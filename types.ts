export type DocType = 'pdf' | 'image' | 'office' | 'text';

export interface DocFile {
  id: string;
  file: File;
  name: string;
  size: number;
  type: DocType;
  previewUrl?: string; // For images
  rotation: 0 | 90 | 180 | 270;
}

export interface BackendConfig {
  url: string;
}

export const OFFICE_EXTENSIONS = ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx'];
export const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];
