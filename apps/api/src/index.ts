import { serve } from "@hono/node-server";

import { createApp } from "@/app";
import { readServerConfig } from "@/config";

const config = readServerConfig();

const app = createApp({
  config,
});

serve({
  fetch: app.fetch,
  hostname: "127.0.0.1",
  port: config.port,
});

export { app };
