import { DocType, OFFICE_EXTENSIONS, IMAGE_EXTENSIONS } from './types';

export const formatBytes = (bytes: number, decimals = 2) => {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export const getFileType = (fileName: string): DocType => {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) return 'pdf';
  if (IMAGE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'image';
  if (OFFICE_EXTENSIONS.some(ext => lower.endsWith(ext))) return 'office';
  return 'text';
};

export const generateId = () => Math.random().toString(36).substr(2, 9);
