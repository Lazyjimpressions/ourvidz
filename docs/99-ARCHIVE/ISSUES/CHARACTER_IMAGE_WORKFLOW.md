# Character Image Workflow - Complete System Flow

This document traces the character image through the entire system from creation to display in all contexts.

## Overview

Character images flow through multiple storage locations and contexts:
1. **Generation** → `workspace-temp` bucket (temporary)
2. **Auto-save** → `user-library` bucket (permanent)
3. **Character record** → `characters.image_url` and `characters.reference_image_url`
4. **Display contexts** → Roleplay page, Library, Character cards

---

## Phase 1: Character Creation & Image Generation

### 1.1 User Initiates Character Creation

**Location**: `src/components/roleplay/AddCharacterModal.tsx`

**Flow**:
1. User fills in character details (name, description, appearance tags, etc.)
2. User clicks "Generate AI Portrait" button
3. System calls `generateCharacterImage()` function

```134:238:src/components/roleplay/AddCharacterModal.tsx
  // Generate character portrait using AI
  const generateCharacterImage = useCallback(async () => {
    if (!formData.name || !formData.description) {
      toast({
        title: 'Missing Information',
        description: 'Please provide a name and description before generating an image.',
        variant: 'destructive'
      });
      return;
    }

    // Build optimized prompt for character portrait
    const prompt = buildCharacterPortraitPrompt({
      name: formData.name,
      description: formData.description,
      appearance_tags: formData.appearance_tags,
      traits: formData.traits,
      persona: formData.persona,
      gender: formData.gender
    });

    console.log('🎨 Generating character portrait with prompt:', prompt);

    // Check if selected model is from fal.ai (default model is Seedream from fal.ai)
    const selectedModel = imageModels?.find(m => m.id === selectedImageModel);
    const isFalModel = selectedModel?.model_key?.includes('fal-ai') ||
                       selectedModel?.model_key?.includes('seedream') ||
                       !selectedImageModel; // Default model is fal.ai Seedream

    if (isFalModel) {
      // Use fal-image edge function directly for fal.ai models
      setIsGeneratingPortrait(true);
      try {
        const { data, error } = await supabase.functions.invoke('fal-image', {
          body: {
            prompt,
            apiModelId: selectedImageModel || undefined, // Will use default fal.ai model if not specified
            quality: 'high',
            metadata: {
              contentType: formData.content_rating,
              destination: 'character_portrait',
              characterName: formData.name
            }
          }
        });

        if (error) {
          console.error('❌ fal-image error:', error);
          throw new Error(error.message || 'Failed to generate image');
        }

        if (data?.status === 'completed' && data?.resultUrl) {
          console.log('✅ Portrait generated successfully:', data.resultUrl);
          setGeneratedImageUrl(data.resultUrl);
          setFormData(prev => ({
            ...prev,
            image_url: data.resultUrl,
            reference_image_url: data.resultUrl
          }));
          toast({
            title: 'Image Generated',
            description: 'Your character portrait is ready!'
          });
        } else if (data?.status === 'queued') {
          // Handle async response (rare for Seedream)
          toast({
            title: 'Generating...',
            description: 'Image is being generated. This may take a moment.'
          });
        } else {
          throw new Error('Unexpected response from image generation');
        }
      } catch (error) {
        console.error('Failed to generate portrait:', error);
        toast({
          title: 'Generation Failed',
          description: error instanceof Error ? error.message : 'Could not generate image. Please try again.',
          variant: 'destructive'
        });
      } finally {
        setIsGeneratingPortrait(false);
      }
    } else {
      // Fall back to useGeneration hook for other models (SDXL, Replicate)
      try {
        await generateContent({
          format: 'sdxl_image_high',
          prompt,
          projectId: '00000000-0000-0000-0000-000000000000',
          metadata: {
            contentType: formData.content_rating,
            destination: 'character_portrait',
            characterName: formData.name,
            apiModelId: selectedImageModel || undefined
          }
        });
      } catch (error) {
        console.error('Failed to start image generation:', error);
        toast({
          title: 'Generation Failed',
          description: 'Could not start image generation. Please try again.',
          variant: 'destructive'
        });
      }
    }
  }, [formData, selectedImageModel, imageModels, generateContent, toast]);
```

**Key Points**:
- For fal.ai models: Direct call to `fal-image` edge function (synchronous response)
- For other models: Uses `useGeneration` hook (queued job)
- Image URL stored in form state (`formData.image_url` and `formData.reference_image_url`)

### 1.2 Character Record Creation

**Location**: `src/components/roleplay/AddCharacterModal.tsx`

When user clicks "Create Character":

```324:376:src/components/roleplay/AddCharacterModal.tsx
  const handleCreate = async () => {
    if (!formData.name.trim() || !formData.description.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide at least a name and description.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Build the character data, excluding internal-only fields
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { character_layers, ...cleanFormData } = formData;

      const characterData = {
        ...cleanFormData,
        content_rating: formData.content_rating,
        // Store structured layers in scene_behavior_rules
        scene_behavior_rules: Object.keys(character_layers).length > 0
          ? { characterLayers: character_layers }
          : undefined
      };

      console.log('📝 Creating character with data:', {
        name: characterData.name,
        description: characterData.description?.substring(0, 50) + '...',
        content_rating: characterData.content_rating,
        hasImage: !!characterData.image_url,
        traitsCount: characterData.traits?.split(',').length || 0,
        appearanceTagsCount: characterData.appearance_tags?.length || 0
      });

      const newCharacter = await createUserCharacter(characterData);

      toast({
        title: "Character Created",
        description: `${formData.name} has been successfully created!`,
      });

      onCharacterAdded?.(newCharacter);
      onClose();
      resetForm();
    } catch (error) {
      console.error('❌ Failed to create character:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      toast({
        title: "Creation Failed",
        description: `Failed to create character: ${errorMessage}`,
        variant: "destructive",
      });
    }
  };
```

**Character Record Fields**:
- `image_url`: Initial image URL (may be signed URL from fal.ai or workspace-temp path)
- `reference_image_url`: Same as `image_url` initially (used for consistency in scene generation)

---

## Phase 2: Image Storage in Workspace-Temp

### 2.1 fal-image Edge Function Processing

**Location**: `supabase/functions/fal-image/index.ts`

**Flow**:
1. Edge function receives generation request
2. Calls fal.ai API to generate image
3. Downloads generated image from fal.ai
4. Uploads to `workspace-temp` bucket
5. Creates `workspace_assets` record
6. **If `destination === 'character_portrait'`**: Updates character record

```955:1073:supabase/functions/fal-image/index.ts
      let storagePath = '';
      let fileSizeBytes = 0;

      try {
        console.log('📥 Downloading image from fal.ai...');
        const imageResponse = await fetch(resultUrl);
        if (!imageResponse.ok) {
          throw new Error(`Failed to download image: ${imageResponse.status}`);
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        fileSizeBytes = imageBuffer.byteLength;

        // Generate storage path: workspace-temp/{user_id}/{job_id}_{timestamp}.{ext}
        const extension = resultType === 'video' ? 'mp4' : 'png';
        const timestamp = Date.now();
        storagePath = `${user.id}/${jobData.id}_${timestamp}.${extension}`;

        console.log('📤 Uploading to Supabase storage:', storagePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('workspace-temp')
          .upload(storagePath, imageBuffer, {
            contentType: resultType === 'video' ? 'video/mp4' : 'image/png',
            upsert: true
          });

        if (uploadError) {
          console.error('❌ Failed to upload to storage:', uploadError);
          // Fall back to using the external URL
          storagePath = resultUrl;
        } else {
          console.log('✅ Image uploaded to storage:', uploadData.path);
          storagePath = uploadData.path;
        }
      } catch (downloadError) {
        console.error('❌ Failed to download/upload image:', downloadError);
        // Fall back to using the external URL
        storagePath = resultUrl;
      }

      // Update job with result
      await
```

**Storage Path Format**: `workspace-temp/{user_id}/{job_id}_{timestamp}.png`

**Workspace Asset Record**:
- `temp_storage_path`: `{user_id}/{job_id}_{timestamp}.png`
- `asset_type`: `'image'`
- `generation_settings`: Contains metadata including `character_id`, `destination`, etc.

**Character Update** (if `destination === 'character_portrait'`):

```1045:1073:supabase/functions/fal-image/index.ts
      // Handle character portrait destination - update character's image_url automatically
      if (body.metadata?.destination === 'character_portrait' && body.metadata?.character_id) {
        console.log('🖼️ Updating character portrait for:', body.metadata.character_id);

        // Determine the full image path - only prepend bucket if it's a storage path (not external URL)
        const fullImagePath = storagePath.startsWith('http') ? storagePath : `workspace-temp/${storagePath}`;

        const characterUpdateData: Record<string, any> = {
          image_url: fullImagePath,
          reference_image_url: fullImagePath, // Use same image as reference for consistency
          updated_at: new Date().toISOString()
        };

        // If we have a seed, lock it for character consistency
        if (generationSeed) {
          characterUpdateData.seed_locked = generationSeed;
        }

        const { error: charUpdateError } = await supabase
          .from('characters')
          .update(characterUpdateData)
          .eq('id', body.metadata.character_id);

        if (charUpdateError) {
          console.warn('⚠️ Failed to update character image:', charUpdateError);
        } else {
          console.log('✅ Character portrait updated successfully');
        }
      }
```

**Character Record After Update**:
- `image_url`: `workspace-temp/{user_id}/{job_id}_{timestamp}.png`
- `reference_image_url`: `workspace-temp/{user_id}/{job_id}_{timestamp}.png`
- `seed_locked`: Generation seed (if available)

---

## Phase 3: Auto-Save to User Library

### 3.1 Job Callback Processing

**Location**: `supabase/functions/job-callback/index.ts`

**Trigger**: When job status changes to `'completed'`

**Flow**:
1. Job callback receives completion notification
2. **If `destination === 'character_portrait'`**:
   - Copies image from `workspace-temp` to `user-library` bucket
   - Creates `user_library` record with roleplay metadata
   - Updates character record with stable `user-library` path

```353:449:supabase/functions/job-callback/index.ts
      // Auto-save character portraits to library and update character
      if (job.metadata?.destination === 'character_portrait') {
        const characterId = job.metadata.character_id;
        const firstImageAsset = assetsToCreate.find(asset => asset.asset_type === 'image');
        
        if (characterId && firstImageAsset) {
          try {
            // Auto-save to user library with roleplay metadata
            let sourceKey = firstImageAsset.temp_storage_path;
            if (sourceKey.startsWith('workspace-temp/')) {
              sourceKey = sourceKey.replace('workspace-temp/', '');
            }
            
            const destKey = `${finalUserId}/${jobId}_${characterId}.${firstImageAsset.mime_type.split('/')[1]}`;
            
            // Copy file to user-library
            const { data: fileData, error: downloadError } = await supabaseClient.storage
              .from('workspace-temp')
              .download(sourceKey);

            if (!downloadError && fileData) {
              const { error: uploadError } = await supabaseClient.storage
                .from('user-library')
                .upload(destKey, fileData, {
                  contentType: firstImageAsset.mime_type,
                  upsert: true
                });

              if (!uploadError) {
                // Handle thumbnail copy
                let libraryThumbPath: string | null = null;
                let thumbSrc = firstImageAsset.thumbnail_path;
                if (!thumbSrc) {
                  const base = firstImageAsset.temp_storage_path.replace(/\.(png|jpg|jpeg)$/i, '');
                  thumbSrc = `${base}.thumb.webp`;
                }
                
                if (thumbSrc && thumbSrc.startsWith('workspace-temp/')) {
                  thumbSrc = thumbSrc.replace('workspace-temp/', '');
                }
                
                if (thumbSrc) {
                  const { data: thumbData } = await supabaseClient.storage
                    .from('workspace-temp')
                    .download(thumbSrc);
                  
                  if (thumbData) {
                    const thumbDest = `${finalUserId}/${jobId}_${characterId}.thumb.webp`;
                    const { error: upThumbErr } = await supabaseClient.storage
                      .from('user-library')
                      .upload(thumbDest, thumbData, {
                        contentType: 'image/webp',
                        upsert: true
                      });
                    if (!upThumbErr) {
                      libraryThumbPath = thumbDest;
                    }
                  }
                }

                // Create library record with roleplay metadata
                const { data: libraryAsset, error: libraryError } = await supabaseClient
                  .from('user_library')
                  .insert({
                    user_id: finalUserId,
                    asset_type: firstImageAsset.asset_type,
                    storage_path: destKey,
                    thumbnail_path: libraryThumbPath,
                    file_size_bytes: firstImageAsset.file_size_bytes || 0,
                    mime_type: firstImageAsset.mime_type,
                    original_prompt: firstImageAsset.original_prompt,
                    model_used: firstImageAsset.model_used,
                    generation_seed: firstImageAsset.generation_seed,
                    width: firstImageAsset.generation_settings?.width,
                    height: firstImageAsset.generation_settings?.height,
                    tags: ['character', 'portrait'],
                    roleplay_metadata: {
                      type: 'character_portrait',
                      character_id: characterId,
                      character_name: job.metadata.character_name,
                      consistency_method: job.metadata.consistency_method
                    },
                    content_category: 'character'
                  })
                  .select()
                  .single();

                if (!libraryError && libraryAsset) {
                  // Update character with stable storage path instead of signed URL
                  const stableImageUrl = `user-library/${destKey}`;
                  
                  const { error: updateError } = await supabaseClient
                    .from('characters')
                    .update({
                      image_url: stableImageUrl,
                      reference_image_url: stableImageUrl,
                      seed_locked: firstImageAsset.generation_seed,
```

**Storage Path Format**: `user-library/{user_id}/{job_id}_{character_id}.png`

**User Library Record**:
- `storage_path`: `{user_id}/{job_id}_{character_id}.png`
- `thumbnail_path`: `{user_id}/{job_id}_{character_id}.thumb.webp` (if available)
- `asset_type`: `'image'`
- `tags`: `['character', 'portrait']`
- `roleplay_metadata`: 
  ```json
  {
    "type": "character_portrait",
    "character_id": "...",
    "character_name": "...",
    "consistency_method": "..."
  }
  ```
- `content_category`: `'character'`

**Character Record Final Update**:
- `image_url`: `user-library/{user_id}/{job_id}_{character_id}.png`
- `reference_image_url`: `user-library/{user_id}/{job_id}_{character_id}.png`
- `seed_locked`: Generation seed

---

## Phase 4: Display in Roleplay Page

### 4.1 Character Card Display

**Location**: `src/components/roleplay/MobileCharacterCard.tsx`

**Flow**:
1. Component reads `character.image_url`
2. Checks if URL needs signing (contains `user-library/` or `workspace-temp/`)
3. Signs URL using `urlSigningService`
4. Displays signed URL in `<img>` tag

```88:147:src/components/roleplay/MobileCharacterCard.tsx
  const imageUrl = character.image_url || character.preview_image_url;

  // Sign image URL if it's a private storage path
  useEffect(() => {
    const signImageUrl = async () => {
      if (!imageUrl) {
        setSignedImageUrl('');
        return;
      }

      // Check if URL needs signing (user-library or workspace-temp paths)
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedImageUrl(signed);
        } catch (error: any) {
          console.error('Failed to sign image URL:', error);
          
          // Check if error is "Object not found" or similar storage error
          const errorMessage = error?.message || error?.toString() || '';
          const isNotFoundError = errorMessage.includes('Object not found') || 
                                 errorMessage.includes('not found') ||
                                 errorMessage.includes('404') ||
                                 errorMessage.includes('No such object');
          
          if (isNotFoundError)
```

**Display**:
```317:331:src/components/roleplay/MobileCharacterCard.tsx
          {displayImageUrl ? (
            <img 
              src={displayImageUrl} 
              alt={character.name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
              <div className="text-center text-gray-400">
                <Sparkles className="w-6 h-6 mx-auto mb-1 opacity-50" />
                <p className="text-xs">No Image</p>
              </div>
            </div>
          )}
```

### 4.2 Chat Message Display

**Location**: `src/components/roleplay/ChatMessage.tsx`

**Flow**:
1. Receives `signedCharacterImageUrl` prop (pre-signed by parent)
2. Or signs URL locally if not provided
3. Displays in chat message avatar

```67:86:src/components/roleplay/ChatMessage.tsx
  // Sign character image URL (use passed prop if available)
  useEffect(() => {
    const signCharacterImage = async () => {
      if (signedCharacterImageUrl) {
        setSignedCharacterImage(signedCharacterImageUrl);
      } else if (character?.image_url && !character.image_url.startsWith('http')) {
        try {
          const signed = await getSignedUrl(character.image_url, 'user-library');
          setSignedCharacterImage(signed);
        } catch (error) {
          console.error('Error signing character image:', error);
          setSignedCharacterImage('/placeholder.svg');
        }
      } else {
        setSignedCharacterImage(character?.image_url || '/placeholder.svg');
      }
    };

    signCharacterImage();
  }, [character?.image_url, signedCharacterImageUrl, getSignedUrl]);
```

### 4.3 Character Info Drawer

**Location**: `src/components/roleplay/CharacterInfoDrawer.tsx`

**Flow**: Same as character card - signs URL and displays

```76:103:src/components/roleplay/CharacterInfoDrawer.tsx
  const hasImage = !!imageUrl;

  // Sign image URL if it's a private storage path
  useEffect(() => {
    const signImageUrl = async () => {
      if (!imageUrl) {
        setSignedImageUrl('');
        return;
      }

      // Check if URL needs signing (user-library or workspace-temp paths)
      if (imageUrl.includes('user-library/') || imageUrl.includes('workspace-temp/')) {
        try {
          const bucket = imageUrl.includes('user-library/') ? 'user-library' : 'workspace-temp';
          const signed = await urlSigningService.getSignedUrl(imageUrl, bucket);
          setSignedImageUrl(signed);
        } catch (error) {
          console.error('Failed to sign image URL:', error);
          setSignedImageUrl(imageUrl); // Fallback to original
        }
      } else {
        setSignedImageUrl(imageUrl); // Use as-is for public URLs
      }
    };

    signImageUrl();
  }, [imageUrl]);
```

---

## Phase 5: Display in Library

### 5.1 Library Component

**Location**: `src/components/library/UpdatedOptimizedLibrary.tsx`

**Flow**:
1. Fetches assets from `user_library` table using `useLibraryAssets()` hook
2. Filters by character tab: `roleplay_metadata.type === 'character_portrait'`
3. Signs URLs using `useSignedAssets()` hook
4. Displays in grid/list view

```36:56:src/components/library/UpdatedOptimizedLibrary.tsx
  // Fetch library assets
  const {
    data: rawAssets = [],
    isLoading,
    error,
    refetch
  } = useLibraryAssets();

  // Convert to shared asset format and filter by tab
  const sharedAssets = useMemo(() => {
    const allAssets = rawAssets.map(toSharedFromLibrary);
    
    if (activeTab === 'characters') {
      return allAssets.filter(asset => 
        asset.metadata?.roleplay_metadata?.type === 'character_portrait' ||
        asset.metadata?.tags?.includes('character') ||
        asset.metadata?.content_category === 'character'
      );
    }
    
    return allAssets;
  }, [rawAssets, activeTab]);

  // Get signed URLs for thumbnails
  const { signedAssets, isSigning } = useSignedAssets(sharedAssets, 'user-library', {
    thumbTtlSec: 24 * 60 * 60, // 24 hours for library
    enabled: true
  });
```

**Character Tab Filtering**:
- `roleplay_metadata.type === 'character_portrait'`
- OR `tags.includes('character')`
- OR `content_category === 'character'`

---

## Image Path Evolution Summary

| Phase | Location | Path Format | Bucket |
|-------|----------|-------------|--------|
| **Initial Generation** | `fal-image` response | `https://fal.ai/...` (temporary) | External |
| **Workspace Storage** | `workspace-temp` | `{user_id}/{job_id}_{timestamp}.png` | `workspace-temp` |
| **Character Record (Initial)** | `characters.image_url` | `workspace-temp/{user_id}/{job_id}_{timestamp}.png` | N/A (path only) |
| **Library Storage** | `user-library` | `{user_id}/{job_id}_{character_id}.png` | `user-library` |
| **Character Record (Final)** | `characters.image_url` | `user-library/{user_id}/{job_id}_{character_id}.png` | N/A (path only) |
| **Display** | UI Components | Signed URL (temporary, expires) | N/A |

---

## Key Storage Buckets

1. **`workspace-temp`**: Temporary storage for generated images
   - Path: `{user_id}/{job_id}_{timestamp}.png`
   - Auto-cleaned periodically
   - Used during generation process

2. **`user-library`**: Permanent storage for user assets
   - Path: `{user_id}/{job_id}_{character_id}.png`
   - Thumbnail: `{user_id}/{job_id}_{character_id}.thumb.webp`
   - Persisted long-term
   - Used for library display and character references

---

## URL Signing

All private storage paths (`user-library/` or `workspace-temp/`) must be signed before display:

**Signing Service**: `src/lib/storage.ts` (via `getSignedUrl()`)

**Signed URL Format**: 
```
https://{project}.supabase.co/storage/v1/object/sign/{bucket}/{path}?token={jwt}&expires={timestamp}
```

**TTL**:
- Library: 24 hours
- Workspace: 1 hour (default)

---

## Real-time Updates

**Hook**: `src/hooks/useCharacterImageUpdates.ts`

Subscribes to:
- `jobs` table updates (when `destination === 'character_portrait'`)
- `characters` table updates (for `image_url` changes)

Updates character records when generation completes.

---

## Edge Cases & Fallbacks

1. **External URL**: If image is from external source (starts with `http`), used as-is without signing
2. **Missing Image**: Shows placeholder (`/placeholder.svg`) or gradient background
3. **Storage Error**: Falls back to original URL or placeholder
4. **Not Found Error**: Handles gracefully, shows placeholder

---

## Related Files

### Core Services
- `src/services/CharacterImageService.ts` - Character image generation service
- `src/lib/storage.ts` - URL signing utilities
- `src/utils/characterImageUtils.ts` - Character image utilities

### Edge Functions
- `supabase/functions/fal-image/index.ts` - Image generation (fal.ai)
- `supabase/functions/job-callback/index.ts` - Job completion handler
- `supabase/functions/workspace-actions/index.ts` - Workspace operations

### Components
- `src/components/roleplay/AddCharacterModal.tsx` - Character creation
- `src/components/roleplay/MobileCharacterCard.tsx` - Character card display
- `src/components/roleplay/CharacterInfoDrawer.tsx` - Character details
- `src/components/roleplay/ChatMessage.tsx` - Chat message display
- `src/components/library/UpdatedOptimizedLibrary.tsx` - Library display

### Hooks
- `src/hooks/useCharacterImageUpdates.ts` - Real-time image updates
- `src/hooks/useSignedImageUrls.ts` - URL signing hook
- `src/hooks/useLibraryAssets.ts` - Library asset fetching

