// utils/pathUtils.ts
export const getHDImagePath = (thumbnailPath: string): string => {
  return thumbnailPath.replace('/thumbnails/', '/panoramas/').replace(/-/g, '');
};
