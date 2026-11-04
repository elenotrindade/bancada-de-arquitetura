import { defineConfig, devices } from '@playwright/test';

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

/**
 * Bancada de testes.
 * - funcional: cada componente e fluxo do app, isolado (contexto novo por teste).
 * - desempenho: benchmarks com CPU desacelerada; resultados em bench-results/.
 *
 * Rode com o app já compilado (npm run build). O servidor sobe sozinho.
 */
export default defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  timeout: 60_000,
  expect: { timeout: 7_000 },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: process.env.PW_HTML || 'playwright-report' }],
    ['json', { outputFile: process.env.PW_JSON || 'bench-results/funcional.json' }]
  ],
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    permissions: ['clipboard-read', 'clipboard-write'],
    acceptDownloads: true
  },
  projects: [
    {
      name: 'funcional',
      testIgnore: /perf\//,
      retries: process.env.CI ? 1 : 0,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    },
    {
      name: 'desempenho',
      testMatch: /perf\/.*\.spec\.ts/,
      fullyParallel: false,
      retries: 0,
      timeout: 180_000,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } }
    }
  ],
  workers: process.env.CI ? 2 : undefined,
  webServer: process.env.BASE_URL ? undefined : {
    command: `npm run start -- -p ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000
  }
});
