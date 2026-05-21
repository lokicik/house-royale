const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const { ILLER } = require('../../config');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-ej');
const DB_PATH = path.resolve('./data/emlakjet.db');
const BASE_URL = 'https://www.emlakjet.com';
const BASLANGIC_SAYFA = 2;
const HEDEF = 50;
const DELAY_MIN = 1500;
const DELAY_MAX = 4000;
const DETAY_DELAY_MIN = 1500;
const DETAY_DELAY_MAX = 3500;

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function buildListeUrl(slug, page) {
  return `${BASE_URL}/satilik-daire/${slug}?sayfa=${page}`;
}

function initDb() {
  const db = new Database(DB_PATH);
  // Mevcut tablo üzerine yazar, yeni kolonlar yoksa ekle
  const cols = db.pragma('table_info(ilanlar)').map(c => c.name);
  const ekle = (col, type) => {
    if (!cols.includes(col)) db.exec(`ALTER TABLE ilanlar ADD COLUMN ${col} ${type}`);
  };
  ekle('metrekare_net',    'INTEGER');
  ekle('kat_sayisi',       'TEXT');
  ekle('isitma',           'TEXT');
  ekle('banyo_sayisi',     'TEXT');
  ekle('balkon',           'TEXT');
  ekle('asansor',          'TEXT');
  ekle('otopark',          'TEXT');
  ekle('esyali',           'TEXT');
  ekle('kullanim_durumu',  'TEXT');
  ekle('site_icerisinde',  'TEXT');
  ekle('site_adi',         'TEXT');
  ekle('aidat',            'TEXT');
  ekle('krediye_uygun',    'TEXT');
  ekle('tapu_durumu',      'TEXT');
  ekle('kimden',           'TEXT');
  ekle('takas',            'TEXT');
  ekle('ilce',             'TEXT');
  ekle('mahalle',          'TEXT');
  ekle('detay_cekimi',     'INTEGER DEFAULT 0');

  db.exec(`
    CREATE TABLE IF NOT EXISTS ilerleme_r2 (
      il_id      INTEGER PRIMARY KEY,
      il_adi     TEXT,
      tamamlandi INTEGER DEFAULT 0,
      cekilen    INTEGER DEFAULT 0,
      son_sayfa  INTEGER DEFAULT 2
    );
  `);
  // Eski kayıtlarda son_sayfa kolonu yoksa ekle
  try { db.exec('ALTER TABLE ilerleme_r2 ADD COLUMN son_sayfa INTEGER DEFAULT 2'); } catch (_) {}
  return db;
}

async function parseListePage(page) {
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
        const quickText = card.querySelector('[class*="quickinfo"]')?.textContent?.trim() || '';
        const parts = quickText.split('|').map(s => s.trim());
        const oda_salon      = parts[1] || '';
        const kat            = parts[2] || '';
        const metrekare_brut = parseInt((parts[3] || '').replace(/[^\d]/g, '')) || null;
        if (ilan_id && url) results.push({ ilan_id, url, fiyat, baslik, konum_ham: konum, oda_salon, metrekare_brut, kat });
      } catch (_) {}
    });
    return results;
  });
}

async function parseDetailPage(page) {
  return page.evaluate(() => {
    const data = {};
    document.querySelectorAll('span[class*="key"]').forEach(keyEl => {
      const label = keyEl.textContent?.trim();
      const valueEl = keyEl.nextElementSibling;
      const value = valueEl?.textContent?.trim();
      if (label && value) data[label] = value;
    });
    const konumEl = document.querySelector('span[class*="location"]');
    if (konumEl) data['__konum__'] = konumEl.textContent?.trim() || '';
    return data;
  });
}

function mapDetailFields(raw) {
  const get = k => raw[k] || null;
  const konumParts = (raw['__konum__'] || '').split(' - ');
  return {
    tarih:           get('İlan Güncelleme Tarihi'),
    metrekare_net:   parseInt((get('Net Metrekare') || '').replace(/[^\d]/g, '')) || null,
    bina_yasi:       get('Binanın Yaşı'),
    kat_sayisi:      get('Binanın Kat Sayısı'),
    isitma:          get('Isıtma Tipi'),
    kullanim_durumu: get('Kullanım Durumu'),
    krediye_uygun:   get('Krediye Uygunluk'),
    tapu_durumu:     get('Tapu Durumu'),
    site_icerisinde: get('Site İçerisinde'),
    site_adi:        get('Site Adı'),
    aidat:           get('Aidat'),
    kimden:          get('Kimden'),
    banyo_sayisi:    get('Banyo Sayısı'),
    balkon:          get('Balkon'),
    asansor:         get('Asansör'),
    otopark:         get('Otopark'),
    esyali:          get('Eşya Durumu') || get('Eşyalı'),
    takas:           get('Takas'),
    ilce:            konumParts[1] || null,
    mahalle:         konumParts[2] || null,
  };
}

async function runRound2() {
  const db = initDb();

  const insertStmt = db.prepare(`
    INSERT OR IGNORE INTO ilanlar
      (ilan_id, il, il_id, baslik, url, fiyat, tarih, konum_ham, oda_salon,
       metrekare_brut, metrekare_net, bina_yasi, kat, kat_sayisi, isitma,
       kullanim_durumu, krediye_uygun, tapu_durumu, site_icerisinde, site_adi,
       aidat, kimden, banyo_sayisi, balkon, asansor, otopark, esyali, takas,
       ilce, mahalle, detay_cekimi, cekilis_tarihi)
    VALUES
      (@ilan_id, @il, @il_id, @baslik, @url, @fiyat, @tarih, @konum_ham, @oda_salon,
       @metrekare_brut, @metrekare_net, @bina_yasi, @kat, @kat_sayisi, @isitma,
       @kullanim_durumu, @krediye_uygun, @tapu_durumu, @site_icerisinde, @site_adi,
       @aidat, @kimden, @banyo_sayisi, @balkon, @asansor, @otopark, @esyali, @takas,
       @ilce, @mahalle, 1, @cekilis_tarihi)
  `);

  const siralanmis = [...ILLER].sort((a, b) => {
    const buyuk = new Set([34, 6, 35]);
    return (buyuk.has(a.id) ? 1 : 0) - (buyuk.has(b.id) ? 1 : 0);
  });

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  let page = await context.newPage();
  let toplamKaydedilen = 0;

  console.log(`\nRound 2 başlıyor — sayfa ${BASLANGIC_SAYFA}'den itibaren, her ilden max ${HEDEF} ilan\n`);

  for (const il of siralanmis) {
    const ilerleme = db.prepare('SELECT * FROM ilerleme_r2 WHERE il_id = ?').get(il.id);
    if (ilerleme?.tamamlandi) { console.log(`[ATLA] ${il.ad}`); continue; }

    console.log(`\n=== ${il.ad} ===`);
    let kaydedilen = ilerleme?.cekilen || 0;
    let sayfa = ilerleme?.son_sayfa || BASLANGIC_SAYFA;
    if (kaydedilen > 0) console.log(`  Kaldığı yerden devam: sayfa ${sayfa}, ${kaydedilen} ilan zaten var`);

    try {
      let boslukSayaci = 0;
      while (kaydedilen < HEDEF) {
        if (sayfa > 20) { console.log('  Max sayfa (20) aşıldı, durdu.'); break; }

        const listeUrl = buildListeUrl(il.slug, sayfa);
        console.log(`  Liste sayfa ${sayfa}: ${listeUrl}`);

        if (page.isClosed()) page = await context.newPage();
        await page.goto(listeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        const ilanlar = await parseListePage(page);
        if (ilanlar.length === 0) { console.log('  Boş sayfa, durdu.'); break; }

        // Sayfadaki ilanların hepsi zaten DB'deyse (tıkandık)
        const yeniSayisi = ilanlar.filter(i =>
          !db.prepare('SELECT id FROM ilanlar WHERE ilan_id = ?').get(i.ilan_id)
        ).length;
        if (yeniSayisi === 0) {
          boslukSayaci++;
          if (boslukSayaci >= 2) { console.log('  2 sayfadır yeni ilan yok, durdu.'); break; }
          sayfa++; continue;
        }
        boslukSayaci = 0;

        // Her sayfa sonunda ilerlemeyi kaydet
        db.prepare('INSERT OR REPLACE INTO ilerleme_r2 VALUES (@il_id, @il_adi, 0, @cekilen, @son_sayfa)')
          .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen, son_sayfa: sayfa });

        for (const ilan of ilanlar) {
          if (kaydedilen >= HEDEF) break;

          // Zaten DB'de varsa detaya girme
          const mevcutMu = db.prepare('SELECT id FROM ilanlar WHERE ilan_id = ?').get(ilan.ilan_id);
          if (mevcutMu) { kaydedilen++; continue; }

          // Detay sayfasına git
          try {
            if (page.isClosed()) page = await context.newPage();
            await page.goto(ilan.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await page.waitForTimeout(2000 + Math.random() * 2000);

            const raw = await parseDetailPage(page);
            const detay = mapDetailFields(raw);

            insertStmt.run({
              ...ilan, ...detay,
              il: il.ad, il_id: il.id,
              cekilis_tarihi: new Date().toISOString(),
              // null fallback'ler
              bina_yasi: detay.bina_yasi || null,
              tarih: detay.tarih || null,
            });
            kaydedilen++;
          } catch (detayErr) {
            // Detay alınamazsa sadece liste verisini kaydet
            insertStmt.run({
              ...ilan, il: il.ad, il_id: il.id,
              cekilis_tarihi: new Date().toISOString(),
              tarih: null, metrekare_net: null, bina_yasi: null, kat_sayisi: null,
              isitma: null, kullanim_durumu: null, krediye_uygun: null, tapu_durumu: null,
              site_icerisinde: null, site_adi: null, aidat: null, kimden: null,
              banyo_sayisi: null, balkon: null, asansor: null, otopark: null,
              esyali: null, takas: null, ilce: null, mahalle: null,
            });
            kaydedilen++;
          }

          process.stdout.write(`\r  Kaydedilen: ${kaydedilen}/${HEDEF}`);
          await randomDelay(DETAY_DELAY_MIN, DETAY_DELAY_MAX);
        }

        if (kaydedilen >= HEDEF) break;
        sayfa++;
        await randomDelay(DELAY_MIN, DELAY_MAX);
      }

      toplamKaydedilen += kaydedilen;
      console.log(`\n  ${il.ad} tamamlandı: ${kaydedilen} ilan`);
      db.prepare('INSERT OR REPLACE INTO ilerleme_r2 VALUES (@il_id, @il_adi, 1, @cekilen, @son_sayfa)')
        .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen, son_sayfa: sayfa });

    } catch (err) {
      console.error(`\nHATA (${il.ad}):`, err.message.split('\n')[0]);
      db.prepare('INSERT OR IGNORE INTO ilerleme_r2 VALUES (@il_id, @il_adi, 0, 0, @son_sayfa)')
        .run({ il_id: il.id, il_adi: il.ad, son_sayfa: sayfa });
    }

    await randomDelay(8000, 15000);
  }

  const toplam = db.prepare('SELECT COUNT(*) as t FROM ilanlar').get();
  console.log(`\nRound 2 tamamlandı! Bu turda: ${toplamKaydedilen} | Toplam DB: ${toplam.t}`);

  await context.close();
  db.close();
}

module.exports = { runRound2 };
