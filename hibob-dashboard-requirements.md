Here’s a tight, implementation-ready guide for integrating a HiBob-powered “Engagement” dashboard into your existing project. I’ve focused on what you can reliably get via the Public API today, how to model it, and the charts that communicate engagement best.

⸻

1) What we mean by “engagement”

In a HiBob context, you can instrument observable engagement via:
	•	People activity proxies: profile updates, lifecycle changes, org moves (via People + Employee Tables + Webhooks).  ￼
	•	Workflow participation: open/completed Tasks (e.g., onboarding, reviews).  ￼
	•	Time off signals: requests, “who’s out,” balance touches (participation + seasonality).  ￼
	•	Reports: anything you can expose as a saved report in Bob (including survey outputs if available in your tenant) and then download via the Reports API.  ￼

Note on login analytics: HiBob’s Public API doesn’t expose user login/session events. HiBob does expose API audit logs (requests your integrations make), but that’s not employee login activity. For “who’s logging in and how recently,” pull from your IdP (Okta/Azure AD/Google) or Bob’s in-app audit/reporting if available in UI, not via Public API.  ￼

⸻

2) Endpoints to use (and what they return)

A. People & structure
	•	POST /v1/people/search – search employees with selected fields (defaults span root/about/employment/work; use fields to expand). Use for headcount, departments, managers, locations. Rate limit ~50/min.  ￼
	•	POST /v1/people/fields-by-employee-id – fetch precise field sets by employee. Good for enriching cards/drilldowns. Rate limit ~100/min.  ￼
	•	GET /v1/people/public-profile – public basics for all active employees (avatars, names). Good for roster chips in charts.  ￼

Employee tables (historical & engagement proxies)
	•	GET /v1/tables/work/history (bulk) & /v1/people/{id}/work – track team/manager changes.  ￼
	•	GET /v1/tables/lifecycle/history (bulk) & /v1/people/{id}/lifecycle – joiners/leavers/status changes.  ￼

B. Tasks (participation/completion)
	•	GET /v1/tasks/open – open tasks (filter by assignee/status).
	•	GET /v1/tasks/employees/{id} – tasks for a given employee.
	•	POST /v1/tasks/complete – mark as complete (if you want to close loops).  ￼

Webhooks (recommended)
Subscribe to Task events v2 (todo.changedStatus, etc.) to stream completion in near-real-time; then fetch full details via API using the IDs from the payload.  ￼

C. Time off (participation + seasonality)
	•	GET /v1/timeoff/whosout – list of who’s out over a period.
	•	GET /v1/timeoff/outtoday?date=YYYY-MM-DD – point-in-time “who’s out.”
	•	GET /v1/timeoff/requests/changes?since=…&to=… – request activity window (6-month lookback window rules apply).
	•	GET /v1/timeoff/employees/{id}/balance – balances (if useful for entitlement vs. usage narratives).  ￼

Webhooks: Time off events v2 (request created/updated/cancelled) provide IDs and a ready-to-use GET URL to pull details.  ￼

D. Reports (bring your own metrics from Bob)
	•	GET /v1/reports – list available company reports for the service user’s permissions.
	•	GET /v1/reports/{reportId}/download or GET /v1/reports/download?name={reportName} – retrieve the data file (poll downloadUrl if needed). Use this to pull survey/engagement reports you’ve configured in Bob.  ￼

⸻

3) Data model (minimal)

Employees

Employee { id, displayName, email, managerId, department, site, jobTitle, startDate, status, avatarUrl }

LifecycleEvent

{ employeeId, effectiveDate, status (e.g., Employed, Leave, Terminated), reason }

Task

{ id, employeeId, title, listName, status (open/completed), dueDate, lastUpdated }

TimeOff

{ requestId, employeeId, policyType, dates[], duration, status, createdAt }

WhosOut

{ employeeId, date, portion (am/pm/full), policyType }

ReportRow

{ reportName, rowData: object } // depends on the saved report schema in Bob


⸻

4) Recommended charts & tiles (what to show)

Top-line tiles
	•	Active headcount; Joiners (30/90d); Leavers (30/90d); Open tasks; % tasks completed (rolling 30d); Time-off requests (30d). (People + Employee Tables + Tasks + Time off.)  ￼

Engagement proxies
	•	Task completion rate by department/manager (stacked bar + trend). (Tasks.)  ￼
	•	Profile activity (count of employee.updated events / distinct employees per week). Requires Webhooks + follow-up GET. (Employee events v2.)  ￼
	•	Org mobility: transfers and manager changes over time (area/line). (Work history.)  ￼
	•	Time-off trend: requests per week + acceptance rate (line + %). (Time off requests/changes.)  ￼
	•	Who’s out calendar heatmap: density by date; optional by department. (whosout/outtoday).  ￼
	•	Tenure distribution (histogram) + upcoming anniversaries (list). (People startDate + lifecycle.)  ￼

Optional (if you expose Bob Reports for surveys)
	•	Engagement/survey index by team/manager + “favorable/unfavorable” split. (Reports API feeding a bar + small multiples.)  ￼

Login activity (caveat)
	•	Active users (7/30/90d), DAU/WAU/MAU, Last seen – source from IdP logs (Okta/AAD/Google) or any internal reverse-proxy logs gating Bob SSO. Not available from HiBob Public API.  ￼

⸻

5) Eventing pattern (webhooks → fetch → store)

For freshness without polling:
	1.	Subscribe to Employee, Time off, and Task webhooks (v2).  ￼
	2.	On event, read the IDs from the payload and GET the authoritative record (the webhook explicitly tells you which endpoint/IDs to call).  ￼
	3.	Upsert into your store; recompute aggregates incrementally.

HiBob recently enhanced webhook event logging (UI) to 3 months and exportable (handy for debugging).  ￼

⸻

6) Auth, permissions, limits
	•	Create a Service User and grant category-level permissions to only the data you need (root/about/employment/work; add histories for tables). Missing fields often = missing permissions.  ￼
	•	Mind rate limits (varies by endpoint; e.g., People search 50/min). Batch/bulk endpoints reduce load; paginate.  ￼

⸻

7) Minimal integration snippets (Node/TypeScript)

Setup

// env: HIBOB_API_KEY, HIBOB_BASE=https://api.hibob.com
const base = process.env.HIBOB_BASE!;
const headers = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.HIBOB_API_KEY}`
};

People (search basic roster)

const searchPeople = async (fields = ['displayName','email','id','department','manager','site','employment.startDate']) => {
  const res = await fetch(`${base}/v1/people/search`, {
    method: 'POST', headers,
    body: JSON.stringify({ fields, limit: 500 })
  });
  return res.json();
};

(Endpoint + default fields & permissions guidance.)  ￼

Tasks (open tasks)

const readOpenTasks = async () => {
  const res = await fetch(`${base}/v1/tasks/open`, { headers });
  return res.json();
};

(Tasks API for engagement workflows.)  ￼

Time off (who’s out this week)

const whosOut = async (fromISO: string, toISO: string) => {
  const url = new URL(`${base}/v1/timeoff/whosout`);
  url.searchParams.set('from', fromISO);
  url.searchParams.set('to', toISO);
  const res = await fetch(url, { headers });
  return res.json();
};

(WhosOut and time-off participation.)  ￼

Reports (pull a saved survey/engagement report)

const downloadReportByName = async (reportName: string) => {
  const res = await fetch(`${base}/v1/reports/download?name=${encodeURIComponent(reportName)}`, { headers });
  if (res.status === 202) {
    const { downloadUrl } = await res.json(); // poll URL until ready, then GET file
    const file = await fetch(downloadUrl).then(r => r.arrayBuffer());
    return Buffer.from(file);
  }
  return res.arrayBuffer();
};

(Reports list/download flow.)  ￼

⸻

8) “Who’s logging in to Bob?” — viable approach
	•	Not exposed via Public API. The closest “logs” API is for API usage (i.e., your integration calls) and is accessed in the Bob UI (exportable), not employee logins. Use your SSO/IdP sign-in logs to compute DAU/WAU/MAU and “last seen” and join on email.  ￼
	•	If you absolutely need it inside the same dashboard: stream Okta/Azure AD sign-in events to your data store and render the same charts alongside HiBob data.

⸻

9) Dashboard layout blueprint

Row 1 – KPIs
	•	Headcount | Joiners (30d) | Leavers (30d) | Tasks open | Tasks completion 30d | Time-off requests 30d.

Row 2 – Engagement charts
	•	Task completion by department/manager (stacked bar)
	•	Profile edits per week (line) — from employee.updated webhook counts
	•	Time-off requests trend (line) + approval rate (%).

Row 3 – Workforce context
	•	Org changes (manager/department moves) over time (area)
	•	Tenure distribution (histogram) + upcoming anniversaries (list)
	•	Who’s Out calendar heatmap (this + “Out today” counter).

Side panel
	•	Saved survey/engagement report (via Reports API) with filters for department/manager.

(Endpoints backing each element are listed above; webhooks remove polling for Tasks/People/Time off.)  ￼

⸻

10) Gotchas & tips
	•	Permissions drive shape of responses (missing fields are silently omitted). Test with a service user mirroring prod permissions.  ￼
	•	Time-off /changes now supports a date range but only within ~6 months; schedule periodic backfills if you need longer retros.  ￼
	•	Webhook payloads are notifications; always follow up with the GET the payload suggests to fetch full data.  ￼
	•	Rate limiting varies per module; batch where possible and pre-aggregate.  ￼

⸻

Quick next steps
	1.	Create a Service User with read on root/about/employment/work + histories (tables) + tasks + time off. Test /people/search.  ￼
	2.	Stand up webhook endpoints for Employee, Tasks, Time off; upsert on event.  ￼
	3.	Decide which Bob reports you want to surface (e.g., survey/engagement, attrition risk if available), then wire the Reports API.  ￼
	4.	For login analytics, connect your IdP event stream and align identities with Bob employees by email.

If you want, I can drop in a small Prisma schema for these tables plus a Next.js page skeleton with the suggested tiles/charts.