import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Sparkles, Wand2, Loader2, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCharacterStudioV2 } from '@/hooks/useCharacterStudioV2';
import { IdentityTab } from '@/components/character-studio/IdentityTab';
import { AppearanceTab } from '@/components/character-studio/AppearanceTab';
import { StyleTab } from '@/components/character-studio/StyleTab';
import { MediaTab } from '@/components/character-studio/MediaTab';
import { CharacterStudioPromptBarV2 } from '@/components/character-studio/CharacterStudioPromptBarV2';
import { CharacterHistoryStrip } from '@/components/character-studio/CharacterHistoryStrip';
import { supabase } from '@/integrations/supabase/client';

// Helper to sign storage URLs for preview display
async function getSignedPreviewUrl(url: string): Promise<string> {
    if (!url) return '';
    // Already a full URL (http/https or data URI)
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
        return url;
    }
    // Parse bucket and path from storage path
    const knownBuckets = ['workspace-temp', 'user-library', 'characters', 'reference_images'];
    const parts = url.split('/');
    let bucket = 'characters';
    let path = url;

    if (knownBuckets.includes(parts[0])) {
        bucket = parts[0];
        path = parts.slice(1).join('/');
    }

    try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 3600);
        if (error) {
            console.error('Failed to sign preview URL:', error);
            return url;
        }
        return data.signedUrl;
    } catch (err) {
        console.error('Error signing preview URL:', err);
        return url;
    }
}

export default function CharacterStudioV2() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const mode = (searchParams.get('mode') as 'edit' | 'create') || (id ? 'edit' : 'create');

  const {
    formData,
    isLoading,
    isSaving,
    activeTab,
    setActiveTab,
    updateField,
    handleSave,
    uploadAnchor,
    deleteAnchor,
    setPrimaryAnchor,
    // Generation props
    prompt,
    setPrompt,
    generatePreview,
    isGenerating,
    consistencyControls,
    setConsistencyControls,
    mediaType,
    setMediaType,
    // History
    history,
    isLoadingHistory,
    pinAsAnchor,
    useAsMain,
    deleteFromHistory
  } = useCharacterStudioV2(id, mode);

  // Signed preview URL state
  const [signedPreviewUrl, setSignedPreviewUrl] = useState<string>('');
  // Signed anchor URL state for avatar display
  const [signedAvatarUrl, setSignedAvatarUrl] = useState<string>('');
  // Preview mode state
  const [previewMode, setPreviewMode] = useState<'single' | 'grid' | 'compare'>('single');
  // Signed history URLs for Grid/Compare modes
  const [signedHistoryUrls, setSignedHistoryUrls] = useState<Record<string, string>>({});
  // Signed primary anchor URL for Compare mode
  const [signedPrimaryAnchorUrl, setSignedPrimaryAnchorUrl] = useState<string>('');

  // Sign the preview URL when formData.image_url changes
  useEffect(() => {
    const signUrl = async () => {
      if (formData.image_url) {
        const signed = await getSignedPreviewUrl(formData.image_url);
        setSignedPreviewUrl(signed);
      } else {
        setSignedPreviewUrl('');
      }
    };
    signUrl();
  }, [formData.image_url]);

  // Sign the avatar URL from primary anchor
  const primaryAnchor = formData.character_anchors?.find(a => a.is_primary);
  useEffect(() => {
    const signUrl = async () => {
      const avatarSource = primaryAnchor?.image_url || formData.image_url;
      if (avatarSource) {
        const signed = await getSignedPreviewUrl(avatarSource);
        setSignedAvatarUrl(signed);
      } else {
        setSignedAvatarUrl('');
      }
    };
    signUrl();
  }, [primaryAnchor?.image_url, formData.image_url]);

  // Sign the primary anchor URL for Compare mode
  useEffect(() => {
    const signUrl = async () => {
      if (primaryAnchor?.image_url) {
        const signed = await getSignedPreviewUrl(primaryAnchor.image_url);
        setSignedPrimaryAnchorUrl(signed);
      } else {
        setSignedPrimaryAnchorUrl('');
      }
    };
    signUrl();
  }, [primaryAnchor?.image_url]);

  // Sign history URLs for Grid mode
  useEffect(() => {
    const signUrls = async () => {
      if (!history || history.length === 0) {
        setSignedHistoryUrls({});
        return;
      }
      const urlMap: Record<string, string> = {};
      const toSign = history.slice(0, 4); // Only sign first 4 for grid
      await Promise.all(
        toSign.map(async (scene) => {
          if (scene.image_url) {
            urlMap[scene.id] = await getSignedPreviewUrl(scene.image_url);
          }
        })
      );
      setSignedHistoryUrls(urlMap);
    };
    signUrls();
  }, [history]);

  // If loading existing character
  if (id && isLoading) {
    return (
      <OurVidzDashboardLayout>
        <div className="h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </OurVidzDashboardLayout>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col overflow-hidden">
      {/* Header Toolbar */}
      <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            onClick={() => navigate('/character-hub-v2')}
            title="Back to Hub"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="w-px h-4 bg-border/50 mx-1" />
          <div>
            <h1 className="text-sm font-semibold leading-none flex items-center gap-2">
              {mode === 'edit' ? formData.name || 'Edit Character' : 'New Character'}
              {isSaving && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </h1>
            <p className="text-[10px] text-muted-foreground mt-0.5">
              {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Mode
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/character-hub-v2')}
            className="text-xs h-8"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-xs h-8 gap-1.5"
            onClick={handleSave}
            disabled={isSaving}
          >
            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

        {/* Left Column: Configuration Controls (Scrollable) */}
        <div className="w-full lg:w-[400px] border-b lg:border-r border-border/50 flex flex-col bg-card/30 lg:h-full">
          {/* Character Avatar Header */}
          <div className="px-4 py-3 border-b border-border/50 flex items-center gap-3">
            <div className="relative">
              {signedAvatarUrl ? (
                <img
                  src={signedAvatarUrl}
                  alt={formData.name || 'Character'}
                  className="w-10 h-10 rounded-full object-cover border border-border/50"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-muted/50 flex items-center justify-center border border-border/50">
                  <User className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xs font-semibold truncate">
                {formData.name || (mode === 'create' ? 'New Character' : 'Unnamed')}
              </h2>
              <p className="text-[10px] text-muted-foreground">
                {mode === 'edit' ? 'Saved • Editing' : 'Unsaved • Creating'}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-4 py-2 border-b border-border/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-7 bg-muted/50 p-0.5">
                <TabsTrigger value="identity" className="text-[10px] h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Identity</TabsTrigger>
                <TabsTrigger value="appearance" className="text-[10px] h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Visuals</TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Style</TabsTrigger>
                <TabsTrigger value="media" className="text-[10px] h-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Media</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-6">
            {activeTab === 'identity' && <IdentityTab formData={formData} updateField={updateField} />}
            {activeTab === 'appearance' && (
              <AppearanceTab
                formData={formData}
                updateField={updateField}
                anchors={formData.character_anchors || []}
                onUploadAnchor={uploadAnchor}
                onDeleteAnchor={deleteAnchor}
                onSetPrimaryAnchor={setPrimaryAnchor}
              />
            )}
            {activeTab === 'style' && <StyleTab formData={formData} updateField={updateField} />}
            {activeTab === 'media' && <MediaTab formData={formData} updateField={updateField} />}
          </div>
        </div>

        {/* Middle Column: Preview Canvas (Fixed) */}
        <div className="w-full lg:flex-1 bg-black/50 relative flex flex-col items-center p-4 lg:p-6 h-[50vh] lg:h-full border-b lg:border-b-0 border-border/50">
          {/* View Mode Tabs */}
          <div className="flex gap-1 mb-3 flex-wrap justify-center">
            {(['Single', 'Grid', 'Compare', 'Image', 'Video', 'Avatar'] as const).map((mode) => (
              <button
                key={mode}
                className={cn(
                  "px-2 py-1 text-[10px] rounded transition-colors",
                  previewMode === mode.toLowerCase()
                    ? "bg-primary text-white"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                )}
                onClick={() => {
                  if (['single', 'grid', 'compare'].includes(mode.toLowerCase())) {
                    setPreviewMode(mode.toLowerCase() as 'single' | 'grid' | 'compare');
                  }
                }}
                title={!['Single', 'Grid', 'Compare'].includes(mode) ? 'Coming soon' : undefined}
              >
                {mode}
              </button>
            ))}
          </div>

          {/* Canvas Area */}
          <div className="relative aspect-[3/4] flex-1 max-h-[800px] w-full max-w-[600px] bg-gray-900/50 rounded-lg border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden group">
            {/* Grid Mode - 2x2 of recent history */}
            {previewMode === 'grid' ? (
              history && history.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 w-full h-full p-2">
                  {history.slice(0, 4).map((scene) => (
                    <div key={scene.id} className="relative aspect-square rounded-lg overflow-hidden bg-black/30 border border-white/5">
                      {signedHistoryUrls[scene.id] ? (
                        <img
                          src={signedHistoryUrls[scene.id]}
                          alt={scene.prompt || 'Generated'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground/50" />
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Fill empty slots if less than 4 */}
                  {Array.from({ length: Math.max(0, 4 - (history?.length || 0)) }).map((_, i) => (
                    <div key={`empty-${i}`} className="relative aspect-square rounded-lg bg-black/20 border border-white/5 flex items-center justify-center">
                      <Sparkles className="w-6 h-6 text-muted-foreground/20" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">No History Yet</h3>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                      Generate some images to see them in grid view.
                    </p>
                  </div>
                </div>
              )
            ) : previewMode === 'compare' ? (
              /* Compare Mode - Anchor vs Latest side by side */
              <div className="flex gap-2 w-full h-full p-2">
                {/* Anchor Side */}
                <div className="flex-1 relative rounded-lg overflow-hidden bg-black/30 border border-white/5">
                  {signedPrimaryAnchorUrl ? (
                    <>
                      <img
                        src={signedPrimaryAnchorUrl}
                        alt="Primary Anchor"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white/90 px-2 py-1 rounded font-medium">
                        Anchor
                      </span>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <User className="w-8 h-8 text-muted-foreground/30" />
                      <span className="text-[10px] text-muted-foreground/50">No Anchor</span>
                    </div>
                  )}
                </div>
                {/* Latest Generation Side */}
                <div className="flex-1 relative rounded-lg overflow-hidden bg-black/30 border border-white/5">
                  {history && history.length > 0 && signedHistoryUrls[history[0]?.id] ? (
                    <>
                      <img
                        src={signedHistoryUrls[history[0].id]}
                        alt="Latest Generation"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white/90 px-2 py-1 rounded font-medium">
                        Latest
                      </span>
                    </>
                  ) : signedPreviewUrl ? (
                    <>
                      <img
                        src={signedPreviewUrl}
                        alt="Current Preview"
                        className="w-full h-full object-cover"
                      />
                      <span className="absolute bottom-2 left-2 text-[10px] bg-black/70 text-white/90 px-2 py-1 rounded font-medium">
                        Current
                      </span>
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
                      <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                      <span className="text-[10px] text-muted-foreground/50">No Generation</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* Single Mode - Default */
              signedPreviewUrl ? (
                <img src={signedPreviewUrl} alt="Preview" className="w-full h-full object-cover transition-opacity duration-300" />
              ) : (
                <div className="text-center space-y-4 p-8">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/5">
                    <Sparkles className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-muted-foreground">No Preview Generated</h3>
                    <p className="text-xs text-muted-foreground/60 mt-1 max-w-[200px] mx-auto">
                      Configure your character settings and use the prompt bar to generate a preview.
                    </p>
                  </div>
                </div>
              )
            )}

            {/* Loading Overlay */}
            {isGenerating && (
              <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <span className="text-xs font-medium text-white/90 animate-pulse">
                  Generating Preview...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Prompt & Generation Controls */}
        <div className="w-full lg:w-[320px] bg-card/30 flex flex-col h-[60vh] lg:h-full border-l border-border/50">
          <div className="flex-1 flex flex-col min-h-0">
            {/* Prompt Bar Section */}
            <div className="p-0 border-b border-border/50 flex-none z-10 bg-background/50 backdrop-blur-sm">
              <CharacterStudioPromptBarV2
                prompt={prompt}
                onPromptChange={setPrompt}
                onGenerate={generatePreview}
                isGenerating={isGenerating}
                consistencyControls={consistencyControls}
                onConsistencyChange={setConsistencyControls}
                primaryAnchor={formData.character_anchors?.find(a => a.is_primary) || null}
                mediaType={mediaType}
                onMediaTypeChange={setMediaType}
                isCreateMode={mode === 'create'}
              />
            </div>

            {/* History Section (Scrollable Area) */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-black/10">
              <div className="sticky top-0 p-3 bg-card/95 backdrop-blur-sm border-b border-border/50 flex items-center justify-between z-10">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Generation History</h3>
                <span className="text-[10px] text-muted-foreground/50 bg-white/5 px-1.5 py-0.5 rounded-full">
                  {history?.length || 0}
                </span>
              </div>
              <CharacterHistoryStrip
                history={history || []}
                isLoading={isLoadingHistory}
                onPinAsAnchor={pinAsAnchor}
                onUseAsMain={useAsMain}
                onDelete={deleteFromHistory}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
