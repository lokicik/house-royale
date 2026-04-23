const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-ej');
const DB_PATH = path.resolve('./data/emlakjet_buyuksehir.db');
const BASE_URL = 'https://www.emlakjet.com';
const HEDEF_PER_IL = 1334;      // 2. tur: her şehirde 667 daha → toplam ~4000
const BASLANGIC_SAYFA = 4;     // İlk 3 sayfa emlakjet.db'de zaten var
const DELAY_MIN = 1500;
const DELAY_MAX = 4000;
const DETAY_DELAY_MIN = 2000;
const DETAY_DELAY_MAX = 5000;

const BUYUKSEHIRLER = [
  { id: 34, ad: 'İstanbul', slug: 'istanbul' },
  { id: 6,  ad: 'Ankara',   slug: 'ankara'   },
  { id: 35, ad: 'İzmir',    slug: 'izmir'     },
];

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function buildListeUrl(slug, page) {
  const base = `${BASE_URL}/satilik-daire/${slug}`;
  return page > 1 ? `${base}?sayfa=${page}` : base + '/';
}

function initDb() {
  const db = new Database(DB_PATH);
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
      oda_salon        TEXT,
      metrekare_brut   INTEGER,
      metrekare_net    INTEGER,
      bina_yasi        TEXT,
      kat              TEXT,
      kat_sayisi       TEXT,
      isitma           TEXT,
      banyo_sayisi     TEXT,
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
      ilce             TEXT,
      mahalle          TEXT,
      detay_cekimi     INTEGER DEFAULT 0,
      cekilis_tarihi   TEXT
    );

    CREATE TABLE IF NOT EXISTS ilerleme (
      il_id      INTEGER PRIMARY KEY,
      il_adi     TEXT,
      tamamlandi INTEGER DEFAULT 0,
      cekilen    INTEGER DEFAULT 0,
      son_sayfa  INTEGER DEFAULT 4
    );
  `);
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
        if (ilan_id && url) {
          results.push({ ilan_id, url, fiyat, baslik, konum_ham: konum, oda_salon, metrekare_brut, kat });
        }
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

async function runBuyuksehirScraper() {
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

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  let page = await context.newPage();
  let toplamKaydedilen = 0;

  console.log(`\nBüyükşehir scraper — İstanbul / Ankara / İzmir`);
  console.log(`Her şehirden hedef: ${HEDEF_PER_IL} ilan (toplam ~${HEDEF_PER_IL * 3})\n`);

  for (const il of BUYUKSEHIRLER) {
    const ilerleme = db.prepare('SELECT * FROM ilerleme WHERE il_id = ?').get(il.id);

    if (ilerleme?.tamamlandi) {
      const gercekSayi = db.prepare('SELECT COUNT(*) as c FROM ilanlar WHERE il_id = ?').get(il.id).c;
      console.log(`[ATLA] ${il.ad} — zaten tamamlandı (${gercekSayi} ilan)`);
      toplamKaydedilen += gercekSayi;
      continue;
    }

    console.log(`\n=== ${il.ad} ===`);
    // DB'deki gerçek sayıyı başlangıç noktası olarak al (resume hatasını önler)
    let kaydedilen = db.prepare('SELECT COUNT(*) as c FROM ilanlar WHERE il_id = ?').get(il.id).c;
    let sayfa = Math.max(ilerleme?.son_sayfa || BASLANGIC_SAYFA, BASLANGIC_SAYFA);

    if (kaydedilen > 0) {
      console.log(`  Kaldığı yerden devam: sayfa ${sayfa}, ${kaydedilen} ilan mevcut`);
    }

    try {
      let boslukSayaci = 0;

      while (kaydedilen < HEDEF_PER_IL) {
        if (sayfa > 100) { console.log('\n  Sayfa limiti (100) aşıldı, duruldu.'); break; }

        const listeUrl = buildListeUrl(il.slug, sayfa);
        console.log(`\n  Sayfa ${sayfa}: ${listeUrl}`);

        if (page.isClosed()) page = await context.newPage();
        await page.goto(listeUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(3000 + Math.random() * 2000);

        const ilanlar = await parseListePage(page);
        if (ilanlar.length === 0) {
          boslukSayaci++;
          console.log(`  Boş sayfa (bosluk: ${boslukSayaci}/5) — ${boslukSayaci < 5 ? 'bekleniyor...' : 'duruldu.'}`);
          if (boslukSayaci >= 5) break;
          // Bot tespitine karşı uzun bekle, sonra tekrar dene
          await randomDelay(15000, 25000);
          continue;
        }

        const yeniIlanlar = ilanlar.filter(
          i => !db.prepare('SELECT id FROM ilanlar WHERE ilan_id = ?').get(i.ilan_id)
        );

        console.log(`  Sayfada ${ilanlar.length} ilan, ${yeniIlanlar.length} yeni`);

        if (yeniIlanlar.length === 0) {
          boslukSayaci++;
          if (boslukSayaci >= 5) { console.log('  5 sayfadır yeni ilan yok, duruldu.'); break; }
          sayfa++;
          continue;
        }
        boslukSayaci = 0;

        // İlerlemeyi kaydet
        db.prepare('INSERT OR REPLACE INTO ilerleme VALUES (@il_id, @il_adi, 0, @cekilen, @son_sayfa)')
          .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen, son_sayfa: sayfa });

        for (const ilan of ilanlar) {
          if (kaydedilen >= HEDEF_PER_IL) break;

          if (db.prepare('SELECT id FROM ilanlar WHERE ilan_id = ?').get(ilan.ilan_id)) continue;

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
            });
          } catch (_) {
            // Detay alınamazsa liste verisini yedek olarak kaydet
            insertStmt.run({
              ...ilan, il: il.ad, il_id: il.id,
              cekilis_tarihi: new Date().toISOString(),
              tarih: null, metrekare_net: null, bina_yasi: null, kat_sayisi: null,
              isitma: null, kullanim_durumu: null, krediye_uygun: null, tapu_durumu: null,
              site_icerisinde: null, site_adi: null, aidat: null, kimden: null,
              banyo_sayisi: null, balkon: null, asansor: null, otopark: null,
              esyali: null, takas: null, ilce: null, mahalle: null,
            });
          }

          kaydedilen++;
          process.stdout.write(`\r  Kaydedilen: ${kaydedilen}/${HEDEF_PER_IL}`);
          await randomDelay(DETAY_DELAY_MIN, DETAY_DELAY_MAX);
        }

        if (kaydedilen >= HEDEF_PER_IL) break;
        sayfa++;
        await randomDelay(DELAY_MIN, DELAY_MAX);
      }

      toplamKaydedilen += kaydedilen;
      console.log(`\n  ${il.ad} tamamlandı: ${kaydedilen} ilan`);
      db.prepare('INSERT OR REPLACE INTO ilerleme VALUES (@il_id, @il_adi, 1, @cekilen, @son_sayfa)')
        .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen, son_sayfa: sayfa });

    } catch (err) {
      console.error(`\nHATA (${il.ad}): ${err.message.split('\n')[0]}`);
      db.prepare('INSERT OR REPLACE INTO ilerleme VALUES (@il_id, @il_adi, 0, @cekilen, @son_sayfa)')
        .run({ il_id: il.id, il_adi: il.ad, cekilen: kaydedilen, son_sayfa: sayfa });
    }

    await randomDelay(10000, 20000);
  }

  const toplam = db.prepare('SELECT COUNT(*) as t FROM ilanlar').get();
  console.log(`\nToplam kaydedilen: ${toplamKaydedilen} | DB'deki toplam: ${toplam.t}\n`);

  await context.close();
  db.close();
}

module.exports = { runBuyuksehirScraper };
