# Türkiye Emlak Verisi — Web Scraping Projesi

Bu proje, Türkiye genelindeki satılık konut ilanlarını otomatik olarak toplamak amacıyla geliştirilmiştir. Toplanan veriler bir Yapay Sinir Ağı (YSA) modelinin eğitimi için kullanılacaktır.

---

## Veri Kaynakları

| Site | Kayıt | İl Sayısı | Yöntem |
|------|-------|-----------|--------|
| hepsiemlak.com | 3.553 | 81 | Playwright (liste + detay sayfası) |
| emlakjet.com | 5.170 | 81 | Playwright (liste + detay sayfası) |
| sahibinden.com | devam ediyor | 81 | Playwright + Stealth |

---

## Toplanan Alanlar

### hepsiemlak.com ve emlakjet.com

| Alan | Açıklama |
|------|----------|
| `ilan_id` | İlana ait benzersiz kimlik |
| `il` | İl adı |
| `ilce` | İlçe adı |
| `mahalle` | Mahalle adı |
| `baslik` | İlan başlığı |
| `url` | İlan sayfası adresi |
| `fiyat` | Satış fiyatı (TL) |
| `tarih` | İlan tarihi |
| `konum_ham` | İl / İlçe / Mahalle (ham metin) |
| `oda_salon` | Oda + salon sayısı (ör. 2+1) |
| `metrekare_brut` | Brüt metrekare |
| `metrekare_net` | Net metrekare |
| `kat_sayisi` | Binadaki toplam kat sayısı |
| `bina_yasi` | Bina yaşı |
| `kat` | Bulunduğu kat |
| `isitma` | Isıtma tipi |
| `banyo_sayisi` | Banyo sayısı |
| `balkon` | Balkon var/yok |
| `asansor` | Asansör var/yok |
| `otopark` | Otopark var/yok |
| `esyali` | Eşyalı mı |
| `kullanim_durumu` | Boş / Kiracılı |
| `site_icerisinde` | Site içinde mi |
| `site_adi` | Site adı |
| `aidat` | Aylık aidat (TL) |
| `krediye_uygun` | Krediye uygunluk |
| `tapu_durumu` | Tapu türü |
| `kimden` | Sahibinden / Emlakçıdan |
| `takas` | Takas olur mu |

### sahibinden.com
Yukarıdaki alanlara ek olarak aynı alanlar toplanmaktadır.

---

## Teknik Yapı

```
scrapers/
├── sahibinden/
│   ├── session.js        # Oturum yönetimi (Cloudflare bypass + cookie)
│   ├── scraper.js        # Ana scraper (liste sayfası)
│   ├── parser.js         # HTML → veri çıkarma
│   └── detail-scraper.js # Detay sayfası scraper
├── hepsiemlak/
│   ├── scraper.js        # Liste sayfası scraper
│   └── detail-scraper.js # Detay sayfası scraper
└── emlakjet/
    ├── scraper.js        # Liste sayfası scraper (sayfa 1)
    ├── round2-scraper.js # Liste sayfası scraper (sayfa 2–50)
    └── detail-scraper.js # Detay sayfası scraper
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

# sahibinden.com
node index.js --login              # Oturum aç (bir kez)
node index.js --scrape             # Liste verilerini çek
node index.js --scrape-details     # Detay sayfalarını çek

# hepsiemlak.com
node index.js --scrape-he          # Liste verilerini çek
node index.js --scrape-he-detail   # Detay sayfalarını çek

# emlakjet.com
node index.js --scrape-ej          # Liste verilerini çek (sayfa 1)
node index.js --scrape-ej-r2       # Liste verilerini çek (sayfa 2–50)
node index.js --scrape-ej-detail   # Detay sayfalarını çek

# Geliştirme / inceleme
node index.js --inspect-ej [slug]          # Emlakjet liste selector testi
node index.js --inspect-ej-detail <url>   # Emlakjet detay selector testi
node index.js --inspect-he-detail <url>   # Hepsiemlak detay selector testi

# CSV export (sahibinden)
node index.js --export
```

### Python ile Veri Okuma
```python
import sqlite3
import pandas as pd

conn = sqlite3.connect('data/hepsiemlak.db')
df = pd.read_sql('SELECT * FROM ilanlar', conn)
print(df.shape)   # (3553, 31)
print(df.head())
```

---

## Veri Dosyaları

| Dosya | Boyut | İçerik |
|-------|-------|--------|
| `data/hepsiemlak.db` | ~3 MB | 3.553 satılık daire ilanı (liste + detay) |
| `data/emlakjet.db` | ~4 MB | 5.170 satılık daire ilanı (liste + detay) |
| `data/sahibinden.db` | devam ediyor | Tüm Türkiye satılık daire |
