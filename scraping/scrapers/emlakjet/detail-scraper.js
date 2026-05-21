const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-ej');
const DB_PATH = path.resolve('./data/emlakjet.db');
const DELAY_MIN = 3000;
const DELAY_MAX = 7000;

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function migrateDb(db) {
  const cols = db.pragma('table_info(ilanlar)').map(c => c.name);
  const ekle = (col, type) => {
    if (!cols.includes(col)) db.exec(`ALTER TABLE ilanlar ADD COLUMN ${col} ${type}`);
  };
  ekle('metrekare_net',    'INTEGER');
  ekle('bina_yasi',        'TEXT');
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
}

async function parseDetailPage(page) {
  return page.evaluate(() => {
    const data = {};

    // Tüm key-value çiftleri: span[class*="key"] → span[class*="value"]
    document.querySelectorAll('span[class*="key"]').forEach(keyEl => {
      const label = keyEl.textContent?.trim();
      const valueEl = keyEl.nextElementSibling;
      const value = valueEl?.textContent?.trim();
      if (label && value) data[label] = value;
    });

    // Konum: "Adana - Seyhan - Yeşilyurt Mahallesi"
    const konumEl = document.querySelector('span[class*="location"]');
    if (konumEl) data['__konum__'] = konumEl.textContent?.trim() || '';

    return data;
  });
}

function mapFields(raw) {
  const get = (key) => raw[key] || null;

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

// Detay sayfasının yapısını incelemek için
async function inspectDetailPage(url) {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const page = await context.newPage();
  console.log(`\nDetay inspect: ${url}\n`);

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(5000);

  const info = await page.evaluate(() => {
    // Tüm leaf elementleri tara
    const allEls = Array.from(document.querySelectorAll('*'));
    const leafEls = allEls.filter(el =>
      el.children.length === 0 &&
      el.textContent?.trim().length > 1 &&
      el.textContent?.trim().length < 120
    );

    // Özellik benzeri class'ları bul
    const specClasses = new Set();
    allEls.forEach(el => {
      el.classList.forEach(c => {
        if (['spec', 'detail', 'feature', 'info', 'attr', 'prop', 'row', 'item', 'label', 'value']
            .some(k => c.toLowerCase().includes(k))) {
          specClasses.add(c);
        }
      });
    });

    // Label/value çiftleri gibi görünen alanları bul
    const pairs = [];
    leafEls.forEach(el => {
      const text = el.textContent?.trim();
      const cls = el.className || '';
      pairs.push({ tag: el.tagName, class: cls.substring(0, 60), text });
    });

    return { specClasses: Array.from(specClasses).slice(0, 40), pairs: pairs.slice(0, 80) };
  });

  console.log('Spec class\'ları:', info.specClasses.join(', '));
  console.log('\nLeaf elementler:');
  info.pairs.forEach(e => console.log(`  [${e.tag}] "${e.class}" → "${e.text}"`));

  await context.close();
}

async function runDetailScraper() {
  const db = new Database(DB_PATH);
  migrateDb(db);

  const bekleyenler = db.prepare(
    'SELECT id, ilan_id, url FROM ilanlar WHERE detay_cekimi != 1 ORDER BY id'
  ).all();

  console.log(`Detay çekilecek ilan sayısı: ${bekleyenler.length}`);
  if (bekleyenler.length === 0) { db.close(); return; }

  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  let page = await context.newPage();

  const updateStmt = db.prepare(`
    UPDATE ilanlar SET
      metrekare_net=@metrekare_net, bina_yasi=@bina_yasi, kat_sayisi=@kat_sayisi,
      isitma=@isitma, banyo_sayisi=@banyo_sayisi, balkon=@balkon,
      asansor=@asansor, otopark=@otopark, esyali=@esyali,
      kullanim_durumu=@kullanim_durumu, site_icerisinde=@site_icerisinde,
      site_adi=@site_adi, aidat=@aidat, krediye_uygun=@krediye_uygun,
      tapu_durumu=@tapu_durumu, kimden=@kimden, takas=@takas,
      tarih=@tarih, detay_cekimi=1
    WHERE id=@id
  `);

  let basarili = 0;
  let hatali = 0;

  for (let i = 0; i < bekleyenler.length; i++) {
    const { id, ilan_id, url } = bekleyenler[i];

    try {
      if (page.isClosed()) page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(2500 + Math.random() * 1500);

      const raw = await parseDetailPage(page);
      const fields = mapFields(raw);

      const dolmus = Object.values(fields).some(v => v !== null && v !== undefined);
      if (!dolmus) {
        db.prepare('UPDATE ilanlar SET detay_cekimi = -1 WHERE id = ?').run(id);
        hatali++;
        process.stdout.write(`\r  [${i + 1}/${bekleyenler.length}] Başarılı: ${basarili} | Boş/Hatalı: ${hatali}`);
      } else {
        updateStmt.run({ ...fields, id });
        basarili++;
        process.stdout.write(`\r  [${i + 1}/${bekleyenler.length}] Başarılı: ${basarili} | Boş/Hatalı: ${hatali}`);
      }
    } catch (err) {
      hatali++;
      db.prepare('UPDATE ilanlar SET detay_cekimi = -1 WHERE id = ?').run(id);
      if (hatali <= 5 || hatali % 50 === 0) {
        console.error(`\n  HATA (${ilan_id}): ${err.message.split('\n')[0]}`);
      }
    }

    await randomDelay(DELAY_MIN, DELAY_MAX);
  }

  const toplam = db.prepare('SELECT COUNT(*) as s FROM ilanlar WHERE detay_cekimi = 1').get();
  console.log(`\n\nDetay tamamlandı. Güncellenen: ${toplam.s} | Hatalı: ${hatali}`);

  await context.close();
  db.close();
}

module.exports = { runDetailScraper, inspectDetailPage };
