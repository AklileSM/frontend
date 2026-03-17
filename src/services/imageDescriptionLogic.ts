import { analyzeImage } from './apiClient';

export async function fetchImageDescription(imageUrl: string, fileId?: string): Promise<string> {
  return analyzeImage(imageUrl, fileId);
}
  
