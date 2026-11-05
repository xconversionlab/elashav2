import { supabase } from './supabase';

const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 512;
// The inline fallback is stored in the cart (localStorage) and posted to
// custom_designs, so keep the encoded payload small enough to stay fast.
const MAX_INLINE_CHARS = 400_000;
const ALLOWED_TYPES = ['image/png', 'image/jpeg'];

export interface ArtworkUploadResult {
  url: string;
  name: string;
  storage: 'supabase' | 'inline';
}

async function validateFileHeader(file: File): Promise<boolean> {
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onloadend = event => {
      if (!event.target?.result) return resolve(false);
      const arr = new Uint8Array(event.target.result as ArrayBuffer);
      if (arr.length < 4) return resolve(false);
      // JPEG: FF D8 FF
      if (arr[0] === 0xff && arr[1] === 0xd8 && arr[2] === 0xff) return resolve(true);
      // PNG: 89 50 4E 47
      if (arr[0] === 0x89 && arr[1] === 0x50 && arr[2] === 0x4e && arr[3] === 0x47) return resolve(true);
      resolve(false);
    };
    reader.onerror = () => resolve(false);
    reader.readAsArrayBuffer(file.slice(0, 8));
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not read image'));
    };
    image.src = objectUrl;
  });
}

function renderToDataUrl(image: HTMLImageElement, maxDimension: number, type: string): string {
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported in this browser.');
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL(type, 0.72);
}

async function compressToDataUrl(file: File): Promise<string> {
  const image = await loadImage(file);
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  let dimension = MAX_DIMENSION;
  let url = renderToDataUrl(image, dimension, type);
  // PNG ignores the quality argument, so keep shrinking until the payload fits.
  while (url.length > MAX_INLINE_CHARS && dimension > 64) {
    dimension = Math.round(dimension * 0.7);
    url = renderToDataUrl(image, dimension, type);
  }
  return url;
}

// Uploads artwork to Supabase Storage when the bucket allows it, otherwise embeds
// a bounded compressed copy so the design flow keeps working without storage credentials.
export async function uploadArtwork(file: File, userId: string): Promise<ArtworkUploadResult> {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error('Image is too large. Maximum size is 25 MB.');
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Please upload a PNG or JPG image.');
  }
  const isValidHeader = await validateFileHeader(file);
  if (!isValidHeader) {
    throw new Error('Invalid or corrupted image file content.');
  }

  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const path = `${userId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from('artwork').upload(path, file);
  if (!error) {
    const { data } = supabase.storage.from('artwork').getPublicUrl(path);
    return { url: data.publicUrl, name: file.name, storage: 'supabase' };
  }

  const url = await compressToDataUrl(file);
  return { url, name: file.name, storage: 'inline' };
}
