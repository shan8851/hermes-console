import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { Hono } from "hono";
import { describe, expect, it } from "vitest";

import { isPathInsideDirectory, registerStaticSite } from "@/static-site";

describe("isPathInsideDirectory", () => {
  const createTestApp = (webDistDir: string) => {
    const app = new Hono();

    app.onError((error, context) =>
      context.json(
        {
          error:
            error instanceof Error ? error.message : "Unexpected server error",
        },
        500,
      ),
    );

    registerStaticSite({
      app,
      webDistDir,
    });

    return app;
  };

  it("accepts files inside the static asset root", () => {
    expect(
      isPathInsideDirectory({
        rootPath: "/tmp/dist",
        targetPath: "/tmp/dist/assets/app.js",
      }),
    ).toBe(true);
  });

  it("rejects sibling-prefix escapes that share the same string prefix", () => {
    expect(
      isPathInsideDirectory({
        rootPath: "/tmp/dist",
        targetPath: "/tmp/dist-evil/app.js",
      }),
    ).toBe(false);
  });

  it("rejects normalized parent-directory traversal targets", () => {
    expect(
      isPathInsideDirectory({
        rootPath: "/tmp/dist",
        targetPath: path.resolve("/tmp/dist", "../secret.txt"),
      }),
    ).toBe(false);
  });

  it("returns 404 for missing asset-like requests instead of serving the SPA index", async () => {
    const webDistDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-static-"),
    );
    fs.writeFileSync(
      path.join(webDistDir, "index.html"),
      "<!doctype html><html><body>index</body></html>",
    );

    const app = createTestApp(webDistDir);

    const response = await app.request("http://localhost/assets/missing.js");

    expect(response.status).toBe(404);
    expect(response.headers.get("content-type") ?? "").not.toContain(
      "text/html",
    );
  });

  it("still serves the SPA index for route-like requests without a file extension", async () => {
    const webDistDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-static-"),
    );
    const indexContent = "<!doctype html><html><body>index</body></html>";
    fs.writeFileSync(path.join(webDistDir, "index.html"), indexContent);

    const app = createTestApp(webDistDir);

    const response = await app.request("http://localhost/not-a-real-route");

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(await response.text()).toBe(indexContent);
  });

  it("returns a controlled text response when index.html exists but is unreadable", async () => {
    const webDistDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-static-"),
    );
    fs.mkdirSync(path.join(webDistDir, "index.html"));

    const app = createTestApp(webDistDir);
    const response = await app.request("http://localhost/not-a-real-route");

    expect(response.status).toBe(500);
    expect(response.headers.get("content-type") ?? "").toContain("text/plain");
    expect(await response.text()).toBe(
      "Hermes Console web assets could not be read.",
    );
  });

  it("returns 503 when index.html is missing for a route-like request", async () => {
    const webDistDir = fs.mkdtempSync(
      path.join(os.tmpdir(), "hermes-console-static-"),
    );

    const app = createTestApp(webDistDir);
    const response = await app.request("http://localhost/not-a-real-route");

    expect(response.status).toBe(503);
    expect(await response.text()).toContain("Run `pnpm build` before `pnpm start`");
  });
});
