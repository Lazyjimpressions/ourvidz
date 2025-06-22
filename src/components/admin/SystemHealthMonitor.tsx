
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, Database, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'error';
  value: string;
  icon: React.ReactNode;
}

export const SystemHealthMonitor = () => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([
    {
      name: "Database",
      status: 'healthy',
      value: "Connected",
      icon: <Database className="h-4 w-4" />
    },
    {
      name: "Edge Functions",
      status: 'healthy',
      value: "Available",
      icon: <Zap className="h-4 w-4" />
    },
    {
      name: "Queue Status",
      status: 'warning',
      value: "No Workers",
      icon: <Clock className="h-4 w-4" />
    }
  ]);

  useEffect(() => {
    const checkSystemHealth = async () => {
      try {
        // Test database connection
        const { error: dbError } = await supabase.from('profiles').select('id').limit(1);
        
        // Test edge function
        const { error: funcError } = await supabase.functions.invoke('queue-job', {
          body: { test: true }
        });

        setMetrics(prev => prev.map(metric => {
          if (metric.name === "Database") {
            return {
              ...metric,
              status: dbError ? 'error' : 'healthy',
              value: dbError ? 'Connection Failed' : 'Connected'
            };
          }
          if (metric.name === "Edge Functions") {
            return {
              ...metric,
              status: funcError ? 'error' : 'healthy',
              value: funcError ? 'Unavailable' : 'Available'
            };
          }
          return metric;
        }));
      } catch (error) {
        console.error('Health check failed:', error);
      }
    };

    checkSystemHealth();
    const interval = setInterval(checkSystemHealth, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: HealthMetric['status']) => {
    switch (status) {
      case 'healthy':
        return 'text-green-500';
      case 'warning':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: HealthMetric['status']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-3 w-3" />;
      case 'warning':
      case 'error':
        return <AlertCircle className="h-3 w-3" />;
      default:
        return <Clock className="h-3 w-3" />;
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.name} className="relative">
          <CardContent className="pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={getStatusColor(metric.status)}>
                  {metric.icon}
                </span>
                <span className="text-sm font-medium">{metric.name}</span>
              </div>
              <Badge
                variant={metric.status === 'healthy' ? 'default' : 'destructive'}
                className="text-xs"
              >
                {getStatusIcon(metric.status)}
                {metric.status}
              </Badge>
            </div>
            <div className="mt-2 text-sm text-gray-600">
              {metric.value}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
