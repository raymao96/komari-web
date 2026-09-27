export const AVATAR_OUTPUT_SIZE = 256;
export const AVATAR_PREVIEW_SIZE = 240;
export const AVATAR_MAX_SOURCE_BYTES = 5 * 1024 * 1024;
export const AVATAR_MAX_PIXELS = 16_000_000;
export const AVATAR_MAX_OUTPUT_BYTES = 512 * 1024;
export const AVATAR_ACCEPT = "image/jpeg,image/png,image/webp";

export function isSupportedAvatarType(file: File) {
  const type = (file.type || "").toLowerCase();
  return type === "image/jpeg" || type === "image/png" || type === "image/webp";
}

export async function loadAvatarSource(file: File): Promise<HTMLImageElement> {
  if (!isSupportedAvatarType(file)) {
    throw new Error("unsupported_type");
  }
  if (file.size > AVATAR_MAX_SOURCE_BYTES) {
    throw new Error("too_large");
  }
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  if (bitmap.width * bitmap.height > AVATAR_MAX_PIXELS) {
    bitmap.close();
    throw new Error("too_many_pixels");
  }
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    throw new Error("decode_failed");
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const image = new Image();
  image.src = canvas.toDataURL("image/png");
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("decode_failed"));
  });
  return image;
}

export function avatarPreviewTransform(
  zoom: number,
  offsetX: number,
  offsetY: number,
  previewSize = AVATAR_PREVIEW_SIZE,
) {
  const scale = previewSize / AVATAR_PREVIEW_SIZE;
  const safeZoom = Math.max(1, zoom);
  return `scale(${zoom}) translate(${(offsetX * scale) / safeZoom}px, ${(offsetY * scale) / safeZoom}px)`;
}

export function clampAvatarPreviewOffset(
  zoom: number,
  offsetX: number,
  offsetY: number,
  previewSize = AVATAR_PREVIEW_SIZE,
) {
  const max = (previewSize * (Math.max(1, zoom) - 1)) / 2;
  return {
    x: Math.max(-max, Math.min(max, offsetX)),
    y: Math.max(-max, Math.min(max, offsetY)),
  };
}

export function avatarCropSourceRect(
  imageWidth: number,
  imageHeight: number,
  zoom: number,
  offsetX: number,
  offsetY: number,
  previewSize = AVATAR_PREVIEW_SIZE,
) {
  const minSide = Math.min(imageWidth, imageHeight);
  const safeZoom = Math.max(1, zoom);
  const viewport = minSide / safeZoom;
  const imageOffsetX = (-offsetX * minSide) / (previewSize * safeZoom);
  const imageOffsetY = (-offsetY * minSide) / (previewSize * safeZoom);
  const maxOffset = Math.max(0, (minSide - viewport) / 2);
  const cx = imageWidth / 2 + Math.max(-maxOffset, Math.min(maxOffset, imageOffsetX));
  const cy = imageHeight / 2 + Math.max(-maxOffset, Math.min(maxOffset, imageOffsetY));
  return {
    sx: cx - viewport / 2,
    sy: cy - viewport / 2,
    size: viewport,
  };
}

export function cropAvatarToPng(
  image: HTMLImageElement,
  zoom: number,
  offsetX: number,
  offsetY: number,
): Promise<Blob> {
  const { sx, sy, size } = avatarCropSourceRect(
    image.width,
    image.height,
    zoom,
    offsetX,
    offsetY,
  );
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_OUTPUT_SIZE;
  canvas.height = AVATAR_OUTPUT_SIZE;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("decode_failed"));
  ctx.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  ctx.drawImage(
    image,
    sx,
    sy,
    size,
    size,
    0,
    0,
    AVATAR_OUTPUT_SIZE,
    AVATAR_OUTPUT_SIZE,
  );
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("encode_failed"));
          return;
        }
        if (blob.size > AVATAR_MAX_OUTPUT_BYTES) {
          reject(new Error("output_too_large"));
          return;
        }
        resolve(blob);
      },
      "image/png",
    );
  });
}
