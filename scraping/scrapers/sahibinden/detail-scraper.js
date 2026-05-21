const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const { SAHIBINDEN, DB_PATH } = require('../../config');

chromium.use(StealthPlugin());

const COOKIE_PATH = path.resolve(SAHIBINDEN.COOKIE_FILE);
const USER_DATA_DIR = path.resolve('./browser-profile');

function loadCookies() {
  const raw = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
  const valid = new Set(['Strict', 'Lax', 'None']);
  return raw.map(c => ({ ...c, sameSite: valid.has(c.sameSite) ? c.sameSite : 'Lax' }));
}

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function migrateDb(db) {
  const cols = db.pragma('table_info(ilanlar)').map(c => c.name);
  const ekle = (col, type) => {
    if (!cols.includes(col)) db.exec(`ALTER TABLE ilanlar ADD COLUMN ${col} ${type}`);
  };
  ekle('metrekare_brut', 'INTEGER');
  ekle('metrekare_net', 'INTEGER');
  ekle('bina_yasi', 'TEXT');
  ekle('bulundugu_kat', 'TEXT');
  ekle('kat_sayisi', 'TEXT');
  ekle('isitma', 'TEXT');
  ekle('banyo_sayisi', 'TEXT');
  ekle('mutfak', 'TEXT');
  ekle('balkon', 'TEXT');
  ekle('asansor', 'TEXT');
  ekle('otopark', 'TEXT');
  ekle('esyali', 'TEXT');
  ekle('kullanim_durumu', 'TEXT');
  ekle('site_icerisinde', 'TEXT');
  ekle('site_adi', 'TEXT');
  ekle('aidat', 'TEXT');
  ekle('krediye_uygun', 'TEXT');
  ekle('tapu_durumu', 'TEXT');
  ekle('kimden', 'TEXT');
  ekle('takas', 'TEXT');
  ekle('detay_cekimi', 'INTEGER DEFAULT 0');
}

async function parseDetailPage(page) {
  return page.evaluate(() => {
    const items = document.querySelectorAll('ul.classified-info-list li');
    const data = {};
    items.forEach(li => {
      const label = li.querySelector('strong')?.textContent?.trim().replace(/\s+/g, ' ') || '';
      const value = li.querySelector('span')?.textContent?.trim().replace(/\s+/g, ' ') || '';
      if (label && value) data[label] = value;
    });
    return data;
  });
}

function mapFields(raw) {
  return {
    metrekare_brut:    raw['m² (Brüt)'] ? parseInt(raw['m² (Brüt)']) : null,
    metrekare_net:     raw['m² (Net)']  ? parseInt(raw['m² (Net)'])  : null,
    bina_yasi:         raw['Bina Yaşı'] || null,
    bulundugu_kat:     raw['Bulunduğu Kat'] || null,
    kat_sayisi:        raw['Kat Sayısı'] || null,
    isitma:            raw['Isıtma'] || null,
    banyo_sayisi:      raw['Banyo Sayısı'] || null,
    mutfak:            raw['Mutfak'] || null,
    balkon:            raw['Balkon'] || null,
    asansor:           raw['Asansör'] || null,
    otopark:           raw['Otopark'] || null,
    esyali:            raw['Eşyalı'] || null,
    kullanim_durumu:   raw['Kullanım Durumu'] || null,
    site_icerisinde:   raw['Site İçerisinde'] || null,
    site_adi:          raw['Site Adı'] || null,
    aidat:             raw['Aidat (TL)'] || null,
    krediye_uygun:     raw['Krediye Uygun'] || null,
    tapu_durumu:       raw['Tapu Durumu'] || null,
    kimden:            raw['Kimden'] || null,
    takas:             raw['Takas'] || null,
  };
}

async function runDetailScraper() {
  const db = new Database(path.resolve(DB_PATH));
  migrateDb(db);

  const bekleyenler = db.prepare(
    'SELECT id, ilan_id, url FROM ilanlar WHERE detay_cekimi = 0 OR detay_cekimi IS NULL ORDER BY id'
  ).all();

  console.log(`Detay çekilecek ilan sayısı: ${bekleyenler.length}`);
  if (bekleyenler.length === 0) { db.close(); return; }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });
  await context.addCookies(loadCookies());
  const page = await context.newPage();

  const updateStmt = db.prepare(`
    UPDATE ilanlar SET
      metrekare_brut=@metrekare_brut, metrekare_net=@metrekare_net,
      bina_yasi=@bina_yasi, bulundugu_kat=@bulundugu_kat, kat_sayisi=@kat_sayisi,
      isitma=@isitma, banyo_sayisi=@banyo_sayisi, mutfak=@mutfak,
      balkon=@balkon, asansor=@asansor, otopark=@otopark, esyali=@esyali,
      kullanim_durumu=@kullanim_durumu, site_icerisinde=@site_icerisinde,
      site_adi=@site_adi, aidat=@aidat, krediye_uygun=@krediye_uygun,
      tapu_durumu=@tapu_durumu, kimden=@kimden, takas=@takas, detay_cekimi=1
    WHERE id=@id
  `);

  for (let i = 0; i < bekleyenler.length; i++) {
    const { id, ilan_id, url } = bekleyenler[i];
    const detayUrl = url.includes('/detay') ? url : url.replace(/\/$/, '') + '/detay';

    try {
      await page.goto(detayUrl, { waitUntil: 'domcontentloaded', timeout: SAHIBINDEN.REQUEST_TIMEOUT });
      await page.waitForTimeout(1500 + Math.random() * 1000);

      const raw = await parseDetailPage(page);
      const fields = mapFields(raw);
      updateStmt.run({ ...fields, id });

      if ((i + 1) % 10 === 0) {
        console.log(`[${i + 1}/${bekleyenler.length}] ${ilan_id} ✓`);
      }
    } catch (err) {
      console.error(`[${i + 1}] HATA (${ilan_id}):`, err.message);
    }

    await randomDelay(2000, 5000);
  }

  const toplam = db.prepare('SELECT COUNT(*) as s FROM ilanlar WHERE detay_cekimi = 1').get();
  console.log(`\nDetay tamamlandı. Güncellenen: ${toplam.s}`);

  await context.close();
  db.close();
}

module.exports = { runDetailScraper };
