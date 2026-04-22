# Türkiye Emlak Verisi — Web Scraping Projesi

Bu proje, Türkiye genelindeki satılık konut ilanlarını otomatik olarak toplamak amacıyla geliştirilmiştir. Toplanan veriler bir Yapay Sinir Ağı (YSA) modelinin eğitimi için kullanılacaktır.

---

## Veri Kaynakları

| Site | Kayıt | İl Sayısı | Yöntem |
|------|-------|-----------|--------|
| hepsiemlak.com | 3.553 | 81 | Playwright (liste sayfası) |
| sahibinden.com | devam ediyor | 81 | Playwright + Stealth |

---

## Toplanan Alanlar

### hepsiemlak.com
| Alan | Açıklama |
|------|----------|
| `ilan_id` | İlana ait benzersiz kimlik |
| `il` | İl adı |
| `baslik` | İlan başlığı |
| `url` | İlan sayfası adresi |
| `fiyat` | Satış fiyatı (TL) |
| `tarih` | İlan tarihi |
| `konum_ham` | İl / İlçe / Mahalle |
| `oda_salon` | Oda + salon sayısı (ör. 2+1) |
| `metrekare_brut` | Brüt metrekare |
| `bina_yasi` | Bina yaşı |
| `kat` | Bulunduğu kat |

### sahibinden.com
hepsiemlak alanlarına ek olarak:
`metrekare_net`, `isitma`, `banyo_sayisi`, `mutfak`, `balkon`, `asansor`, `otopark`, `esyali`, `kullanim_durumu`, `site_icerisinde`, `site_adi`, `aidat`, `krediye_uygun`, `tapu_durumu`, `kimden`, `takas`

---

## Teknik Yapı

```
scrapers/
├── sahibinden/
│   ├── session.js        # Oturum yönetimi (Cloudflare bypass + cookie)
│   ├── scraper.js        # Ana scraper (liste + detay sayfası)
│   ├── parser.js         # HTML → veri çıkarma
│   └── detail-scraper.js # Detay sayfası scraper
└── hepsiemlak/
    └── scraper.js        # Liste sayfası scraper
config.js                 # 81 il listesi ve ayarlar
index.js                  # Komut satırı arayüzü
```

### Kullanılan Teknolojiler
- **Node.js** — Çalışma ortamı
- **Playwright** — Tarayıcı otomasyonu
- **playwright-extra + puppeteer-extra-plugin-stealth** — Bot tespitini aşmak için
- **better-sqlite3** — Veri depolama
- **Python / Pandas** — Veri analizi

---

## Scraping Mimarisi

### Cloudflare ve Bot Koruması Aşma Yöntemi
sahibinden.com, ziyaretçilerin otomatik yazılım kullanıp kullanmadığını tespit eden Cloudflare koruması kullanmaktadır. Bu engeli aşmak için:

1. **Stealth Plugin** — `puppeteer-extra-plugin-stealth` ile tarayıcının otomasyon imzaları gizlenir (WebDriver flag, navigator properties, vb.)
2. **Kalıcı Tarayıcı Profili** — `launchPersistentContext` ile gerçek kullanıcıya benzer tarayıcı geçmişi oluşturulur
3. **İnsan Benzeri Gecikmeler** — Sayfalar arasında rastgele 8-20 saniye, şehirler arasında 45-90 saniye bekleme
4. **Cookie Tabanlı Oturum** — Tek seferlik manuel giriş sonrası oturum cookie'leri saklanır

### Resume (Kaldığı Yerden Devam) Sistemi
Her şehrin scraping durumu SQLite `ilerleme` tablosunda takip edilir. Program herhangi bir noktada kesintiye uğrarsa, kaldığı şehirden devam eder.

---

## Kullanım

```bash
# Bağımlılıkları kur
npm install

# sahibinden.com oturumu aç (bir kez)
node index.js --login

# sahibinden.com scraping başlat
node index.js --scrape

# hepsiemlak.com scraping başlat
node index.js --scrape-he
```

### Python ile Veri Okuma
```pythonö
import sqlite3
import pandas as pd

conn = sqlite3.connect('data/hepsiemlak.db')
df = pd.read_sql('SELECT * FROM ilanlar', conn)
print(df.shape)   # (3553, 14)
print(df.head())
```

---

## Veri Dosyaları

| Dosya | Boyut | İçerik |
|-------|-------|--------|
| `data/hepsiemlak.db` | ~2 MB | 3.553 satılık daire ilanı |
| `data/sahibinden.db` | devam ediyor | Tüm Türkiye satılık daire |
