import { apiClient } from './client';

export interface Media {
  id: string;
  uploaderId: string;
  storageId: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: string;
}

interface SignatureResponse {
  signature: string;
  timestamp: number;
  apiKey: string;
  cloudName: string;
  folder: string;
}

export const mediaApi = {
  upload: async (file: File, onProgress?: (progress: number) => void) => {
    // 1. Get the upload signature and params from our backend
    const { signature, timestamp, apiKey, cloudName, folder } = await apiClient<SignatureResponse>('/media/signature');

    // 2. Upload the file directly to Cloudinary
    const formData = new FormData();
    formData.append('file', file);
    formData.append('api_key', apiKey);
    formData.append('timestamp', timestamp.toString());
    formData.append('signature', signature);
    formData.append('folder', folder);

    // Using 'auto' resource type supports images, videos, raw files, etc.
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
    
    const cloudData = await new Promise<{ secure_url?: string; [key: string]: unknown }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', uploadUrl);

      if (onProgress) {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded * 100) / e.total));
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            resolve(JSON.parse(xhr.responseText));
          } catch {
            resolve({ secure_url: xhr.responseText });
          }
        } else {
          try {
            const err = JSON.parse(xhr.responseText);
            reject(new Error(err.error?.message || 'Failed to upload to Cloudinary'));
          } catch {
            reject(new Error(`Failed to upload: ${xhr.statusText}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(formData);
    });

    // 3. Save the media metadata to our backend
    return apiClient<{media: Media}>('/media', {
      method: 'POST',
      body: JSON.stringify({
        storageId: cloudData.secure_url, // We'll use the public URL as the storage ID so we can just redirect or serve it directly
        fileName: file.name,
        mimeType: file.type,
        fileSize: file.size,
      }),
    }).then(res => res.media);
  },

  // Note: Downloading media typically doesn't need to go through our JSON apiClient
  // if it's returning a blob/file directly, but for now we define the URL getter
  // which can be used in <img> tags with credentials enabled.
  getMediaUrl: (mediaId: string) => {
    return `/api/v1/media/${mediaId}`;
  }
};
