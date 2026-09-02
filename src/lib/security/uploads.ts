const signatures = {
  "image/png": {
    extension: "png",
    matches: (buffer: Buffer) =>
      buffer.length >= 33 &&
      buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) &&
      buffer.subarray(12, 16).toString("ascii") === "IHDR" &&
      buffer.subarray(-8, -4).toString("ascii") === "IEND",
  },
  "image/jpeg": {
    extension: "jpg",
    matches: (buffer: Buffer) =>
      buffer.length >= 4 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff &&
      buffer[buffer.length - 2] === 0xff &&
      buffer[buffer.length - 1] === 0xd9,
  },
  "image/webp": {
    extension: "webp",
    matches: (buffer: Buffer) =>
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
      buffer.subarray(8, 12).toString("ascii") === "WEBP" &&
      buffer.readUInt32LE(4) + 8 === buffer.length,
  },
} as const;

export const MAX_LOGO_SIZE = 2 * 1024 * 1024;
export const MAX_SETTINGS_FORM_SIZE = MAX_LOGO_SIZE + 64 * 1024;

export function validateLogoUpload(file: { type: string; size: number }, buffer: Buffer) {
  if (file.size < 1 || file.size > MAX_LOGO_SIZE || buffer.length !== file.size) {
    throw new Error("Logo must be between 1 byte and 2 MB");
  }
  const signature = signatures[file.type as keyof typeof signatures];
  if (!signature || !signature.matches(buffer)) {
    throw new Error("Logo content must be a valid PNG, JPEG, or WebP image");
  }
  return { extension: signature.extension };
}
