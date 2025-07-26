import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { 
  Settings, 
  Save, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle,
  Shield,
  Zap,
  Database,
  Users,
  Globe,
  TestTube
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface SystemConfig {
  // Generation Settings
  maxConcurrentJobs: number;
  maxJobsPerUser: number;
  maxJobsPerHour: number;
  jobTimeoutMinutes: number;
  
  // Model Settings
  defaultImageModel: string;
  defaultVideoModel: string;
  enableNSFWDetection: boolean;
  nsfwThreshold: number;
  
  // Worker Configuration
  workerUrl: string;
  workerUrlUpdatedAt: string;
  
  // Storage Settings
  maxFileSizeMB: number;
  maxStoragePerUserGB: number;
  enableCompression: boolean;
  
  // User Settings
  requireEmailVerification: boolean;
  allowGuestAccess: boolean;
  maxGuestJobs: number;
  
  // System Settings
  maintenanceMode: boolean;
  debugMode: boolean;
  enableAnalytics: boolean;
  
  // Rate Limiting
  rateLimitRequestsPerMinute: number;
  rateLimitBurstSize: number;
  
  // Notifications
  emailNotifications: boolean;
  slackWebhookUrl: string;
  discordWebhookUrl: string;
}

export const SystemConfigTab = () => {
  const [config, setConfig] = useState<SystemConfig>({
    maxConcurrentJobs: 10,
    maxJobsPerUser: 100,
    maxJobsPerHour: 20,
    jobTimeoutMinutes: 30,
    defaultImageModel: 'sdxl_lustify',
    defaultVideoModel: 'wan',
    enableNSFWDetection: true,
    nsfwThreshold: 0.7,
    workerUrl: '',
    workerUrlUpdatedAt: '',
    maxFileSizeMB: 50,
    maxStoragePerUserGB: 10,
    enableCompression: true,
    requireEmailVerification: true,
    allowGuestAccess: false,
    maxGuestJobs: 5,
    maintenanceMode: false,
    debugMode: false,
    enableAnalytics: true,
    rateLimitRequestsPerMinute: 60,
    rateLimitBurstSize: 10,
    emailNotifications: true,
    slackWebhookUrl: '',
    discordWebhookUrl: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [originalConfig, setOriginalConfig] = useState<SystemConfig | null>(null);
  const [workerStatus, setWorkerStatus] = useState<{
    isHealthy: boolean;
    lastChecked: string;
    error?: string;
  } | null>(null);
  const [testingWorker, setTestingWorker] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  useEffect(() => {
    if (originalConfig) {
      setHasChanges(JSON.stringify(config) !== JSON.stringify(originalConfig));
    }
  }, [config, originalConfig]);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      // Load config from database or use defaults
      const { data, error } = await supabase
        .from('system_config')
        .select('*')
        .single();

      if (data && !error) {
        const loadedConfig = { ...config, ...(data.config as any) };
        setConfig(loadedConfig);
        setOriginalConfig(loadedConfig);
      } else {
        setOriginalConfig(config);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      setOriginalConfig(config);
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('system_config')
        .upsert({
          config: config as any,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setOriginalConfig(config);
      setHasChanges(false);
      
      toast({
        title: "Success",
        description: "System configuration saved successfully"
      });
    } catch (error) {
      console.error('Error saving config:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetConfig = () => {
    if (originalConfig) {
      setConfig(originalConfig);
      setHasChanges(false);
    }
  };

  const updateConfig = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const testWorkerConnection = async () => {
    if (!config.workerUrl) {
      toast({
        title: "Error",
        description: "Please enter a worker URL first",
        variant: "destructive"
      });
      return;
    }

    setTestingWorker(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-active-worker-url');
      
      if (error) throw error;

      setWorkerStatus({
        isHealthy: data.isHealthy,
        lastChecked: new Date().toISOString(),
        error: data.healthError
      });

      toast({
        title: data.isHealthy ? "Success" : "Warning",
        description: data.isHealthy 
          ? "Worker is responding correctly" 
          : `Worker is not responding: ${data.healthError}`,
        variant: data.isHealthy ? "default" : "destructive"
      });
    } catch (error) {
      console.error('Error testing worker:', error);
      setWorkerStatus({
        isHealthy: false,
        lastChecked: new Date().toISOString(),
        error: error.message
      });
      toast({
        title: "Error",
        description: "Failed to test worker connection",
        variant: "destructive"
      });
    } finally {
      setTestingWorker(false);
    }
  };

  const updateWorkerUrl = async () => {
    if (!config.workerUrl) {
      toast({
        title: "Error",
        description: "Please enter a worker URL",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('update-worker-url', {
        body: { workerUrl: config.workerUrl }
      });
      
      if (error) throw error;

      // Update the config with the new timestamp
      setConfig(prev => ({ 
        ...prev, 
        workerUrlUpdatedAt: data.updatedAt 
      }));

      // Test the connection after updating
      await testWorkerConnection();

      toast({
        title: "Success",
        description: "Worker URL updated successfully",
      });
    } catch (error) {
      console.error('Error updating worker URL:', error);
      toast({
        title: "Error",
        description: "Failed to update worker URL",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">System Configuration</h2>
          <p className="text-gray-600">Manage application settings and system parameters</p>
        </div>
        <div className="flex gap-2">
          {hasChanges && (
            <Button variant="outline" onClick={resetConfig}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button onClick={saveConfig} disabled={isLoading || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Generation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Generation Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxConcurrentJobs">Max Concurrent Jobs</Label>
              <Input
                id="maxConcurrentJobs"
                type="number"
                value={config.maxConcurrentJobs}
                onChange={(e) => updateConfig('maxConcurrentJobs', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="maxJobsPerUser">Max Jobs Per User</Label>
              <Input
                id="maxJobsPerUser"
                type="number"
                value={config.maxJobsPerUser}
                onChange={(e) => updateConfig('maxJobsPerUser', parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <Label htmlFor="maxJobsPerHour">Max Jobs Per Hour</Label>
              <Input
                id="maxJobsPerHour"
                type="number"
                value={config.maxJobsPerHour}
                onChange={(e) => updateConfig('maxJobsPerHour', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
            <div>
              <Label htmlFor="jobTimeoutMinutes">Job Timeout (minutes)</Label>
              <Input
                id="jobTimeoutMinutes"
                type="number"
                value={config.jobTimeoutMinutes}
                onChange={(e) => updateConfig('jobTimeoutMinutes', parseInt(e.target.value))}
                min="5"
                max="120"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Model Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Model Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="defaultImageModel">Default Image Model</Label>
              <Select
                value={config.defaultImageModel}
                onValueChange={(value) => updateConfig('defaultImageModel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sdxl_lustify">SDXL LUSTIFY</SelectItem>
                  <SelectItem value="sdxl_base">SDXL Base</SelectItem>
                  <SelectItem value="sdxl_turbo">SDXL Turbo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="defaultVideoModel">Default Video Model</Label>
              <Select
                value={config.defaultVideoModel}
                onValueChange={(value) => updateConfig('defaultVideoModel', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wan">WAN</SelectItem>
                  <SelectItem value="svd">Stable Video Diffusion</SelectItem>
                  <SelectItem value="svd_xt">SVD XT</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableNSFWDetection">Enable NSFW Detection</Label>
              <p className="text-sm text-gray-500">Automatically detect and flag inappropriate content</p>
            </div>
            <Switch
              id="enableNSFWDetection"
              checked={config.enableNSFWDetection}
              onCheckedChange={(checked) => updateConfig('enableNSFWDetection', checked)}
            />
          </div>
          
          {config.enableNSFWDetection && (
            <div>
              <Label htmlFor="nsfwThreshold">NSFW Detection Threshold</Label>
              <Input
                id="nsfwThreshold"
                type="number"
                step="0.1"
                min="0"
                max="1"
                value={config.nsfwThreshold}
                onChange={(e) => updateConfig('nsfwThreshold', parseFloat(e.target.value))}
              />
              <p className="text-sm text-gray-500 mt-1">
                Content with NSFW score above this threshold will be flagged (0.0 - 1.0)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Worker Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Worker Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="workerUrl">Worker URL</Label>
            <div className="flex gap-2">
              <Input
                id="workerUrl"
                type="url"
                placeholder="https://your-runpod-worker-url.com"
                value={config.workerUrl}
                onChange={(e) => updateConfig('workerUrl', e.target.value)}
                className="flex-1"
              />
              <Button 
                variant="outline" 
                onClick={updateWorkerUrl}
                disabled={isLoading || !config.workerUrl}
              >
                Update URL
              </Button>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              URL of the RunPod worker for prompt enhancement
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm font-medium">Worker Status</span>
              {workerStatus && (
                <p className="text-xs text-gray-500">
                  Last checked: {new Date(workerStatus.lastChecked).toLocaleString()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {workerStatus && (
                <Badge variant={workerStatus.isHealthy ? "default" : "destructive"}>
                  {workerStatus.isHealthy ? "Online" : "Offline"}
                </Badge>
              )}
              <Button 
                variant="outline" 
                size="sm"
                onClick={testWorkerConnection}
                disabled={testingWorker || !config.workerUrl}
              >
                <TestTube className="h-4 w-4 mr-2" />
                {testingWorker ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          </div>

          {workerStatus?.error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3">
              <p className="text-sm text-red-700">
                <strong>Error:</strong> {workerStatus.error}
              </p>
            </div>
          )}

          {config.workerUrlUpdatedAt && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-700">
                Worker URL last updated: {new Date(config.workerUrlUpdatedAt).toLocaleString()}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Storage Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Storage Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="maxFileSizeMB">Max File Size (MB)</Label>
              <Input
                id="maxFileSizeMB"
                type="number"
                value={config.maxFileSizeMB}
                onChange={(e) => updateConfig('maxFileSizeMB', parseInt(e.target.value))}
                min="1"
                max="500"
              />
            </div>
            <div>
              <Label htmlFor="maxStoragePerUserGB">Max Storage Per User (GB)</Label>
              <Input
                id="maxStoragePerUserGB"
                type="number"
                value={config.maxStoragePerUserGB}
                onChange={(e) => updateConfig('maxStoragePerUserGB', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableCompression">Enable Image Compression</Label>
              <p className="text-sm text-gray-500">Automatically compress images to save storage</p>
            </div>
            <Switch
              id="enableCompression"
              checked={config.enableCompression}
              onCheckedChange={(checked) => updateConfig('enableCompression', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* User Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="requireEmailVerification">Require Email Verification</Label>
              <p className="text-sm text-gray-500">Users must verify their email before accessing the platform</p>
            </div>
            <Switch
              id="requireEmailVerification"
              checked={config.requireEmailVerification}
              onCheckedChange={(checked) => updateConfig('requireEmailVerification', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="allowGuestAccess">Allow Guest Access</Label>
              <p className="text-sm text-gray-500">Allow users to generate content without creating an account</p>
            </div>
            <Switch
              id="allowGuestAccess"
              checked={config.allowGuestAccess}
              onCheckedChange={(checked) => updateConfig('allowGuestAccess', checked)}
            />
          </div>
          
          {config.allowGuestAccess && (
            <div>
              <Label htmlFor="maxGuestJobs">Max Guest Jobs</Label>
              <Input
                id="maxGuestJobs"
                type="number"
                value={config.maxGuestJobs}
                onChange={(e) => updateConfig('maxGuestJobs', parseInt(e.target.value))}
                min="1"
                max="50"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            System Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="maintenanceMode">Maintenance Mode</Label>
              <p className="text-sm text-gray-500">Temporarily disable the platform for maintenance</p>
            </div>
            <Switch
              id="maintenanceMode"
              checked={config.maintenanceMode}
              onCheckedChange={(checked) => updateConfig('maintenanceMode', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="debugMode">Debug Mode</Label>
              <p className="text-sm text-gray-500">Enable detailed logging and error reporting</p>
            </div>
            <Switch
              id="debugMode"
              checked={config.debugMode}
              onCheckedChange={(checked) => updateConfig('debugMode', checked)}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="enableAnalytics">Enable Analytics</Label>
              <p className="text-sm text-gray-500">Collect usage analytics and performance metrics</p>
            </div>
            <Switch
              id="enableAnalytics"
              checked={config.enableAnalytics}
              onCheckedChange={(checked) => updateConfig('enableAnalytics', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Rate Limiting */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Rate Limiting
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="rateLimitRequestsPerMinute">Requests Per Minute</Label>
              <Input
                id="rateLimitRequestsPerMinute"
                type="number"
                value={config.rateLimitRequestsPerMinute}
                onChange={(e) => updateConfig('rateLimitRequestsPerMinute', parseInt(e.target.value))}
                min="1"
                max="1000"
              />
            </div>
            <div>
              <Label htmlFor="rateLimitBurstSize">Burst Size</Label>
              <Input
                id="rateLimitBurstSize"
                type="number"
                value={config.rateLimitBurstSize}
                onChange={(e) => updateConfig('rateLimitBurstSize', parseInt(e.target.value))}
                min="1"
                max="100"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label htmlFor="emailNotifications">Email Notifications</Label>
              <p className="text-sm text-gray-500">Send email notifications for system events</p>
            </div>
            <Switch
              id="emailNotifications"
              checked={config.emailNotifications}
              onCheckedChange={(checked) => updateConfig('emailNotifications', checked)}
            />
          </div>
          
          <div>
            <Label htmlFor="slackWebhookUrl">Slack Webhook URL</Label>
            <Input
              id="slackWebhookUrl"
              type="url"
              placeholder="https://hooks.slack.com/services/..."
              value={config.slackWebhookUrl}
              onChange={(e) => updateConfig('slackWebhookUrl', e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="discordWebhookUrl">Discord Webhook URL</Label>
            <Input
              id="discordWebhookUrl"
              type="url"
              placeholder="https://discord.com/api/webhooks/..."
              value={config.discordWebhookUrl}
              onChange={(e) => updateConfig('discordWebhookUrl', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Status Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm font-medium">Configuration</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {hasChanges ? 'Unsaved changes' : 'All changes saved'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {config.maintenanceMode ? (
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">System Status</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {config.maintenanceMode ? 'Maintenance mode active' : 'System operational'}
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              {config.debugMode ? (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-500" />
              )}
              <span className="text-sm font-medium">Debug Mode</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {config.debugMode ? 'Debug logging enabled' : 'Production mode'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}; 