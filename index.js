const args = process.argv.slice(2);

async function main() {
  if (args.includes('--login')) {
    const { doLogin } = require('./scrapers/sahibinden/session');
    await doLogin();
    console.log('\nOturum kaydedildi. Artık scraping başlatabilirsiniz:');
    console.log('  node index.js --scrape\n');

  } else if (args.includes('--scrape-he')) {
    const { runScraper } = require('./scrapers/hepsiemlak/scraper');
    await runScraper();

  } else if (args.includes('--inspect-ej')) {
    const { inspectPage } = require('./scrapers/emlakjet/scraper');
    const slug = args[args.indexOf('--inspect-ej') + 1] || 'adana';
    await inspectPage(slug);

  } else if (args.includes('--scrape-ej')) {
    const { runScraper } = require('./scrapers/emlakjet/scraper');
    await runScraper();

  } else if (args.includes('--scrape-details')) {
    const { runDetailScraper } = require('./scrapers/sahibinden/detail-scraper');
    await runDetailScraper();

  } else if (args.includes('--scrape')) {
    const { runScraper } = require('./scrapers/sahibinden/scraper');
    await runScraper();

  } else if (args.includes('--export')) {
    // SQLite'dan CSV export (Python/Pandas alternatifiniz varsa bu opsiyonel)
    const Database = require('better-sqlite3');
    const fs = require('fs');
    const db = new Database('./data/sahibinden.db');
    const rows = db.prepare('SELECT * FROM ilanlar').all();

    if (rows.length === 0) {
      console.log('Henüz veri yok.');
      db.close();
      return;
    }

    const header = Object.keys(rows[0]).join(',');
    const lines = rows.map((r) =>
      Object.values(r)
        .map((v) => (v === null ? '' : `"${String(v).replace(/"/g, '""')}"`))
        .join(',')
    );

    fs.writeFileSync('./data/sahibinden_export.csv', [header, ...lines].join('\n'), 'utf8');
    console.log(`CSV export tamamlandı: ./data/sahibinden_export.csv (${rows.length} kayıt)`);
    db.close();

  } else {
    console.log(`
YSA Scraping Projesi - Kullanım:

  node index.js --login         Sahibinden.com oturumu aç ve cookie kaydet
  node index.js --scrape        Sahibinden - tüm Türkiye verilerini çek
  node index.js --scrape-he     Hepsiemlak - tüm Türkiye verilerini çek
  node index.js --inspect-ej [slug]  Emlakjet selector testi (örn: adana)
  node index.js --scrape-ej     Emlakjet - tüm Türkiye verilerini çek
  node index.js --export        Veriyi CSV olarak dışa aktar

Python ile veri okuma:
  import sqlite3, pandas as pd
  conn = sqlite3.connect('data/sahibinden.db')
  df = pd.read_sql('SELECT * FROM ilanlar', conn)
`);
  }
}

main().catch(console.error);
