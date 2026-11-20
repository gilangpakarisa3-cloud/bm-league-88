const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const SIZES = [
  { name: 'icon-32x32.png', size: 32 },
  { name: 'icon-72x72.png', size: 72 },
  { name: 'icon-96x96.png', size: 96 },
  { name: 'icon-128x128.png', size: 128 },
  { name: 'icon-144x144.png', size: 144 },
  { name: 'icon-152x152.png', size: 152 },
  { name: 'icon-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'icon-384x384.png', size: 384 },
  { name: 'icon-512x512.png', size: 512 }
];

async function generate() {
  const svgPath = path.join(__dirname, '..', 'public', 'icons', 'ucl-app-icon.svg');
  const svgContent = fs.readFileSync(svgPath, 'utf8');

  const browser = await chromium.launch({ channel: 'chrome' });
  const context = await browser.newContext({ deviceScaleFactor: 1 });
  const page = await context.newPage();

  console.log('Rendering icons from:', svgPath);

  for (const { name, size } of SIZES) {
    await page.setViewportSize({ width: size, height: size });
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body, html { width: ${size}px; height: ${size}px; overflow: hidden; background: transparent; }
            svg { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `;
    await page.setContent(html);
    // wait a tick for rendering
    await page.waitForTimeout(100);

    const outPath = path.join(__dirname, '..', 'public', 'icons', name);
    await page.screenshot({ path: outPath, omitBackground: false });
    console.log(`Generated: ${name} (${size}x${size}) -> ${outPath}`);
  }

  await browser.close();
  console.log('All icons generated successfully!');
}

generate().catch(err => {
  console.error('Failed generating icons:', err);
  process.exit(1);
});
