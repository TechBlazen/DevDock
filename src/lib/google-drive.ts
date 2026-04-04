import axios from 'axios';
import type { DriveFile, DriveBreadcrumb } from '../types';

const DRIVE_API = 'https://www.googleapis.com/drive/v3';
const UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3';

function headers(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export async function listFiles(token: string, folderId = 'root', pageSize = 50): Promise<DriveFile[]> {
  const { data } = await axios.get(`${DRIVE_API}/files`, {
    headers: headers(token),
    params: {
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,webContentLink,parents,thumbnailLink)',
      orderBy: 'folder,name',
      pageSize,
    },
  });
  return data.files ?? [];
}

export async function searchFiles(token: string, query: string): Promise<DriveFile[]> {
  const { data } = await axios.get(`${DRIVE_API}/files`, {
    headers: headers(token),
    params: {
      q: `name contains '${query.replace(/'/g, "\\'")}' and trashed = false`,
      fields: 'files(id,name,mimeType,size,modifiedTime,iconLink,webViewLink,webContentLink,parents,thumbnailLink)',
      orderBy: 'folder,name',
      pageSize: 50,
    },
  });
  return data.files ?? [];
}

export async function getFile(token: string, fileId: string): Promise<DriveFile> {
  const { data } = await axios.get(`${DRIVE_API}/files/${fileId}`, {
    headers: headers(token),
    params: {
      fields: 'id,name,mimeType,size,modifiedTime,iconLink,webViewLink,webContentLink,parents,thumbnailLink',
    },
  });
  return data;
}

export async function buildBreadcrumbs(token: string, folderId: string): Promise<DriveBreadcrumb[]> {
  const crumbs: DriveBreadcrumb[] = [];
  let currentId = folderId;

  while (currentId && currentId !== 'root') {
    const file = await getFile(token, currentId);
    crumbs.unshift({ id: file.id, name: file.name });
    currentId = file.parents?.[0] ?? '';
  }

  crumbs.unshift({ id: 'root', name: 'My Drive' });
  return crumbs;
}

export async function uploadFile(
  token: string,
  file: File,
  parentFolderId: string,
  onProgress?: (pct: number) => void,
): Promise<DriveFile> {
  const metadata = {
    name: file.name,
    parents: [parentFolderId],
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', file);

  const { data } = await axios.post(`${UPLOAD_API}/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,webViewLink`, form, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    onUploadProgress: (e) => {
      if (onProgress && e.total) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    },
  });

  return data;
}

export async function createFolder(token: string, name: string, parentId: string): Promise<DriveFile> {
  const { data } = await axios.post(`${DRIVE_API}/files`, {
    name,
    mimeType: 'application/vnd.google-apps.folder',
    parents: [parentId],
  }, {
    headers: {
      ...headers(token),
      'Content-Type': 'application/json',
    },
    params: {
      fields: 'id,name,mimeType,modifiedTime,webViewLink',
    },
  });
  return data;
}

export async function deleteFile(token: string, fileId: string): Promise<void> {
  await axios.delete(`${DRIVE_API}/files/${fileId}`, {
    headers: headers(token),
  });
}

export function formatFileSize(bytes?: string): string {
  if (!bytes) return '—';
  const b = parseInt(bytes, 10);
  if (b === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
}

export function isFolder(file: DriveFile): boolean {
  return file.mimeType === 'application/vnd.google-apps.folder';
}
