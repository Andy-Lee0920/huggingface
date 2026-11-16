#!/usr/bin/env node
// 덱 → output/deck.pdf (한 페이지 = 한 장, 1920×1080). 페이지 수가 장 수와 같은지 검사한다.
// 사용: node scripts/export-pdf.mjs      종료 코드 0 = 성공, 1 = 실패
import { mkdirSync, readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startServer } from './serve.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'output/deck.pdf');
mkdirSync(dirname(out), { recursive: true });

const server = await startServer(root);
const browser = await chromium.launch();
let ok = false;
let message = '';
try {
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  await page.goto(server.url + '?motion=off#1', { waitUntil: 'networkidle' });
  await page.waitForSelector('.slide.is-active', { timeout: 10000 });
  await page.evaluate(() => document.fonts.ready);
  const slides = await page.locator('.slide').count();
  await page.evaluate(() => window.dispatchEvent(new Event('beforeprint')));
  await page.emulateMedia({ media: 'print' });
  await page.pdf({ path: out, preferCSSPageSize: true, printBackground: true });
  const pdf = readFileSync(out, 'latin1');
  const pages = (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length;
  ok = pages === slides;
  message = `${pages}쪽 / ${slides}장, ${(statSync(out).size / 1024).toFixed(0)} KB`;
} catch (e) {
  message = `PDF 생성 실패: ${e.message}`;
} finally {
  await browser.close();
  await server.close();
}
console.log(`${ok ? '✔' : '✖'} output/deck.pdf — ${message}`);
process.exit(ok ? 0 : 1);
