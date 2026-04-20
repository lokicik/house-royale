const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { ILLER } = require('../../config');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-ej');
const DB_PATH = path.resolve('./data/emlakjet.db');
const BASE_URL = 'https://www.emlakjet.com';
const HEDEF = 50;
const DELAY_MIN = 5000;
const DELAY_MAX = 12000;

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function buildUrl(slug, page) {
  const base = `${BASE_URL}/satilik-daire/${slug}/`;
  return page > 1 ? `${base}?page=${page}` : base;
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

async function parsePage(page) {
  return page.evaluate(() => {
    const cards = document.querySelectorAll('div[data-id]');
    const results = [];

    cards.forEach(card => {
      try {
        const ilan_id = card.getAttribute('data-id') || '';
        if (!ilan_id) return;

        const linkEl = card.querySelector('a[href*="/ilan/"]');
        const href = linkEl?.getAttribute('href') || '';
        const url = href ? 'https://www.emlakjet.com' + href : '';

        const fiyatText = card.querySelector('[class*="price"]')?.textContent?.trim() || '';
        const fiyat = parseFloat(fiyatText.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || null;

        const baslik = card.querySelector('h3[class*="title"]')?.textContent?.trim() || '';
        const konum  = card.querySelector('[class*="location"]')?.textContent?.trim().replace(/\s+/g, ' ') || '';

        // "Daire | 1+1 | Bahçe katı | 50 m²" formatını parse et
        const quickText = card.querySelector('[class*="quickinfo"]')?.textContent?.trim() || '';
        const parts = quickText.split('|').map(s => s.trim());
        const oda_salon      = parts[1] || '';
        const kat            = parts[2] || '';
        const metrekare_brut = parseInt((parts[3] || '').replace(/[^\d]/g, '')) || null;

        results.push({ ilan_id, url, fiyat, tarih: '', baslik, konum_ham: konum,
          oda_salon, metrekare_brut, bina_yasi: '', kat });
      } catch (_) {}
    });

    return results;
  });
}

async function hasNextPage(page, currentPage) {
  return page.evaluate((cp) => {
    // emlakjet pagination: ?page=N query param
    const next = document.querySelector(`a[href*="page=${cp + 1}"]`);
    // alternatif: "Sonraki" butonu
    if (next) return true;
    const sonraki = Array.from(document.querySelectorAll('a')).find(a =>
      a.textContent?.trim() === 'Sonraki' || a.getAttribute('aria-label') === 'Sonraki sayfa'
    );
    return sonraki !== null && sonraki !== undefined;
  }, currentPage);
}

// Sayfa HTML'ini dump etmek için inspect modu
async function inspectPage(ilSlug) {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const page = await context.newPage();
  const url = buildUrl(ilSlug, 1);
  console.log(`\nInspect modu: ${url}\n`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(6000);

  const info = await page.evaluate(() => {
    // İlk kartın HTML'ini al
    const possibleSelectors = [
      'div.listing-card-bordered',
      'div[class*="listing-card"]',
      'article[class*="listing"]',
      'div[class*="listingCard"]',
      'div[class*="ListingCard"]',
      'li.listing-item',
      'div[data-id]',
    ];

    let found = null;
    for (const sel of possibleSelectors) {
      const els = document.querySelectorAll(sel);
      if (els.length > 0) {
        found = { selector: sel, count: els.length, html: els[0].outerHTML.substring(0, 2000) };
        break;
      }
    }

    // Tüm class'ları tara (listing içeren)
    const allEls = Array.from(document.querySelectorAll('*'));
    const listingClasses = new Set();
    allEls.forEach(el => {
      el.classList.forEach(c => {
        if (c.toLowerCase().includes('listing') || c.toLowerCase().includes('ilan') || c.toLowerCase().includes('card')) {
          listingClasses.add(c);
        }
      });
    });

    // İlk kartın tüm text içerikli elementlerini listele
    let elementDetails = [];
    if (found) {
      const sel = found.selector;
      const firstCard = document.querySelector(sel);
      if (firstCard) {
        firstCard.querySelectorAll('*').forEach(el => {
          const text = el.textContent?.trim().replace(/\s+/g, ' ');
          if (text && text.length < 100 && text.length > 1 && el.children.length === 0) {
            elementDetails.push({ tag: el.tagName, class: el.className, text });
          }
        });
      }
    }

    return { found: found ? { ...found, html: found.html } : null, listingClasses: Array.from(listingClasses).slice(0, 30), elementDetails: elementDetails.slice(0, 50) };
  });

  console.log('Bulunan class\'lar:', info.listingClasses.join(', '));
  if (info.found) {
    console.log(`\nSelector: ${info.found.selector} (${info.found.count} kart)`);
    console.log('\nİlk kartın tüm leaf elementleri (class → text):');
    info.elementDetails.forEach(e => {
      console.log(`  [${e.tag}] class="${e.class}" → "${e.text}"`);
    });
  } else {
    console.log('\nHiçbir ilan kartı bulunamadı! Lütfen sayfayı manuel inceleyin.');
    console.log('Tarayıcı açık kalıyor, DevTools\'u kullanabilirsiniz...');
    await new Promise(r => setTimeout(r, 120000));
  }

  await context.close();
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

  // İstanbul, Ankara, İzmir'i sona bırak (daha fazla ilan = daha yavaş)
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
        if (ilanlar.length === 0) {
          console.log('  Boş sayfa veya selector eşleşmedi, durdu.');
          break;
        }

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

module.exports = { runScraper, inspectPage };
