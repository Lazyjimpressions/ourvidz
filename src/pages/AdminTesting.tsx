
import { useState } from "react";
import { PortalLayout } from "@/components/PortalLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AdminPromptTester } from "@/components/admin/AdminPromptTester";
import { AdminImageTester } from "@/components/admin/AdminImageTester";
import { AdminVideoTester } from "@/components/admin/AdminVideoTester";
import { AdminDatabaseManager } from "@/components/admin/AdminDatabaseManager";
import { SystemHealthMonitor } from "@/components/admin/SystemHealthMonitor";
import { Settings, Clock, Zap, CheckCircle, Database, AlertTriangle } from "lucide-react";

const AdminTesting = () => {
  const [activeTab, setActiveTab] = useState("prompts");

  return (
    <PortalLayout title="Admin Testing Dashboard">
      <div className="min-h-screen bg-gray-50/50">
        <div className="container mx-auto p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Testing Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive testing and validation for all AI generation capabilities
              </p>
            </div>
            <Badge variant="outline" className="text-sm">
              <Settings className="h-4 w-4 mr-1" />
              Admin Only
            </Badge>
          </div>

          {/* Spot Server Cost Warning */}
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-700">
                <AlertTriangle className="h-5 w-5" />
                Spot Server Cost Notice
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-red-600 text-sm">
                <strong>Important:</strong> Creating jobs in the testing tabs below will wake up the spot server and incur costs. 
                Only create jobs when necessary for testing. Use the Database Management tab to clean up unnecessary jobs.
              </p>
            </CardContent>
          </Card>

          {/* System Health Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SystemHealthMonitor />
            </CardContent>
          </Card>

          {/* Testing Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-6">
              <TabsTrigger value="prompts" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Prompt Testing
              </TabsTrigger>
              <TabsTrigger value="images" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Image Generation
              </TabsTrigger>
              <TabsTrigger value="videos" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Video Generation
              </TabsTrigger>
              <TabsTrigger value="database" className="flex items-center gap-2">
                <Database className="h-4 w-4" />
                Database Management
              </TabsTrigger>
            </TabsList>

            <TabsContent value="prompts" className="space-y-6">
              <AdminPromptTester />
            </TabsContent>

            <TabsContent value="images" className="space-y-6">
              <AdminImageTester />
            </TabsContent>

            <TabsContent value="videos" className="space-y-6">
              <AdminVideoTester />
            </TabsContent>

            <TabsContent value="database" className="space-y-6">
              <AdminDatabaseManager />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </PortalLayout>
  );
};

export default AdminTesting;
