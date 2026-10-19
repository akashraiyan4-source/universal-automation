import { Redis } from '@upstash/redis';
import { env } from './env';

/**
 * Tiny TTL key-value abstraction used by idempotency, slot locks and cooldowns.
 *
 *  • Upstash Redis when configured → consistent across all serverless instances.
 *  • Bounded in-memory Map otherwise  → per-instance (fine for local dev / single node).
 *
 * Redis errors degrade to memory instead of failing the user's request.
 */

export interface KeyValueStore {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, ttlSeconds: number): Promise<void>;
  /** Atomically set only if absent. Returns true when this call created the key. */
  setIfAbsent(key: string, value: unknown, ttlSeconds: number): Promise<boolean>;
  delete(key: string): Promise<void>;
}

const MAX_ENTRIES = 20_000;
// Shared through globalThis so every route bundle (and dev hot-reloads) see the same store.
const globalKv = globalThis as unknown as { __kvMemory?: Map<string, { value: unknown; expires: number }> };
const memory = (globalKv.__kvMemory ??= new Map<string, { value: unknown; expires: number }>());
let lastSweep = 0;

function sweep(now: number) {
  if (now - lastSweep < 15_000 && memory.size < MAX_ENTRIES) return;
  lastSweep = now;
  for (const [key, entry] of memory) if (entry.expires <= now) memory.delete(key);
  if (memory.size >= MAX_ENTRIES) {
    let toRemove = memory.size - MAX_ENTRIES + 2_000;
    for (const key of memory.keys()) {
      memory.delete(key);
      if (--toRemove <= 0) break;
    }
  }
}

const memoryStore: KeyValueStore = {
  async get<T>(key: string) {
    const now = Date.now();
    sweep(now);
    const entry = memory.get(key);
    if (!entry || entry.expires <= now) {
      memory.delete(key);
      return null;
    }
    return entry.value as T;
  },
  async set(key, value, ttlSeconds) {
    sweep(Date.now());
    memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  },
  async setIfAbsent(key, value, ttlSeconds) {
    const existing = await memoryStore.get(key);
    if (existing !== null) return false;
    await memoryStore.set(key, value, ttlSeconds);
    return true;
  },
  async delete(key) {
    memory.delete(key);
  },
};

let redis: Redis | null = null;

function getRedis(): Redis | null {
  const url = env.upstashUrl();
  const token = env.upstashToken();
  if (!url || !token) return null;
  try {
    redis ??= new Redis({ url, token });
    return redis;
  } catch {
    return null;
  }
}

const redisStore: KeyValueStore = {
  async get<T>(key: string) {
    const client = getRedis();
    if (!client) return memoryStore.get<T>(key);
    try {
      return (await client.get<T>(key)) ?? null;
    } catch (error) {
      console.error('[KV] redis get failed, using memory:', error instanceof Error ? error.message : error);
      return memoryStore.get<T>(key);
    }
  },
  async set(key, value, ttlSeconds) {
    const client = getRedis();
    if (!client) return memoryStore.set(key, value, ttlSeconds);
    try {
      await client.set(key, value, { ex: ttlSeconds });
    } catch (error) {
      console.error('[KV] redis set failed, using memory:', error instanceof Error ? error.message : error);
      await memoryStore.set(key, value, ttlSeconds);
    }
  },
  async setIfAbsent(key, value, ttlSeconds) {
    const client = getRedis();
    if (!client) return memoryStore.setIfAbsent(key, value, ttlSeconds);
    try {
      const result = await client.set(key, value, { ex: ttlSeconds, nx: true });
      return result === 'OK';
    } catch (error) {
      console.error('[KV] redis setNX failed, using memory:', error instanceof Error ? error.message : error);
      return memoryStore.setIfAbsent(key, value, ttlSeconds);
    }
  },
  async delete(key) {
    const client = getRedis();
    if (!client) return memoryStore.delete(key);
    try {
      await client.del(key);
    } catch (error) {
      console.error('[KV] redis del failed:', error instanceof Error ? error.message : error);
      await memoryStore.delete(key);
    }
  },
};

export const kv: KeyValueStore = redisStore;
