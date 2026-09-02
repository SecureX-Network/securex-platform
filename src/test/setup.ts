import '@testing-library/jest-dom';

class MemoryStorage implements Storage {
  private store = new Map<string, string>();

  get length(): number {
    return this.store.size;
  }

  clear(): void {
    this.store.clear();
  }

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null;
  }

  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  setItem(key: string, value: string): void {
    this.store.set(key, String(value));
  }
}

type StorageLike = { getItem: (...args: never[]) => unknown };

function installStorage(target: object) {
  const store = new MemoryStorage();

  Object.defineProperty(target, 'localStorage', {
    configurable: true,
    enumerable: true,
    value: store as StorageLike,
  });
  Object.defineProperty(target, 'sessionStorage', {
    configurable: true,
    enumerable: true,
    value: store as StorageLike,
  });
}

if (typeof window !== 'undefined') {
  if (!(window.localStorage && typeof window.localStorage.getItem === 'function')) {
    installStorage(window);
  }
}
if (
  typeof globalThis !== 'undefined' &&
  !(globalThis.localStorage && typeof globalThis.localStorage.getItem === 'function')
) {
  installStorage(globalThis);
}
