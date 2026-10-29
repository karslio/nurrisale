# NurRisale

Risale-i Nur okuma sitesi — öğrenme projesi.

Site: https://karslio.github.io/nurrisale

## Klasörler

- `index.html` — sitenin tamamı (HTML, CSS ve JavaScript tek dosyada)
- `books/index.json` — kitap listesi (ad, açıklama, kapak rengi, sayfa sayısı)
- `books/<kitap>.json` — kitabın sayfaları, içindekiler ve haşiyeleri
- `books/lugat-big.json`, `books/kelime-sira.json` — büyük lugat ve en sık 1000 kelime
  (`tools/build_lugat.py` ile [Risale-i Nur Kelime Frekansı](https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans) verisinden, CC0)
- `tools/epub_to_json.py` — EPUB dosyasını `books/` için JSON'a çeviren araç

## Yeni kitap eklemek

```
python3 tools/epub_to_json.py Kitap.epub
```

Kitabın adı, sırası ve kapak rengi `tools/epub_to_json.py` içindeki `META` listesinde ayarlanır.
EPUB dosyaları depoya eklenmez (`.gitignore`).
