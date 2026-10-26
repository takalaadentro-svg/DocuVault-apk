/**
 * High-speed client cache for document previews.
 * Prevents blank preview states, eliminates redundant network fetches,
 * and enables instant 0ms preview rendering when opening documents.
 */

interface CacheEntry {
  url: string;
  mimeType?: string;
  blob?: Blob;
  timestamp: number;
}

class PreviewCacheService {
  private cache = new Map<string, CacheEntry>();

  set(docId: string, url: string, mimeType?: string, blob?: Blob): void {
    if (!docId) return;
    // If an existing entry has an object URL that differs, revoke old one
    const existing = this.cache.get(docId);
    if (existing && existing.url !== url && existing.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(existing.url);
      } catch (e) {}
    }

    this.cache.set(docId, {
      url,
      mimeType,
      blob,
      timestamp: Date.now(),
    });
  }

  get(docId: string): CacheEntry | undefined {
    if (!docId) return undefined;
    return this.cache.get(docId);
  }

  has(docId: string): boolean {
    if (!docId) return false;
    return this.cache.has(docId);
  }

  storeBlob(docId: string, blob: Blob, explicitMime?: string): string {
    const mimeType = explicitMime || blob.type || 'application/octet-stream';
    const url = URL.createObjectURL(blob);
    this.set(docId, url, mimeType, blob);
    return url;
  }

  remove(docId: string): void {
    const entry = this.cache.get(docId);
    if (entry && entry.url.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(entry.url);
      } catch (e) {}
    }
    this.cache.delete(docId);
  }

  clear(): void {
    for (const entry of this.cache.values()) {
      if (entry.url.startsWith('blob:')) {
        try {
          URL.revokeObjectURL(entry.url);
        } catch (e) {}
      }
    }
    this.cache.clear();
  }
}

export const previewCache = new PreviewCacheService();
