import { supabase } from '@/integrations/supabase/client';

/**
 * Upload an image to the avatars public bucket and return the public URL
 */
export const uploadToAvatarsBucket = async (
  file: File,
  userId: string,
  type: 'character' | 'user' = 'character'
): Promise<string> => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${type}/${userId}/${Date.now()}.${fileExt}`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false
    });

  if (error) {
    console.error('Error uploading to avatars bucket:', error);
    throw error;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

/**
 * Upload a generated image blob to the avatars bucket
 */
export const uploadGeneratedImageToAvatars = async (
  imageBlob: Blob,
  userId: string,
  characterName: string,
  type: 'character' | 'user' = 'character'
): Promise<string> => {
  const fileName = `${type}/${userId}/${characterName.replace(/\s+/g, '_')}_${Date.now()}.png`;

  const { data, error } = await supabase.storage
    .from('avatars')
    .upload(fileName, imageBlob, {
      cacheControl: '3600',
      upsert: false,
      contentType: 'image/png'
    });

  if (error) {
    console.error('Error uploading generated image to avatars bucket:', error);
    throw error;
  }

  // Get the public URL
  const { data: urlData } = supabase.storage
    .from('avatars')
    .getPublicUrl(fileName);

  return urlData.publicUrl;
};

/**
 * Delete an image from the avatars bucket using its public URL
 */
export const deleteFromAvatarsBucket = async (publicUrl: string): Promise<void> => {
  // Extract the file path from the public URL
  const urlParts = publicUrl.split('/storage/v1/object/public/avatars/');
  if (urlParts.length < 2) {
    throw new Error('Invalid avatar URL format');
  }
  
  const filePath = urlParts[1];

  const { error } = await supabase.storage
    .from('avatars')
    .remove([filePath]);

  if (error) {
    console.error('Error deleting from avatars bucket:', error);
    throw error;
  }
};