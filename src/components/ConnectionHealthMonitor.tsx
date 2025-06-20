
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const ConnectionHealthMonitor = () => {
  const [isConnected, setIsConnected] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    let mounted = true;
    let healthCheckInterval: NodeJS.Timeout;

    const checkConnection = async () => {
      try {
        const { error } = await supabase.from('profiles').select('id').limit(1);
        
        if (mounted) {
          if (error && !isConnected) {
            console.log('Connection restored');
            setIsConnected(true);
            toast({
              title: "Connection Restored",
              description: "Supabase connection has been restored.",
            });
          } else if (!error && !isConnected) {
            setIsConnected(true);
          }
        }
      } catch (error) {
        if (mounted && isConnected) {
          console.error('Connection lost:', error);
          setIsConnected(false);
          toast({
            title: "Connection Issue",
            description: "Lost connection to Supabase. Attempting to reconnect...",
            variant: "destructive",
          });
        }
      }
    };

    // Initial check
    checkConnection();

    // Set up periodic health checks
    healthCheckInterval = setInterval(checkConnection, 30000); // Check every 30 seconds

    return () => {
      mounted = false;
      if (healthCheckInterval) {
        clearInterval(healthCheckInterval);
      }
    };
  }, [isConnected, toast]);

  return null; // This is a monitoring component, no UI needed
};
