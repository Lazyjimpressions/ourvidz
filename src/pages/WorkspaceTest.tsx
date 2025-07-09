import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import TestMediaGrid from '@/components/TestMediaGrid';
import TestVideoGrid from '@/components/TestVideoGrid';
import { Button } from '@/components/ui/button';
import Lightbox from '@/components/ui/Lightbox';
import { clearWorkspaceSessionData, clearSignedUrlCache, getSessionStorageStats } from '@/lib/utils';

interface WorkspaceAsset {
  id: string;
  url: string;
  jobId: string;
  prompt: string;
  type?: 'image' | 'video';
}

const WorkspaceTest = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const mode = searchParams.get('mode') || 'image';
  const [workspace, setWorkspace] = useState<WorkspaceAsset[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Load workspace from sessionStorage
  useEffect(() => {
    const sessionStart = sessionStorage.getItem('workspace-test-session');
    const sessionUserId = sessionStorage.getItem('workspace-test-user');
    const currentUserId = user?.id;
    
    // Check if this is a new session or different user
    if (!sessionStart || sessionUserId !== currentUserId) {
      // Clear old workspace data and start fresh
      sessionStorage.removeItem('workspace-test');
      sessionStorage.removeItem('workspace-test-session');
      sessionStorage.removeItem('workspace-test-user');
      
      // Set new session data
      if (currentUserId) {
        sessionStorage.setItem('workspace-test-session', Date.now().toString());
        sessionStorage.setItem('workspace-test-user', currentUserId);
        console.log('🆕 Started new workspace test session for user:', currentUserId);
      }
      
      setWorkspace([]);
      return;
    }
    
    // Load existing workspace from current session
    const stored = sessionStorage.getItem('workspace-test');
    if (stored) {
      try {
        setWorkspace(JSON.parse(stored));
        console.log('🔄 Loaded workspace from current session');
      } catch (error) {
        console.error('Error parsing workspace data:', error);
        sessionStorage.removeItem('workspace-test');
        setWorkspace([]);
      }
    }
  }, [user]);

  // Save workspace to sessionStorage with debouncing
  useEffect(() => {
    const timeout = setTimeout(() => {
      sessionStorage.setItem('workspace-test', JSON.stringify(workspace));
    }, 300);
    return () => clearTimeout(timeout);
  }, [workspace]);

  // Fetch jobs based on mode
  useEffect(() => {
    if (!user) return;
    
    const fetchJobs = async () => {
      setLoading(true);
      try {
        if (mode === 'image') {
          const { data, error } = await supabase
            .from('images')
            .select('id, image_urls, prompt, metadata, created_at, generation_mode, quality')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (!error && data) {
            setJobs(data);
          }
        } else {
          const { data, error } = await supabase
            .from('videos')
            .select('id, video_url, signed_url, metadata, created_at, resolution, thumbnail_url')
            .eq('user_id', user.id)
            .eq('status', 'completed')
            .order('created_at', { ascending: false })
            .limit(20);
            
          if (!error && data) {
            setJobs(data);
          }
        }
      } catch (error) {
        console.error('Error fetching jobs:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchJobs();
  }, [user, mode]);

  const handleImport = (signedUrl: string, jobId: string, prompt: string) => {
    const assetId = `${jobId}_${Date.now()}`;
    const newAsset: WorkspaceAsset = {
      id: assetId,
      url: signedUrl,
      jobId,
      prompt,
      type: mode as 'image' | 'video'
    };
    
    // Check if this exact URL is already in workspace
    const existingAsset = workspace.find(asset => asset.url === signedUrl);
    if (!existingAsset) {
      setWorkspace(prev => [newAsset, ...prev]);
      console.log(`Imported asset ${assetId} to workspace`);
    }
  };

  const handleRemoveFromWorkspace = (assetId: string) => {
    setWorkspace(prev => prev.filter(asset => asset.id !== assetId));
  };

  const clearWorkspace = () => {
    setWorkspace([]);
  };

  const switchMode = (newMode: 'image' | 'video') => {
    const params = new URLSearchParams(searchParams);
    params.set('mode', newMode);
    setSearchParams(params);
  };

  const handleClearSessionData = () => {
    clearWorkspaceSessionData();
    setWorkspace([]);
    window.location.reload(); // Reload to test fresh session
  };

  const handleClearUrlCache = () => {
    clearSignedUrlCache();
    window.location.reload(); // Reload to test fresh URL requests
  };

  const [storageStats, setStorageStats] = useState(getSessionStorageStats());

  // Update stats when workspace changes
  useEffect(() => {
    setStorageStats(getSessionStorageStats());
  }, [workspace]);

  if (!user) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <p className="text-muted-foreground">Please sign in to use the workspace test.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Workspace Test</h1>
        <div className="flex gap-2">
          <Button 
            variant={mode === 'image' ? 'default' : 'outline'}
            onClick={() => switchMode('image')}
          >
            Images
          </Button>
          <Button 
            variant={mode === 'video' ? 'default' : 'outline'}
            onClick={() => switchMode('video')}
          >
            Videos
          </Button>
        </div>
      </div>

      {/* Current Workspace */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Current Workspace ({workspace.length} assets)</h2>
          {workspace.length > 0 && (
            <Button variant="destructive" onClick={clearWorkspace}>
              Clear Workspace
            </Button>
          )}
        </div>
        
        {workspace.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {workspace.map((asset) => (
              <div key={asset.id} className="relative group">
                {asset.type === 'video' ? (
                  <video
                    src={asset.url}
                    className="w-full aspect-square object-cover rounded-lg border border-border"
                    muted
                    loop
                    onMouseEnter={(e) => e.currentTarget.play()}
                    onMouseLeave={(e) => e.currentTarget.pause()}
                  />
                ) : (
                  <img
                    src={asset.url}
                    alt={`Workspace ${asset.id}`}
                    onClick={() => setLightboxIndex(workspace.findIndex(a => a.id === asset.id))}
                    className="w-full aspect-square object-cover rounded-lg border border-border hover:scale-105 transition cursor-pointer"
                  />
                )}
                <button
                  onClick={() => handleRemoveFromWorkspace(asset.id)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition text-xs"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <p className="text-muted-foreground">Workspace is empty. Import some assets from your recent jobs below.</p>
          </div>
        )}
      </section>

      {/* Lightbox Viewer */}
      {lightboxIndex !== null && (
        <Lightbox
          items={workspace.filter(asset => asset.type !== 'video').map(asset => asset.url)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}

      {/* Job Results */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Your Recent {mode === 'image' ? 'Images' : 'Videos'}</h2>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        ) : mode === 'image' ? (
          <TestMediaGrid 
            jobs={jobs} 
            onImport={handleImport}
            mode={mode as 'image' | 'video'}
          />
        ) : (
          <TestVideoGrid 
            jobs={jobs} 
            onImport={handleImport}
            mode={mode as 'image' | 'video'}
          />
        )}
      </section>

      {/* Debug Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Debug Storage</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h3 className="text-lg font-bold">Session Storage</h3>
            <p>Session Start: {new Date(parseInt(sessionStorage.getItem('workspace-test-session') || '0', 10)).toLocaleDateString()}</p>
            <p>Current User ID: {sessionStorage.getItem('workspace-test-user')}</p>
            <p>Workspace Count: {workspace.length}</p>
            <Button variant="outline" onClick={handleClearSessionData}>
              Clear Session Data
            </Button>
          </div>
          <div>
            <h3 className="text-lg font-bold">Signed URL Cache</h3>
            <p>Cache Size: {storageStats.signedUrlCacheSize} bytes</p>
            <Button variant="outline" onClick={handleClearUrlCache}>
              Clear Signed URL Cache
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default WorkspaceTest;