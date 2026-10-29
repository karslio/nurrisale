# NurRisale — proje durumu

Risale-i Nur Külliyatı okuma sitesi, öğrenme projesi.

- Site: https://karslio.github.io/nurrisale
- Kod: https://github.com/karslio/nurrisale (GitHub Pages, `main` dalı)

## Yapı

- `index.html` — sitenin tamamı (HTML, CSS, JavaScript tek dosya)
- `books/index.json` — 40 kitabın listesi (ad, raf: kulliyat/cep, kapak, sayfa sayısı)
- `books/<id>.json` — sayfalar (`s` bölüm, `b` bloklar: p/c/ar/h), içindekiler, haşiyeler
- `books/lugat.json` — ~950 kelimelik lugat (sayfadaki küçük lugatla birleşir)
- `books/covers/` — kapaklar (EPUB'lardan; külliyat kitapları sitede çizilmiş cilt kapağıyla görünür)
- `fonts/` — Souvenir (metin; eksik â î û Â Î Û harfleri eklendi) ve Hamdullah (Arapça), WOFF
- `tools/epub_to_json.py` — EPUB → JSON dönüştürücü (kitap adları, raflar ve açıklamalar `META` içinde)
- `sw.js`, `manifest.webmanifest`, simgeler — uygulama olarak yükleme ve çevrimdışı okuma
  - Kitap verisi değişince `sw.js` içindeki `CACHE` sürümünü artır.

## Özellikler

- eRisale düzeni: sekmeler (Arama + okuma sekmeleri, en fazla 6), solda kitap ağacı, kitap/bölüm yolu ve sayfa kutusu, bölüm bölüm kaydırarak okuma
- Lugat: altın renkli kelimeler, üstüne gelince/dokununca anlam; aranabilir lugat penceresi
- Arapça: kırmızı, Hamdullah yazı tipi; sık geçen ifade ve ayetlerin meâli (~%56 satır)
- Haşiyeler: kırmızı numara, tıklayınca metni
- Ayarlar paneli: tema (sistem/açık/sepya/gece), sürekli ya da sayfa sayfa okuma, yazı boyutu, yazı tipi, iki yana hizalama, sayfa/satır boşluğu, lugat/meâl/haşiye/sayfa numarası aç-kapa
- Vurgu (4 renk) ve notlar, yer imleri, seçili metni kaynakla kopyalama, bağlantı, vecize kartı (kare görsel)
- Arama: çok kelime (hepsi geçmeli), "tırnakla" tam ifade, lugat kutusu, kitaba göre süzme
- Ana sayfa: arama, eser grupları, günün vecizesi, okuma takibi (bugün, üst üste gün, 7 gün grafiği), son okunanlar
- Sesli okuma (tarayıcının Türkçe sesi), odak/tam ekran modu, uygulama menüsü, yardım ve kısayollar

## Bilinen sınırlar

- Sayfa numaraları sitenin kendi sayfalaması; basılı kitapla aynı değil. Archive.org'daki `page_numbers.json` dosyaları
  güvenilmez tahminler (güven %0–47, sıra sık sık başa dönüyor), o yüzden kullanılmadı. Basılı sayfa için sayfa
  numarası basılı bir kaynak (taranmış PDF) gerekiyor.
- Souvenir ticari bir yazı tipi; kullanım izni kullanıcının sorumluluğunda.
- Arapça meâllerin geri kalanı (~%44) için güvenilir bir meâl kaynağı gerekiyor.
