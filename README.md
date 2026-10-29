# NurRisale

Risale-i Nur okuma sitesi — öğrenme projesi.

Site: https://karslio.github.io/nurrisale

## Klasörler

- `index.html` — sitenin tamamı (HTML, CSS ve JavaScript tek dosyada)
- `books/index.json` — kitap listesi (ad, açıklama, kapak rengi, sayfa sayısı)
- `books/<kitap>.json` — kitabın sayfaları, içindekiler ve haşiyeleri
- `books/lugat-big.json`, `books/kelime-sira.json` — büyük lugat ve en sık 1000 kelime
  (`tools/build_lugat.py` ile [Risale-i Nur Kelime Frekansı](https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans) verisinden, CC0)
- `books/ayetler.json` — Arapça satırlarda geçen ayetler ve mealleri (`tools/build_ayet.py`;
  [quran-json](https://github.com/risan/quran-json) verisinden: Tanzil metni CC BY 3.0, meal: Rowwad Tercüme Merkezi, QuranEnc.com)
- `books/stats.json` — kitaplara göre kelime istatistikleri (`tools/build_stats.py`)
- `books/konular.json` — konu dizini: 28 konunun en çok işlendiği bölümler (`tools/build_konular.py`)
- `books/arapca.json` — ayet olmayan Arapça/Farsça satırların yaklaşık meali (`tools/build_arapca.py`, kaynak `tools/arapca_tercume.json`)
- `books/dizin.json` — hadis, kişi ve yer dizini (`tools/build_dizin.py`); `books/hayat.json` — Bediüzzaman'ın hayatı haritası (`tools/build_hayat.py`, 55 durak, Tarihçe ve Lâhika alıntılarıyla; il sınırları: Turkey-Maps-GeoJSON, Apache 2.0; ülkeler ve göller: Natural Earth, kamu malı)
- `tools/epub_to_json.py` — EPUB dosyasını `books/` için JSON'a çeviren araç

## Yeni kitap eklemek

```
python3 tools/epub_to_json.py Kitap.epub
python3 tools/build_stats.py   # istatistikleri yenile
```

Kitabın adı, sırası ve kapak rengi `tools/epub_to_json.py` içindeki `META` listesinde ayarlanır.
EPUB dosyaları depoya eklenmez (`.gitignore`).
