import { constants, promises as fs } from "node:fs";
import path from "node:path";
import { MAX_LOGO_SIZE, validateLogoUpload } from "@/lib/security/uploads";

const MANAGED_LOGO_PATH =
  /^\/(?:api\/)?uploads\/([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp))$/;
const MANAGED_LOGO_FILENAME =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:png|jpg|webp)$/;

export function managedLogoFilename(logoPath: string | null | undefined) {
  return logoPath?.match(MANAGED_LOGO_PATH)?.[1] ?? null;
}

export function managedLogoRoutePath(logoPath: string | null | undefined) {
  const filename = managedLogoFilename(logoPath);
  return filename ? `/api/uploads/${filename}` : null;
}

export function managedLogoRouteForFilename(filename: string) {
  return MANAGED_LOGO_FILENAME.test(filename) ? `/api/uploads/${filename}` : null;
}

export function managedLogoUploadDirectory(projectRoot = process.cwd()) {
  return path.resolve(projectRoot, "var", "uploads", "logos");
}

async function isSafeDirectory(directory: string) {
  try {
    const stats = await fs.lstat(directory);
    if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    return (await fs.realpath(directory)) === directory;
  } catch {
    return false;
  }
}

export async function ensureManagedLogoUploadDirectory(projectRoot = process.cwd()) {
  const directory = managedLogoUploadDirectory(projectRoot);
  let current = path.resolve(projectRoot);
  for (const segment of ["var", "uploads", "logos"]) {
    current = path.join(/* turbopackIgnore: true */ current, segment);
    try {
      await fs.mkdir(current, { mode: 0o700 });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
    const stats = await fs.lstat(current);
    if (!stats.isDirectory() || stats.isSymbolicLink()) {
      throw new Error("Managed upload directory must not contain filesystem links");
    }
  }
  if (!(await isSafeDirectory(directory))) {
    throw new Error("Managed upload directory must be a real local directory");
  }
  await fs.chmod(directory, 0o700);
  return directory;
}

export function resolveManagedLogoUpload(
  logoPath: string | null | undefined,
  projectRoot = process.cwd(),
) {
  const filename = managedLogoFilename(logoPath);
  if (!filename) return null;

  const uploadDirectory = managedLogoUploadDirectory(projectRoot);
  const absolutePath = path.resolve(uploadDirectory, filename);
  return path.dirname(absolutePath) === uploadDirectory ? absolutePath : null;
}

function resolveLegacyLogoUpload(filename: string, projectRoot: string) {
  const uploadDirectory = path.resolve(projectRoot, "public", "uploads");
  const absolutePath = path.resolve(uploadDirectory, filename);
  return path.dirname(absolutePath) === uploadDirectory ? absolutePath : null;
}

function contentTypeForFilename(filename: string) {
  if (filename.endsWith(".png")) return "image/png";
  if (filename.endsWith(".jpg")) return "image/jpeg";
  if (filename.endsWith(".webp")) return "image/webp";
  return null;
}

export async function readManagedLogoUpload(
  logoPath: string,
  projectRoot = process.cwd(),
) {
  const filename = managedLogoFilename(logoPath);
  const contentType = filename ? contentTypeForFilename(filename) : null;
  if (!filename || !contentType) return null;

  const absolutePath = resolveManagedLogoUpload(logoPath, projectRoot);
  const uploadDirectory = managedLogoUploadDirectory(projectRoot);
  if (!absolutePath || !(await isSafeDirectory(uploadDirectory))) return null;

  let handle: Awaited<ReturnType<typeof fs.open>> | null = null;
  try {
    const pathStats = await fs.lstat(absolutePath);
    if (!pathStats.isFile() || pathStats.size < 1 || pathStats.size > MAX_LOGO_SIZE) return null;
    handle = await fs.open(
      /* turbopackIgnore: true */ absolutePath,
      constants.O_RDONLY | constants.O_NOFOLLOW,
    );
    const stats = await handle.stat();
    if (
      !stats.isFile() ||
      stats.size !== pathStats.size ||
      stats.dev !== pathStats.dev ||
      stats.ino !== pathStats.ino
    ) {
      return null;
    }
    const buffer = Buffer.allocUnsafe(MAX_LOGO_SIZE + 1);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    const finalStats = await handle.stat();
    if (bytesRead < 1 || bytesRead > MAX_LOGO_SIZE || finalStats.size !== bytesRead) return null;
    const bytes = buffer.subarray(0, bytesRead);
    validateLogoUpload({ type: contentType, size: bytesRead }, bytes);
    return { bytes, contentType };
  } catch {
    return null;
  } finally {
    await handle?.close().catch(() => undefined);
  }
}

export async function removeManagedLogoUpload(
  logoPath: string | null | undefined,
  projectRoot = process.cwd(),
) {
  const filename = managedLogoFilename(logoPath);
  const absolutePath =
    filename && logoPath?.startsWith("/uploads/")
      ? resolveLegacyLogoUpload(filename, projectRoot)
      : resolveManagedLogoUpload(logoPath, projectRoot);
  if (!absolutePath) return false;

  if (!(await isSafeDirectory(path.dirname(absolutePath)))) return false;

  try {
    const stats = await fs.lstat(absolutePath);
    if (!stats.isFile() && !stats.isSymbolicLink()) return false;
    await fs.unlink(absolutePath);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return false;
    throw error;
  }
}
