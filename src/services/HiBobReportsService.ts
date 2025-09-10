import { HiBobApiClient } from './HiBobApiClient';

export interface HiBobReport {
  id: string;
  name: string;
  description?: string;
  category?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  isPublic?: boolean;
}

export interface HiBobReportDownload {
  downloadUrl?: string;
  expiresAt?: string;
  status: 'ready' | 'pending' | 'failed';
}

export interface ReportData {
  reportName: string;
  data: any[];
  metadata?: {
    totalRows?: number;
    generatedAt?: string;
    columns?: string[];
  };
}

export class HiBobReportsService {
  private apiClient: HiBobApiClient;

  constructor() {
    this.apiClient = new HiBobApiClient();
  }

  async getReports(): Promise<HiBobReport[]> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<{ reports: HiBobReport[] }>('/v1/reports');
      return response.reports || [];
    });
  }

  async downloadReportById(reportId: string): Promise<Buffer> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<HiBobReportDownload>(`/v1/reports/${reportId}/download`);

      if (response.status === 'ready' && response.downloadUrl) {
        const fileResponse = await fetch(response.downloadUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download report: ${fileResponse.statusText}`);
        }
        const arrayBuffer = await fileResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else if (response.status === 'pending') {
        // Wait a bit and try again (polling)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.downloadReportById(reportId);
      } else {
        throw new Error(`Report download failed with status: ${response.status}`);
      }
    });
  }

  async downloadReportByName(reportName: string): Promise<Buffer> {
    return this.apiClient.withRateLimit(async () => {
      const response = await this.apiClient.get<HiBobReportDownload>(`/v1/reports/download?name=${encodeURIComponent(reportName)}`);

      if (response.status === 'ready' && response.downloadUrl) {
        const fileResponse = await fetch(response.downloadUrl);
        if (!fileResponse.ok) {
          throw new Error(`Failed to download report: ${fileResponse.statusText}`);
        }
        const arrayBuffer = await fileResponse.arrayBuffer();
        return Buffer.from(arrayBuffer);
      } else if (response.status === 'pending') {
        // Wait a bit and try again (polling)
        await new Promise(resolve => setTimeout(resolve, 2000));
        return this.downloadReportByName(reportName);
      } else {
        throw new Error(`Report download failed with status: ${response.status}`);
      }
    });
  }

  // Helper method to get engagement/survey reports
  async getEngagementReports(): Promise<HiBobReport[]> {
    const allReports = await this.getReports();

    // Filter for reports that might contain engagement/survey data
    // This is a heuristic - you might want to configure specific report names
    return allReports.filter(report =>
      report.name.toLowerCase().includes('engagement') ||
      report.name.toLowerCase().includes('survey') ||
      report.name.toLowerCase().includes('satisfaction') ||
      report.name.toLowerCase().includes('feedback')
    );
  }

  // Parse CSV report data (assuming HiBob returns CSV format)
  private parseCSVReport(csvData: Buffer): any[] {
    const csvString = csvData.toString('utf-8');
    const lines = csvString.split('\n').filter(line => line.trim());

    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const rows = lines.slice(1);

    return rows.map(row => {
      const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
      const obj: any = {};

      headers.forEach((header, index) => {
        obj[header] = values[index] || '';
      });

      return obj;
    });
  }

  // Get report data as structured object
  async getReportData(reportName: string): Promise<ReportData> {
    const csvData = await this.downloadReportByName(reportName);
    const data = this.parseCSVReport(csvData);

    return {
      reportName,
      data,
      metadata: {
        totalRows: data.length,
        generatedAt: new Date().toISOString(),
        columns: data.length > 0 ? Object.keys(data[0]) : []
      }
    };
  }

  // Get multiple reports data
  async getMultipleReportsData(reportNames: string[]): Promise<ReportData[]> {
    const promises = reportNames.map(name => this.getReportData(name));
    return Promise.all(promises);
  }

  // Helper for common engagement metrics from reports
  async getEngagementMetricsFromReports(): Promise<{
    averageEngagementScore?: number;
    responseRate?: number;
    topPositiveThemes?: string[];
    topImprovementAreas?: string[];
    byDepartment?: Record<string, number>;
    trendData?: Array<{ period: string; score: number }>;
  }> {
    const engagementReports = await this.getEngagementReports();

    if (engagementReports.length === 0) {
      return {};
    }

    // Get the most recent engagement report
    const latestReport = engagementReports[0]; // Assuming they're sorted by recency
    const reportData = await this.getReportData(latestReport.name);

    // This is a simplified parsing - you'd need to adapt based on your actual report structure
    const metrics = {
      averageEngagementScore: 0,
      responseRate: 0,
      topPositiveThemes: [] as string[],
      topImprovementAreas: [] as string[],
      byDepartment: {} as Record<string, number>,
      trendData: [] as Array<{ period: string; score: number }>
    };

    // Calculate basic metrics from the data
    if (reportData.data.length > 0) {
      // Look for engagement score columns
      const scoreColumns = reportData.metadata?.columns?.filter(col =>
        col.toLowerCase().includes('score') ||
        col.toLowerCase().includes('engagement') ||
        col.toLowerCase().includes('satisfaction')
      ) || [];

      if (scoreColumns.length > 0) {
        const scores = reportData.data
          .map(row => parseFloat(row[scoreColumns[0]]))
          .filter(score => !isNaN(score));

        if (scores.length > 0) {
          metrics.averageEngagementScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        }
      }

      // Group by department if department column exists
      const deptColumn = reportData.metadata?.columns?.find(col =>
        col.toLowerCase().includes('department') ||
        col.toLowerCase().includes('dept')
      );

      if (deptColumn) {
        const deptScores: Record<string, number[]> = {};

        reportData.data.forEach(row => {
          const dept = row[deptColumn];
          const score = scoreColumns.length > 0 ? parseFloat(row[scoreColumns[0]]) : 0;

          if (dept && !isNaN(score)) {
            if (!deptScores[dept]) deptScores[dept] = [];
            deptScores[dept].push(score);
          }
        });

        // Calculate average by department
        Object.entries(deptScores).forEach(([dept, scores]) => {
          metrics.byDepartment[dept] = scores.reduce((sum, score) => sum + score, 0) / scores.length;
        });
      }
    }

    return metrics;
  }

  // Get attrition risk indicators from reports
  async getAttritionRiskData(): Promise<{
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
    byDepartment: Record<string, { high: number; medium: number; low: number }>;
  }> {
    const reports = await this.getReports();
    const attritionReport = reports.find(r =>
      r.name.toLowerCase().includes('attrition') ||
      r.name.toLowerCase().includes('turnover') ||
      r.name.toLowerCase().includes('retention')
    );

    if (!attritionReport) {
      return {
        highRiskCount: 0,
        mediumRiskCount: 0,
        lowRiskCount: 0,
        byDepartment: {}
      };
    }

    const reportData = await this.getReportData(attritionReport.name);

    // Simplified parsing - adapt based on your report structure
    let highRiskCount = 0;
    let mediumRiskCount = 0;
    let lowRiskCount = 0;
    const byDepartment: Record<string, { high: number; medium: number; low: number }> = {};

    reportData.data.forEach(row => {
      const riskLevel = (row.riskLevel || row.risk || '').toLowerCase();
      const department = row.department || row.dept || 'Unknown';

      if (riskLevel.includes('high')) highRiskCount++;
      else if (riskLevel.includes('medium')) mediumRiskCount++;
      else if (riskLevel.includes('low')) lowRiskCount++;

      if (!byDepartment[department]) {
        byDepartment[department] = { high: 0, medium: 0, low: 0 };
      }

      if (riskLevel.includes('high')) byDepartment[department].high++;
      else if (riskLevel.includes('medium')) byDepartment[department].medium++;
      else if (riskLevel.includes('low')) byDepartment[department].low++;
    });

    return {
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      byDepartment
    };
  }
}

