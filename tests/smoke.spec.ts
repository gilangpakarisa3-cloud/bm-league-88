import { test, expect } from '@playwright/test';

const BASE_URL = process.env.TEST_URL || 'https://studio--studio-2162727345-cf90e.us-central1.hosted.app';

test.describe('BM LEAGUE 88 - Smoke Tests', () => {
  const pages = [
    { name: 'Home', path: '/' },
    { name: 'League', path: '/league' },
    { name: 'Fixtures', path: '/fixtures' },
    { name: 'Players', path: '/players' },
    { name: 'Teams', path: '/teams' },
    { name: 'Hall of Fame', path: '/hall-of-fame' },
  ];

  for (const p of pages) {
    test(`Halaman ${p.name} (${p.path}) harus termuat tanpa error runtime console`, async ({ page }) => {
      const consoleErrors: string[] = [];

      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(msg.text());
        }
      });

      page.on('pageerror', (err) => {
        consoleErrors.push(err.message);
      });

      const response = await page.goto(`${BASE_URL}${p.path}`, { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // Beri jeda rendering hidrasi React
      await page.waitForTimeout(1500);

      // Verifikasi tidak ada error runtime JavaScript fatal (ReferenceError, TypeError, dll)
      const fatalErrors = consoleErrors.filter(e => 
        e.includes('ReferenceError') || 
        e.includes('is not defined') || 
        e.includes('TypeError')
      );

      expect(fatalErrors, `Ditemukan fatal JS error pada ${p.path}:\n${fatalErrors.join('\n')}`).toHaveLength(0);
    });
  }
});
