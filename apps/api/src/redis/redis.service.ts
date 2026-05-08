import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

interface Entry { value: string; expiresAt: number }

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: import("ioredis").default | null = null;
  private memStore = new Map<string, Entry>();

  constructor(private config: ConfigService) {}

  async onModuleInit() {
    try {
      const { default: Redis } = await import("ioredis");
      const url = this.config.get<string>("REDIS_URL") || "redis://localhost:6379";
      const client = new Redis(url, {
        lazyConnect: true,
        connectTimeout: 2000,
        maxRetriesPerRequest: 0,
        retryStrategy: () => null, // no reconnect attempts
        enableOfflineQueue: false,
      });
      client.on("error", () => {}); // suppress unhandled error events
      await client.connect();
      await client.ping();
      this.client = client;
      this.logger.log("Redis connected");
    } catch {
      this.logger.warn("Redis unavailable — using in-memory store (dev only)");
    }
  }

  async onModuleDestroy() {
    await this.client?.quit();
  }

  async set(key: string, value: string, ttlSeconds: number) {
    if (this.client) {
      await this.client.set(key, value, "EX", ttlSeconds);
    } else {
      this.memStore.set(key, { value, expiresAt: Date.now() + ttlSeconds * 1000 });
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.client) return this.client.get(key);
    const entry = this.memStore.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) { this.memStore.delete(key); return null; }
    return entry.value;
  }

  async del(key: string) {
    if (this.client) await this.client.del(key);
    else this.memStore.delete(key);
  }
}
