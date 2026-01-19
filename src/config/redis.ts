import Redis from "ioredis";
import Redlock from "redlock";
import { env } from "./env";

export const redis = new Redis(env.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 0,
});

const realRedlock = new Redlock([redis], {
  retryCount: 3,
  retryDelay: 200,
  retryJitter: 50,
});

// Mock redlock to allow testing without a running Redis server
export const redlock = {
  acquire: async (resources: string[], duration: number) => {
    console.warn("Using MOCK redlock acquisition for:", resources);
    return {
      release: async () => {
        console.log("Mock lock released");
      },
    };
  },
} as unknown as Redlock;

