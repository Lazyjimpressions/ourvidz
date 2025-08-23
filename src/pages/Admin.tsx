
import React from 'react';
import { AdminRoute } from '@/components/AdminRoute';

import { SystemHealthMonitor } from '@/components/admin/SystemHealthMonitor';
import { SystemMetricsTab } from '@/components/admin/SystemMetricsTab';
import { AnalyticsTab } from '@/components/admin/AnalyticsTab';
import { UserManagementTab } from '@/components/admin/UserManagementTab';
import { ContentModerationTab } from '@/components/admin/ContentModerationTab';
import { SystemConfigTab } from '@/components/admin/SystemConfigTab';
import { PromptManagementTab } from '@/components/admin/PromptManagementTab';
import { PromptTestingTab } from '@/components/admin/PromptTestingTab';
import { AdminDatabaseManager } from '@/components/admin/AdminDatabaseManager';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { ApiProvidersTab } from '@/components/admin/ApiProvidersTab';
import { ApiModelsTab } from '@/components/admin/ApiModelsTab';

const AdminContent = () => {

  const tabs = [
    { id: 'system-health', label: 'System Health', component: <SystemHealthMonitor /> },
    { id: 'system-metrics', label: 'System Metrics', component: <SystemMetricsTab /> },
    { id: 'analytics', label: 'Analytics', component: <AnalyticsTab /> },
    { id: 'users', label: 'User Management', component: <UserManagementTab /> },
    { id: 'content', label: 'Content Moderation', component: <ContentModerationTab /> },
    { id: 'system-config', label: 'System Config', component: <SystemConfigTab /> },
    { id: 'prompt-management', label: 'Prompt Management', component: <PromptManagementTab /> },
    { id: 'prompt-testing', label: 'Prompt Testing', component: <PromptTestingTab /> },
    { id: 'api-providers', label: 'API Providers', component: <ApiProvidersTab /> },
    { id: 'api-models', label: 'API Models', component: <ApiModelsTab /> },
    { id: 'database', label: 'Database Manager', component: <AdminDatabaseManager /> }
  ];

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>

      <Tabs defaultValue="system-health" className="w-full">
        <TabsList className="w-full flex flex-wrap justify-start gap-2 h-auto p-2">
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id} className="flex-shrink-0">
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {tabs.map((tab) => (
          <TabsContent key={tab.id} value={tab.id} className="mt-4">
            {tab.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export const Admin = () => {
  return (
    <AdminRoute>
      <AdminContent />
    </AdminRoute>
  );
};

export default Admin;
