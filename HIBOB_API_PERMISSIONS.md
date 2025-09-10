# HiBob API User Permissions Guide

## Overview

This document outlines the specific permissions required for the HiBob API service user to enable full functionality of the Engagement Dashboard. The dashboard currently uses Basic Authentication with a service user ID and secret.

## Current Implementation Status

### ✅ Working Features
- **Employee Directory Access**: Can retrieve employee IDs (163 employees currently synced)
- **Basic Authentication**: Successfully authenticates with HiBob API
- **Data Synchronization**: Automated sync jobs for employee data

### ⚠️ Limited Features (Due to Permission Restrictions)
- **Employee Details**: Cannot access full employee profiles (names, emails, departments, etc.)
- **Task Management**: No access to task data
- **Time Off**: No access to time-off requests and balances
- **Lifecycle Events**: No access to employee lifecycle data
- **Reports**: No access to custom reports and surveys

## Required Permissions

### 1. People & Structure API Permissions

#### Essential Permissions (Currently Missing):
```
People API - Read
├── Employee Directory - Read
├── Employee Profiles - Read
├── Employee Lifecycle - Read
└── Work History - Read
```

#### Specific Fields Needed:
- `displayName` - Employee display name
- `firstName` - Employee first name
- `lastName` - Employee last name
- `email` - Employee email address
- `department` - Department information
- `site` - Office/site location
- `manager` - Manager information
- `employment.status` - Employment status
- `employment.startDate` - Start date
- `work` - Work-related information
- `about` - Personal information

### 2. Tasks API Permissions

#### Required Permissions:
```
Tasks API - Read
├── Open Tasks - Read
├── Task Details - Read
├── Task History - Read
└── Task Assignments - Read
```

#### Features Enabled:
- Task completion rates
- Overdue task tracking
- Department-wise task analytics

### 3. Time Off API Permissions

#### Required Permissions:
```
Time Off API - Read
├── Time Off Requests - Read
├── Time Off Balances - Read
├── Who's Out - Read
├── Time Off Policies - Read
└── Time Off History - Read
```

#### Features Enabled:
- Time-off request tracking
- Employee availability calendar
- Time-off patterns analysis
- Seasonal time-off trends

### 4. Reports API Permissions

#### Required Permissions:
```
Reports API - Read
├── Custom Reports - Read
├── Report Data - Export
├── Survey Results - Read
└── Analytics Data - Read
```

#### Features Enabled:
- Custom engagement surveys
- Employee satisfaction metrics
- Custom report integration
- Advanced analytics

### 5. Webhooks Permissions (Future Enhancement)

#### Required Permissions:
```
Webhooks API - Read/Write
├── Webhook Subscriptions - Manage
├── Event Notifications - Receive
└── Real-time Updates - Configure
```

#### Features Enabled:
- Real-time data synchronization
- Instant updates on employee changes
- Automated dashboard refreshes

## Permission Request Template

### For HiBob Administrator

**Subject:** API Permissions Request for Engagement Dashboard Integration

**Dear HiBob Administrator,**

We are implementing an Employee Engagement Dashboard that integrates with HiBob to provide comprehensive workforce analytics. To enable full functionality, we require the following permissions for our service user:

#### Required Permissions:

1. **People API - Full Read Access**
   - Employee profiles and personal information
   - Department and organizational structure
   - Employment status and lifecycle events
   - Work history and role changes

2. **Tasks API - Read Access**
   - Open tasks and assignments
   - Task completion tracking
   - Department-wise task analytics

3. **Time Off API - Read Access**
   - Time-off requests and approvals
   - Employee availability tracking
   - Time-off balance information

4. **Reports API - Read Access**
   - Custom reports and surveys
   - Engagement metrics and analytics
   - Employee satisfaction data

#### Service User Details:
- **Service User ID:** [HIBOBSERVICE value]
- **Purpose:** Employee engagement analytics and reporting
- **Data Access:** Read-only access to workforce data
- **Security:** All data transmission encrypted, stored securely

#### Business Justification:
This integration will provide:
- Real-time workforce insights
- Improved employee engagement tracking
- Better organizational analytics
- Enhanced decision-making capabilities

#### Security Assurance:
- Read-only access only
- Encrypted data transmission
- Secure storage with access controls
- Regular security audits

**Please grant these permissions to enable the full functionality of our engagement dashboard.**

**Best regards,**  
[Your Name]  
[Your Position]  
[Your Contact Information]

## Implementation Impact

### With Full Permissions:
- **Complete Employee Profiles**: Names, emails, departments, managers
- **Task Analytics**: Completion rates, overdue tracking, department performance
- **Time-Off Insights**: Request patterns, availability calendar, seasonal trends
- **Engagement Surveys**: Custom surveys, satisfaction metrics, feedback analysis
- **Real-time Updates**: Webhook integration for live dashboard updates

### Current Limitations:
- Employees displayed as "Employee [ID]" instead of actual names
- No task completion analytics
- No time-off pattern analysis
- No engagement survey data
- Manual sync required (no real-time updates)

## Technical Details

### API Endpoints Used:
```
GET/POST /v1/people/search
GET/POST /v1/people/fields-by-employee-id
GET     /v1/tasks/open
GET/POST /v1/timeoff/requests
GET     /v1/timeoff/whosout
GET     /v1/reports
POST    /v1/webhooks (future)
```

### Authentication Method:
- **Type:** Basic Authentication
- **Credentials:** Service User ID + Secret
- **Security:** Base64 encoded transmission

## Next Steps

1. **Request Permissions**: Submit the permission request to your HiBob administrator
2. **Test Access**: Verify all required endpoints are accessible
3. **Update Dashboard**: Enable full features once permissions are granted
4. **Implement Webhooks**: Add real-time data synchronization (optional)

## Support

For technical questions about this integration:
- Contact: [Your technical contact]
- Documentation: [Link to HiBob API docs]
- Dashboard: [Link to your engagement dashboard]

---

**Document Version:** 1.0
**Last Updated:** September 9, 2025
**Integration Status:** Partially Functional (Employee IDs only)

