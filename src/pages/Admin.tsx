import { AdminRoute } from "@/components/AdminRoute";
import { SystemHealthMonitor } from "@/components/admin/SystemHealthMonitor";
import { AdminDatabaseManager } from "@/components/admin/AdminDatabaseManager";
import { HealthCheckJobCleaner } from "@/components/admin/HealthCheckJobCleaner";
import { PromptManagementTab } from "@/components/admin/PromptManagementTab";
import { PromptTestingTab } from "@/components/admin/PromptTestingTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { ContentModerationTab } from "@/components/admin/ContentModerationTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { SystemConfigTab } from "@/components/admin/SystemConfigTab";
import { SystemMetricsTab } from "@/components/admin/SystemMetricsTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Shield, Flag, BarChart3, Settings, Database, Activity, Home, Monitor } from "lucide-react";

interface ActivityLog {
  id: string;
  action: string;
  created_at: string;
  user_id: string | null;
  resource_type: string | null;
  resource_id: string | null;
  metadata: any;
}

/**
 * Admin dashboard page with system monitoring and management tools
 * Protected by AdminRoute component to ensure only admin users can access
 */
const Admin = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [recentActivity, setRecentActivity] = useState<ActivityLog[]>([]);
  const [isLoadingActivity, setIsLoadingActivity] = useState(false);

  useEffect(() => {
    loadRecentActivity();
  }, []);

  const loadRecentActivity = async () => {
    setIsLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from('user_activity_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setRecentActivity(data || []);
    } catch (error) {
      console.error('Error loading recent activity:', error);
    } finally {
      setIsLoadingActivity(false);
    }
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'users':
        setActiveTab('users');
        break;
      case 'moderation':
        setActiveTab('moderation');
        break;
      case 'analytics':
        setActiveTab('analytics');
        break;
      case 'config':
        setActiveTab('config');
        break;
      case 'database':
        setActiveTab('database');
        break;
      case 'jobs':
        setActiveTab('jobs');
        break;
    }
  };

  const formatActivityTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <Users className="h-4 w-4" />;
      case 'generate':
        return <Activity className="h-4 w-4" />;
      case 'upload':
        return <Database className="h-4 w-4" />;
      default:
        return <Activity className="h-4 w-4" />;
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
                <p className="text-gray-600 mt-2">
                  System monitoring and management tools for administrators
                </p>
              </div>
              <Button
                variant="outline"
                onClick={() => window.location.href = '/dashboard'}
                className="gap-2"
              >
                <Home className="h-4 w-4" />
                Back to Dashboard
              </Button>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-5 lg:grid-cols-10 gap-2">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="metrics">Metrics</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="prompt-management">Prompts</TabsTrigger>
              <TabsTrigger value="testing">Testing</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card className="lg:col-span-2">
                  <CardHeader>
                    <CardTitle>System Status</CardTitle>
                    <CardDescription>
                      Current system health and performance metrics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <SystemHealthMonitor />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                      Common administrative tasks
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('users')}
                      >
                        <Users className="h-4 w-4 mr-2" />
                        Manage Users
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('moderation')}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        Content Moderation
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('analytics')}
                      >
                        <BarChart3 className="h-4 w-4 mr-2" />
                        View Analytics
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('database')}
                      >
                        <Database className="h-4 w-4 mr-2" />
                        Database Management
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('jobs')}
                      >
                        <Activity className="h-4 w-4 mr-2" />
                        Job Queue
                      </Button>
                      <Button 
                        variant="outline" 
                        className="w-full justify-start"
                        onClick={() => handleQuickAction('config')}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        System Config
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest system events and user actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {isLoadingActivity ? (
                    <div className="text-center py-4">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900 mx-auto"></div>
                      <p className="text-sm text-gray-500 mt-2">Loading activity...</p>
                    </div>
                  ) : recentActivity.length > 0 ? (
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="text-gray-500">
                            {getActivityIcon(activity.action)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.action.charAt(0).toUpperCase() + activity.action.slice(1)}
                            </p>
                            {activity.resource_type && (
                              <p className="text-xs text-gray-500">
                                {activity.resource_type}: {activity.resource_id}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-gray-400">
                            {formatActivityTime(activity.created_at)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Activity className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No recent activity to display</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="metrics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5" />
                    System Metrics
                  </CardTitle>
                  <CardDescription>
                    Real-time worker health, queue depths, and system performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemMetricsTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    System performance metrics, user engagement, and business insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>User Management</CardTitle>
                  <CardDescription>
                    Manage user accounts, view usage statistics, and perform administrative actions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <UserManagementTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="moderation" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Content Moderation</CardTitle>
                  <CardDescription>
                    Review and manage user-generated content, NSFW detection, and moderation workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ContentModerationTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="prompt-management" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Management</CardTitle>
                  <CardDescription>
                    Manage prompt templates and negative prompts for all models
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PromptManagementTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Testing</CardTitle>
                  <CardDescription>
                    Test prompt optimization and model performance across different scenarios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <PromptTestingTab />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Database Management</CardTitle>
                  <CardDescription>
                    Manage user profiles, roles, and system data
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AdminDatabaseManager />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="jobs" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Job Queue Management</CardTitle>
                  <CardDescription>
                    Monitor and clean up generation job queues
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <HealthCheckJobCleaner />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="config" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Configuration</CardTitle>
                  <CardDescription>
                    Manage application settings, model configurations, rate limits, and system parameters
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemConfigTab />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminRoute>
  );
};

export default Admin; 