import { hc } from "hono/client";
import type { AppType } from "@repo/api";
import { API_URL } from "@/config";

const client = hc<AppType>(API_URL);



