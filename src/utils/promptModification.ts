/**
 * Intelligent prompt modification for exact copy functionality
 * Replaces specific elements in the original enhanced prompt while preserving the rest
 */

export const modifyOriginalPrompt = (originalPrompt: string, modification: string): string => {
  if (!originalPrompt || !modification.trim()) {
    return originalPrompt;
  }

  const modificationLower = modification.toLowerCase().trim();
  
  // Enhanced keyword detection for better modification recognition
  const modificationKeywords = ['change', 'modify', 'replace', 'swap', 'add', 'remove', 'alter', 'different', 'new', 'wearing', 'in', 'to', 'with', 'make', 'turn', 'convert'];
  const isModification = modificationKeywords.some(keyword => 
    modificationLower.includes(keyword)
  );
  
  // Enhanced pattern detection for common user inputs
  const isColorChange = /\b(red|blue|green|yellow|black|white|pink|purple|orange|brown|gray|grey)\b/i.test(modification);
  const isClothingChange = /\b(shirt|dress|outfit|clothes|bikini|top|bottom|pants|skirt|jacket|sweater|t-shirt|blouse)\b/i.test(modification);
  const isLocationChange = /\b(forest|beach|park|studio|outdoor|indoor|street|room|kitchen|bedroom|office)\b/i.test(modification);
  const isStyleChange = /\b(hairstyle|hair|makeup|pose|position|standing|sitting|lying|background|setting)\b/i.test(modification);
  
  if (!isModification && !isColorChange && !isClothingChange && !isLocationChange && !isStyleChange) {
    // If no modification indicators, treat as simple addition
    return `${originalPrompt}, ${modification}`;
  }
  
  // Handle clothing/outfit modifications with better pattern matching
  if (isClothingChange || modificationLower.includes('outfit') || modificationLower.includes('wearing') || modificationLower.includes('clothes')) {
    return handleClothingModification(originalPrompt, modification);
  }
  
  // Handle pose modifications
  if (isStyleChange || modificationLower.includes('pose') || modificationLower.includes('position')) {
    return handlePoseModification(originalPrompt, modification);
  }
  
  // Handle background/location modifications  
  if (isLocationChange || modificationLower.includes('background') || modificationLower.includes('setting') || modificationLower.includes('location')) {
    return handleBackgroundModification(originalPrompt, modification);
  }
  
  // Handle color modifications
  if (isColorChange) {
    return handleColorModification(originalPrompt, modification);
  }
  
  // Default: append modification to original prompt
  return `${originalPrompt}, ${modification}`;
};

const handleClothingModification = (originalPrompt: string, modification: string): string => {
  // Enhanced clothing patterns for better matching
  const clothingPatterns = [
    /wearing\s+([^,;.]+)/gi,
    /in\s+a?\s*([^,;.]+)\s+(dress|outfit|clothes|attire|clothing|bikini|shirt|top|bottom)/gi,
    /([^,;.]+)\s+(dress|outfit|clothes|attire|clothing|bikini|shirt|top|bottom|pants|skirt)/gi,
    /(dressed\s+in|clad\s+in)\s+([^,;.]+)/gi,
    /(has\s+on|puts\s+on)\s+([^,;.]+)/gi
  ];
  
  let modifiedPrompt = originalPrompt;
  let replacementMade = false;
  
  // Extract new clothing from modification
  const newClothing = extractNewClothing(modification);
  
  if (newClothing) {
    // Try to replace existing clothing references
    clothingPatterns.forEach(pattern => {
      const newModifiedPrompt = modifiedPrompt.replace(pattern, (match, ...groups) => {
        replacementMade = true;
        if (match.toLowerCase().includes('wearing')) {
          return `wearing ${newClothing}`;
        } else if (match.toLowerCase().includes('dressed in') || match.toLowerCase().includes('clad in')) {
          return match.replace(/\s+[^,;.]+$/, ` ${newClothing}`);
        } else {
          return `${newClothing}`;
        }
      });
      if (replacementMade) {
        modifiedPrompt = newModifiedPrompt;
      }
    });
    
    // If no clothing found in original, add new clothing
    if (!replacementMade) {
      modifiedPrompt = `${originalPrompt}, wearing ${newClothing}`;
    }
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
  // Enhanced extraction patterns for better clothing recognition
  const clothingExtractionPatterns = [
    /(change.*?(?:to|into))\s+(.+?)(?:\s|$)/i,
    /(wearing|in)\s+(.+?)(?:\s|$)/i,
    /(?:to|into)\s+(.+?)(?:\s|$)/i,
    /(.+?)(?:\s|$)/i // fallback
  ];
  
  // Try each pattern
  for (const pattern of clothingExtractionPatterns) {
    const match = modification.match(pattern);
    if (match && match[2]) {
      return match[2].trim();
    } else if (match && match[1] && !match[2]) {
      return match[1].replace(/^(change|to|wearing|in)\s+/i, '').trim();
    }
  }
  
  // Enhanced clothing item detection with colors
  const clothingItems = ['dress', 'shirt', 'blouse', 'skirt', 'pants', 'jeans', 'bikini', 'swimsuit', 'top', 'bottom', 'jacket', 'sweater', 't-shirt'];
  const colors = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
  
  for (const item of clothingItems) {
    if (modification.toLowerCase().includes(item)) {
      const words = modification.split(' ');
      const itemIndex = words.findIndex(word => word.toLowerCase().includes(item));
      if (itemIndex >= 0) {
        // Look for color/descriptor before the item
        let startIndex = Math.max(0, itemIndex - 2);
        for (const color of colors) {
          const colorIndex = words.findIndex(word => word.toLowerCase().includes(color));
          if (colorIndex >= 0 && colorIndex < itemIndex) {
            startIndex = colorIndex;
            break;
          }
        }
        const description = words.slice(startIndex, itemIndex + 1).join(' ');
        return description.replace(/^(change|to|wearing|in)\s+/i, '').trim();
      }
    }
  }
  
  return modification.replace(/^(change|to|wearing|in|outfit|clothes)\s+/i, '').trim();
};

const extractNewPose = (modification: string): string => {
  const poseMatch = modification.match(/(change|to)\s+(.*?)(?:\s|$)/i);
  if (poseMatch) {
    return poseMatch[2];
  }
  return modification.replace(/^(change|to|pose)\s+/i, '').trim();
};

const handleColorModification = (originalPrompt: string, modification: string): string => {
  // Handle color changes for clothing, hair, etc.
  const colorWords = ['red', 'blue', 'green', 'yellow', 'black', 'white', 'pink', 'purple', 'orange', 'brown', 'gray', 'grey'];
  const targetWords = ['shirt', 'dress', 'outfit', 'hair', 'eyes', 'top', 'bottom', 'bikini'];
  
  let modifiedPrompt = originalPrompt;
  
  // Extract the color and target from modification
  const foundColor = colorWords.find(color => modification.toLowerCase().includes(color));
  const foundTarget = targetWords.find(target => modification.toLowerCase().includes(target));
  
  if (foundColor) {
    if (foundTarget) {
      // Replace existing target with new color
      const targetPattern = new RegExp(`([^,;.]*${foundTarget}[^,;.]*)`, 'gi');
      modifiedPrompt = modifiedPrompt.replace(targetPattern, `${foundColor} ${foundTarget}`);
    } else {
      // If no specific target, try to replace clothing items with new color
      const clothingPattern = /(wearing\s+)([^,;.]+)/gi;
      modifiedPrompt = modifiedPrompt.replace(clothingPattern, (match, prefix, clothing) => {
        return `${prefix}${foundColor} ${clothing.replace(/^\w+\s+/, '')}`;
      });
    }
  }
  
  return modifiedPrompt;
};

const extractNewBackground = (modification: string): string => {
  const backgroundMatch = modification.match(/(change|to|in)\s+(.*?)(?:\s|$)/i);
  if (backgroundMatch) {
    return backgroundMatch[2];
  }
  return modification.replace(/^(change|to|in|background)\s+/i, '').trim();
};