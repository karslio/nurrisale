# NurRisale

Risale-i Nur okuma sitesi — öğrenme projesi.

Site: https://karslio.github.io/nurrisale

## Klasörler

- `index.html` — HTML iskeleti ve sayfa içi CSS
- `js/` — uygulamanın JavaScript dosyaları; `index.html` içinde bağımlılık sırasıyla yüklenir.
- `books/index.json` — kitap listesi (ad, açıklama, kapak rengi, sayfa sayısı)
- `books/<kitap>.json` — kitabın sayfaları, içindekiler ve haşiyeleri
- `books/lugat-big.json`, `books/kelime-sira.json` — büyük lugat ve en sık 1000 kelime
  (`tools/build_lugat.py` ile depodaki `data/` CSV kopyalarından üretilir; kaynak ve lisans bilgisi `data/README.md` içinde)
- `books/ayetler.json` — Arapça satırlarda geçen ayetler ve mealleri (`tools/build_ayet.py`;
  [quran-json](https://github.com/risan/quran-json) verisinden: Tanzil metni CC BY 3.0, meal: Rowwad Tercüme Merkezi, QuranEnc.com)
- `books/stats.json` — kitaplara göre kelime istatistikleri (`tools/build_stats.py`)
- `books/konular.json` — konu dizini: 28 konunun en çok işlendiği bölümler (`tools/build_konular.py`)
- `books/arapca.json` — ayet olmayan Arapça/Farsça satırların yaklaşık meali (`tools/build_arapca.py`, kaynak `tools/arapca_tercume.json`)
- `books/dizin.json` — hadis, kişi ve yer dizini (`tools/build_dizin.py`); `books/hayat.json` — Bediüzzaman'ın hayatı haritası (`tools/build_hayat.py`, 57 durak, Tarihçe ve Lâhika alıntılarıyla; il sınırları: Turkey-Maps-GeoJSON, Apache 2.0; ülkeler ve göller: Natural Earth, kamu malı)
- `tools/epub_to_json.py` — EPUB dosyasını `books/` için JSON'a çeviren araç

## Sözlük kontrolü ve üretimi

Sözlük, kelime istatistikleri ve kalite denetimini tek komutla yenile:

```
python3 tools/build_dictionary.py
```

Komut, birden fazla anlamı bulunan sözlük kayıtları için `books/lugat-review.json` inceleme raporunu üretir. İnceleme ekranını açmak için depo kökünde yerel sunucu başlat:

```
python3 -m http.server 8000
```

Ardından `http://localhost:8000/tools/lugat-review.html` adresine git. Anlam adaylarından birini seçebilir veya kendi düzeltmeni yazıp **Düzeltmeleri indir** ile `lugat-overrides.json` dosyasını indirebilirsin. Dosyayı `data/lugat-overrides.json` üzerine kopyalayıp üretim komutunu yeniden çalıştır; düzeltmeler lugata ve kelime istatistiklerine uygulanır.

## Yeni kitap eklemek

```
python3 tools/epub_to_json.py Kitap.epub
python3 tools/build_stats.py   # istatistikleri yenile
```

Kitabın adı, sırası ve kapak rengi `tools/epub_to_json.py` içindeki `META` listesinde ayarlanır.
EPUB dosyaları depoya eklenmez (`.gitignore`).
