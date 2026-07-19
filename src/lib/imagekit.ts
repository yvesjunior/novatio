import ImageKit from "imagekit";

/**
 * Lazily-constructed ImageKit client (server-side only — uses the private key).
 *
 * Required env:
 *   IMAGEKIT_PUBLIC_KEY
 *   IMAGEKIT_PRIVATE_KEY
 *   IMAGEKIT_URL_ENDPOINT   e.g. https://ik.imagekit.io/<your_id>
 */
let client: ImageKit | null = null;

export function getImageKit(): ImageKit {
  if (client) return client;
  const publicKey = process.env.IMAGEKIT_PUBLIC_KEY;
  const privateKey = process.env.IMAGEKIT_PRIVATE_KEY;
  const urlEndpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!publicKey || !privateKey || !urlEndpoint) {
    throw new Error(
      "ImageKit env vars (IMAGEKIT_PUBLIC_KEY, IMAGEKIT_PRIVATE_KEY, IMAGEKIT_URL_ENDPOINT) are not all set",
    );
  }
  client = new ImageKit({ publicKey, privateKey, urlEndpoint });
  return client;
}

/**
 * Delete a single file from ImageKit given its CDN URL. Best-effort:
 *   - Skips URLs that don't belong to our configured endpoint (e.g. local paths).
 *   - Resolves the file's fileId by listing its folder and matching the filePath,
 *     then deletes it. Never throws — returns true only on a confirmed delete.
 */
export async function deleteImageByUrl(url: unknown): Promise<boolean> {
  const endpoint = process.env.IMAGEKIT_URL_ENDPOINT;
  if (!endpoint || typeof url !== "string" || !url.startsWith(endpoint)) return false;

  let filePath = url.slice(endpoint.length).split("?")[0].split("#")[0];
  try {
    filePath = decodeURIComponent(filePath);
  } catch {
    // keep as-is if it isn't valid percent-encoding
  }
  if (!filePath.startsWith("/")) filePath = "/" + filePath;
  const name = filePath.slice(filePath.lastIndexOf("/") + 1);
  const folder = filePath.slice(0, filePath.length - name.length - 1) || "/";
  if (!name) return false;

  try {
    const ik = getImageKit();
    const files = (await ik.listFiles({ path: folder, limit: 1000 })) as Array<{
      fileId?: string;
      filePath?: string;
    }>;
    const match = files.find((f) => f.filePath === filePath);
    if (match?.fileId) {
      await ik.deleteFile(match.fileId);
      return true;
    }
  } catch (err) {
    console.error("[imagekit] delete failed for", url, err);
  }
  return false;
}

/** Best-effort delete of many URLs; returns the count actually removed. */
export async function deleteImagesByUrls(urls: unknown[]): Promise<number> {
  const results = await Promise.allSettled((urls ?? []).map((u) => deleteImageByUrl(u)));
  return results.filter((r) => r.status === "fulfilled" && r.value).length;
}
