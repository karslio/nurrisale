"""Bediüzzaman'ın hayatı: books/hayat.json (zaman çizelgesi + harita)

Kullanım:
    python3 tools/build_hayat.py /yol/Turkey-Maps-GeoJSON /yol/natural-earth-vector

Harita:
  - il sınırları: https://github.com/alpers/Turkey-Maps-GeoJSON (Apache 2.0)
  - komşu ülkeler ve göller: Natural Earth (kamu malı), geojson/ne_50m_admin_0_countries ve ne_10m_lakes
Duraklar elle yazıldı. Her durak Tarihçe-i Hayat'ın ve Lâhikaların ilgili paragraflarına bağlanır;
alıntılar kitap dosyalarından (books/*.json) otomatik çekilir, yani hep sitedeki metinle aynıdır.
"""
import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GEO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/claude/ext/Turkey-Maps-GeoJSON")
NEV = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/home/claude/ext/nev")

# Ana pencere (Türkiye) ve izdüşüm: eşit dikdörtgen, enlem 38.5'e göre düzeltilmiş.
LON0, LON1, LAT0, LAT1 = 25.5, 45.2, 32.8, 42.4
K = math.cos(math.radians(38.5))
W = 1000
H = round(W * (LAT1 - LAT0) / ((LON1 - LON0) * K))
SX, SY = W / (LON1 - LON0), H / (LAT1 - LAT0)
def xy(lon, lat):
    return round((lon - LON0) * SX, 1), round((LAT1 - lat) * SY, 1)

# Çizilecek alan (Balkanlar ve Kafkasya da görünsün diye ana pencereden geniş)
CLIP = (18.5, 31.0, 47.5, 44.6)  # lon0, lat0, lon1, lat1

def clip_ring(ring, box=CLIP):
    """Sutherland–Hodgman: çokgeni dikdörtgene kırp."""
    x0, y0, x1, y1 = box
    def cut(pts, inside, inter):
        out = []
        for i, p in enumerate(pts):
            q = pts[i - 1]
            if inside(p):
                if not inside(q): out.append(inter(q, p))
                out.append(p)
            elif inside(q):
                out.append(inter(q, p))
        return out
    def ix(xc):
        return lambda a, b: (xc, a[1] + (b[1] - a[1]) * (xc - a[0]) / ((b[0] - a[0]) or 1e-12))
    def iy(yc):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (yc - a[1]) / ((b[1] - a[1]) or 1e-12), yc)
    pts = [tuple(p[:2]) for p in ring]
    for inside, inter in ((lambda p: p[0] >= x0, ix(x0)), (lambda p: p[0] <= x1, ix(x1)),
                          (lambda p: p[1] >= y0, iy(y0)), (lambda p: p[1] <= y1, iy(y1))):
        if not pts: break
        pts = cut(pts, inside, inter)
    return pts

def path_of(rings, tol):
    d = ""
    for ring in rings:
        pts, out = [xy(*p) for p in ring], []
        for p in pts:
            if not out or abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= tol:
                out.append(p)
        if len(out) >= 4:
            d += "M" + "L".join(f"{x:g},{y:g}" for x, y in out) + "Z"
    return d

def outer_rings(g):
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    return [poly[0] for poly in polys]

# İller
geo = json.loads((GEO / "tr-cities.json").read_text(encoding="utf-8"))
iller = []
for f in geo["features"]:
    d = path_of(outer_rings(f["geometry"]), 1.0)
    if d: iller.append([f["properties"]["name"], d])

# Komşu ülkeler (Türkiye hariç), kırpılmış
ulke = []
cn = json.loads((NEV / "geojson/ne_50m_admin_0_countries.geojson").read_text(encoding="utf-8"))
TR_NAMES = {"Turkey": "", "Greece": "Yunanistan", "Bulgaria": "Bulgaristan", "Syria": "Suriye", "Iraq": "Irak", "Iran": "İran",
            "Georgia": "Gürcistan", "Armenia": "Ermenistan", "Azerbaijan": "Azerbaycan", "Russia": "Rusya", "Cyprus": "Kıbrıs",
            "N. Cyprus": "Kıbrıs", "Northern Cyprus": "Kıbrıs", "Lebanon": "Lübnan", "Israel": "İsrail", "Jordan": "Ürdün",
            "Kosovo": "Kosova", "Macedonia": "Makedonya", "North Macedonia": "Makedonya", "Albania": "Arnavutluk", "Serbia": "Sırbistan",
            "Romania": "Romanya", "Montenegro": "Karadağ", "Ukraine": "Ukrayna", "Egypt": "Mısır", "Saudi Arabia": "S. Arabistan",
            "Palestine": "Filistin", "Bosnia and Herz.": "Bosna", "Moldova": "Moldova"}
for f in cn["features"]:
    name = f["properties"].get("NAME") or f["properties"].get("ADMIN")
    if name == "Turkey": continue
    rings = [r for r in (clip_ring(r) for r in outer_rings(f["geometry"])) if len(r) >= 4]
    d = path_of(rings, 1.2)
    if d: ulke.append([TR_NAMES.get(name, name), d])

# Tabii göller (barajlar o yıllarda yoktu, alınmaz)
LAKES = {"Lake Van": "Van Gölü", "Eğirdir": "Eğirdir Gölü", "Beyşehir": "Beyşehir Gölü", "Lake Tuz": "Tuz Gölü",
         "Lake Urmia": "Urmiye Gölü", "Lake Sevan": "Gökçe Gölü"}
gol = []
lk = json.loads((NEV / "geojson/ne_10m_lakes.geojson").read_text(encoding="utf-8"))
for f in lk["features"]:
    n = f["properties"].get("name")
    if n in LAKES:
        gol.append([LAKES[n], path_of(outer_rings(f["geometry"]), 0.5)])

# Bölgeler: oynatırken harita durağın bölgesine yaklaşır. (lon0, lat0, lon1, lat1)
REG = {
    "tr": (LON0, LAT0, LON1, LAT1),
    "dogu": (40.3, 37.0, 44.6, 40.2),
    "gol": (41.5, 37.6, 43.9, 38.8),
    "kafkas": (39.6, 37.8, 45.6, 42.4),
    "bati": (28.5, 37.2, 33.3, 40.3),
    "kuzey": (31.6, 40.2, 35.8, 42.3),
    "balkan": (20.0, 38.4, 30.0, 43.8),
}
def reg_box(b):
    x0, y1 = xy(b[0], b[1]); x1, y0 = xy(b[2], b[3])
    w, h = x1 - x0, y1 - y0
    if w / h < W / H:  # oranı haritanınkine getir
        nw = h * W / H; x0 -= (nw - w) / 2; w = nw
    else:
        nh = w * H / W; y0 -= (nh - h) / 2; h = nh
    return [round(x0, 1), round(y0, 1), round(w, 1), round(h, 1)]
regions = {k: reg_box(v) for k, v in REG.items()}

# Harita noktaları: id -> (ad, enlem, boylam, bölge, önemli mi, etiket konumu [dx, dy, hizalama])
# "önemli" olmayanların adı yalnız yakınlaşınca görünür. Harita dışındakiler (Rusya, Avrupa) ok ile gösterilir.
PTS = {
    "nurs":      ("Nurs", 38.36, 42.38, "gol", 0, [12, -10, "start"]),
    "nursin":    ("Nurşin", 38.60, 41.98, "gol", 0, [-14, -10, "end"]),
    "hizan":     ("Hizan", 38.225, 42.43, "gol", 0, [0, 30, "middle"]),
    "arvas":     ("Arvas · Müküs", 38.10, 42.92, "gol", 0, [14, 20, "start"]),
    "vastan":    ("Vastan", 38.31, 43.11, "gol", 0, [0, 30, "middle"]),
    "bayezid":   ("Doğubayazıt", 39.55, 44.08, "dogu", 1, [-14, -14, "end"]),
    "bitlis":    ("Bitlis", 38.40, 42.11, "gol", 1, [-14, -12, "end"]),
    "sirvan":    ("Şirvan", 38.06, 42.03, "gol", 0, [-14, 6, "end"]),
    "siirt":     ("Siirt · Tillo", 37.93, 41.96, "gol", 1, [-14, 18, "end"]),
    "cizre":     ("Cizre (Cezire)", 37.33, 42.19, "dogu", 0, [14, 6, "start"]),
    "mardin":    ("Mardin", 37.31, 40.74, "dogu", 1, [14, 6, "start"]),
    "van":       ("Van", 38.50, 43.38, "gol", 1, [14, -10, "start"]),
    "edremit":   ("Edremit (Artemit)", 38.42, 43.25, "gol", 0, [-10, -12, "end"]),
    "erek":      ("Erek Dağı", 38.44, 43.58, "gol", 0, [14, 18, "start"]),
    "pasinler":  ("Pasinler", 39.98, 41.68, "dogu", 0, [14, 6, "start"]),
    "tiflis":    ("Tiflis", 41.72, 44.79, "kafkas", 1, [-14, -10, "end"]),
    "sam":       ("Şam", 33.51, 36.29, "tr", 1, [14, 6, "start"]),
    "istanbul":  ("İstanbul", 41.01, 28.98, "tr", 1, [12, -12, "start"]),
    "selanik":   ("Selânik", 40.64, 22.94, "balkan", 1, [-14, 6, "end"]),
    "kosova":    ("Kosova", 42.66, 21.17, "balkan", 1, [14, -8, "start"]),
    "ankara":    ("Ankara", 39.93, 32.86, "bati", 1, [14, 6, "start"]),
    "burdur":    ("Burdur", 37.72, 30.29, "bati", 1, [-14, 12, "end"]),
    "barla":     ("Barla", 38.03, 30.76, "bati", 1, [14, -4, "start"]),
    "isparta":   ("Isparta · Sav", 37.76, 30.55, "bati", 1, [12, 24, "start"]),
    "eskisehir": ("Eskişehir", 39.78, 30.52, "bati", 1, [-14, -4, "end"]),
    "kastamonu": ("Kastamonu", 41.38, 33.78, "kuzey", 1, [14, 8, "start"]),
    "tosya":     ("Tosya", 41.01, 34.04, "kuzey", 0, [-12, 22, "end"]),
    "atabey":    ("Atabey", 37.95, 30.65, "bati", 0, [14, 6, "start"]),
    "inebolu":   ("İnebolu", 41.98, 33.76, "kuzey", 0, [14, 6, "start"]),
    "denizli":   ("Denizli", 37.78, 29.09, "bati", 1, [-14, 6, "end"]),
    "emirdag":   ("Emirdağ", 39.02, 31.15, "bati", 1, [14, 8, "start"]),
    "afyon":     ("Afyon", 38.76, 30.54, "bati", 1, [-14, 10, "end"]),
    "urfa":      ("Urfa", 37.16, 38.79, "tr", 1, [14, 6, "start"]),
    # harita dışı: okun konacağı yer (lon, lat) ve yazı
    "kosturma":  ("Kosturma (Rusya)", 42.12, 42.6, "tr", 1, "↑"),
    "firar":     ("Petersburg · Varşova · Viyana", 42.12, 36.4, "tr", 1, "↑"),
}

# Kitaplardan alıntı
_books = {}
def block(ref):
    b, p, i = ref.rsplit("-", 2)
    if b not in _books:
        _books[b] = json.loads((ROOT / f"books/{b}.json").read_text(encoding="utf-8"))
    t = _books[b]["pages"][int(p) - 1]["b"][int(i)][1]
    t = re.sub(r"⟦[^⟧]*⟧(\(\*?Haşiye\)|\(\*\))?", "", re.sub(r"<[^>]+>", "", t))
    return re.sub(r"\s+", " ", t).strip()

def quote(ref, find, maxlen=300):
    t = block(ref)
    at = t.find(find)
    if at < 0:
        raise SystemExit(f"Alıntı bulunamadı: {ref} :: {find}")
    # cümle başı: bulduğumuz yerden geriye ilk ". " / "! " / "? " / ": "
    s = max(t.rfind(m, 0, at) for m in (". ", "! ", "? ", ": ", "… "))
    s = 0 if s < 0 else s + 2
    e = len(t)
    for m in (". ", "! ", "? ", "… "):
        k = t.find(m, at + len(find))
        if k >= 0: e = min(e, k + 1)
    q = t[s:e].strip()
    if len(q) > maxlen:  # çok uzunsa bulunan yerin çevresini al
        a = max(s, at - maxlen // 3); a = t.find(" ", a) + 1 if a > s else s
        q = t[a:a + maxlen]; q = q[:q.rfind(" ")]
        q = ("… " if a > s else "") + q + " …"
    return q

ES, YS, US = "Eski Said", "Yeni Said", "Üçüncü Said"
T = "tarihceihayat"

# Duraklar: yıl, dönem, nokta, yer adı (listede), başlık, açıklama, eserler, kaynaklar, alıntı (ref, aranan söz)
STOPS = [
    # ---------------- ESKİ SAİD ----------------
    ("1877", ES, "nurs", "Nurs", "Doğum",
     "Rumî 1293'te Bitlis'in Hizan kazasına bağlı İsparit nahiyesinin Nurs köyünde doğdu. Babası Mirza, annesi Nuriye Hanım'dır. Dokuz yaşına kadar ailesinin yanında büyüdü.",
     [], [(f"{T}-28-1", "Tarihçe: doğumu")], (f"{T}-28-1", "Babasının adı Mirza")),
    ("1886", ES, "nurs", "Tağ köyü", "İlk medrese",
     "Okumaya karar verip İsparit'e bağlı Tağ köyünde Molla Mehmed Emin Efendi'nin medresesine gitti. Kimseye boyun eğmeyen mizacı yüzünden orada fazla kalamadı.",
     [], [(f"{T}-28-1", "Tarihçe: Tağ medresesi")], (f"{T}-28-1", "Tağ Köyü")),
    ("1887", ES, "nursin", "Nurşin · Şeyhan yaylası", "\"Şeyh Talebesi\"",
     "Ağabeyi Molla Abdullah ile Nurşin köyüne geldi; yazın talebelerle birlikte Şeyhan yaylasına çıktı. Bu yıllarda \"Şeyh Talebesi\" diye anılmaya başladı.",
     [], [(f"{T}-28-6", "Tarihçe: Nurşin")], (f"{T}-28-6", "Şeyh Talebesi")),
    ("1888", ES, "hizan", "Hizan", "Bir rüya ve yeni bir şevk",
     "Hizan'a döndü, medreseyi bırakıp baharı babasının yanında geçirdi. O sırada gördüğü bir rüyadan sonra ilme büyük bir şevkle yeniden sarıldı.",
     [], [(f"{T}-29-5", "Tarihçe: Hizan ve rüya"), (f"{T}-29-7", "Rüyadan sonra")], (f"{T}-29-7", "büyük bir şevk")),
    ("1888", ES, "arvas", "Arvas · Mîr Hasan-ı Veli", "Sıradan çıkan talebe",
     "Arvas'ta Molla Mehmed Emin Efendi'den, sonra Müküs'teki Mîr Hasan-ı Veli Medresesi'nde okudu. Yeni talebeye önem verilmediğini görünce sıradaki yedi kitabı bırakıp sekizinciden okumaya başladı.",
     [], [(f"{T}-29-7", "Tarihçe: Arvas"), (f"{T}-30-0", "Mîr Hasan-ı Veli Medresesi")], (f"{T}-30-0", "sekizinci kitabdan")),
    ("1888–1889", ES, "bayezid", "Vastan · Doğubayazıt", "Asıl tahsil: üç ayda icazet",
     "Vastan'da bir ay kaldıktan sonra Bayezid'e geçti. Şeyh Mehmed Celâlî'nin yanında, normalde yirmi yılda okunan ilimlerin özünü üç ayda tamamlayıp icazet aldı. Az konuşur, geceleri Ahmed Hânî'nin türbesine kapanırdı; 13–14 yaşlarındaydı.",
     [], [(f"{T}-30-1", "Tarihçe: Bayezid"), (f"{T}-30-3", "Üç ayda tahsil"), (f"{T}-31-5", "Ahmed Hânî türbesi")], (f"{T}-30-3", "üç ayda tahsil")),
    ("1890", ES, "sirvan", "Şirvan", "Ağabeyine hoca olan kardeş",
     "Şirvan'da ağabeyi Molla Abdullah'ın yanına gitti. \"Seksen kitap okudum\" deyince imtihan edildi; ağabeyi, sekiz ay önce talebesi olan kardeşinden gizlice ders almaya başladı.",
     [], [(f"{T}-32-1", "Tarihçe: Şirvan"), (f"{T}-32-8", "Ağabeyinin imtihanı")], (f"{T}-32-3", "seksen kitab")),
    ("1891–1892", ES, "siirt", "Siirt", "\"Said-i Meşhur\"",
     "Molla Fethullah'ın medresesinde imtihan edildi; Cem'ü'l-Cevâmi'i bir haftada ezberledi. Siirt âlimleriyle yaptığı münazaradan galip çıkınca \"Said-i Meşhur\" diye anıldı. On beş-on altı yaşlarındaydı.",
     [], [(f"{T}-32-10", "Molla Fethullah"), (f"{T}-33-3", "Cem'ü'l-Cevâmi' bir haftada"), (f"{T}-34-2", "Said-ül Meşhur")], (f"{T}-33-3", "bir haftada hıfzetti")),
    ("1892", ES, "bitlis", "Bitlis · Kureyş Camii", "On altı sual ve sürgün",
     "Bitlis'te Şeyh Emin Efendi'nin sorduğu on altı zor suale cevap verdi, Kureyş Camii'nde vaaz etmeye başladı. Halk ikiye bölününce vali onu Şirvan'a gönderdi.",
     [], [(f"{T}-34-3", "Tarihçe: Bitlis"), (f"{T}-35-0", "On altı sual")], (f"{T}-35-0", "onaltı sual")),
    ("1893", ES, "siirt", "Tillo", "Tillo'da inziva",
     "Siirt'e bağlı Tillo'da bir türbeye kapandı; Kamus-u Okyanus'u Bâbü's-Sin'e kadar ezberledi. Abdülkadir-i Geylânî'yi rüyasında gördü ve Mîran aşiretinin reisine gitmesi emredildi.",
     [], [(f"{T}-35-9", "Tarihçe: Tillo"), (f"{T}-36-3", "Geylânî rüyası")], (f"{T}-35-9", "Kamus-u Okyanus")),
    ("1893", ES, "cizre", "Cizre · Biro çölü", "Mustafa Paşa ve Cezire âlimleri",
     "Mîran aşireti reisi Mustafa Paşa'nın çadırına girip onu zulmü bırakmaya davet etti. Paşa'nın Cezire âlimleriyle tertiplediği münazarayı kazandı; Paşa namaza başladı. Sonra bedevilerin yurdu Biro çölüne geçti.",
     [], [(f"{T}-36-5", "Tarihçe: Mîran aşireti"), (f"{T}-37-0", "Cezire âlimleri"), (f"{T}-38-2", "Biro")], (f"{T}-37-12", "namaz kılmaya başlar")),
    ("1894", ES, "mardin", "Mardin", "İlk siyasî hayat",
     "Mardin âlimleriyle münazara etti; Cemaleddin Efgânî ve Senûsî yollarından iki talebeyle tanıştı. \"İlk hayat-ı siyasiyesi Mardin'de başlamıştır.\" Mutasarrıf onu elleri bağlı olarak Bitlis'e sürdü; yolda namaz için kelepçeleri açtı.",
     [], [(f"{T}-39-2", "Tarihçe: Mardin"), (f"{T}-39-3", "Efgânî ve Senûsî"), (f"{T}-39-4", "Bitlis'e nefy")], (f"{T}-39-4", "İlk hayat-ı siyasiyesi")),
    ("1894–1895", ES, "bitlis", "Bitlis", "Kırk risale ezberi",
     "Bitlis'te valinin içki meclisine girip hadis okudu. Kur'an'ın büyük kısmını ve kırk ilmî risaleyi ezberledi; Şeyh Mehmed Küfrevî'den son dersini aldı.",
     [], [(f"{T}-39-6", "Vali olayı"), (f"{T}-41-4", "Kırk risale"), (f"{T}-41-6", "Şeyh Küfrevî")], (f"{T}-41-4", "kırk risaleyi")),
    ("1895–1907", ES, "van", "Van · Horhor", "Van: fen ilimleri ve \"Bedîüzzaman\"",
     "Hasan Paşa'nın daveti, sonra Vali Tahir Paşa'nın himayesiyle on beş yıl Van'da kaldı. Eski kelâmın yetmediğine kanaat getirip tarih, coğrafya, matematik, jeoloji, fizik, kimya ve astronomiyi kısa sürede öğrendi. Bunu gören âlimler ona \"Bedîüzzaman\" lakabını verdi. Horhor Medresesi'nde ders okuttu.",
     [], [(f"{T}-42-4", "Tarihçe: Van"), (f"{T}-43-0", "Bedîüzzaman lakabı"), (f"{T}-45-8", "Horhor Medresesi")], (f"{T}-43-0", "lakabını vermiştir")),
    ("1907", ES, "van", "Van · Bâşit yaylası", "Medresetü'z-Zehra fikri ve büyük ahd",
     "Câmiü'l-Ezher'in eşi olarak Bitlis ve Van'da Medresetü'z-Zehra adlı bir üniversite kurmayı tasarladı. İngiliz Müstemlekât Nâzırı'nın Kur'an'ı gösterip \"onu Müslümanların elinden kaldırmalıyız\" dediğini duyunca Kur'an'ın sönmez bir güneş olduğunu göstermeye ahdetti.",
     [], [(f"{T}-44-2", "Medresetü'z-Zehra"), (f"{T}-44-3", "Bâşit yaylası"), (f"{T}-45-9", "İngiliz nâzırın nutku")], (f"{T}-44-2", "Medreset-üz Zehra")),
    ("1907–1908", ES, "istanbul", "İstanbul · Şekerci Han", "\"Burada her müşkil halledilir\"",
     "Medresetü'z-Zehra için İstanbul'a geldi. Kaldığı hanın kapısına \"Burada her müşkil halledilir, her suale cevap verilir\" yazdı; âlimler grup grup gelip soru sordu. Ezher'den Şeyh Bahît Efendi, Ayasofya'daki karşılaşmalarının ardından onu takdir etti.",
     [], [(f"{T}-46-1", "İstanbul'a geliş"), (f"{T}-46-7", "Âlimlerin sualleri"), (f"{T}-47-0", "Şeyh Bahît")], (f"{T}-46-7", "ehl-i ilmi hayranlıkla")),
    ("1908", ES, "selanik", "Selânik", "Hürriyete Hitap",
     "İlân-ı Hürriyet'in üçüncü gününde İstanbul'da irticalen söylediği nutku Selânik'te Hürriyet Meydanı'nda tekrarladı. Meşrutiyeti şeriata uygun bir \"meşrûiyet\" olarak anlattı.",
     [], [(f"{T}-48-1", "Hürriyete Hitap"), (f"{T}-52-0", "Selânik'te Karasso")], (f"{T}-48-1", "Hürriyet Meydanı")),
    ("1909", ES, "istanbul", "İstanbul", "31 Mart ve Divan-ı Harb-i Örfî",
     "İttihad-ı Muhammedî Cemiyeti'ne katıldı; 31 Mart Hâdisesi'nde isyan eden sekiz taburu bir nutukla itaate getirdi. Yine de Divan-ı Harb-i Örfî'de yargılandı; idam edilenleri pencereden görerek müdafaasını yaptı ve beraat etti.",
     ["divaniharbiorfi"], [(f"{T}-47-9", "İttihad-ı Muhammedî"), (f"{T}-52-2", "31 Mart"), (f"{T}-53-0", "Divan-ı Harb müdafaası")], (f"{T}-52-2", "pencereden onları gördüğü")),
    ("1910", ES, "tiflis", "Batum · Tiflis", "Şeyh San'an Tepesi",
     "Batum yoluyla Van'a dönerken Tiflis'e uğradı. Şeyh San'an Tepesi'nde ne yaptığını soran Rus polisine \"Medresemin plânını yapıyorum\" dedi; Bitlis ile Tiflis'in kardeş olduğunu, perdenin yırtılıp İslâm âleminde üç nurun doğacağını söyledi.",
     [], [(f"{T}-71-8", "Tarihçe: Tiflis"), (f"{T}-71-18", "Üç nur, üç zulmet")], (f"{T}-71-20", "Her kışın bir baharı")),
    ("1910–1911", ES, "van", "Van · aşiretler", "Münâzarât",
     "Doğu aşiretlerini dolaşıp meşrutiyeti, hürriyeti ve birliği soru-cevap derslerle anlattı. Bu sohbetler Münâzarât adıyla basıldı.",
     ["munazarat"], [(f"{T}-72-3", "Tarihçe: Münâzarât")], (f"{T}-72-3", "Münazarat")),
    ("1911", ES, "sam", "Şam · Emevî Camii", "Hutbe-i Şâmiye",
     "Şam âlimlerinin ısrarıyla Emevî Camii'nde, içinde yüz âlimin bulunduğu on bine yakın bir cemaate hutbe okudu: İslâm âleminin geri kalışının altı hastalığı ve çareleri.",
     ["hutbeisamiye"], [(f"{T}-80-14", "Tarihçe: Şam"), ("hutbeisamiye-9-3", "Altı hastalık")], (f"{T}-80-14", "Câmi-ül Emevî")),
    ("1911", ES, "kosova", "Rumeli · Kosova", "19.000 altın Doğu'ya",
     "Sultan Reşad'ın Rumeli seyahatine doğu vilâyetleri adına katıldı. Kosova'da kurulması düşünülen üniversitenin tahsisatının Doğu'daki üniversiteye verilmesini istedi; 19.000 altın lira kabul edildi.",
     [], [(f"{T}-92-6", "Rumeli seyahati"), (f"{T}-97-3", "Kosova dârülfünunu"), (f"{T}-97-4", "On dokuz bin altın")], (f"{T}-97-4", "ondokuz bin altun")),
    ("1913", ES, "edremit", "Van · Artemit (Edremit)", "Medresetü'z-Zehra'nın temeli",
     "Van Gölü kıyısındaki Artemit'te üniversitenin temeli atıldı. Birinci Dünya Savaşı çıkınca inşaat yarım kaldı. O kış talebelerine \"Hazır olunuz, büyük bir musibet yaklaşıyor\" demişti.",
     [], [(f"{T}-98-0", "Tarihçe: temel"), (f"{T}-291-1", "Kendi anlatımı")], (f"{T}-98-0", "dârülfünunun temeli atılır")),
    ("1914–1915", ES, "pasinler", "Kafkas cephesi · Pasinler", "Gönüllü alay kumandanı",
     "Talebeleriyle kurduğu gönüllü alayla Kafkas cephesinde savaştı. Siperde, at üstünde, avcı hattında söyleyip talebesi Molla Habib'e yazdırarak İşârâtü'l-İ'câz tefsirini telif etti.",
     ["isaratulicaz"], [(f"{T}-98-4", "Kafkas cephesi"), (f"{T}-99-0", "İşârâtü'l-İ'câz siperde")], (f"{T}-99-0", "bazan at üzerinde")),
    ("1915", ES, "vastan", "Van · Vastan", "Van'ın tahliyesi",
     "Rus ilerleyişiyle Van'a çekildi; kaleyi savunmaya karar verdiyse de valinin ısrarıyla Vastan'a geçti. Tefsirin kâtibi Molla Habib burada şehit düştü. Toplanan binlerce Ermeni çocuğuna dokunulmamasını emredip ailelerine gönderdi.",
     [], [(f"{T}-98-4", "Van'ın tahliyesi"), (f"{T}-101-3", "Molla Habib'in şehadeti"), (f"{T}-102-0", "Ermeni çocukları")], (f"{T}-102-0", "Bunlara ilişmeyiniz")),
    ("1916", ES, "bitlis", "Bitlis", "Bitlis müdafaası ve esaret",
     "Ruslar üç tümenle Bitlis'e yürüyünce halk çekilene kadar direndi. Yaralı ve ayağı kırık hâlde otuz üç saat su ve çamur içinde kaldı; sonra esir düştü. Van, Celfa, Tiflis ve Kiloğrif üzerinden Rusya'ya götürüldü.",
     [], [(f"{T}-102-1", "Bitlis'e hücum"), (f"{T}-104-0", "Yaralanma"), (f"{T}-104-4", "Esaret yolu")], (f"{T}-104-0", "otuzüç saat su ve çamur")),
    ("1916–1918", ES, "kosturma", "Kosturma", "Rusya'da esaret",
     "İki buçuk yıl Volga kıyısındaki Kosturma'da esir kaldı; doksan esir subaya ders verdi. Ayağa kalkmadığı için Nikola Nikolayeviç'in verdiği idam kararı namazı sırasında geri alındı. Volga kenarındaki Tatar camisinde bir \"intibâh-ı ruhî\" yaşadı.",
     [], [(f"{T}-105-0", "Rus başkumandanı"), (f"{T}-105-12", "İki buçuk yıl"), (f"{T}-106-4", "Volga kenarındaki cami")], (f"{T}-105-5", "İmanlı bir kimse")),
    ("1918", ES, "firar", "Petersburg · Varşova · Viyana", "Esaretten firar",
     "Esaretten kaçarak Petersburg ve Varşova'ya, oradan Viyana yoluyla (Rumî 1334) İstanbul'a döndü.",
     [], [(f"{T}-105-13", "Tarihçe: firar")], (f"{T}-105-13", "Petersburg ve Varşova")),
    ("1918–1922", ES, "istanbul", "İstanbul · Dârü'l-Hikmet", "Dârü'l-Hikmeti'l-İslâmiye",
     "Haberi olmadan Mehmed Âkif, Elmalılı Hamdi ve İzmirli İsmail Hakkı'nın da bulunduğu Dârü'l-Hikmeti'l-İslâmiye'ye âza seçildi. Maaşının ihtiyacı aşanını kitap bastırmaya verdi. İşgal yıllarında Hutuvât-ı Sitte'yi yazıp İngilizlere karşı İstanbul ulemasının fikrini çevirdi.",
     ["mesneviinuriye"], [(f"{T}-107-3", "Dârü'l-Hikmet"), (f"{T}-108-2", "Maaşı"), (f"{T}-260-0", "Hutuvât-ı Sitte")], (f"{T}-107-3", "Mehmed Âkif")),
    # ---------------- YENİ SAİD ----------------
    ("1920–1921", YS, "istanbul", "Eyüp · Sarıyer", "Eski Said'den Yeni Said'e",
     "Eyüp Sultan kabristanının dereye bakan bir tepesinde ölümü tefekkür ederken \"Yeni Said\" doğdu. Kabristan ona İstanbul'dan daha sevimli geldi; Sarıyer'de kendine bir halvethane buldu.",
     [], [(f"{T}-109-2", "Eyüp kabristanı"), (f"{T}-112-0", "Sarıyer halvethanesi"), (f"{T}-113-0", "Beyaz saçlar")], (f"{T}-112-0", "Sarıyer’de")),
    ("1922–1923", YS, "ankara", "Ankara · Hacı Bayram", "Meclis'e beyanname",
     "Meclis'in davetiyle Ankara'ya geldi, Hacı Bayram civarında kaldı. Mebusların namaza ilgisizliğini görünce \"Ey mebuslar, siz büyük bir gün için ba'solunacaksınız\" diye başlayan beyannameyi dağıttı. Kendisine teklif edilen makamları reddetti.",
     [], [(f"{T}-127-2", "Ankara'ya geliş"), (f"{T}-136-1", "Teklifler"), (f"{T}-137-3", "Kendi anlatımı")], (f"{T}-127-2", "Hacı Bayram civarında")),
    ("1923–1925", YS, "erek", "Van · Erek Dağı", "Zernebad mağarasında inziva",
     "Siyaseti bırakıp Van'a çekildi; Erek Dağı eteğinde Zernebad suyu başındaki bir mağarada ibadetle yaşadı. Şeyh Said hareketine katılması istenince \"Türk milleti asırlardan beri İslâmiyet'e hizmet etmiş\" diyerek reddetti.",
     [], [(f"{T}-136-2", "Erek Dağı"), (f"{T}-138-5", "İsyana katılmama")], (f"{T}-138-5", "Türk Milleti asırlardan beri")),
    ("1926", YS, "burdur", "Burdur", "Nur'un İlk Kapısı",
     "Van'dan alınıp Batı Anadolu'ya sürüldü. Burdur'da sıkı takip altında on üç derslik Nur'un İlk Kapısı'nı bir kısım ehl-i imana okutup gizlice kitap hâline getirdi. Mareşal Fevzi Çakmak'ın valiye verdiği cevap da buradadır.",
     ["nurunilkkapisi"], [(f"{T}-139-0", "Burdur"), (f"{T}-139-1", "Fevzi Çakmak")], (f"{T}-139-0", "onüç ders")),
    ("1927–1934", YS, "barla", "Barla", "Barla: Risale-i Nur'un doğuşu",
     "Isparta'nın ücra nahiyesi Barla'ya sürüldü ve sekiz buçuk yıl kaldı. Önünde çınar ağacı ve çeşme olan iki odalı evde, Sözler, Mektubat ve Lem'aların çoğunu yazdı. Risaleler köylerde binlerce kalemle elle çoğaltıldı; Barla Lâhikası bu yılların mektuplarıdır.",
     ["sozler", "mektubat", "lemalar", "barlalahikasi"], [(f"{T}-141-0", "Barla'ya nefy"), (f"{T}-156-0", "Barla'daki hayatı"), (f"{T}-148-0", "Telif yılları")], (f"{T}-156-0", "Nur Risalelerini te’lif eder")),
    ("1927–1934", YS, "barla", "Barla · Çam Dağı", "Çam Dağı'nda bir ağaç evi",
     "Yazları Barla yaylasındaki Çam Dağı'na çıkar, Eğirdir Gölü'ne bakan tepede büyük bir çam ağacının üstündeki odacıkta yalnız kalırdı. \"İnsten tevahhuş ve vuhuşa ünsiyet ettim\" diye yazar.",
     ["lemalar"], [(f"{T}-160-0", "Çam Dağı"), (f"{T}-160-8", "Mektubu"), (f"{T}-182-4", "Çam ağacındaki gece")], (f"{T}-160-8", "çam ağacının tepesinde")),
    ("1927–1934", YS, "barla", "Barla · Yokuşbaşı Çeşmesi", "Yağmur duası",
     "Barla'da yirmi-otuz gündür yağmur yağmamıştı. Yokuşbaşı Çeşmesi'nin menbaına yakın bir yerde talebeleriyle namaz kıldı, Kur'an'ı şefaatçi yaparak yağmur duası etti; her ele yedi-sekiz damla düştü. \"Bu bir işaret-i İlâhiyedir\" dedi; sonra Yâsîn'in şefaatiyle yağmur yağdı.",
     ["barlalahikasi"], [("barlalahikasi-183-0", "Barla Lâhikası: yağmur duası")], ("barlalahikasi-183-0", "Bu bir işaret-i İlahiyedir")),
    ("1927–1934", YS, "isparta", "Isparta köyleri", "Nur fabrikaları: Sav, İslâmköy, Kuleönü, Atabey",
     "Barla'da yazılan risaleler Isparta köylerinde elle çoğaltıldı. Lâhikalarda Kuleönü'nün \"çalışkanları\", İslâmköy'ün \"sadık ve gayretli\" talebeleri, Atabey'in ve Bedre'nin hizmetleri sık sık anılır.",
     ["barlalahikasi"], [("kastamonulahikasi-5-2", "Kastamonu Lâhikası: köyler"), ("kastamonulahikasi-97-12", "Atabey ve Sav"), ("barlalahikasi-302-4", "Barla Lâhikası: Kuleönü")], ("kastamonulahikasi-5-2", "Kuleönü’nün")),
    ("1927–1943", YS, "atabey", "Atabey", "Atabey: Zergendere Mescidi ve Nur talebeleri",
     "İslâmköy ile Kuleönü arasındaki Atabey, Sıddık Sabri ve Lütfü gibi talebeler yetiştirdi. Barla Lâhikası'nda bir talebe, Üstad'ın Atabey'deki Zergendere Mescidi'nde olduğunu rüyasında görür; Kastamonu Lâhikası'nda Üstad, köyün geri kaldığını düşünüp üzülürken Tahir ve Abdullah Çavuş'un hizmetinin bu endişesini giderdiğini yazar.",
     ["barlalahikasi", "kastamonulahikasi"], [("barlalahikasi-39-3", "Barla Lâhikası: Atabey'e giderken"), ("barlalahikasi-185-0", "Zergendere Mescidi"), ("kastamonulahikasi-89-4", "Kastamonu Lâhikası: Atabey")], ("kastamonulahikasi-89-4", "Atabey Karyesi")),
    ("1935–1936", YS, "eskisehir", "Eskişehir", "Eskişehir mahkemesi ve hapsi",
     "Barla'dan alınıp talebeleriyle kelepçeli olarak Eskişehir'e götürüldü; yüz yirmi talebesiyle Ağır Ceza'da yargılandı. On bir ay hapiste Otuzuncu Lem'a'yı ve Birinci, İkinci Şua'yı yazdı.",
     ["lemalar", "sualar"], [(f"{T}-207-1", "Eskişehir'e sevk"), (f"{T}-207-2", "Hapiste telif"), (f"{T}-208-1", "Yüz yirmi talebe")], (f"{T}-207-2", "Otuzuncu Lem’a")),
    ("1936–1943", YS, "kastamonu", "Kastamonu", "Kastamonu: karakolun karşısındaki ev",
     "Önce polis karakolunda, sonra tam karşısındaki evde sekiz yıl göz hapsinde yaşadı. Âyetü'l-Kübrâ, Münâcât ve Şuaların birçoğu burada yazıldı. Isparta talebeleriyle yazışmaları Kastamonu Lâhikası'nı oluşturur.",
     ["kastamonulahikasi", "ayetulkubra", "sualar"], [(f"{T}-284-1", "Kastamonu'ya nefy"), (f"{T}-387-3", "Kastamonu'da telif"), ("barlalahikasi-2-2", "Lâhikalar hakkında")], (f"{T}-284-1", "karakolun tam karşısında")),
    ("1936–1943", YS, "tosya", "Tosya yolu", "Tosya yolunda kamyon kazası",
     "Tosya'dan Kastamonu'ya kamyonla gelirken yanında Lem'alar ve Şualar vardı. Kamyon üç takla atıp yirmi beş-otuz metre aşağı yuvarlandı; şoförün tarafı parçalandığı hâlde onun tarafındaki ince cam bile kırılmadı. Bunu bir mucize değil, bir keramet olarak yorumladı.",
     ["kastamonulahikasi"], [("kastamonulahikasi-59-0", "Kastamonu Lâhikası: kamyon kazası")], ("kastamonulahikasi-59-0", "Yüzbin şükür hiçbir yaram yok")),
    ("1939", YS, "kastamonu", "Kastamonu · Karadağ", "Karadağ'da bir tefekkür",
     "Kastamonu'da Karadağ'a çıkarken \"Müslümanların bu felâketleri ne vakitten başladı, ne vakte kadar sürecek?\" diye düşündü. Karadağ'ın ormanlarında at üstünde geçen hâtıraları da Lâhika'dadır.",
     ["kastamonulahikasi"], [("kastamonulahikasi-200-10", "Kastamonu Lâhikası: Karadağ"), ("kastamonulahikasi-257-0", "Karadağ ormanları")], ("kastamonulahikasi-200-10", "Karadağ başına çıkıyordum")),
    ("1936–1943", YS, "inebolu", "İnebolu", "İnebolu talebeleri",
     "Kastamonu yıllarında İnebolu'da fedakâr ve faal talebeler yetişti. Isparta talebeleri gibi risaleleri yazıp gizlice yaydılar; sonra teksir makinesiyle çoğaltmaya başladılar.",
     [], [(f"{T}-284-3", "İnebolu talebeleri"), (f"{T}-480-1", "Teksir makinesi")], (f"{T}-284-3", "İnebolu’da çok fedakâr")),
    ("1943–1944", YS, "denizli", "Denizli", "Denizli hapsi ve Meyve Risalesi",
     "Talebeleriyle Denizli hapishanesine konuldu; zehirlendi. Meyve Risalesi'ni iki Cuma gününde yazdı; risale hapishanedeki yüzlerce mahkûmu ıslah etti. Dokuz ay sonra Haziran 1944'te beraat etti ve bir süre Şehir Oteli'nde kaldı.",
     ["meyverisalesi"], [(f"{T}-410-0", "Beraat ve zehir"), (f"{T}-410-1", "Meyve Risalesi"), (f"{T}-474-1", "Şehir Oteli")], (f"{T}-410-1", "iki Cuma gününde")),
    ("1944–1947", YS, "emirdag", "Emirdağ", "Emirdağ: Çalışkanlar ve zehir",
     "Ağustos 1944'te Emirdağ'a sürüldü. Kapısında bekçi beklerken Çalışkanlar ailesi ona yakın dostluk gösterdi. İlk iki yıl Çarşı Camii'ne gitti; bir gece penceresinden yemeğine zehir atıldı. Bu yılların mektupları Emirdağ Lâhikası'dır.",
     ["emirdaglahikasi"], [(f"{T}-474-3", "Emirdağ'a nefy"), (f"{T}-475-0", "Çalışkanlar"), (f"{T}-477-1", "Zehirlenme"), (f"{T}-478-0", "Çarşı Camii")], (f"{T}-475-0", "Çalışkanlar Hanedanı")),
    ("1944–1951", YS, "emirdag", "Emirdağ · yangın", "Emirdağ'da gece yangını",
     "Emirdağ'da eski belediye binası gece üç saat yandı; bitişikteki Çalışkanlardan Ceylan'ın mağazası da tehlikedeydi, ama zarar görmedi; Üstad iki gün önce mağazadaki Âyetü'l-Kübrâ nüshalarını getirtmek istemişti, onlar orada kalmıştı. Üstad bunu Risale-i Nur'un ve Âyetü'l-Kübrâ'nın bir kerameti saydı.",
     ["emirdaglahikasi"], [("emirdaglahikasi-122-5", "Emirdağ Lâhikası: yangın"), ("emirdaglahikasi-123-0", "Çalışkanlar kurtuldu")], ("emirdaglahikasi-122-5", "Risale-i Nur’un Çalışkanlarından")),
    ("1948–1949", YS, "afyon", "Afyon", "Afyon hapsi",
     "1947'nin son ayında on beş talebesiyle Emirdağ'dan alınıp Afyon'da tutuklandı. Yirmi ay çoğunlukla tecrid-i mutlakta kaldı. 20 Eylül 1949'da, halk karşılamasın diye şafak vakti tahliye edildi.",
     [], [(f"{T}-564-0", "Afyon'a sevk"), (f"{T}-569-1", "Tahliye"), (f"{T}-644-3", "Rahmete dönen musibet")], (f"{T}-569-1", "şafa")),
    # ---------------- ÜÇÜNCÜ SAİD ----------------
    ("1949–1951", US, "emirdag", "Afyon · Emirdağ", "Üçüncü Said",
     "Tahliyeden sonra iki ay Afyon'da, sonra yeniden Emirdağ'da kaldı. Yanına gelenler artık çoğunlukla mektepli gençlerdi; Nurların neşri teksir ve matbaa ile genişledi.",
     ["emirdaglahikasi"], [(f"{T}-645-1", "Emirdağ'a dönüş"), (f"{T}-644-3", "Mektepli gençler")], (f"{T}-645-1", "iki ay kadar")),
    ("1951", US, "eskisehir", "Eskişehir · Yıldız Oteli", "Yıldız Oteli",
     "1371 Muharreminde Eskişehir'e geldi ve bir buçuk ay Yıldız Oteli'nde kaldı. 1950'ye kadar sürgün yerlerinden hiçbir yere çıkmamıştı.",
     [], [(f"{T}-684-1", "Tarihçe: Eskişehir")], (f"{T}-684-1", "Yıldız Oteli")),
    ("1952", US, "istanbul", "İstanbul", "Gençlik Rehberi mahkemesi",
     "Isparta'da yetmiş gün kaldıktan sonra Gençlik Rehberi'nin basılması yüzünden İstanbul'da yargılandı. 22 Ocak ve 5 Mart 1952'deki duruşmalarda salon ve koridorlar üniversiteli gençlerle doldu; beraat etti.",
     ["genclikrehberi"], [(f"{T}-684-4", "Isparta'da yetmiş gün"), (f"{T}-685-2", "22 Ocak 1952"), (f"{T}-688-2", "5 Mart 1952")], (f"{T}-685-2", "genç üniversiteliler")),
    ("1953–1960", US, "isparta", "Isparta · Sav", "Isparta: son yıllar",
     "1953 yazında Isparta'ya yerleşti; mezarının Isparta'da, Sav'da ya da Barla'da olmasını istiyordu. Sav köyünde bin kadar kalemin risaleleri yazdığını anlatır. Urfa ve Diyarbakır'daki talebeler birer medrese-i Nuriye kurdu.",
     [], [(f"{T}-711-1", "Isparta'ya geliş"), (f"{T}-711-2", "Sav köyü"), (f"{T}-711-6", "Vasiyet"), (f"{T}-712-5", "Urfa ve Diyarbakır")], (f"{T}-711-2", "bin kad")),
    ("1956", US, "isparta", "Isparta · Afyon mahkemesi", "Risale-i Nur serbest",
     "Afyon'da yıllarca süren dava, 1956'da Diyanet İşleri Müşavere Kurulu'nun Risale-i Nur'un iman ve ahlâka hizmet ettiğini bildiren raporuyla beraatle sonuçlandı. Risaleler matbaada serbestçe basılmaya başlandı.",
     [], [(f"{T}-713-0", "Diyanet raporu ve beraat"), (f"{T}-713-2", "Medrese-i Nuriyeler")], (f"{T}-713-0", "Diyanet İşleri")),
    ("1956", US, "barla", "Barla", "Yirmi beş yıl sonra Barla",
     "Yirmi beş yıl önce ayrıldığı Barla'ya bu defa sürgünle değil, kendi isteğiyle ve serbest olarak bir bahar günü döndü. Barla, \"Risale-i Nur'un telif yeri olduğundan\" ona Nurs'tan da sevimliydi.",
     ["barlalahikasi"], [(f"{T}-714-1", "Barla'ya dönüş"), (f"{T}-714-2", "En tatlı hayat")], (f"{T}-714-2", "kendi rızası ile")),
    ("1959", US, "ankara", "Ankara · İstanbul", "Son yolculuklar",
     "1959'da İstanbul'a ve Ankara'ya gitti; Tarihçe-i Hayat'taki fotoğraflar bu ziyaretlerden kalmadır. Tarihçe-i Hayat'ın mufassal baskısı da bu yıllarda Ankara'da tamamlandı.",
     [], [(f"{T}-745-4", "1959 Ankara"), (f"{T}-743-2", "1959 İstanbul"), (f"{T}-745-0", "Tarihçe'nin baskısı")], None),
    ("1960", US, "urfa", "Urfa", "Vefat",
     "Hastalığı ağırlaşmışken Urfa'ya gitti ve 23 Mart 1960'ta (25 Ramazan 1379) Urfa'da vefat etti.",
     [], [], None),
]

pts = {}
for k, (name, lat, lon, reg, major, lbl) in PTS.items():
    x, y = xy(lon, lat)
    p = {"n": name, "x": x, "y": y, "r": reg, "m": major}
    if isinstance(lbl, str): p["off"] = lbl
    else: p["l"] = lbl
    pts[k] = p

stops, used = [], set()
for year, era, pt, place, title, text, works, refs, q in STOPS:
    assert pt in pts, pt
    used.add(pt)
    for r, _ in refs: block(r)  # yanlış referans varsa burada patlasın
    s = {"y": year, "e": era, "pt": pt, "pl": place, "t": title, "d": text, "w": works, "src": [[r, l] for r, l in refs]}
    if q: s["q"] = [quote(*q), q[0]]
    stops.append(s)
pts = {k: v for k, v in pts.items() if k in used}

out = {"w": W, "h": H, "il": iller, "ulke": ulke, "gol": gol, "reg": regions, "pts": pts, "stops": stops,
       "eras": [[ES, "1877–1920", "Medrese, siyaset ve cephe: ilim ve cihad yılları"],
                [YS, "1920–1949", "Uzlet, sürgün ve hapisler: Risale-i Nur'un yazıldığı yıllar"],
                [US, "1949–1960", "Gençlerle ve matbaayla Nurların serbestçe yayıldığı yıllar"]],
       "kaynak": "İl sınırları: Turkey-Maps-GeoJSON (alpers, Apache 2.0). Ülkeler ve göller: Natural Earth (kamu malı)"}
(ROOT / "books/hayat.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(iller)} il, {len(ulke)} ülke, {len(gol)} göl, {len(pts)} nokta, {len(stops)} durak, harita {W}x{H}")
