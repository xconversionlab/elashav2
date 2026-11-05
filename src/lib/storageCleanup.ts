import { supabase } from './supabase';

export type CleanupResult = {
  success: boolean;
  bucket: string;
  path: string;
  error?: string;
  auditRecorded?: boolean;
};

/**
 * Observable & retryable storage object cleanup utility.
 * Attempts to remove a file from Supabase Storage with retries, detailed logging,
 * and automatic audit logging to `storage_cleanup_failures` for admin reconciliation.
 */
export async function deleteStorageObjectObservable(
  bucket: string,
  fullUrl: string | null | undefined,
  maxRetries = 2
): Promise<CleanupResult> {
  if (!fullUrl || !fullUrl.includes(`/${bucket}/`)) {
    return { success: true, bucket, path: '' };
  }

  const parts = fullUrl.split(`/${bucket}/`);
  if (!parts[1]) {
    return { success: true, bucket, path: '' };
  }

  const path = decodeURIComponent(parts[1]);
  let lastError: string | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (!error) {
      console.info(`[Storage Cleanup Success] Bucket: ${bucket}, Path: ${path}`);
      return { success: true, bucket, path };
    }

    lastError = error.message;
    console.warn(`[Storage Cleanup Attempt ${attempt}/${maxRetries} Failed] Bucket: ${bucket}, Path: ${path}, Error: ${error.message}`);
    if (attempt < maxRetries) {
      await new Promise(res => setTimeout(res, 500 * attempt));
    }
  }

  console.error(`[Storage Cleanup Error] Failed to delete ${bucket}/${path} after ${maxRetries} attempts: ${lastError}`);

  // Record failure in storage_cleanup_failures audit table for administrator reconciliation
  let auditRecorded = false;
  try {
    const { error: dbError } = await supabase.from('storage_cleanup_failures').insert({
      bucket_id: bucket,
      object_path: path,
      reason: lastError || 'Storage delete API failure',
      attempt_count: maxRetries,
    });
    if (!dbError) {
      auditRecorded = true;
      console.info(`[Storage Cleanup Audit Recorded] Logged orphaned object ${bucket}/${path} to storage_cleanup_failures table.`);
    } else {
      console.warn(`[Storage Cleanup Audit Warning] Could not record cleanup failure in DB: ${dbError.message}`);
    }
  } catch (e) {
    console.warn('[Storage Cleanup Audit Exception]', e);
  }

  return { success: false, bucket, path, error: lastError, auditRecorded };
}
