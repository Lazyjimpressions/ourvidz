import React, { useState } from 'react';
import { useWorkspaceAssets, useSaveToLibrary, useDiscardAsset } from '@/hooks/useWorkspaceAssets';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Save, Trash2, Sparkles, Download, Eye, X } from 'lucide-react';

/**
 * NEW ARCHITECTURE: Workspace using workspace_assets table
 * Provides simplified workspace experience with save/discard flow
 * 
 * Features:
 * - New workspace_assets table for temporary staging
 * - Clear save/discard actions
 * - Simplified 2-bucket storage architecture
 * - Real-time asset updates
 * - Collection organization
 */
export const SimplifiedWorkspace: React.FC = () => {
  const { data: workspaceAssets, isLoading, error } = useWorkspaceAssets();
  const saveToLibrary = useSaveToLibrary();
  const discardAsset = useDiscardAsset();

  // State for lightbox
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Asset action handlers
  const handleSaveAsset = async (assetId: string) => {
    try {
      await saveToLibrary.mutateAsync({ assetId });
      toast.success('Asset saved to library');
    } catch (error) {
      toast.error('Failed to save asset');
    }
  };

  const handleDiscardAsset = async (assetId: string) => {
    try {
      await discardAsset.mutateAsync(assetId);
      toast.success('Asset discarded');
    } catch (error) {
      toast.error('Failed to discard asset');
    }
  };

  const handleDownload = async (asset: any) => {
    try {
      if (!asset.url) {
        toast.error('Asset URL not available');
        return;
      }
      
      const link = document.createElement('a');
      link.href = asset.url;
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `${asset.prompt?.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.png`;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Download started');
    } catch (error) {
      toast.error('Failed to download asset');
    }
  };

  const handleExpand = (assetIndex: number) => {
    setLightboxIndex(assetIndex);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading workspace assets...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center text-destructive">
          <p>Failed to load workspace assets: {error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col min-h-screen">        
        <main className="flex-1 container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Workspace</h1>
            <p className="text-muted-foreground">
              Review your generated assets and save the ones you want to keep to your library.
            </p>
          </div>

          {/* TODO: Add new prompt input component for workspace_assets */}
          <div className="mb-8 p-4 border rounded-lg">
            <p className="text-muted-foreground">
              Prompt input will be added here for the new workspace architecture.
            </p>
          </div>
          
          {/* Assets grid */}
          {workspaceAssets && workspaceAssets.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {workspaceAssets.map((asset, index) => (
                <WorkspaceAssetCard
                  key={asset.id}
                  asset={asset}
                  index={index}
                  onSave={() => handleSaveAsset(asset.id)}
                  onDiscard={() => handleDiscardAsset(asset.id)}
                  onDownload={() => handleDownload(asset)}
                  onExpand={() => handleExpand(index)}
                  isSaving={saveToLibrary.isPending}
                  isDiscarding={discardAsset.isPending}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Sparkles className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No assets in workspace</h3>
              <p className="text-muted-foreground">
                Generated assets will appear here for you to review and save.
              </p>
            </div>
          )}
        </main>
      </div>
      
      {/* TODO: Add lightbox for new workspace assets */}
      {lightboxIndex !== null && workspaceAssets && workspaceAssets.length > 0 && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <button 
              onClick={() => setLightboxIndex(null)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="w-6 h-6" />
            </button>
            <img 
              src={workspaceAssets[lightboxIndex]?.url} 
              alt={workspaceAssets[lightboxIndex]?.prompt}
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}
    </>
  );
};

interface WorkspaceAssetCardProps {
  asset: any;
  index: number;
  onSave: () => void;
  onDiscard: () => void;
  onDownload: () => void;
  onExpand: () => void;
  isSaving: boolean;
  isDiscarding: boolean;
}

function WorkspaceAssetCard({ 
  asset, 
  index, 
  onSave, 
  onDiscard, 
  onDownload, 
  onExpand, 
  isSaving, 
  isDiscarding 
}: WorkspaceAssetCardProps) {
  return (
    <Card className="overflow-hidden group">
      <div className="aspect-square bg-muted relative cursor-pointer" onClick={onExpand}>
        {asset.url ? (
          <img
            src={asset.url}
            alt={asset.prompt}
            className="w-full h-full object-cover transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        )}
        
        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); onExpand(); }}>
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
        </div>
      </div>
      
      <CardContent className="p-4">
        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
          {asset.prompt}
        </p>
        
        <div className="flex gap-2">
          <Button
            onClick={onSave}
            disabled={isSaving || isDiscarding}
            className="flex-1"
            size="sm"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          
          <Button
            onClick={onDownload}
            disabled={isSaving || isDiscarding}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4" />
          </Button>
          
          <Button
            onClick={onDiscard}
            disabled={isSaving || isDiscarding}
            variant="destructive"
            size="sm"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Make it the default export to maintain compatibility
export default SimplifiedWorkspace;