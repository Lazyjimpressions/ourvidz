
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

export const Admin = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const checkAdminStatus = async () => {
      if (!user) {
        navigate('/login');
        return;
      }

      // For now, we'll check if user exists in auth. Later we can add role checks.
      // This assumes admin access is granted through some other mechanism
      // (e.g., environment variable, direct database role, etc.)
      
      setIsLoading(false);
    };

    checkAdminStatus();
  }, [user, navigate]);

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen">Loading...</div>;
  }

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
        <TabsList>
          {tabs.map((tab) => (
            <TabsTrigger key={tab.id} value={tab.id}>
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

export default Admin;
