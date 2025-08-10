/**
 * Intelligent prompt modification for exact copy functionality
 * Replaces specific elements in the original enhanced prompt while preserving the rest
 */

export const modifyOriginalPrompt = (originalPrompt: string, modification: string): string => {
  if (!originalPrompt || !modification.trim()) {
    return originalPrompt;
  }

  const modificationLower = modification.toLowerCase().trim();
  
  // Keywords that indicate modification intent
  const modificationKeywords = ['change', 'modify', 'replace', 'swap', 'add', 'remove', 'alter', 'different', 'new', 'wearing', 'in', 'to'];
  const isModification = modificationKeywords.some(keyword => 
    modificationLower.includes(keyword)
  );
  
  if (!isModification) {
    // If no modification keywords, treat as simple replacement/addition
    return `${originalPrompt}, ${modification}`;
  }
  
  // Handle clothing/outfit modifications
  if (modificationLower.includes('outfit') || modificationLower.includes('wearing') || modificationLower.includes('clothes')) {
    return handleClothingModification(originalPrompt, modification);
  }
  
  // Handle pose modifications
  if (modificationLower.includes('pose') || modificationLower.includes('position') || modificationLower.includes('standing') || modificationLower.includes('sitting')) {
    return handlePoseModification(originalPrompt, modification);
  }
  
  // Handle background modifications
  if (modificationLower.includes('background') || modificationLower.includes('setting') || modificationLower.includes('location')) {
    return handleBackgroundModification(originalPrompt, modification);
  }
  
  // Default: append modification to original prompt
  return `${originalPrompt}, ${modification}`;
};

const handleClothingModification = (originalPrompt: string, modification: string): string => {
  // Common clothing patterns in enhanced prompts
  const clothingPatterns = [
    /wearing\s+([^,]+)/gi,
    /in\s+a?\s*([^,]+)\s+(dress|outfit|clothes|attire|clothing)/gi,
    /([^,]+)\s+(dress|outfit|clothes|attire|clothing)/gi,
    /(dressed\s+in|clad\s+in)\s+([^,]+)/gi
  ];
  
  let modifiedPrompt = originalPrompt;
  
  // Extract new clothing from modification
  const newClothing = extractNewClothing(modification);
  
  // Replace existing clothing references
  clothingPatterns.forEach(pattern => {
    modifiedPrompt = modifiedPrompt.replace(pattern, (match) => {
      if (newClothing) {
        return match.replace(/wearing\s+[^,]+/gi, `wearing ${newClothing}`)
                   .replace(/(in\s+a?\s*)[^,]+(\s+(dress|outfit|clothes|attire|clothing))/gi, `$1${newClothing}$2`)
                   .replace(/[^,]+(\s+(dress|outfit|clothes|attire|clothing))/gi, `${newClothing}$1`)
                   .replace(/(dressed\s+in|clad\s+in)\s+[^,]+/gi, `$1 ${newClothing}`);
      }
      return match;
    });
  });
  
  // If no clothing found in original, add new clothing
  if (modifiedPrompt === originalPrompt && newClothing) {
    modifiedPrompt = `${originalPrompt}, wearing ${newClothing}`;
  }
  
  return modifiedPrompt;
};

const handlePoseModification = (originalPrompt: string, modification: string): string => {
  // Common pose patterns
  const posePatterns = [
    /(standing|sitting|lying|kneeling|crouching|leaning)([^,]*)/gi,
    /(pose|posing|positioned)([^,]*)/gi
  ];
  
  let modifiedPrompt = originalPrompt;
  const newPose = extractNewPose(modification);
  
  if (newPose) {
    posePatterns.forEach(pattern => {
      modifiedPrompt = modifiedPrompt.replace(pattern, newPose);
    });
    
    // If no pose found, add new pose
    if (modifiedPrompt === originalPrompt) {
      modifiedPrompt = `${originalPrompt}, ${newPose}`;
    }
  }
  
  return modifiedPrompt;
};

const handleBackgroundModification = (originalPrompt: string, modification: string): string => {
  // Common background patterns
  const backgroundPatterns = [
    /(background|setting|environment|location)([^,]*)/gi,
    /(in\s+a?\s*)(studio|room|outdoor|indoor|park|beach|forest)([^,]*)/gi
  ];
  
  let modifiedPrompt = originalPrompt;
  const newBackground = extractNewBackground(modification);
  
  if (newBackground) {
    backgroundPatterns.forEach(pattern => {
      modifiedPrompt = modifiedPrompt.replace(pattern, newBackground);
    });
    
    // If no background found, add new background
    if (modifiedPrompt === originalPrompt) {
      modifiedPrompt = `${originalPrompt}, ${newBackground}`;
    }
  }
  
  return modifiedPrompt;
};

const extractNewClothing = (modification: string): string => {
  // Extract clothing from modification text
  const clothingMatch = modification.match(/(change|to|wearing|in)\s+(.*?)(?:\s|$)/i);
  if (clothingMatch) {
    return clothingMatch[2];
  }
  
  // Look for common clothing items
  const clothingItems = ['dress', 'shirt', 'blouse', 'skirt', 'pants', 'jeans', 'bikini', 'swimsuit', 'top', 'bottom'];
  for (const item of clothingItems) {
    if (modification.toLowerCase().includes(item)) {
      const words = modification.split(' ');
      const itemIndex = words.findIndex(word => word.toLowerCase().includes(item));
      if (itemIndex >= 0) {
        // Get color/description before the item
        const description = words.slice(Math.max(0, itemIndex - 2), itemIndex + 1).join(' ');
        return description;
      }
    }
  }
  
  return modification.replace(/^(change|to|wearing|in)\s+/i, '').trim();
};

const extractNewPose = (modification: string): string => {
  const poseMatch = modification.match(/(change|to)\s+(.*?)(?:\s|$)/i);
  if (poseMatch) {
    return poseMatch[2];
  }
  return modification.replace(/^(change|to|pose)\s+/i, '').trim();
};

const extractNewBackground = (modification: string): string => {
  const backgroundMatch = modification.match(/(change|to|in)\s+(.*?)(?:\s|$)/i);
  if (backgroundMatch) {
    return backgroundMatch[2];
  }
  return modification.replace(/^(change|to|in|background)\s+/i, '').trim();
};