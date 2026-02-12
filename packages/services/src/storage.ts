export class StorageService {
  private storageKey = 'treefrog-cache';

  save<T>(key: string, data: T, ttl?: number): void {
    const entry = {
      data,
      timestamp: Date.now(),
      ttl,
    };
    const storage = this.getAllStorage();
    storage[key] = entry;
    localStorage.setItem(this.storageKey, JSON.stringify(storage));
  }

  get<T>(key: string): T | null {
    const storage = this.getAllStorage();
    const entry = storage[key];

    if (!entry) return null;

    // Check if expired
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      delete storage[key];
      localStorage.setItem(this.storageKey, JSON.stringify(storage));
      return null;
    }

    return entry.data as T;
  }

  remove(key: string): void {
    const storage = this.getAllStorage();
    delete storage[key];
    localStorage.setItem(this.storageKey, JSON.stringify(storage));
  }

  clear(): void {
    localStorage.removeItem(this.storageKey);
  }

  private getAllStorage(): Record<string, any> {
    try {
      const data = localStorage.getItem(this.storageKey);
      return data ? JSON.parse(data) : {};
    } catch {
      return {};
    }
  }
}

export const storageService = new StorageService();
export default storageService;
