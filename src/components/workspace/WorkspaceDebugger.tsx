import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import useSignedImageUrls from '@/hooks/useSignedImageUrls';
import { Button } from '@/components/ui/button';

export const WorkspaceDebugger: React.FC = () => {
  const [testPath, setTestPath] = useState('');
  const [testResult, setTestResult] = useState<string | null>(null);
  const { getSignedUrl } = useSignedImageUrls();

  const testSignedUrl = async () => {
    if (!testPath) return;
    
    console.log('🧪 Testing signed URL generation for:', testPath);
    const result = await getSignedUrl(testPath, 'sdxl_image_high');
    setTestResult(result || 'Failed to generate URL');
  };

  // Auto-test with a recent workspace item path
  useEffect(() => {
    const fetchRecentPath = async () => {
      const { data: user } = await supabase.auth.getUser();
      if (user?.user) {
        const { data: items } = await supabase
          .from('workspace_items')
          .select('storage_path, url')
          .eq('user_id', user.user.id)
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (items?.[0]?.storage_path) {
          setTestPath(items[0].storage_path);
          console.log('🎯 Auto-detected test path:', items[0].storage_path);
        }
      }
    };
    
    fetchRecentPath();
  }, []);

  return (
    <div className="p-4 bg-muted/50 rounded-lg space-y-4">
      <h3 className="text-sm font-medium">Workspace URL Debug Tool</h3>
      
      <div className="space-y-2">
        <input
          type="text"
          value={testPath}
          onChange={(e) => setTestPath(e.target.value)}
          placeholder="Enter storage path to test..."
          className="w-full p-2 border rounded"
        />
        
        <Button onClick={testSignedUrl} size="sm">
          Test Signed URL Generation
        </Button>
      </div>
      
      {testResult && (
        <div className="space-y-2">
          <p className="text-xs font-medium">Result:</p>
          <pre className="text-xs bg-background p-2 rounded overflow-auto max-h-32">
            {testResult}
          </pre>
        </div>
      )}
    </div>
  );
};