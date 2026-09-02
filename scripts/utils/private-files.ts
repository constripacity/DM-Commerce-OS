import {
  chmodSync,
  closeSync,
  constants,
  fsyncSync,
  openSync,
  writeFileSync,
} from "node:fs";
import { chmod, open, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";

const PRIVATE_FILE_MODE = 0o600;
const NO_FOLLOW = constants.O_NOFOLLOW ?? 0;

export function restrictFileToOwnerSync(filePath: string) {
  if (process.platform !== "win32") {
    chmodSync(filePath, PRIVATE_FILE_MODE);
  }
}

export function writePrivateNewTextFileSync(filePath: string, content: string) {
  const descriptor = openSync(
    filePath,
    constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NO_FOLLOW,
    PRIVATE_FILE_MODE,
  );

  try {
    writeFileSync(descriptor, content, "utf8");
    fsyncSync(descriptor);
  } finally {
    closeSync(descriptor);
  }

  restrictFileToOwnerSync(filePath);
}

export async function atomicWritePrivateTextFile(filePath: string, content: string) {
  const directory = path.dirname(filePath);
  const basename = path.basename(filePath);
  const temporaryPath = path.join(
    directory,
    `.${basename}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`,
  );
  let handle: Awaited<ReturnType<typeof open>> | undefined;

  try {
    handle = await open(
      temporaryPath,
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NO_FOLLOW,
      PRIVATE_FILE_MODE,
    );
    await handle.writeFile(content, "utf8");
    await handle.sync();
    await handle.close();
    handle = undefined;

    await rename(temporaryPath, filePath);
    if (process.platform !== "win32") {
      await chmod(filePath, PRIVATE_FILE_MODE);
    }
  } catch (error) {
    await handle?.close().catch(() => undefined);
    await unlink(temporaryPath).catch(() => undefined);
    throw error;
  }
}
