import { AdminRoute } from "@/components/AdminRoute";
import { SystemHealthMonitor } from "@/components/admin/SystemHealthMonitor";
import { AdminDatabaseManager } from "@/components/admin/AdminDatabaseManager";
import { HealthCheckJobCleaner } from "@/components/admin/HealthCheckJobCleaner";
import { PromptTestingTab } from "@/components/admin/PromptTestingTab";
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

          <Tabs defaultValue="prompt-testing" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="prompt-testing">Prompt Testing</TabsTrigger>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="health">System Health</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="jobs">Job Management</TabsTrigger>
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
                        • Manage database records
                      </p>
                      <p className="text-sm text-gray-600">
                        • Clean up job queues
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

            <TabsContent value="health" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Health Monitor</CardTitle>
                  <CardDescription>
                    Real-time monitoring of system components and services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SystemHealthMonitor />
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
          </Tabs>
        </div>
      </div>
    </AdminRoute>
  );
};

export default Admin; 