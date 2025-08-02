# Admin Portal Documentation - Consolidated

**Last Updated:** July 30, 2025  
**Status:** Production Active

## 🚀 Overview

The OurVidz Admin Portal provides comprehensive management tools for monitoring, analytics, content moderation, and system administration.

### **Product Vision**
Create a streamlined, utility-first admin panel for OurVidz.com that enables rapid system management, real-time monitoring, and direct configuration of AI video generation infrastructure without compromising on functionality or performance.

### **Key Objectives**
- **Operational Efficiency**: Reduce admin task completion time by 70%
- **System Reliability**: Enable proactive monitoring and instant issue resolution
- **Scalability Management**: Support growing user base and content generation volume
- **Cost Optimization**: Direct control over AI model parameters for performance/cost balance

### **Success Criteria**
- Admin task completion time < 30 seconds for routine operations
- System issue detection and response time < 2 minutes
- 99.5% admin panel uptime
- Zero data loss during configuration changes

## 🏗️ Admin Portal Architecture

### **Component Overview**
```
┌─────────────────────────────────────┐
│         Admin Portal                │
├─────────────────────────────────────┤
│  • Dashboard & Analytics            │
│  • User Management                  │
│  • Content Moderation               │
│  • System Monitoring                │
│  • Database Management              │
│  • Worker Management                │
└─────────────────────────────────────┘
```

### **Access Control**
```typescript
// Admin role verification
interface AdminUser {
  id: string;
  email: string;
  role: 'admin' | 'moderator' | 'viewer';
  permissions: string[];
  lastLogin: Date;
}
```

## 📊 Dashboard & Analytics

### **Key Metrics Dashboard**
```typescript
interface DashboardMetrics {
  // User metrics
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  premiumUsers: number;
  
  // Content metrics
  totalImages: number;
  totalVideos: number;
  imagesGeneratedToday: number;
  videosGeneratedToday: number;
  
  // System metrics
  activeWorkers: number;
  queueLength: number;
  averageResponseTime: number;
  systemUptime: number;
  
  // Revenue metrics
  monthlyRevenue: number;
  conversionRate: number;
  averageOrderValue: number;
}
```

### **Real-time Analytics**
```typescript
// Real-time data streams
interface RealTimeData {
  activeJobs: JobStatus[];
  workerHealth: WorkerHealth[];
  userActivity: UserActivity[];
  systemAlerts: SystemAlert[];
}
```

### **Performance Charts**
```typescript
// Chart data structures
interface ChartData {
  // Time series data
  generationVolume: TimeSeriesPoint[];
  userGrowth: TimeSeriesPoint[];
  revenueTrend: TimeSeriesPoint[];
  
  // Distribution data
  modelUsage: PieChartData[];
  userTypes: PieChartData[];
  contentCategories: PieChartData[];
}
```

## 👥 User Management

### **User List & Search**
```typescript
interface UserFilters {
  search: string;
  status: 'active' | 'suspended' | 'banned';
  userType: 'free' | 'premium' | 'admin';
  dateRange: DateRange;
  sortBy: 'created_at' | 'last_login' | 'generation_count';
  sortOrder: 'asc' | 'desc';
}

interface UserData {
  id: string;
  email: string;
  username: string;
  status: UserStatus;
  userType: UserType;
  createdAt: Date;
  lastLogin: Date;
  generationCount: number;
  totalSpent: number;
  isVerified: boolean;
}
```

### **User Actions**
```typescript
// Admin actions on users
interface UserActions {
  suspendUser: (userId: string, reason: string) => Promise<void>;
  banUser: (userId: string, reason: string) => Promise<void>;
  restoreUser: (userId: string) => Promise<void>;
  upgradeToPremium: (userId: string) => Promise<void>;
  downgradeToFree: (userId: string) => Promise<void>;
  resetPassword: (userId: string) => Promise<void>;
  viewUserContent: (userId: string) => Promise<Content[]>;
}
```

### **User Analytics**
```typescript
interface UserAnalytics {
  // User behavior
  averageSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  
  // Generation patterns
  favoriteModels: string[];
  averageGenerationsPerDay: number;
  peakUsageHours: number[];
  
  // Conversion metrics
  freeToPremiumConversion: number;
  churnRate: number;
  lifetimeValue: number;
}
```

## 🛡️ Content Moderation

### **Moderation Queue**
```typescript
interface ModerationItem {
  id: string;
  type: 'image' | 'video';
  url: string;
  userId: string;
  prompt: string;
  status: 'pending' | 'approved' | 'rejected' | 'flagged';
  createdAt: Date;
  flaggedBy: string[];
  moderationNotes: string;
  autoModerationScore: number;
}

interface ModerationFilters {
  status: ModerationStatus[];
  type: ContentType[];
  dateRange: DateRange;
  autoModerationScore: number;
  flaggedBy: string[];
}
```

### **Auto-Moderation System**
```typescript
interface AutoModerationConfig {
  enabled: boolean;
  threshold: number; // 0-1 score threshold
  models: {
    nsfw: boolean;
    violence: boolean;
    hate: boolean;
    spam: boolean;
  };
  actions: {
    autoApprove: boolean;
    autoReject: boolean;
    flagForReview: boolean;
  };
}

interface ModerationResult {
  score: number;
  categories: {
    nsfw: number;
    violence: number;
    hate: number;
    spam: number;
  };
  confidence: number;
  recommendedAction: 'approve' | 'reject' | 'review';
}
```

### **Moderation Actions**
```typescript
interface ModerationActions {
  approveContent: (contentId: string, moderatorId: string) => Promise<void>;
  rejectContent: (contentId: string, reason: string, moderatorId: string) => Promise<void>;
  flagContent: (contentId: string, reason: string, moderatorId: string) => Promise<void>;
  bulkModerate: (contentIds: string[], action: ModerationAction) => Promise<void>;
  updateAutoModeration: (config: AutoModerationConfig) => Promise<void>;
}
```

## 🔧 System Monitoring

### **Worker Health Monitoring**
```typescript
interface WorkerHealth {
  workerId: string;
  workerType: 'sdxl' | 'wan' | 'video' | 'chat';
  status: 'healthy' | 'degraded' | 'unhealthy' | 'offline';
  uptime: number;
  gpuUtilization: number;
  memoryUsage: number;
  activeJobs: number;
  queueLength: number;
  lastHeartbeat: Date;
  errorCount: number;
}

interface SystemAlerts {
  id: string;
  type: 'worker_down' | 'high_load' | 'error_spike' | 'queue_backlog';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}
```

### **Performance Monitoring**
```typescript
interface PerformanceMetrics {
  // Response times
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  
  // Throughput
  requestsPerSecond: number;
  jobsPerMinute: number;
  concurrentUsers: number;
  
  // Error rates
  errorRate: number;
  timeoutRate: number;
  failureRate: number;
  
  // Resource utilization
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkUsage: number;
}
```

### **Database Monitoring**
```typescript
interface DatabaseMetrics {
  // Connection metrics
  activeConnections: number;
  maxConnections: number;
  connectionUtilization: number;
  
  // Query performance
  slowQueries: number;
  averageQueryTime: number;
  queryThroughput: number;
  
  // Storage metrics
  databaseSize: number;
  tableSizes: Record<string, number>;
  indexUsage: Record<string, number>;
  
  // Replication lag
  replicationLag: number;
  replicationStatus: 'healthy' | 'lagging' | 'failed';
}
```

## 🗄️ Database Management

### **Database Operations**
```sql
-- User management queries
SELECT 
  COUNT(*) as total_users,
  COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as new_users_24h,
  COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_users_24h
FROM users;

-- Content generation analytics
SELECT 
  DATE(created_at) as date,
  COUNT(*) as generations,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_generation_time
FROM jobs 
WHERE status = 'completed'
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Worker performance
SELECT 
  worker_type,
  COUNT(*) as jobs_processed,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))) as avg_processing_time,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs
FROM jobs 
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY worker_type;
```

### **Data Export & Import**
```typescript
interface DataExport {
  exportUsers: (filters: UserFilters, format: 'csv' | 'json') => Promise<string>;
  exportContent: (filters: ContentFilters, format: 'csv' | 'json') => Promise<string>;
  exportAnalytics: (dateRange: DateRange, format: 'csv' | 'json') => Promise<string>;
  importUsers: (file: File, options: ImportOptions) => Promise<ImportResult>;
  backupDatabase: () => Promise<string>;
  restoreDatabase: (backupId: string) => Promise<void>;
}
```

### **Database Maintenance**
```sql
-- Cleanup old data
DELETE FROM job_status WHERE created_at < NOW() - INTERVAL '30 days';
DELETE FROM prompt_tests WHERE created_at < NOW() - INTERVAL '90 days';

-- Optimize tables
VACUUM ANALYZE jobs;
VACUUM ANALYZE images;
VACUUM ANALYZE videos;

-- Update statistics
ANALYZE users;
ANALYZE jobs;
ANALYZE images;
ANALYZE videos;
```

## 🔄 Worker Management

### **Worker Configuration**
```typescript
interface WorkerConfig {
  workerId: string;
  workerType: WorkerType;
  status: 'active' | 'inactive' | 'maintenance';
  maxConcurrentJobs: number;
  pollingInterval: number;
  memoryLimit: number;
  autoScale: boolean;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
}

interface WorkerActions {
  startWorker: (workerId: string) => Promise<void>;
  stopWorker: (workerId: string) => Promise<void>;
  restartWorker: (workerId: string) => Promise<void>;
  updateConfig: (workerId: string, config: Partial<WorkerConfig>) => Promise<void>;
  viewLogs: (workerId: string, lines: number) => Promise<string[]>;
}
```

### **Queue Management**
```typescript
interface QueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  averageWaitTime: number;
  oldestJob: Date;
  queueByType: Record<JobType, number>;
}

interface QueueActions {
  viewQueue: (filters: QueueFilters) => Promise<Job[]>;
  cancelJob: (jobId: string) => Promise<void>;
  retryJob: (jobId: string) => Promise<void>;
  prioritizeJob: (jobId: string) => Promise<void>;
  clearFailedJobs: () => Promise<void>;
  purgeOldJobs: (olderThan: Date) => Promise<void>;
}
```

## 📈 Analytics & Reporting

### **Custom Reports**
```typescript
interface ReportConfig {
  name: string;
  description: string;
  query: string;
  parameters: ReportParameter[];
  schedule: 'daily' | 'weekly' | 'monthly' | 'manual';
  recipients: string[];
  format: 'pdf' | 'csv' | 'json';
}

interface ReportParameter {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  defaultValue?: any;
  required: boolean;
}
```

### **Scheduled Reports**
```typescript
interface ScheduledReport {
  id: string;
  name: string;
  schedule: CronExpression;
  lastRun: Date;
  nextRun: Date;
  status: 'active' | 'paused' | 'error';
  recipients: string[];
  reportConfig: ReportConfig;
}
```

### **Export & Integration**
```typescript
interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx' | 'pdf';
  dateRange: DateRange;
  filters: Record<string, any>;
  includeCharts: boolean;
  compression: boolean;
}

interface IntegrationConfig {
  webhookUrl: string;
  apiKey: string;
  events: string[];
  retryOnFailure: boolean;
  maxRetries: number;
}
```

## 🔐 Security & Access Control

### **Admin Permissions**
```typescript
interface AdminPermissions {
  // User management
  viewUsers: boolean;
  editUsers: boolean;
  deleteUsers: boolean;
  suspendUsers: boolean;
  
  // Content moderation
  viewContent: boolean;
  moderateContent: boolean;
  bulkModerate: boolean;
  configureAutoModeration: boolean;
  
  // System management
  viewSystemMetrics: boolean;
  manageWorkers: boolean;
  manageDatabase: boolean;
  configureSystem: boolean;
  
  // Analytics
  viewAnalytics: boolean;
  exportData: boolean;
  createReports: boolean;
  scheduleReports: boolean;
}
```

### **Audit Logging**
```typescript
interface AuditLog {
  id: string;
  adminId: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  timestamp: Date;
  ipAddress: string;
  userAgent: string;
}

interface AuditFilters {
  adminId?: string;
  action?: string;
  resource?: string;
  dateRange: DateRange;
  severity: 'low' | 'medium' | 'high';
}
```

## 🚨 Emergency Procedures

### **System Recovery**
```typescript
interface EmergencyProcedures {
  // Worker recovery
  restartAllWorkers: () => Promise<void>;
  failoverToBackup: () => Promise<void>;
  emergencyMaintenance: (message: string) => Promise<void>;
  
  // Database recovery
  rollbackMigration: (migrationId: string) => Promise<void>;
  restoreFromBackup: (backupId: string) => Promise<void>;
  emergencyBackup: () => Promise<string>;
  
  // User communication
  sendEmergencyNotification: (message: string, users: string[]) => Promise<void>;
  updateSystemStatus: (status: SystemStatus) => Promise<void>;
}
```

### **Incident Response**
```typescript
interface IncidentResponse {
  // Incident tracking
  createIncident: (type: IncidentType, severity: Severity, description: string) => Promise<string>;
  updateIncident: (incidentId: string, updates: IncidentUpdate) => Promise<void>;
  resolveIncident: (incidentId: string, resolution: string) => Promise<void>;
  
  // Communication
  notifyStakeholders: (incidentId: string) => Promise<void>;
  updateStatusPage: (status: StatusPageUpdate) => Promise<void>;
  escalateIncident: (incidentId: string, level: EscalationLevel) => Promise<void>;
}
```

---

**For system architecture, see [02-ARCHITECTURE.md](./02-ARCHITECTURE.md)**  
**For API details, see [03-API.md](./03-API.md)** 