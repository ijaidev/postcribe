import { hc } from "hono/client";
import type { AppType } from "@repo/api";

const clientUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

// Pre-compile types to avoid infinite recursion - this calculates the type when compiling
export type Client = ReturnType<typeof hc<AppType>>;

export const hcWithType = (...args: Parameters<typeof hc>): Client =>
  hc<AppType>(...args);

export const client = hcWithType(clientUrl);
