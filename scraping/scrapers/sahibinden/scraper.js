const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { ILLER, SAHIBINDEN, DB_PATH } = require('../../config');

chromium.use(StealthPlugin());

const COOKIE_PATH = path.resolve(SAHIBINDEN.COOKIE_FILE);
const USER_DATA_DIR = path.resolve('./browser-profile');
const HEDEF_ILAN = 50; // Her il için max ilan sayısı

function loadCookies() {
  const raw = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
  const valid = new Set(['Strict', 'Lax', 'None']);
  return raw.map(c => ({ ...c, sameSite: valid.has(c.sameSite) ? c.sameSite : 'Lax' }));
}

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function initDb() {
  const db = new Database(path.resolve(DB_PATH));
  db.exec(`
    CREATE TABLE IF NOT EXISTS ilanlar (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      ilan_id          TEXT UNIQUE,
      il               TEXT,
      il_id            INTEGER,
      baslik           TEXT,
      url              TEXT,
      fiyat            REAL,
      tarih            TEXT,
      konum_ham        TEXT,
      metrekare        INTEGER,
      metrekare_brut   INTEGER,
      metrekare_net    INTEGER,
      oda_salon        TEXT,
      bina_yasi        TEXT,
      bulundugu_kat    TEXT,
      kat_sayisi       TEXT,
      isitma           TEXT,
      banyo_sayisi     TEXT,
      mutfak           TEXT,
      balkon           TEXT,
      asansor          TEXT,
      otopark          TEXT,
      esyali           TEXT,
      kullanim_durumu  TEXT,
      site_icerisinde  TEXT,
      site_adi         TEXT,
      aidat            TEXT,
      krediye_uygun    TEXT,
      tapu_durumu      TEXT,
      kimden           TEXT,
      takas            TEXT,
      cekilis_tarihi   TEXT
    );

    CREATE TABLE IF NOT EXISTS ilerleme (
      il_id       INTEGER PRIMARY KEY,
      il_adi      TEXT,
      tamamlandi  INTEGER DEFAULT 0,
      cekilen     INTEGER DEFAULT 0
    );
  `);
  return db;
}

// Liste sayfasından ilan URL'lerini topla (max 50)
async function collectUrls(page, il) {
  const urls = [];
  let offset = 0;

  while (urls.length < HEDEF_ILAN) {
    const listUrl = `${SAHIBINDEN.BASE_URL}${SAHIBINDEN.CATEGORY_PATH}/${il.slug}?pagingOffset=${offset}&pagingSize=${SAHIBINDEN.PAGE_SIZE}`;
    console.log(`  [${il.ad}] Liste: ${listUrl}`);

    await page.goto(listUrl, { waitUntil: 'domcontentloaded', timeout: SAHIBINDEN.REQUEST_TIMEOUT });
    await page.waitForTimeout(2000 + Math.random() * 1500);

    const pageUrls = await page.evaluate(() => {
      const rows = document.querySelectorAll('tr.searchResultsItem');
      return [...rows].map(row => {
        const link = row.querySelector('td.searchResultsLargeThumbnail a');
        const id   = row.getAttribute('data-id') || '';
        const baslik = row.querySelector('td.searchResultsTitleValue')?.textContent?.trim() || '';
        const fiyatText = row.querySelector('td.searchResultsPriceValue')?.textContent?.trim() || '';
        const attrs = row.querySelectorAll('td.searchResultsAttributeValue');
        const tarih  = row.querySelector('td.searchResultsDateValue')?.textContent?.trim().replace(/\s+/g,' ') || '';
        const konum  = row.querySelector('td.searchResultsLocationValue')?.textContent?.trim().replace(/\s+/g,' ') || '';
        return {
          ilan_id: id,
          url: link?.href || '',
          baslik,
          fiyat: parseFloat(fiyatText.replace(/\./g,'').replace(',','.').replace(/[^\d.]/g,'')) || null,
          tarih,
          konum_ham: konum,
          metrekare: parseInt(attrs[0]?.textContent?.trim().replace(/[^\d]/g,'')) || null,
          oda_salon: attrs[1]?.textContent?.trim() || '',
        };
      }).filter(r => r.url && r.ilan_id);
    });

    if (pageUrls.length === 0) break;

    for (const item of pageUrls) {
      if (urls.length < HEDEF_ILAN) urls.push(item);
    }

    const hasNext = await page.evaluate(() => {
      const next = document.querySelector('.prevNextBut.next:not(.disabled)');
      return next !== null;
    });
    if (!hasNext) break;

    offset += SAHIBINDEN.PAGE_SIZE;
    await randomDelay(3000, 6000);
  }

  return urls;
}

// Detay sayfasından tüm özellikleri çek
async function fetchDetail(page, listingData) {
  const base = listingData.url.split('?')[0].replace(/\/$/, '');
  const detayUrl = base.endsWith('/detay') ? base : base + '/detay';

  await page.goto(detayUrl, { waitUntil: 'domcontentloaded', timeout: SAHIBINDEN.REQUEST_TIMEOUT });
  await page.waitForTimeout(2000 + Math.random() * 1500);

  const raw = await page.evaluate(() => {
    const items = document.querySelectorAll('ul.classified-info-list li');
    const data = {};
    items.forEach(li => {
      const label = li.querySelector('strong')?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const value = li.querySelector('span:not(.price-history-detail-wrapper)')?.textContent?.trim().replace(/\s+/g, ' ') || '';
      if (label && value) data[label] = value;
    });
    return data;
  });

  return {
    ...listingData,
    metrekare_brut:   raw['m² (Brüt)']         ? parseInt(raw['m² (Brüt)'])        : null,
    metrekare_net:    raw['m² (Net)']           ? parseInt(raw['m² (Net)'])         : null,
    bina_yasi:        raw['Bina Yaşı']          || null,
    bulundugu_kat:    raw['Bulunduğu Kat']      || null,
    kat_sayisi:       raw['Kat Sayısı']         || null,
    isitma:           raw['Isıtma']             || null,
    banyo_sayisi:     raw['Banyo Sayısı']       || null,
    mutfak:           raw['Mutfak']             || null,
    balkon:           raw['Balkon']             || null,
    asansor:          raw['Asansör']            || null,
    otopark:          raw['Otopark']            || null,
    esyali:           raw['Eşyalı']             || null,
    kullanim_durumu:  raw['Kullanım Durumu']    || null,
    site_icerisinde:  raw['Site İçerisinde']    || null,
    site_adi:         raw['Site Adı']           || null,
    aidat:            raw['Aidat (TL)']         || null,
    krediye_uygun:    raw['Krediye Uygun']      || null,
    tapu_durumu:      raw['Tapu Durumu']        || null,
    kimden:           raw['Kimden']             || null,
    takas:            raw['Takas']              || null,
  };
}

async function runScraper() {
  const db = initDb();
  const cookies = loadCookies();

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });
  await context.addCookies(cookies);
  let page = await context.newPage();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ilanlar (
      ilan_id, il, il_id, baslik, url, fiyat, tarih, konum_ham,
      metrekare, metrekare_brut, metrekare_net, oda_salon,
      bina_yasi, bulundugu_kat, kat_sayisi, isitma, banyo_sayisi,
      mutfak, balkon, asansor, otopark, esyali, kullanim_durumu,
      site_icerisinde, site_adi, aidat, krediye_uygun, tapu_durumu,
      kimden, takas, cekilis_tarihi
    ) VALUES (
      @ilan_id, @il, @il_id, @baslik, @url, @fiyat, @tarih, @konum_ham,
      @metrekare, @metrekare_brut, @metrekare_net, @oda_salon,
      @bina_yasi, @bulundugu_kat, @kat_sayisi, @isitma, @banyo_sayisi,
      @mutfak, @balkon, @asansor, @otopark, @esyali, @kullanim_durumu,
      @site_icerisinde, @site_adi, @aidat, @krediye_uygun, @tapu_durumu,
      @kimden, @takas, @cekilis_tarihi
    )
  `);

  // Büyük şehirleri sona bırak
  const siralanmis = [...ILLER].sort((a, b) => {
    const buyuk = new Set([34, 6, 35]);
    return (buyuk.has(a.id) ? 1 : 0) - (buyuk.has(b.id) ? 1 : 0);
  });

  console.log(`\n${siralanmis.length} il işlenecek, her ilden max ${HEDEF_ILAN} ilan\n`);

  for (const il of siralanmis) {
    const ilerleme = db.prepare('SELECT * FROM ilerleme WHERE il_id = ?').get(il.id);
    if (ilerleme?.tamamlandi) {
      console.log(`[ATLA] ${il.ad}`);
      continue;
    }

    console.log(`\n=== ${il.ad} (${il.id}/81) ===`);

    try {
      // 1. Liste sayfalarından URL topla
      if (page.isClosed()) page = await context.newPage();
      const listings = await collectUrls(page, il);
      console.log(`  ${listings.length} ilan URL'si toplandı`);

      // 2. Her ilan için detay sayfasına git
      let kaydedilen = 0;
      for (let i = 0; i < listings.length; i++) {
        try {
          // Sayfa kapandıysa yeniden aç
          if (page.isClosed()) {
            page = await context.newPage();
          }
          const detay = await fetchDetail(page, listings[i]);
          insertStmt.run({ ...detay, il: il.ad, il_id: il.id, cekilis_tarihi: new Date().toISOString() });
          kaydedilen++;
          process.stdout.write(`\r  Detay: ${i + 1}/${listings.length} (${kaydedilen} kaydedildi)`);

          await randomDelay(8000, 20000);
        } catch (err) {
          console.error(`\n  Detay hatası (${listings[i].ilan_id}):`, err.message);
          if (page.isClosed()) page = await context.newPage();
          await randomDelay(20000, 40000);
        }
      }

      console.log(`\n  ${il.ad} tamamlandı: ${kaydedilen} ilan`);
      db.prepare('INSERT OR REPLACE INTO ilerleme VALUES (@il_id, @il_adi, 1, @cekilen)')
        .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen });

    } catch (err) {
      console.error(`\nHATA (${il.ad}):`, err.message);
      db.prepare('INSERT OR IGNORE INTO ilerleme VALUES (@il_id, @il_adi, 0, 0)')
        .run({ il_id: il.id, il_adi: il.ad });
    }

    // İller arası bekleme: 45-90 saniye
    await randomDelay(45000, 90000);
  }

  const toplam = db.prepare('SELECT COUNT(*) as t FROM ilanlar').get();
  console.log(`\nTamamlandı! Toplam: ${toplam.t} ilan`);

  await context.close();
  db.close();
}

module.exports = { runScraper };
