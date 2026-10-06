const MAGIC = [0x4c, 0x54, 0x46, 0x31];
const KIND_UPLOAD = 1;
const KIND_DOWNLOAD = 2;
const MAX_ID_LENGTH = 64;

export type DownloadFrame = {
  id: string;
  sequence: number;
  payload: Uint8Array;
};

export function isFileFrame(bytes: Uint8Array) {
  return bytes.length >= MAGIC.length && MAGIC.every((byte, index) => bytes[index] === byte);
}

export function encodeUploadFrame(requestID: string, uploadID: string, offset: number, payload: Uint8Array) {
  const request = encodeText(requestID);
  const upload = encodeText(uploadID);
  const frame = new Uint8Array(MAGIC.length + 1 + 4 + request.length + upload.length + 8 + payload.byteLength);
  let cursor = writeMagic(frame, KIND_UPLOAD);
  cursor = writeID(frame, cursor, request);
  cursor = writeID(frame, cursor, upload);
  writeUint64(frame, cursor, offset);
  cursor += 8;
  frame.set(payload, cursor);
  return frame;
}

export function parseDownloadFrame(bytes: Uint8Array): DownloadFrame | null {
  if (!isFileFrame(bytes) || bytes[MAGIC.length] !== KIND_DOWNLOAD) return null;
  let cursor = MAGIC.length + 1;
  const id = readID(bytes, cursor);
  if (!id) return null;
  cursor = id.next;
  if (cursor + 8 > bytes.length) return null;
  const sequence = readUint64(bytes, cursor);
  if (sequence === null) return null;
  cursor += 8;
  return { id: id.value, sequence, payload: bytes.slice(cursor) };
}

function encodeText(value: string) {
  if (!value || value.length > MAX_ID_LENGTH) {
    throw new Error("invalid file frame id");
  }
  return new TextEncoder().encode(value);
}

function writeMagic(frame: Uint8Array, kind: number) {
  frame.set(MAGIC, 0);
  frame[MAGIC.length] = kind;
  return MAGIC.length + 1;
}

function writeID(frame: Uint8Array, cursor: number, value: Uint8Array) {
  frame[cursor] = (value.length >> 8) & 0xff;
  frame[cursor + 1] = value.length & 0xff;
  frame.set(value, cursor + 2);
  return cursor + 2 + value.length;
}

function writeUint64(frame: Uint8Array, cursor: number, value: number) {
  const high = Math.floor(value / 2 ** 32);
  const low = value >>> 0;
  frame[cursor] = (high >>> 24) & 0xff;
  frame[cursor + 1] = (high >>> 16) & 0xff;
  frame[cursor + 2] = (high >>> 8) & 0xff;
  frame[cursor + 3] = high & 0xff;
  frame[cursor + 4] = (low >>> 24) & 0xff;
  frame[cursor + 5] = (low >>> 16) & 0xff;
  frame[cursor + 6] = (low >>> 8) & 0xff;
  frame[cursor + 7] = low & 0xff;
}

function readID(bytes: Uint8Array, cursor: number) {
  if (cursor + 2 > bytes.length) return null;
  const size = (bytes[cursor] << 8) | bytes[cursor + 1];
  if (size <= 0 || size > MAX_ID_LENGTH || cursor + 2 + size > bytes.length) return null;
  const value = new TextDecoder().decode(bytes.subarray(cursor + 2, cursor + 2 + size));
  return { value, next: cursor + 2 + size };
}

function readUint64(bytes: Uint8Array, cursor: number) {
  let value = 0;
  for (let index = 0; index < 8; index += 1) {
    value = value * 256 + bytes[cursor + index];
  }
  if (!Number.isSafeInteger(value)) return null;
  return value;
}
