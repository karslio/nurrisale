"""Bediüzzaman'ın hayatı: books/hayat.json (zaman çizelgesi + harita)

Kullanım:
    python3 tools/build_hayat.py /yol/Turkey-Maps-GeoJSON

Harita: il sınırları https://github.com/alpers/Turkey-Maps-GeoJSON (Apache 2.0) verisinden sadeleştirilir.
Duraklar elle yazıldı; her durak ilgili eserlere ve Tarihçe-i Hayat'ın ilgili sayfasına bağlanır.
"""
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
GEO = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/claude/ext/Turkey-Maps-GeoJSON")

# Harita penceresi (boylam, enlem) ve izdüşüm: eşit dikdörtgen, enlem 39'a göre düzeltilmiş
LON0, LON1, LAT0, LAT1 = 25.5, 45.2, 32.8, 42.4
K = math.cos(math.radians(38.5))
W = 1000
H = round(W * (LAT1 - LAT0) / ((LON1 - LON0) * K))
def xy(lon, lat):
    return round((lon - LON0) / (LON1 - LON0) * W, 1), round((LAT1 - lat) / (LAT1 - LAT0) * H, 1)

def simplify(ring, tol=1.6):
    pts, out = [xy(*p) for p in ring], []
    for p in pts:
        if not out or abs(p[0] - out[-1][0]) + abs(p[1] - out[-1][1]) >= tol:
            out.append(p)
    return out if len(out) >= 4 else []

geo = json.loads((GEO / "tr-cities.json").read_text(encoding="utf-8"))
paths = []
for f in geo["features"]:
    g = f["geometry"]
    polys = g["coordinates"] if g["type"] == "MultiPolygon" else [g["coordinates"]]
    d = ""
    for poly in polys:
        pts = simplify(poly[0])
        if pts:
            d += "M" + "L".join(f"{x:g},{y:g}" for x, y in pts) + "Z"
    if d:
        paths.append([f["properties"]["name"], d])

# year, yer, enlem, boylam, başlık, açıklama, eserler, Tarihçe sayfası
STOPS = [
    ("1877", "Nurs", 38.36, 42.35, "Doğum", "Bitlis'in Hizan kazasına bağlı Nurs köyünde doğdu. Babası Mirza Efendi, annesi Nuriye Hanım'dır.", [], 28),
    ("1886–1892", "Doğubayazıt", 39.55, 44.08, "Medrese yılları", "Tağ, Pirmis, Şirvan ve Bitlis medreselerinde okudu; Doğubayazıt'ta Şeyh Muhammed Celâlî'den kısa sürede icazet aldı.", [], 28),
    ("1892", "Siirt", 37.93, 41.94, "\"Bedîüzzaman\" lakabı", "Siirt'te âlimlerle yaptığı münazaralar ve Molla Fethullah Efendi'nin imtihanından sonra \"zamanın harikası\" anlamında Bedîüzzaman diye anıldı.", [], 28),
    ("1894–1907", "Van", 38.50, 43.38, "Van ve fen ilimleri", "Vali Tahir Paşa'nın konağında kaldı; fen ilimlerini öğrendi. Doğu'da din ve fen ilimlerinin birlikte okutulacağı bir üniversite (Medresetü'z-Zehra) fikri burada doğdu.", [], 31),
    ("1907–1910", "İstanbul", 41.01, 28.98, "İstanbul ve Hürriyet", "Medresetü'z-Zehra için Sultan Abdülhamid'e başvurdu. 1908 Hürriyeti'ni nutuklarıyla karşıladı; 31 Mart Hâdisesi'nden sonra Divan-ı Harb-i Örfî'de yargılanıp beraat etti.", ["divaniharbiorfi"], 53),
    ("1910–1911", "Bitlis", 38.40, 42.11, "Doğu aşiretleri arasında", "Aşiretleri dolaşarak meşrutiyeti, hürriyeti ve ittihadı anlattı; bu sohbetler Münâzarât adıyla basıldı.", ["munazarat"], 72),
    ("1911", "Şam", 33.51, 36.29, "Hutbe-i Şamiye", "Emevî Camii'nde, İslâm âleminin ilerleyişine dair meşhur hutbesini okudu.", ["hutbeisamiye"], None),
    ("1914–1916", "Erzurum", 39.90, 41.27, "Gönüllü alay kumandanı", "Birinci Dünya Savaşı'nda talebeleriyle gönüllü alay kurdu; cephede İşârâtü'l-İ'câz tefsirini yazdırdı. 1916'da Bitlis'te yaralanıp esir düştü.", ["isaratulicaz"], 98),
    ("1916–1918", "Kosturma", 57.77, 40.93, "Rusya'da esaret", "İki buçuk yıl Kosturma'da esir kaldı; 1918'de kaçarak Varşova, Berlin ve Viyana üzerinden İstanbul'a döndü.", [], 106),
    ("1918–1922", "İstanbul", 41.01, 28.98, "Dârü'l-Hikmeti'l-İslâmiye", "Dârü'l-Hikmeti'l-İslâmiye âzası oldu. \"Eski Said\"den \"Yeni Said\"e geçiş bu yıllardadır; işgale karşı Hutuvât-ı Sitte'yi yazdı.", ["mesneviinuriye"], 109),
    ("1922–1923", "Ankara", 39.93, 32.86, "Ankara", "Meclis'in davetiyle Ankara'ya geldi; milletvekillerine namaza dair bir beyanname dağıttı. Sonra siyaseti bırakıp Van'a çekildi.", [], 137),
    ("1923–1925", "Van", 38.50, 43.38, "Erek Dağı'nda inziva", "Van'da Erek Dağı'ndaki Zernebad mevkiinde ibadet ve tefekkürle yaşadı.", [], 138),
    ("1926", "Burdur", 37.72, 30.29, "Batı Anadolu'ya sürgün", "Burdur'a sürgün edildi; ilk iman derslerini burada verdi.", ["nurunilkkapisi"], 138),
    ("1927–1934", "Barla", 38.03, 30.73, "Barla: Risale-i Nur'un doğuşu", "Sekiz buçuk yıl Barla'da kaldı. Sözler, Mektubat ve Lem'aların çoğu burada yazıldı; risaleler elle yazılarak çoğaltıldı.", ["sozler", "mektubat", "lemalar", "barlalahikasi"], 140),
    ("1935–1936", "Eskişehir", 39.78, 30.52, "Eskişehir mahkemesi", "Talebeleriyle birlikte Eskişehir Ağır Ceza Mahkemesi'nde yargılandı; on bir ay hapis yattı.", [], 207),
    ("1936–1943", "Kastamonu", 41.38, 33.78, "Kastamonu yılları", "Karakolun karşısındaki evde yedi buçuk yıl kaldı. Âyetü'l-Kübrâ ve Şuaların birçoğu burada yazıldı.", ["kastamonulahikasi", "ayetulkubra", "sualar"], 284),
    ("1943–1944", "Denizli", 37.78, 29.09, "Denizli hapsi", "Denizli hapishanesinde Meyve Risalesi'ni yazdı; mahkeme beraatle sonuçlandı.", ["meyverisalesi"], 409),
    ("1944–1951", "Emirdağ", 39.02, 31.15, "Emirdağ", "Emirdağ'da ikamete mecbur edildi; burada zehirlendi. Bu yılların mektupları Emirdağ Lâhikası'nı oluşturur.", ["emirdaglahikasi"], 468),
    ("1948–1949", "Afyon", 38.76, 30.54, "Afyon hapsi", "Yirmi ay Afyon hapishanesinde, çoğu zaman tecrid-i mutlakta kaldı.", [], 563),
    ("1952", "İstanbul", 41.01, 28.98, "Gençlik Rehberi mahkemesi", "Gençlik Rehberi'nden dolayı İstanbul'da yargılandı ve beraat etti.", ["genclikrehberi"], 685),
    ("1953–1960", "Isparta", 37.76, 30.55, "Isparta: son yıllar", "Son yıllarını Isparta'da geçirdi. 1956'da Risale-i Nur'un serbestçe basılmasına karar verildi.", [], 711),
    ("1960", "Urfa", 37.16, 38.79, "Vefat", "23 Mart 1960'ta Urfa'da vefat etti.", [], None),
]
stops = []
for year, place, lat, lon, title, text, works, page in STOPS:
    inside = LON0 <= lon <= LON1 and LAT0 <= lat <= LAT1
    x, y = xy(lon, lat) if inside else (None, None)
    stops.append({"y": year, "pl": place, "x": x, "yy": y, "t": title, "d": text, "w": works, "p": page})
out = {"w": W, "h": H, "il": paths, "stops": stops,
       "kaynak": "İl sınırları: Turkey-Maps-GeoJSON (alpers, Apache 2.0)"}
(ROOT / "books/hayat.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(paths)} il, {len(stops)} durak, harita {W}x{H}")
