
import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, AlertCircle, Clock, Database, Users, AlertTriangle } from "lucide-react";
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
    <div className="space-y-4">
      {/* Spot Server Warning */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-orange-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm font-medium">Spot Server Notice</span>
          </div>
          <p className="text-sm text-orange-600 mt-1">
            Edge function testing has been disabled to prevent unnecessary job creation that keeps the spot server active. 
            Use the testing tabs below for intentional job creation only.
          </p>
        </CardContent>
      </Card>

      {/* Health Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
    </div>
  );
};
