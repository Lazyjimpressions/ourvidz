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
    <OurVidzDashboardLayout>
      <div className="h-[calc(100vh-64px)] overflow-hidden bg-background text-foreground flex flex-col">

        {/* Header Toolbar */}
        <div className="h-14 border-b border-border/50 flex items-center justify-between px-4 bg-background/50 backdrop-blur-sm z-20">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/character-hub-v2')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold leading-none">
                {mode === 'edit' ? 'Edit Character' : 'New Character'}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Settings
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate('/character-hub-v2')}>
              Discard
            </Button>
            <Button
              size="sm"
              className="bg-primary hover:bg-primary/90"
              onClick={handleSave}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Character
            </Button>
          </div>
        </div>

        {/* Main 3-Column Layout */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">

          {/* Left Column: Configuration Controls (Scrollable) */}
          <div className="w-full lg:w-[400px] border-b lg:border-r border-border/50 flex flex-col bg-card/30 h-[40vh] lg:h-full">
            <div className="p-2 border-b border-border/50">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-9">
                  <TabsTrigger value="identity" className="text-xs">Identity</TabsTrigger>
                  <TabsTrigger value="appearance" className="text-xs">Visuals</TabsTrigger>
                  <TabsTrigger value="style" className="text-xs">Style</TabsTrigger>
                  <TabsTrigger value="media" className="text-xs">Media</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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
          <div className="w-full lg:flex-1 bg-black/50 relative flex items-center justify-center p-4 lg:p-8 h-[40vh] lg:h-full border-b lg:border-b-0 border-border/50">
            <div className="absolute top-4 left-4 z-10">
              <div className="bg-black/60 backdrop-blur-sm rounded-lg p-2 text-xs text-muted-foreground border border-white/10">
                Preview Mode: Portrait
              </div>
            </div>

            {/* Canvas Area */}
            <div className="relative aspect-[3/4] h-full max-h-[800px] bg-gray-900/50 rounded-lg border border-white/5 shadow-2xl flex items-center justify-center overflow-hidden group">
              {formData.image_url ? (
                <img src={formData.image_url} alt="Preview" className="w-full h-full object-cover" />
              ) : (
                <div className="text-center space-y-4">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto">
                    <Sparkles className="w-8 h-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">Configure settings to generate preview</p>
                </div>
              )}

              {/* Overlay Controls */}
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                <Button size="lg" className="rounded-full shadow-lg bg-primary hover:bg-primary/90">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Preview
                </Button>
              </div>
            </div>
          </div>

          {/* Right Column: Prompt & Generation Controls */}
          <div className="w-full lg:w-[320px] bg-card/30 flex flex-col h-[60vh] lg:h-full border-l border-border/50">
            {/* Prompt Bar (Top) */}
            <div className="flex-none h-[60%] border-b border-border/50">
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
              />
            </div>

            {/* History Strip (Bottom) */}
            <div className="flex-1 flex flex-col min-h-0 bg-black/20">
              <div className="p-3 border-b border-border/50 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">History</h3>
                <span className="text-[10px] text-muted-foreground/50">{history?.length || 0} items</span>
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
    </OurVidzDashboardLayout>
  );
}
