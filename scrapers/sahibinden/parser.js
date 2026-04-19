async function parseListingPage(page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('tr.searchResultsItem');
    const results = [];

    rows.forEach((row) => {
      try {
        const ilan_id = row.getAttribute('data-id') || '';

        // [0] thumbnail — gerçek ilan URL'i buradan alınır
        const url = row.querySelector('td.searchResultsLargeThumbnail a')?.href || '';

        // [1] başlık
        const baslik = row.querySelector('td.searchResultsTitleValue')?.textContent?.trim() || '';

        // [2][3] özellikler (metrekare, oda)
        const attrs = row.querySelectorAll('td.searchResultsAttributeValue');
        const metrekare = attrs[0]?.textContent?.trim().replace(/[^\d]/g, '') || null;
        const oda_salon  = attrs[1]?.textContent?.trim() || '';

        // [4] fiyat
        const fiyatText = row.querySelector('td.searchResultsPriceValue')?.textContent?.trim() || '';
        const fiyat = parseFloat(fiyatText.replace(/\./g, '').replace(',', '.').replace(/[^\d.]/g, '')) || null;

        // [5] tarih
        const tarih = row.querySelector('td.searchResultsDateValue')?.textContent?.trim().replace(/\s+/g, ' ') || '';

        // [6] konum
        const konum_ham = row.querySelector('td.searchResultsLocationValue')?.textContent?.trim().replace(/\s+/g, ' ') || '';

        if (ilan_id) {
          results.push({ ilan_id, baslik, url, fiyat, tarih, konum_ham, metrekare, oda_salon });
        }
      } catch (_) {}
    });

    return results;
  });
}

async function hasNextPage(page) {
  return page.evaluate(() => {
    const next = document.querySelector('.prevNextBut.next:not(.disabled), a[title="Sonraki Sayfa"]');
    return next !== null && !next.classList.contains('disabled');
  });
}

async function getTotalCount(page) {
  return page.evaluate(() => {
    const el = document.querySelector('.search-count-text, .searchCount, [class*="resultCount"]');
    if (!el) return 0;
    const text = el.textContent.replace(/\./g, '').replace(/\s/g, '');
    return parseInt(text.match(/\d+/)?.[0] || '0', 10);
  });
}

module.exports = { parseListingPage, hasNextPage, getTotalCount };
