const Database = require('better-sqlite3');
const path = require('path');
const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

chromium.use(StealthPlugin());

const USER_DATA_DIR = path.resolve('./browser-profile-he');
const DB_PATH = path.resolve('./data/hepsiemlak.db');
const DELAY_MIN = 4000;
const DELAY_MAX = 9000;

function randomDelay(min, max) {
  return new Promise(r => setTimeout(r, Math.floor(Math.random() * (max - min + 1)) + min));
}

function migrateDb(db) {
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
}

function parseGAParams(urlStr) {
  try {
    const params = new URLSearchParams(urlStr.split('?')[1] || '');
    const get = k => decodeURIComponent(params.get(k) || '').trim() || null;

    // "120 m2 / 110 m2" → 110
    const grossNet = get('ep.grossAndNetm2') || '';
    const netMatch = grossNet.match(/\/\s*(\d+)/);
    const metrekare_net = netMatch ? parseInt(netMatch[1]) : null;

    // Konum parametreleri
    const ilce   = get('ep.cd_ilce') || null;
    const mahalle = get('ep.cd_mahalle') ? get('ep.cd_mahalle') + ' Mah.' : null;

    return {
      metrekare_net,
      kat_sayisi:      get('epn.numberOfFloors') ? get('epn.numberOfFloors') + ' Katlı' : null,
      banyo_sayisi:    get('epn.bathroomCount'),
      otopark:         get('ep.parkingLot'),
      krediye_uygun:   get('ep.creditAvailability'),
      tapu_durumu:     get('ep.deedStatus'),
      kimden:          get('ep.ownerType'),
      aidat:           get('epn.maintenaceFees'),
      tarih:           get('ep.lastUpdateDate'),
      site_icerisinde: get('ep.insideTheSite'),
      ilce,
      mahalle,
    };
  } catch (_) {
    return {};
  }
}

async function parseHtmlExtras(page) {
  // GA'da olmayan alanlar: isitma, esyali, kullanim_durumu, bina_yasi, takas, balkon, asansor
  return page.evaluate(() => {
    const data = {};
    document.querySelectorAll('.spec-item').forEach(item => {
      const label = item.querySelector('.spec-item__tooltip')?.textContent?.trim();
      const value = item.querySelector('.value-txt')?.textContent?.trim()
                 || item.querySelector('a')?.textContent?.trim() || '';
      if (label && value) data[label] = value;
    });
    return data;
  });
}

function mapFields(gaData, htmlData) {
  const h = (key) => htmlData[key] || null;
  return {
    ...gaData,
    isitma:          h('Isınma Tipi'),
    esyali:          h('Eşya Durumu'),
    kullanim_durumu: h('Kullanım Durumu'),
    bina_yasi:       h('Bina Yaşı')    || gaData.bina_yasi    || null,
    balkon:          h('Balkon'),
    asansor:         h('Asansör'),
    takas:           h('Takas'),
    site_adi:        h('Site Adı'),
    // ilce/mahalle GA'dan geliyor, HTML'den override etme
    ilce:            gaData.ilce    || null,
    mahalle:         gaData.mahalle || null,
  };
}

async function inspectApiRequests(url) {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false, viewport: null, locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled', '--start-maximized'],
  });

  const page = await context.newPage();
  const apiRequests = [];

  // Tüm network isteklerini dinle
  page.on('request', req => {
    const u = req.url();
    const t = req.resourceType();
    if (t === 'xhr' || t === 'fetch' || u.includes('/api/') || u.includes('.json')) {
      apiRequests.push({ method: req.method(), url: u, type: t });
    }
  });

  page.on('response', async res => {
    const u = res.url();
    if ((u.includes('/api/') || u.includes('.json')) && res.status() === 200) {
      try {
        const ct = res.headers()['content-type'] || '';
        if (ct.includes('json')) {
          const body = await res.json();
          console.log(`\n=== JSON Response: ${u} ===`);
          console.log(JSON.stringify(body, null, 2).substring(0, 3000));
        }
      } catch (_) {}
    }
  });

  console.log(`\nAPI inspect: ${url}`);
  console.log('Sayfa yükleniyor, XHR/fetch istekleri yakalanıyor...\n');

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await page.waitForTimeout(6000);

  console.log('\n=== Yakalanan API İstekleri ===');
  apiRequests.forEach(r => console.log(`[${r.method}] ${r.url}`));

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
      ilce=@ilce, mahalle=@mahalle, detay_cekimi=1
    WHERE id=@id
  `);

  let basarili = 0;
  let hatali = 0;

  for (let i = 0; i < bekleyenler.length; i++) {
    const { id, ilan_id, url } = bekleyenler[i];
    let gaData = {};

    const gaHandler = req => {
      const u = req.url();
      if (u.includes('analytics.google.com/g/collect') && u.includes('ep.floor')) {
        gaData = parseGAParams(u);
      }
    };

    try {
      if (page.isClosed()) page = await context.newPage();
      page.on('request', gaHandler);

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      await page.waitForTimeout(4000 + Math.random() * 3000);

      const htmlData = await parseHtmlExtras(page);
      page.off('request', gaHandler);

      const fields = mapFields(gaData, htmlData);
      const dolmus = Object.values(fields).some(v => v !== null && v !== undefined);

      if (!dolmus) {
        db.prepare('UPDATE ilanlar SET detay_cekimi = -1 WHERE id = ?').run(id);
        hatali++;
      } else {
        updateStmt.run({ ...fields, id });
        basarili++;
      }
      process.stdout.write(`\r  [${i + 1}/${bekleyenler.length}] Başarılı: ${basarili} | Boş/Hatalı: ${hatali}`);
    } catch (err) {
      page.off('request', gaHandler);
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

module.exports = { runDetailScraper, inspectApiRequests };
