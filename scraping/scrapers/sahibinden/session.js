const { chromium } = require('playwright-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');
const { SAHIBINDEN } = require('../../config');

chromium.use(StealthPlugin());

const COOKIE_PATH = path.resolve(SAHIBINDEN.COOKIE_FILE);
const USER_DATA_DIR = path.resolve('./browser-profile');

// Scraping için stealth context (cookie ile)
async function launchStealthContext(cookies) {
  const context = await chromium.launchPersistentContext(USER_DATA_DIR, {
    headless: false,
    viewport: null,
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--start-maximized',
      '--lang=tr-TR',
    ],
    extraHTTPHeaders: { 'Accept-Language': 'tr-TR,tr;q=0.9' },
  });

  if (cookies) await context.addCookies(cookies);
  return context;
}

function loadCookies() {
  if (!fs.existsSync(COOKIE_PATH)) return null;
  try {
    const raw = JSON.parse(fs.readFileSync(COOKIE_PATH, 'utf8'));
    // Playwright yalnızca Strict|Lax|None kabul eder
    const validSameSite = new Set(['Strict', 'Lax', 'None']);
    return raw.map((c) => ({
      ...c,
      sameSite: validSameSite.has(c.sameSite) ? c.sameSite : 'Lax',
    }));
  } catch {
    return null;
  }
}

function saveCookies(cookies) {
  fs.mkdirSync(path.dirname(COOKIE_PATH), { recursive: true });
  fs.writeFileSync(COOKIE_PATH, JSON.stringify(cookies, null, 2));
  console.log(`Cookie kaydedildi: ${COOKIE_PATH}`);
}

function waitForEnter(prompt) {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdout.write(prompt);
    process.stdin.once('data', () => {
      process.stdin.pause();
      resolve();
    });
  });
}

// Yöntem 1: Mevcut Chrome'a CDP ile bağlan (en güvenilir - Cloudflare geçemez)
async function doLoginViaCDP() {
  console.log('\n=== CDP MOD: GERÇEK CHROME\'A BAĞLAN ===\n');
  console.log('ADIM 1: Aşağıdaki komutu yeni bir terminalde çalıştırın:');
  console.log('');

  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];
  const chromePath = chromePaths.find(fs.existsSync) || '<chrome.exe yolu>';

  console.log(`  "${chromePath}" --remote-debugging-port=9222 --user-data-dir="C:\\temp\\chrome-sahibinden"`);
  console.log('');
  console.log('ADIM 2: Açılan Chrome\'da sahibinden.com\'a gidin ve giriş yapın.');
  console.log('ADIM 3: Giriş tamamlandıktan sonra buraya dönüp Enter\'a basın.');
  console.log('');

  await waitForEnter('>> Giriş tamamlandı, Enter\'a basın: ');

  let browser;
  try {
    browser = await chromium.connectOverCDP('http://127.0.0.1:9222');
  } catch (err) {
    console.error('\nChrome\'a bağlanılamadı! Hata:', err.message);
    console.error('Chrome\'un --remote-debugging-port=9222 ile açık olduğundan emin olun.');
    return null;
  }

  const contexts = browser.contexts();
  if (contexts.length === 0) {
    console.error('Açık Chrome context bulunamadı.');
    await browser.disconnect();
    return null;
  }

  const context = contexts[0];
  const cookies = await context.cookies();
  const sahibindenCookies = cookies.filter(c => c.domain.includes('sahibinden.com'));

  if (sahibindenCookies.length === 0) {
    console.warn('sahibinden.com cookie\'si bulunamadı. Giriş yapıldı mı?');
  } else {
    console.log(`${sahibindenCookies.length} adet sahibinden.com cookie\'si bulundu.`);
    saveCookies(sahibindenCookies);
  }

  await browser.disconnect();
  return sahibindenCookies.length > 0 ? sahibindenCookies : null;
}

// Yöntem 2: Stealth browser (CDP başarısız olursa fallback)
async function doLoginViaStealth() {
  console.log('\n=== STEALTH MOD ===');
  console.log('Tarayıcı açılıyor, Cloudflare\'i geçmek için birkaç saniye bekleyin...\n');

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  const context = await launchStealthContext(null);
  const page = await context.newPage();

  await page.goto(SAHIBINDEN.LOGIN_URL, {
    waitUntil: 'domcontentloaded',
    timeout: SAHIBINDEN.REQUEST_TIMEOUT,
  });

  // Cloudflare'e insan gibi görünmek için rastgele bekleme + fare hareketi
  await page.waitForTimeout(3000 + Math.random() * 2000);
  await page.mouse.move(300 + Math.random() * 200, 200 + Math.random() * 100);
  await page.waitForTimeout(1000);

  console.log('Tarayıcı açıldı. Cloudflare geçerse giriş yapın.');
  await waitForEnter('>> Giriş tamamlandıktan sonra Enter\'a basın: ');

  const cookies = await context.cookies();
  saveCookies(cookies);
  await context.close();
  return cookies;
}

async function doLogin() {
  // CDP ile dene, başarısız olursa stealth mod
  const cookies = await doLoginViaCDP();
  if (!cookies) {
    console.log('\nCDP başarısız, stealth mod deneniyor...');
    return doLoginViaStealth();
  }
  return cookies;
}

async function getAuthContext() {
  const cookies = loadCookies();
  if (!cookies) {
    console.error('Cookie bulunamadı. Önce: node index.js --login');
    return null;
  }

  fs.mkdirSync(USER_DATA_DIR, { recursive: true });
  const context = await launchStealthContext(cookies);

  console.log('Cookie yüklendi, scraping başlıyor...');
  return context;
}

module.exports = { getAuthContext, doLogin, loadCookies };
