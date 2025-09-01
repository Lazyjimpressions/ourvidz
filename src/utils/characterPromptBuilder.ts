interface Character {
  name: string;
  description?: string;
  persona?: string;
  traits?: string;
  appearance_tags: string[];
  gender?: string;
}

export const buildCharacterPortraitPrompt = (character: Character): string => {
  const maxTokens = 77; // SDXL limit
  
  // Build quality tokens - photorealistic focus
  const qualityTokens = ['score_9', 'score_8_up', 'masterpiece', 'best quality', 'photorealistic'];
  
  // Build character tokens
  const characterTokens: string[] = [];
  
  // Gender-aware base tokens
  const gender = character.gender?.toLowerCase() || 'unspecified';
  if (gender === 'male') {
    characterTokens.push('1boy', 'handsome man', 'portrait', 'headshot');
  } else if (gender === 'female') {
    characterTokens.push('1girl', 'beautiful woman', 'portrait', 'headshot'); 
  } else {
    characterTokens.push('1person', 'beautiful person', 'portrait', 'headshot');
  }
  
  // Add appearance tags if available
  if (character.appearance_tags && character.appearance_tags.length > 0) {
    const cleanTags = character.appearance_tags
      .filter(tag => tag.trim().length > 2)
      .slice(0, 6);
    characterTokens.push(...cleanTags);
  }
  
  // Add description-based tokens
  if (character.description) {
    const descTokens = character.description
      .toLowerCase()
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => 
        token.length > 3 && 
        !['the', 'and', 'with', 'her', 'his', 'has', 'that', 'this', 'very'].includes(token)
      )
      .slice(0, 4);
    characterTokens.push(...descTokens);
  }
  
  // Add personality traits
  if (character.traits) {
    const traitTokens = character.traits
      .split(',')
      .map(trait => trait.trim())
      .filter(trait => trait.length > 2)
      .slice(0, 3);
    characterTokens.push(...traitTokens);
  }
  
  // Technical quality tokens - photorealistic focus
  const technicalTokens = [
    'studio photography',
    'professional lighting', 
    'sharp focus',
    'detailed skin texture',
    'realistic',
    'photographic'
  ];
  
  // Smart token assembly with deduplication
  const allTokenGroups = [
    { tokens: qualityTokens, priority: 1, maxCount: 4 },
    { tokens: characterTokens, priority: 2, maxCount: 12 },
    { tokens: technicalTokens, priority: 3, maxCount: 5 }
  ];

  const finalTokens: string[] = [];
  const usedTokensSet = new Set<string>();
  
  // Add tokens by priority while avoiding duplicates
  for (const group of allTokenGroups) {
    let addedFromGroup = 0;
    
    for (const token of group.tokens) {
      if (finalTokens.length >= maxTokens) break;
      if (addedFromGroup >= group.maxCount) break;
      
      const normalizedToken = token.toLowerCase().trim();
      
      // Skip if already used or too similar
      if (usedTokensSet.has(normalizedToken)) continue;
      if (Array.from(usedTokensSet).some(used => 
        used.includes(normalizedToken) || normalizedToken.includes(used)
      )) continue;
      
      finalTokens.push(token);
      usedTokensSet.add(normalizedToken);
      addedFromGroup++;
    }
    
    if (finalTokens.length >= maxTokens) break;
  }

  const prompt = finalTokens.join(', ');
  
  console.log('🎨 Character portrait prompt generated:', {
    character: character.name,
    prompt,
    tokenCount: finalTokens.length,
    maxTokens
  });

  return prompt;
};