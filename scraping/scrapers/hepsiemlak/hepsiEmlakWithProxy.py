import asyncio
import pandas as pd
import random
import os
import time
from playwright.async_api import async_playwright
# Eğer IP banlandıysanız bu python dosyası ile devam edebilirsiniz.

# Bu gibi sitelerde aseknron kullan
async def random_sleep(min_sec=8, max_sec=20):
    """ rastgele bekleme icin """
    sleep_time = random.uniform(min_sec, max_sec)
    print(f"{sleep_time:.1f} saniye bekleniyor...")
    await asyncio.sleep(sleep_time)

async def random_human_actions(page):
    """sayfa icinde afk kalmamak icin rastgele moves"""
    try:
        # Rastgele mouse hareketi
        x = random.randint(100, 800)
        y = random.randint(100, 600)
        await page.mouse.move(x, y)
        await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Rastgele scroll
        scroll_amount = random.randint(100, 500)
        await page.evaluate(f"window.scrollBy(0, {scroll_amount})")
        await asyncio.sleep(random.uniform(0.5, 1.5))
        
        # Geriye scroll
        await page.evaluate(f"window.scrollBy(0, {-scroll_amount})")
    except:
        pass

async def scrape_hepsiemlak_hybrid():
    MASTER_COLUMNS = [
        "fiyat", "konum", "İlan no", "Son Güncelleme", "İlan Durumu", 
        "Konut Tipi", "Konut Şekli", "Oda Sayısı", "Banyo Sayısı", 
        "Brüt / Net M2", "Kat Sayısı", "Bulunduğu Kat", "Bina Yaşı", 
        "Isınma Tipi", "Eşya Durumu", "Kullanım Durumu", "Takas", 
        "Aidat", "Cephe", "URL"
    ]
    
    # --- PROXY AYARLARI ---
    proxy_url = input("Proxy URL'sini gir (örnek: http://proxy.example.com:8080): ").strip()
    proxy_config = None
    if proxy_url:
        proxy_config = {"server": proxy_url}
        print(f"✓ Proxy kullanılacak: {proxy_url}")
    else:
        print("⚠ Proxy kullanılmayacak")
    
    OUTPUT_FILE = "hepsiemlak_istanbul_ml_ready.csv"
    USER_DATA_DIR = os.path.join(os.getcwd(), "browser_data")
    
    async with async_playwright() as p:
        
        context = await p.chromium.launch_persistent_context(
            user_data_dir=USER_DATA_DIR,
            headless=False,
            slow_mo=1000,
            proxy=proxy_config,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--start-maximized',
                '--disable-infobars' 
            ],
            user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        )
        
        page = context.pages[0]
        await page.add_init_script("Object.defineProperty(navigator, 'webdriver', {get: () => undefined})")
        await page.add_init_script("Object.defineProperty(navigator, 'plugins', {get: () => [1, 2, 3]})")
        await page.add_init_script("Object.defineProperty(navigator, 'languages', {get: () => ['tr-TR', 'tr']})")

        # --- KRİTİK ADIM: MANUEL DOĞRULAMA ---
        print("\n [MANUEL ADIM] Hepsiemlak aciliyor...")
        await page.goto("https://www.hepsiemlak.com/istanbul-satilik/daire?page=1")
        
        print("🚨 EĞER CLOUDFLARE ENGELİ VARSA:")
        print("1. Tarayicida 'Gerçek kişi olduğunuzu doğrulayin' kutusuna TIKLA.")
        print("2. Sayfa tamamen yüklenip ilanlari görene kadar bekle.")
        print("3. Her şey hazir olduğunda buraya gel ve ENTER'a bas.")
        input("\n Devam etmek için ENTER'a bas")

        # Artık bot devralabilir
        for current_page in range(770, 1506): # BURADAN BAŞLANGIÇ SAYFASINA AYARLA 
            url = f"https://www.hepsiemlak.com/istanbul-satilik/daire?page={current_page}"
            print(f"\n Sayfa {current_page} taranıyor...")
            
            try:
                # Sayfa geçişlerinde sanki biri adresi yazıp gitmiş gibi yapalım
                await page.goto(url, wait_until="domcontentloaded", timeout=90000)
                await random_sleep(12, 25)  # Minimum 12 saniye, maksimum 25 saniye
                await random_human_actions(page)

                # Eğer aniden tekrar bot kontrolü çıkarsa
                if await page.query_selector("text=Gerçek kişi olduğunuzu doğrulayin"):
                    print("Tekrar Cloudflare çikti")
                    input("Çözünce devam etmek için Enter...")

                links = await page.eval_on_selector_all("a.listingView__card-link", "elements => elements.map(e => e.href)")
                unique_links = list(set([f"https://www.hepsiemlak.com{l}" if l.startswith("/") else l for l in links]))

                for i, link in enumerate(unique_links):
                    try:
                        print(f"[{i+1}/{len(unique_links)}] Veri Çekiliyor...")
                        await page.goto(link, wait_until="domcontentloaded", timeout=60000)
                        
                        # Rastgele insan hareketleri 
                        await random_human_actions(page)
                        await random_sleep(10, 20)  # Minimum 10, maksimum 20 saniye

                        item_data = {col: "N/A" for col in MASTER_COLUMNS}
                        item_data["URL"] = link

                        # Konum 
                        loc_container = await page.query_selector("address.detail-info-location")
                        if loc_container:
                            divs = await loc_container.query_selector_all("div")
                            loc_parts = [ (await d.inner_text()).strip() for d in divs if (await d.inner_text()).strip() ]
                            item_data["konum"] = " / ".join(loc_parts)

                        # Fiyat
                        price_elem = await page.query_selector("p.fz24-text.price")
                        if price_elem:
                            item_data["fiyat"] = (await price_elem.inner_text()).strip()

                        # Özellikler
                        specs = await page.query_selector_all("tr.spec-item")
                        for s in specs:
                            th = await s.query_selector("th")
                            td = await s.query_selector("td")
                            if th and td:
                                key = (await th.inner_text()).strip()
                                val = (await td.inner_text()).strip()
                                if key in item_data:
                                    item_data[key] = val

                        # Kayıt
                        df_row = pd.DataFrame([item_data])
                        df_row = df_row[MASTER_COLUMNS]
                        df_row.to_csv(OUTPUT_FILE, mode='a', index=False, header=not os.path.exists(OUTPUT_FILE), encoding="utf-8-sig")

                    except Exception as e:
                        print(f"İlan atlandi: {e}")
                        continue
                
                print(f"Sayfa {current_page} bitti. Uzun timeout")
                await random_sleep(60, 120)  # 1-2 dakika arası 

            except Exception as e:
                print(f"Sayfa hatasi: {e}")
                continue

        await context.close()

if __name__ == "__main__":
    asyncio.run(scrape_hepsiemlak_hybrid())