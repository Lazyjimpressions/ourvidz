import { AdminRoute } from "@/components/AdminRoute";
import { SystemHealthMonitor } from "@/components/admin/SystemHealthMonitor";
import { AdminDatabaseManager } from "@/components/admin/AdminDatabaseManager";
import { HealthCheckJobCleaner } from "@/components/admin/HealthCheckJobCleaner";
import { PromptTestingTab } from "@/components/admin/PromptTestingTab";
import { UserManagementTab } from "@/components/admin/UserManagementTab";
import { ContentModerationTab } from "@/components/admin/ContentModerationTab";
import { AnalyticsTab } from "@/components/admin/AnalyticsTab";
import { SystemConfigTab } from "@/components/admin/SystemConfigTab";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/**
 * Admin dashboard page with system monitoring and management tools
 * Protected by AdminRoute component to ensure only admin users can access
 */
const Admin = () => {
  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600 mt-2">
              System monitoring and management tools for administrators
            </p>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="moderation">Moderation</TabsTrigger>
              <TabsTrigger value="prompt-testing">Prompt Testing</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="jobs">Jobs</TabsTrigger>
              <TabsTrigger value="config">Config</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Card>
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
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        • Monitor system health
                      </p>
                      <p className="text-sm text-gray-600">
                        • Manage user accounts
                      </p>
                      <p className="text-sm text-gray-600">
                        • Review content moderation
                      </p>
                      <p className="text-sm text-gray-600">
                        • Analyze system performance
                      </p>
                      <p className="text-sm text-gray-600">
                        • Configure system settings
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Recent Activity</CardTitle>
                    <CardDescription>
                      Latest system events and changes
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600">
                        No recent activity to display
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
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

            <TabsContent value="prompt-testing" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Prompt Testing & Validation</CardTitle>
                  <CardDescription>
                    Test and optimize prompts for SDXL and WAN models with quality rating system
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