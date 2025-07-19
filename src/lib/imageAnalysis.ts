
import { toast } from 'sonner';

export interface ImageAnalysisResult {
  hasFaces: boolean;
  isPhotographic: boolean;
  isArtistic: boolean;
  recommendedType: 'character' | 'style' | 'composition';
  recommendedStrength: number;
  suggestedCrop?: { x: number; y: number; width: number; height: number };
}

// Simple face detection using canvas and pixel analysis
export const analyzeImage = async (imageUrl: string): Promise<ImageAnalysisResult> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(getDefaultAnalysis());
        return;
      }
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const analysis = performImageAnalysis(imageData, img.width, img.height);
        resolve(analysis);
      } catch (error) {
        console.warn('Image analysis failed:', error);
        resolve(getDefaultAnalysis());
      }
    };
    
    img.onerror = () => {
      resolve(getDefaultAnalysis());
    };
    
    img.src = imageUrl;
  });
};

const performImageAnalysis = (imageData: ImageData, width: number, height: number): ImageAnalysisResult => {
  const data = imageData.data;
  
  // Basic heuristics for image analysis
  let totalBrightness = 0;
  let colorVariance = 0;
  let edgeCount = 0;
  
  // Analyze pixels for characteristics
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];  
    const b = data[i + 2];
    
    const brightness = (r + g + b) / 3;
    totalBrightness += brightness;
    
    // Simple edge detection
    if (i > width * 4 && i % (width * 4) > 4) {
      const prevR = data[i - 4];
      const prevG = data[i - 3];
      const prevB = data[i - 2];
      
      const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      if (diff > 30) edgeCount++;
    }
  }
  
  const avgBrightness = totalBrightness / (data.length / 4);
  const edgeRatio = edgeCount / (data.length / 4);
  
  // Heuristic-based classification
  const hasFaces = detectPotentialFaces(data, width, height);
  const isPhotographic = avgBrightness > 80 && edgeRatio < 0.1;
  const isArtistic = edgeRatio > 0.15 || avgBrightness < 60;
  
  let recommendedType: 'character' | 'style' | 'composition' = 'style';
  let recommendedStrength = 0.7;
  
  if (hasFaces) {
    recommendedType = 'character';
    recommendedStrength = 0.85;
  } else if (isArtistic) {
    recommendedType = 'style';
    recommendedStrength = 0.7;
  } else {
    recommendedType = 'composition';
    recommendedStrength = 0.55;
  }
  
  return {
    hasFaces,
    isPhotographic,
    isArtistic,
    recommendedType,
    recommendedStrength
  };
};

const detectPotentialFaces = (data: Uint8ClampedArray, width: number, height: number): boolean => {
  // Simple skin tone detection as face indicator
  let skinTonePixels = 0;
  const totalPixels = data.length / 4;
  
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    
    // Basic skin tone detection
    if (r > 95 && g > 40 && b > 20 && 
        r > g && r > b && 
        Math.abs(r - g) > 15) {
      skinTonePixels++;
    }
  }
  
  const skinRatio = skinTonePixels / totalPixels;
  return skinRatio > 0.1; // If >10% of pixels are skin-like
};

const getDefaultAnalysis = (): ImageAnalysisResult => ({
  hasFaces: false,
  isPhotographic: true,
  isArtistic: false,
  recommendedType: 'style',
  recommendedStrength: 0.7
});

// Smart strength recommendations based on reference type and analysis
export const getOptimalStrength = (
  referenceType: 'character' | 'style' | 'composition',
  analysis?: ImageAnalysisResult
): number => {
  if (analysis) {
    return analysis.recommendedStrength;
  }
  
  // Default strengths by type
  switch (referenceType) {
    case 'character':
      return 0.85;
    case 'style':
      return 0.7;
    case 'composition':
      return 0.55;
    default:
      return 0.7;
  }
};
