const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { ILLER } = require('../../config');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-he');
const DB_PATH = path.resolve('./data/hepsiemlak.db');
const BASE_URL = 'https://www.hepsiemlak.com';
const HEDEF = 50;
const DELAY_MIN = 6000;
const DELAY_MAX = 14000;

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function initDb() {
  const db = new Database(DB_PATH);
  db.exec(`
    CREATE TABLE IF NOT EXISTS ilanlar (
      id             INTEGER PRIMARY KEY AUTOINCREMENT,
      ilan_id        TEXT UNIQUE,
      il             TEXT,
      il_id          INTEGER,
      baslik         TEXT,
      url            TEXT,
      fiyat          REAL,
      tarih          TEXT,
      konum_ham      TEXT,
      oda_salon      TEXT,
      metrekare_brut INTEGER,
      bina_yasi      TEXT,
      kat            TEXT,
      cekilis_tarihi TEXT
    );

    CREATE TABLE IF NOT EXISTS ilerleme (
      il_id      INTEGER PRIMARY KEY,
      il_adi     TEXT,
      tamamlandi INTEGER DEFAULT 0,
      cekilen    INTEGER DEFAULT 0
    );
  `);
  return db;
}

function buildUrl(slug, page) {
  const base = `${BASE_URL}/${slug}-satilik/daire`;
  return page > 1 ? `${base}?page=${page}` : base;
}

async function parsePage(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('li.listing-item');
    const results = [];

    cards.forEach(card => {
      try {
        const link = card.querySelector('a.listingView__card-link');
        const url  = link?.href || '';
        const ilan_id = url.split('/').pop() || '';

        const fiyatText = card.querySelector('.list-view-price')?.textContent?.trim() || '';
        const fiyat = parseFloat(fiyatText.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || null;

        const tarih   = card.querySelector('time.list-view-date')?.textContent?.trim() || '';
        const baslik  = card.querySelector('h3')?.textContent?.trim() || '';
        const konum   = card.querySelector('address')?.textContent?.trim().replace(/\s+/g, ' ') || '';

        const oda     = card.querySelector('dd.houseRoomCount')?.textContent?.trim().replace(/\s+/g, '') || '';
        const m2Text  = card.querySelector('dd.squareMeter')?.textContent?.trim() || '';
        const metrekare_brut = parseInt(m2Text.replace(/[^\d]/g, '')) || null;
        const bina_yasi = card.querySelector('dd.buildingAge')?.textContent?.trim() || '';
        const kat       = card.querySelector('dd.floortype')?.textContent?.trim() || '';

        if (ilan_id) {
          results.push({ ilan_id, url, fiyat, tarih, baslik, konum_ham: konum,
            oda_salon: oda, metrekare_brut, bina_yasi, kat });
        }
      } catch (_) {}
    });

    return results;
  });
}

async function hasNextPage(page, currentPage) {
  return page.evaluate((cp) => {
    const next = document.querySelector(`a.he-pagination__link[href*="page=${cp + 1}"]`);
    return next !== null;
  }, currentPage);
}

async function runScraper() {
  const db = initDb();

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  let page = await context.newPage();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ilanlar
      (ilan_id, il, il_id, baslik, url, fiyat, tarih, konum_ham,
       oda_salon, metrekare_brut, bina_yasi, kat, cekilis_tarihi)
    VALUES
      (@ilan_id, @il, @il_id, @baslik, @url, @fiyat, @tarih, @konum_ham,
       @oda_salon, @metrekare_brut, @bina_yasi, @kat, @cekilis_tarihi)
  `);

  const siralanmis = [...ILLER].sort((a, b) => {
    const buyuk = new Set([34, 6, 35]);
    return (buyuk.has(a.id) ? 1 : 0) - (buyuk.has(b.id) ? 1 : 0);
  });

  console.log(`\n${siralanmis.length} il işlenecek, her ilden max ${HEDEF} ilan\n`);

  for (const il of siralanmis) {
    const ilerleme = db.prepare('SELECT * FROM ilerleme WHERE il_id = ?').get(il.id);
    if (ilerleme?.tamamlandi) { console.log(`[ATLA] ${il.ad}`); continue; }

    console.log(`\n=== ${il.ad} ===`);
    let kaydedilen = 0;
    let sayfa = 1;

    try {
      while (kaydedilen < HEDEF) {
        const url = buildUrl(il.slug, sayfa);
        console.log(`  Sayfa ${sayfa}: ${url}`);

        if (page.isClosed()) page = await context.newPage();
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(4000 + Math.random() * 2000);

        const ilanlar = await parsePage(page);
        if (ilanlar.length === 0) { console.log('  Boş sayfa, durdu.'); break; }

        for (const ilan of ilanlar) {
          if (kaydedilen >= HEDEF) break;
          insertStmt.run({ ...ilan, il: il.ad, il_id: il.id, cekilis_tarihi: new Date().toISOString() });
          kaydedilen++;
        }

        process.stdout.write(`\r  Kaydedilen: ${kaydedilen}/${HEDEF}`);

        if (kaydedilen >= HEDEF) break;
        const devam = await hasNextPage(page, sayfa);
        if (!devam) break;

        sayfa++;
        await randomDelay(DELAY_MIN, DELAY_MAX);
      }

      console.log(`\n  ${il.ad} tamamlandı: ${kaydedilen} ilan`);
      db.prepare('INSERT OR REPLACE INTO ilerleme VALUES (@il_id, @il_adi, 1, @cekilen)')
        .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen });

    } catch (err) {
      console.error(`\nHATA (${il.ad}):`, err.message);
      db.prepare('INSERT OR IGNORE INTO ilerleme VALUES (@il_id, @il_adi, 0, 0)')
        .run({ il_id: il.id, il_adi: il.ad });
    }

    await randomDelay(20000, 45000);
  }

  const toplam = db.prepare('SELECT COUNT(*) as t FROM ilanlar').get();
  console.log(`\nTamamlandı! Toplam: ${toplam.t} ilan`);

  await context.close();
  db.close();
}

module.exports = { runScraper };
