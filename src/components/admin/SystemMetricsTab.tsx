import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { 
  Activity, 
  Server, 
  Clock, 
  Zap, 
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Timer
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface WorkerHealth {
  type: string;
  url: string;
  lastChecked: string;
  responseTime?: number;
  status: 'healthy' | 'unhealthy' | 'unknown';
}

interface SystemMetrics {
  timestamp: string;
  workers: {
    chat: WorkerHealth[];
    sdxl: WorkerHealth[];
    wan: WorkerHealth[];
  };
  queues: {
    sdxl_queue: number;
    wan_queue: number;
  };
  etaEstimates: {
    sdxl: string;
    wan: string;
  };
}

export function SystemMetricsTab() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isAutoRefresh, setIsAutoRefresh] = useState(true);
  const { toast } = useToast();

  const fetchMetrics = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('system-metrics', {
        headers: {
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        }
      });

      if (error) throw error;

      setMetrics(data);
      setLastUpdated(new Date());
      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch system metrics:', error);
      toast({
        title: "Error",
        description: "Failed to fetch system metrics",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    if (!isAutoRefresh) return;

    const interval = setInterval(fetchMetrics, 10000); // 10 seconds
    return () => clearInterval(interval);
  }, [isAutoRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-success';
      case 'unhealthy':
        return 'bg-destructive';
      default:
        return 'bg-muted';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle2 className="h-4 w-4" />;
      case 'unhealthy':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatResponseTime = (responseTime?: number) => {
    if (!responseTime) return 'N/A';
    return `${responseTime}ms`;
  };

  const formatLastChecked = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return date.toLocaleTimeString();
  };

  const getQueueProgress = (queueDepth: number) => {
    // Visual progress bar for queue depth (max 50 for visualization)
    return Math.min((queueDepth / 50) * 100, 100);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2">
          <RefreshCw className="h-4 w-4 animate-spin" />
          <span>Loading system metrics...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">System Metrics</h3>
          <p className="text-sm text-muted-foreground">
            Live worker health and queue status
            {lastUpdated && (
              <span className="ml-2">• Last updated {lastUpdated.toLocaleTimeString()}</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsAutoRefresh(!isAutoRefresh)}
          >
            <Activity className={`h-4 w-4 mr-2 ${isAutoRefresh ? 'animate-pulse' : ''}`} />
            Auto-refresh {isAutoRefresh ? 'ON' : 'OFF'}
          </Button>
          <Button variant="outline" size="sm" onClick={fetchMetrics}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          {/* Worker Health Status */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(metrics.workers).map(([workerType, workers]) => (
              <Card key={workerType}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Server className="h-4 w-4" />
                    {workerType.toUpperCase()} Worker
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {workers.length > 0 ? (
                    workers.map((worker, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Badge 
                            variant="secondary" 
                            className={`${getStatusColor(worker.status)} text-primary-foreground`}
                          >
                            {getStatusIcon(worker.status)}
                            <span className="ml-1">{worker.status}</span>
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatResponseTime(worker.responseTime)}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatLastChecked(worker.lastChecked)}
                          </div>
                          {worker.url && (
                            <div className="truncate mt-1 font-mono">
                              {worker.url.replace(/^https?:\/\//, '')}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No workers configured</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          <Separator />

          {/* Queue Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  SDXL Queue
                </CardTitle>
                <CardDescription>Image generation queue depth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.queues.sdxl_queue}</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    ETA: {metrics.etaEstimates.sdxl}
                  </Badge>
                </div>
                <Progress 
                  value={getQueueProgress(metrics.queues.sdxl_queue)} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {metrics.queues.sdxl_queue === 0 ? 'Queue is empty' : `${metrics.queues.sdxl_queue} jobs pending`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  WAN Queue
                </CardTitle>
                <CardDescription>Video generation queue depth</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{metrics.queues.wan_queue}</span>
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    ETA: {metrics.etaEstimates.wan}
                  </Badge>
                </div>
                <Progress 
                  value={getQueueProgress(metrics.queues.wan_queue)} 
                  className="h-2"
                />
                <p className="text-xs text-muted-foreground">
                  {metrics.queues.wan_queue === 0 ? 'Queue is empty' : `${metrics.queues.wan_queue} jobs pending`}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* System Info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">System Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Timestamp</div>
                  <div className="font-medium">{new Date(metrics.timestamp).toLocaleTimeString()}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Workers</div>
                  <div className="font-medium">
                    {Object.values(metrics.workers).reduce((sum, workers) => sum + workers.length, 0)}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Healthy Workers</div>
                  <div className="font-medium text-success">
                    {Object.values(metrics.workers).reduce(
                      (sum, workers) => sum + workers.filter(w => w.status === 'healthy').length, 
                      0
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Total Queue Depth</div>
                  <div className="font-medium">
                    {metrics.queues.sdxl_queue + metrics.queues.wan_queue}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}