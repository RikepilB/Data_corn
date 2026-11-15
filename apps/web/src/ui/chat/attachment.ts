// SI-assisted (Claude Code); reviewed by <name>
// Gets a photo or PDF ready to send, in the browser. A photo is redrawn so its long side is at most
// IMAGE_MAX_SIDE_PX and re-encoded as JPEG (this also drops its location and camera data); a PDF is
// sent as it is. Anything still over MAX_ATTACHMENT_BYTES is refused before sending.
import { IMAGE_MAX_SIDE_PX, IMAGE_TYPES, PDF_TYPE, type ChatAttachment } from '../../../server/chat/limits';
import { fitsAttachmentLimit, scaledSize, toBase64 } from './chatClient';

export type Prepared =
  | { ok: true; attachment: ChatAttachment; name: string }
  | { ok: false; code: 'bad_attachment_type' | 'attachment_too_large' };

const JPEG_QUALITIES = [0.85, 0.7, 0.55];

async function shrinkPhoto(file: File): Promise<Blob | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const { width, height } = scaledSize(bitmap.width, bitmap.height, IMAGE_MAX_SIDE_PX);
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const g = canvas.getContext('2d');
    if (!g) return null;
    // JPEG has no transparency: a transparent PNG gets a white background, not a black one.
    g.fillStyle = '#ffffff';
    g.fillRect(0, 0, width, height);
    g.drawImage(bitmap, 0, 0, width, height);
    for (const quality of JPEG_QUALITIES) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality));
      if (blob && fitsAttachmentLimit(blob.size)) return blob;
    }
    return null;
  } finally {
    bitmap.close();
  }
}

export async function prepareAttachment(file: File): Promise<Prepared> {
  if ((IMAGE_TYPES as readonly string[]).includes(file.type)) {
    let blob: Blob | null;
    try {
      blob = await shrinkPhoto(file);
    } catch {
      return { ok: false, code: 'bad_attachment_type' };
    }
    if (!blob) return { ok: false, code: 'attachment_too_large' };
    const data = toBase64(new Uint8Array(await blob.arrayBuffer()));
    return { ok: true, name: file.name, attachment: { mediaType: 'image/jpeg', data } };
  }
  if (file.type === PDF_TYPE) {
    if (!fitsAttachmentLimit(file.size)) return { ok: false, code: 'attachment_too_large' };
    const data = toBase64(new Uint8Array(await file.arrayBuffer()));
    return { ok: true, name: file.name, attachment: { mediaType: PDF_TYPE, data } };
  }
  return { ok: false, code: 'bad_attachment_type' };
}
