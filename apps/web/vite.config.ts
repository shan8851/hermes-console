import fs from 'node:fs';
import path from 'node:path';

import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';

const defaultApiPort = 3940;
const repoRoot = path.resolve(__dirname, '../..');

const readAppVersion = (): string => {
  const packagePath = path.join(repoRoot, 'package.json');
  const packageContent = fs.readFileSync(packagePath, 'utf8');
  const parsedPackage = JSON.parse(packageContent) as { version?: unknown };

  return typeof parsedPackage.version === 'string' ? parsedPackage.version : '0.0.0';
};

const readApiPort = (rawPort: string | undefined): number => {
  if (rawPort == null || rawPort === '') {
    return defaultApiPort;
  }

  if (!/^\d+$/.test(rawPort)) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  const parsedPort = Number(rawPort);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error('PORT must be an integer between 1 and 65535.');
  }

  return parsedPort;
};

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, repoRoot, '');
  const apiPort = readApiPort(environment.PORT);

  return {
    define: {
      'globalThis.__APP_VERSION__': JSON.stringify(readAppVersion())
    },
    envDir: repoRoot,
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    server: {
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`
      }
    }
  };
});
