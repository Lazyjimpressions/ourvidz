import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { OurVidzDashboardLayout } from '@/components/OurVidzDashboardLayout';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Save, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { useCharacterStudioV2 } from '@/hooks/useCharacterStudioV2';
import { IdentityTab } from '@/components/character-studio/IdentityTab';
import { AppearanceTab } from '@/components/character-studio/AppearanceTab';
import { StyleTab } from '@/components/character-studio/StyleTab';
import { MediaTab } from '@/components/character-studio/MediaTab';
import { CharacterStudioPromptBarV2 } from '@/components/character-studio/CharacterStudioPromptBarV2';
import { CharacterHistoryStrip } from '@/components/character-studio/CharacterHistoryStrip';

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
    useAsMain
  } = useCharacterStudioV2(id, mode);

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
          <div className="px-4 py-3 border-b border-border/50">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-8 bg-muted/50 p-0.5">
                <TabsTrigger value="identity" className="text-[10px] h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">Identity</TabsTrigger>
                <TabsTrigger value="appearance" className="text-[10px] h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">Visuals</TabsTrigger>
                <TabsTrigger value="style" className="text-[10px] h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">Style</TabsTrigger>
                <TabsTrigger value="media" className="text-[10px] h-7 data-[state=active]:bg-background data-[state=active]:shadow-sm">Media</TabsTrigger>
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
        <div className="w-full lg:flex-1 bg-black/50 relative flex flex-col items-center justify-center p-4 lg:p-8 h-[50vh] lg:h-full border-b lg:border-b-0 border-border/50">
          {/* Canvas Area */}
          <div className="relative aspect-[3/4] h-full max-h-[800px] w-full max-w-[600px] bg-gray-900/50 rounded-lg border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden group">
            {formData.image_url ? (
              <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover transition-opacity duration-300" />
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
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
