
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, Database, Zap, Users } from "lucide-react";
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
      value: "Checking...",
      icon: <Database className="h-4 w-4" />
    },
    {
      name: "Authentication",
      status: 'healthy',
      value: "Checking...",
      icon: <Users className="h-4 w-4" />
    },
    {
      name: "Edge Functions",
      status: 'warning',
      value: "Checking...",
      icon: <Zap className="h-4 w-4" />
    }
  ]);

  useEffect(() => {
    const checkSystemHealth = async () => {
      const newMetrics: HealthMetric[] = [...metrics];
      
      try {
        // Test database connection
        const { data: dbTest, error: dbError } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        newMetrics[0] = {
          ...newMetrics[0],
          status: dbError ? 'error' : 'healthy',
          value: dbError ? 'Connection Failed' : 'Connected'
        };

        // Test authentication
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        newMetrics[1] = {
          ...newMetrics[1],
          status: authError ? 'error' : 'healthy',
          value: authError ? 'Auth Failed' : user ? 'Authenticated' : 'No User'
        };

        // Test edge function (with basic health check)
        try {
          const { data: funcData, error: funcError } = await supabase.functions.invoke('queue-job', {
            body: { test: true, jobType: 'health-check' }
          });
          
          newMetrics[2] = {
            ...newMetrics[2],
            status: funcError ? 'error' : 'healthy',
            value: funcError ? 'Function Error' : 'Available'
          };
        } catch (funcError) {
          newMetrics[2] = {
            ...newMetrics[2],
            status: 'error',
            value: 'Function Unavailable'
          };
        }

        setMetrics(newMetrics);
      } catch (error) {
        console.error('Health check failed:', error);
        // Update all metrics to error state
        setMetrics(prev => prev.map(metric => ({
          ...metric,
          status: 'error' as const,
          value: 'Check Failed'
        })));
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
