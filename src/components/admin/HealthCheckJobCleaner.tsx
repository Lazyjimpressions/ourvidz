
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Trash2, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const HealthCheckJobCleaner = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [healthCheckCount, setHealthCheckCount] = useState<number>(0);

  const checkHealthCheckJobs = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('id')
        .eq('metadata->>healthCheck', 'true');

      if (error) throw error;
      setHealthCheckCount(data?.length || 0);
    } catch (error) {
      console.error('Error checking health check jobs:', error);
      toast({
        title: "Error",
        description: "Failed to check health check jobs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const deleteHealthCheckJobs = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('metadata->>healthCheck', 'true');

      if (error) throw error;

      toast({
        title: "Success",
        description: `Deleted ${healthCheckCount} health check jobs`,
      });
      
      setHealthCheckCount(0);
    } catch (error) {
      console.error('Error deleting health check jobs:', error);
      toast({
        title: "Error",
        description: "Failed to delete health check jobs",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-orange-700">
          <AlertTriangle className="h-5 w-5" />
          Health Check Job Cleanup
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-orange-600">
          Health check jobs were automatically created by the system monitoring and are no longer needed. 
          These jobs keep the spot server active unnecessarily, increasing costs.
        </p>
        
        <div className="flex items-center gap-4">
          <Button 
            onClick={checkHealthCheckJobs} 
            variant="outline" 
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Check Count
          </Button>
          
          {healthCheckCount > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={isLoading}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete {healthCheckCount} Health Check Jobs
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Health Check Jobs</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete {healthCheckCount} health check jobs that were automatically created by system monitoring. 
                    This action will help reduce unnecessary spot server usage and costs.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={deleteHealthCheckJobs}>
                    Delete {healthCheckCount} Jobs
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {healthCheckCount === 0 && (
            <span className="text-sm text-green-600 font-medium">
              ✅ No health check jobs found
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
