# NurRisale — proje durumu

Risale-i Nur Külliyatı okuma sitesi, öğrenme projesi.

- Site: https://karslio.github.io/nurrisale
- Kod: https://github.com/karslio/nurrisale (GitHub Pages, `main` dalı)

## Yapı

- `index.html` — sitenin tamamı (HTML, CSS, JavaScript tek dosya)
- `books/index.json` — 40 kitabın listesi (ad, raf: kulliyat/cep, kapak, sayfa sayısı)
- `books/<id>.json` — sayfalar (`s` bölüm, `b` bloklar: p/c/ar/h), içindekiler, haşiyeler
- `books/lugat.json` — ~950 kelimelik küçük lugat (yedek)
- `books/lugat-big.json` — 31 bin kayıtlık büyük lugat (11 bin kelime + 20 bin tamlama; kitaplarda geçmeyenler atıldı), `books/kelime-sira.json` — en sık 1000 kelime
  - `tools/build_lugat.py` ile [Risale-i Nur Kelime Frekansı](https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans) verisinden (Ali Tekdemir, CC0); sitede kaynak belirtildi
- `books/ayetler.json` — ayet eşleşmeleri (3.810 Arapça satırın %41'i, 501 farklı ayet) ve Türkçe meal (Rowwad, QuranEnc.com 1.0.4; metne dokunmadan, kaynakla) — `tools/build_ayet.py /yol/quran-json`
- `books/konular.json` — konu dizini: 28 konu (haşir, kader, namaz, ihlas, gençlik…), her biri için anahtar kelimelerin en yoğun geçtiği 30 bölüm/alt başlık ve kitaplara göre sayılar (`tools/build_konular.py`)
- `books/arapca.json` — ayet olmayan Arapça/Farsça satırların meali (dua, salavat, Âyetü'l-Kübra, Farsça münacatlar): 930 tercüme, 1.404 satır; kaynak `tools/arapca_tercume.json` (NurRisale çalışma tercümesi, yaklaşık meal), `tools/build_arapca.py`
- `books/stats.json` — kitaplara göre kelime sayısı, farklı kelime, en sık kelimeler (`tools/build_stats.py`; kitap eklenince yeniden çalıştır)
- `books/covers/` — kapaklar (EPUB'lardan; külliyat kitapları sitede çizilmiş cilt kapağıyla görünür)
- `fonts/` — Souvenir (metin; eksik â î û Â Î Û harfleri eklendi) ve Hamdullah (Arapça), WOFF
- `tools/epub_to_json.py` — EPUB → JSON dönüştürücü (kitap adları, raflar ve açıklamalar `META` içinde)
- `sw.js`, `manifest.webmanifest`, simgeler — uygulama olarak yükleme ve çevrimdışı okuma
  - Kitap verisi değişince `sw.js` içindeki `CACHE` sürümünü artır.

## Özellikler

- eRisale düzeni: sekmeler (Arama + okuma sekmeleri, en fazla 6, tek boş sekme), solda kitap ağacı, kitap/bölüm/alt başlık yolu ve sayfa kutusu
- Sürekli kaydırma kesintisiz: bölüm bitince sonraki bölüm alta eklenir; yol, sol liste (alt başlığa kadar), sekme adı ve sayfa kutusu okunan yeri izler
- Sayfa sayfa okuma modu ayrıca var (ok tuşları, telefonda kaydırma)
- Lugat: altın renkli kelimeler ve tamlamalar (Cenâb-ı Hak, derd-i maîşet…), üstüne gelince/dokununca anlam, sıklık sırası ve "Biliyorum" düğmesi; aranabilir lugat penceresi
- Kelime Öğren: en sık 100/300/500/1000 kelime kartları, bilinen kelimeler metinde düz yazılır (ayar), kapsam yüzdesi
- Aralıklı tekrar (nr-srs, Leitner): bilinen kelimeler 1, 3, 7, 16, 35, 90 gün sonra yeniden sorulur; "Unuttum" deyince kelime yeniden altın renkli olur; ana sayfada tekrar bekleyen kelime sayısı
- Okuma planı (nr-plan): kitap, gün sayısı, başlangıç sayfası; günlük hedef kalan sayfa/kalan gün olarak her gün yeniden hesaplanır; ana sayfada ilerleme çubuğu (plana göre olunması gereken yer işaretli), hedefe ulaşınca bildirim
- İstatistik sekmesi (#istatistik, #istatistik-<kitap>): toplam/farklı kelime, en sık kelimeler (bağlaçlar hariç seçeneği), kitaplara göre tablo, istenen kelime/ifadenin kitaplara göre sayısı ve payları (ekli hâller dahil ya da tam kelime)
- Ayetler: Arapça satırın altında sure:ayet etiketi, üstüne gelince meal; Ayet dizini (#ayetler, #ayetler-<kitap>): sure sırasıyla, en çok geçenler, geçtiği yerler, arama
- Hız: uzun bölümler 10'ar sayfa çizilir (Onuncu Söz 0,7 sn → 0,06 sn); lugat ve ayet dosyaları açılışta arka planda iner; lugat kitaplarda geçmeyen kayıtlardan ayıklandı (31 bin kayıt)
- Konu dizini (#konular, #konular-<konu>): konu kartları ve arama; konu sayfasında en çok işlendiği yerler (tıklayınca açılır, anahtar kelimeler işaretli), kitaplara göre çubuk grafik. İstatistik sekmesinde Kelimeler / Ayetler / Konular geçişi; menüde ve ana sayfada bağlantı
- Arapça satırların altında "Türkçesi" düğmesi (ayet değilse): yaklaşık meal penceresi
- Arapça: kırmızı, Hamdullah yazı tipi; sık geçen ifade ve ayetlerin meâli (~%56 satır)
- Haşiyeler: kırmızı numara, tıklayınca metni
- Ayarlar paneli: tema (sistem/açık/sepya/gece), sürekli ya da sayfa sayfa okuma, yazı boyutu, yazı tipi, iki yana hizalama, sayfa/satır boşluğu, lugat/meâl/haşiye/sayfa numarası aç-kapa
- Vurgu (4 renk) ve notlar, yer imleri, seçili metni kaynakla kopyalama, bağlantı, vecize kartı (kare görsel)
- Arama: çok kelime (hepsi geçmeli), "tırnakla" tam ifade, lugat kutusu, kitaba göre süzme
- Ana sayfa: arama, eser grupları, günün vecizesi, okuma takibi (bugün, üst üste gün, 7 gün grafiği), son okunanlar
- Okunan sayfa: sayfa ekranda 4 saniye kalınca sayılır (hızlı kaydırılan sayfalar okuma takibine ve plana girmez)
- Yedekle ve aktar (menü): yer imleri, vurgular, notlar, bilinen kelimeler, tekrar durumu, plan, okuma kayıtları ve ayarlar tek JSON dosyasına; geri yüklemede mevcut verilerle birleştirilir
- Sesli okuma (tarayıcının Türkçe sesi), odak/tam ekran modu, uygulama menüsü, yardım ve kısayollar

## Bilinen sınırlar

- Sayfa numaraları sitenin kendi sayfalaması; basılı kitapla aynı değil. Archive.org'daki `page_numbers.json` dosyaları
  güvenilmez tahminler (güven %0–47, sıra sık sık başa dönüyor), o yüzden kullanılmadı. Basılı sayfa için sayfa
  numarası basılı bir kaynak (taranmış PDF) gerekiyor.
- Souvenir ticari bir yazı tipi; kullanım izni kullanıcının sorumluluğunda.
- Arapça satırların %96,6'sında meal var (ayet %41, hazır ifadeler, çalışma tercümesi). Kalanlar: Celcelutiye'nin şifreli isimleri, içindekiler başlıkları, Osmanlıca satırlar, birkaç takriz şiiri ve hemen altında Risale'nin kendi meali olan satırlar. Çalışma tercümeleri yaklaşık; bir hocanın gözden geçirmesi iyi olur.
