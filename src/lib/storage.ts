import { supabase } from '@lib/supabase';

const PHOTOS_BUCKET = 'photos';

export interface UploadResult {
  originalUrl: string;
  thumbnailUrl: string;
  path: string;
}

/**
 * Uploads a captured photo to Supabase Storage.
 * Returns a signed URL for the original and a public thumbnail path.
 * For MVP we upload the original once — BlurView handles the "developing" state client-side.
 */
export async function uploadPostPhoto(
  userId: string,
  postId: string,
  localUri: string,
  onProgress?: (pct: number) => void
): Promise<UploadResult> {
  const path = `${userId}/${postId}.jpg`;

  // Read the file as a blob
  const response = await fetch(localUri);
  const blob = await response.blob();

  onProgress?.(10);

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  onProgress?.(90);

  // Generate a signed URL (expires in 24 hours — will be refreshed on reveal)
  const { data: signedData, error: signError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, 60 * 60 * 24);

  if (signError || !signedData) throw new Error('Could not generate signed URL');

  onProgress?.(100);

  return {
    originalUrl: signedData.signedUrl,
    // Thumbnail is the same URL for MVP — client-side blur during development period
    thumbnailUrl: signedData.signedUrl,
    path,
  };
}

/**
 * Generates a fresh signed URL for a photo path (called at reveal time).
 */
export async function refreshSignedUrl(path: string, expiresInSeconds = 60 * 60 * 24 * 7): Promise<string> {
  const { data, error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(path, expiresInSeconds);

  if (error || !data) throw new Error('Could not refresh signed URL');
  return data.signedUrl;
}

/**
 * Deletes a photo from storage. Only callable by the owner (enforced by RLS).
 */
export async function deletePostPhoto(path: string): Promise<void> {
  const { error } = await supabase.storage.from(PHOTOS_BUCKET).remove([path]);
  if (error) throw new Error(`Delete failed: ${error.message}`);
}

// ─── Generic upload helper ─────────────────────────────────────────────────

async function uploadPhoto(
  storagePath: string,
  localUri: string,
  signedUrlTtl = 60 * 60 * 24 * 7,
): Promise<UploadResult> {
  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .upload(storagePath, blob, { contentType: 'image/jpeg', upsert: false });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data, error: signError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUrl(storagePath, signedUrlTtl);

  if (signError || !data) throw new Error('Could not generate signed URL');

  return {
    originalUrl: data.signedUrl,
    thumbnailUrl: data.signedUrl,
    path: storagePath,
  };
}

/** Upload a single shot for a disposable roll. */
export function uploadRollShot(userId: string, rollId: string, shotId: string, localUri: string) {
  return uploadPhoto(`rolls/${userId}/${rollId}/${shotId}.jpg`, localUri);
}

/** Upload a capsule submission photo. */
export function uploadCapsuleSubmission(userId: string, capsuleId: string, localUri: string) {
  return uploadPhoto(`capsules/${userId}/${capsuleId}.jpg`, localUri);
}

/** Upload a camera-pass shot. */
export function uploadPassShot(userId: string, passId: string, shotId: string, localUri: string) {
  return uploadPhoto(`passes/${userId}/${passId}/${shotId}.jpg`, localUri);
}

/** Upload a desk-drop photo. */
export function uploadDeskDrop(userId: string, dropId: string, localUri: string) {
  return uploadPhoto(`desk/${userId}/${dropId}.jpg`, localUri);
}

/** Upload a booth shot. */
export function uploadBoothShot(userId: string, sessionId: string, shotNumber: number, localUri: string) {
  return uploadPhoto(`booth/${userId}/${sessionId}/${shotNumber}.jpg`, localUri);
}

/** Upload a scrapbook item photo. */
export function uploadScrapbookItem(userId: string, scrapbookId: string, itemId: string, localUri: string) {
  return uploadPhoto(`scrapbooks/${userId}/${scrapbookId}/${itemId}.jpg`, localUri);
}
