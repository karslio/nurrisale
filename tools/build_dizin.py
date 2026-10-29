"""Hadis, kişi ve yer dizini: books/dizin.json

Kullanım:
    python3 tools/build_dizin.py /yol/quran-json

Hadisler: metinde geçen Arapça ifadelerden, yakınında "hadîs" ya da "ev kemâ kal" geçen ve Kur'an'da
eşleşmeyenler (Kur'an metni yalnız ayetleri ayıklamak için kullanılır). Anlamı varsa Risale'nin kendi
açıklamasından ("Yani…", "meal-i şerifi…") alınır, yoksa tools/arapca_tercume.json'dan.
Kişiler ve yerler: isim listesine göre, ekli hâlleriyle sayılır; en yoğun geçtiği bölümler listelenir.
"""
import collections
import json
import math
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "books"
SRC = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/home/claude/ext/quran-json")

def plain(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("ı", "i")
    return re.sub(r"[’`]", "'", s)

# ---------- Kur'an eşleştirme (build_ayet.py ile aynı iskelet yöntemi) ----------
MARKS = re.compile(r"[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]")
def skel(s):
    s = MARKS.sub("", s)
    s = re.sub("[أإآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub(r"[^ء-ي ]", " ", s)
    return [k for k in (re.sub("[اويء]", "", w) for w in s.split()) if k]
quran = json.loads((SRC / "data/tanzil/simple-clean.json").read_text(encoding="utf-8"))
grams = set()
for ch, arr in quran.items():
    for v in arr:
        w = skel(v["text"])
        for i in range(len(w) - 2):
            grams.add(tuple(w[i:i + 3]))
        for i in range(len(w) - 1):
            grams.add(tuple(w[i:i + 2]))
def is_quran(text):
    w = skel(text)
    if len(w) < 2:
        return True                 # tek kelime: hadis sayma
    if len(w) == 2:
        return tuple(w) in grams
    g = [tuple(w[i:i + 3]) for i in range(len(w) - 2)]
    return sum(x in grams for x in g) / len(g) >= 0.5

def norm_ar(s):
    s = MARKS.sub("", s)
    s = re.sub("[أإآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي").replace("ک", "ك")
    return re.sub(r"[^ء-يپچگی]", "", s).replace("ی", "ي")
tercume = {norm_ar(x["ar"]): x["m"] for x in json.loads((ROOT / "tools/arapca_tercume.json").read_text(encoding="utf-8"))}

AR_RUN = re.compile(r"[؀-ۿ][؀-ۿً-ٰ\s❊]{6,}[؀-ۿً-ٰ]")
HADIS = re.compile(r"hadîs|hadis|ev kem[âa] k[âa]l", re.I)
MEAL = re.compile(r"^\W{0,4}(?:-?\s*ev kem[âa] k[âa]l\s*-?\s*)?(?:hadîs-i şerifi(?:nin)?\s*|hadîsi\s*)?(?:Yani|yani|meal-i şerifi|meâl-i şerifi|mealen|meâlen)\s*[:;,]?\s*[“\"]?([^”\"]{12,260})")
FN = re.compile(r"⟦[^⟧]*⟧")

NOT_HADIS = tuple(norm_ar(x) for x in "اللهم|الباقي|بسم|الحمد لله|سبحان|و به نستعين|السلام عليكم|عليه الصلاه|صلي الله".split("|")) + tuple(norm_ar(x) for x in ["باسمه سبحانه", "ايكى مكتب", "على الحوت"])
idx = json.loads((BOOKS / "index.json").read_text(encoding="utf-8"))
had = {}                 # norm → {ar, m, src, places}
segments = []            # konular gibi bölüm parçaları (kişi/yer sayımı için)
for meta in idx:
    data = json.loads((BOOKS / f"{meta['id']}.json").read_text(encoding="utf-8"))
    chap, chap_start, seg = None, 0, None
    for p, page in enumerate(data["pages"], 1):
        if page["s"] != chap or p - chap_start >= 120:
            if seg: segments.append(seg)
            chap, chap_start = page["s"], p
            seg = [meta["id"], p, chap, None, []]
        b = page["b"]
        for i, (k, t) in enumerate(b):
            t = FN.sub("", t)
            if k == "h":
                if seg[4]: segments.append(seg)
                seg = [meta["id"], p, chap, re.sub(r"[-]", "", t).strip(), []]
                continue
            if k != "ar":
                seg[4].append(t)
            # hadis adayları
            cands = []
            if k == "ar":
                around = " ".join(FN.sub("", x[1]) for x in b[max(0, i - 1):i + 2] if x[0] != "ar")
                nxt = FN.sub("", b[i + 1][1]) if i + 1 < len(b) and b[i + 1][0] != "ar" else ""
                if HADIS.search(around):
                    cands.append((t, nxt))
            else:
                for m in AR_RUN.finditer(t):
                    ctx = t[max(0, m.start() - 140):m.end() + 140]
                    if HADIS.search(ctx):
                        cands.append((m.group(), t[m.end():m.end() + 320]))
            for ar, after in cands:
                ar = ar.strip(" ❊")
                n = norm_ar(ar)
                if len(n) < 8 or is_quran(ar) or n.startswith(NOT_HADIS):
                    continue
                x = had.get(n)
                if not x:
                    mm = MEAL.search(after.strip())
                    meal, src = (mm.group(1).strip(" .,;"), "r") if mm else (tercume.get(n), "t")
                    x = had[n] = {"ar": ar, "m": meal, "s": src if meal else None, "pl": []}
                elif not x["m"]:
                    mm = MEAL.search(after.strip())
                    if mm: x["m"], x["s"] = mm.group(1).strip(" .,;"), "r"
                if not any(q[0] == meta["id"] and abs(q[1] - p) < 2 for q in x["pl"]):
                    x["pl"].append([meta["id"], p])
    if seg: segments.append(seg)

hadisler = sorted(had.values(), key=lambda x: (-len(x["pl"]), x["ar"]))
hadisler = [[x["ar"], x["m"], x["s"], x["pl"][:30]] for x in hadisler]
print(f"hadis: {len(hadisler)} farklı, {sum(len(h[3]) for h in hadisler)} yer, meali olan {sum(1 for h in hadisler if h[1])}")

# ---------- Kişiler ve yerler ----------
KISI = [
    ("muhammed", "Peygamber Efendimiz (asm)", "Resul-i Ekrem", ["resul-i ekrem", "peygamberimiz", "habibullah", "fahr-i alem", "fahr-i kainat", "zat-i ahmediye", "muhammed-i arabi"]),
    ("adem", "Hazret-i Âdem (as)", "İlk insan ve ilk peygamber", ["hazret-i adem", "adem aleyhisselam", "adem (a.s"]),
    ("nuh", "Hazret-i Nuh (as)", "Tufan ve gemi", ["hazret-i nuh", "nuh aleyhisselam", "nuh (a.s"]),
    ("ibrahim", "Hazret-i İbrahim (as)", "Halîlullah", ["hazret-i ibrahim", "ibrahim aleyhisselam", "ibrahim (a.s", "halilullah", "halil-i ibrahim"]),
    ("musa", "Hazret-i Musa (as)", "Kelîmullah", ["hazret-i musa", "musa aleyhisselam", "musa (a.s", "kelimullah"]),
    ("isa", "Hazret-i İsa (as)", "Ruhullah", ["hazret-i isa", "isa aleyhisselam", "isa (a.s", "ruhullah", "hazret-i mesih"]),
    ("yusuf", "Hazret-i Yusuf (as)", "Yusuf kıssası", ["hazret-i yusuf", "yusuf aleyhisselam", "yusuf (a.s"]),
    ("suleyman", "Hazret-i Süleyman (as)", "Mülk ve hikmet", ["hazret-i süleyman", "süleyman aleyhisselam", "süleyman (a.s"]),
    ("davud", "Hazret-i Davud (as)", "Zebur", ["hazret-i davud", "davud aleyhisselam", "davud (a.s"]),
    ("yunus", "Hazret-i Yunus (as)", "Balığın karnında münacat", ["hazret-i yunus", "yunus aleyhisselam", "yunus (a.s"]),
    ("eyyub", "Hazret-i Eyyub (as)", "Sabır ve hastalık", ["hazret-i eyyub", "eyyub aleyhisselam", "eyyub (a.s"]),
    ("hizir", "Hazret-i Hızır (as)", "Hayat mertebeleri", ["hazret-i hızır", "hızır aleyhisselam", "hızır (a.s"]),
    ("ebubekir", "Hazret-i Ebu Bekir (ra)", "Sıddîk-ı Ekber", ["ebu bekir", "ebubekir", "sıddık-ı ekber"]),
    ("omer", "Hazret-i Ömer (ra)", "Fârûk-u A'zam", ["hazret-i ömer", "ömer-ül faruk", "faruk-u azam", "ömer (r.a"]),
    ("osman", "Hazret-i Osman (ra)", "Zinnûreyn", ["hazret-i osman", "osman (r.a", "zinnureyn"]),
    ("ali", "Hazret-i Ali (ra)", "Celcelutiye sahibi", ["hazret-i ali", "ali (r.a", "imam-ı ali", "ali radıyallahu"]),
    ("hasan", "Hazret-i Hasan (ra)", "Ehl-i Beyt", ["hazret-i hasan", "hasan (r.a"]),
    ("huseyin", "Hazret-i Hüseyin (ra)", "Ehl-i Beyt", ["hazret-i hüseyin", "hüseyin (r.a"]),
    ("fatima", "Hazret-i Fatıma (ra)", "Ehl-i Beyt", ["hazret-i fatıma", "fatıma (r.a", "fatıma-tüz zehra"]),
    ("aise", "Hazret-i Âişe (ra)", "Ümmühat-ül mü'minîn", ["hazret-i aişe", "aişe-i sıddıka", "aişe (r.a"]),
    ("halid", "Hâlid bin Velid (ra)", "Seyfullah", ["halid bin velid", "halid ibn-i velid", "hazret-i halid"]),
    ("gazali", "İmam-ı Gazâlî", "Hüccetü'l-İslâm", ["imam-ı gazali", "gazali"]),
    ("rabbani", "İmam-ı Rabbânî", "Ahmed-i Fârûkî", ["imam-ı rabbani", "ahmed-i faruki", "müceddid-i elf-i sani"]),
    ("geylani", "Abdülkadir-i Geylânî", "Gavs-ı A'zam", ["abdülkadir-i geylani", "gavs-ı azam", "abdülkadir geylani", "şeyh-i geylani"]),
    ("arabi", "Muhyiddin-i Arabî", "Şeyh-i Ekber", ["muhyiddin-i arabi", "muhyiddin", "şeyh-i ekber"]),
    ("mevlana", "Mevlânâ Celâleddin", "Mesnevî sahibi", ["mevlana", "celaleddin-i rumi", "mevlana celaleddin"]),
    ("nakşibend", "Şah-ı Nakşibend", "Nakşî yolu", ["şah-ı nakşibend", "şah-ı nakşbend", "nakşibend"]),
    ("ebuhanife", "İmam-ı A'zam Ebu Hanife", "Hanefî mezhebi", ["imam-ı azam", "ebu hanife"]),
    ("safii", "İmam-ı Şâfiî", "Şâfiî mezhebi", ["imam-ı şafii"]),
    ("malik", "İmam-ı Mâlik", "Mâlikî mezhebi", ["imam-ı malik"]),
    ("hanbel", "Ahmed bin Hanbel", "Hanbelî mezhebi", ["ahmed bin hanbel", "ahmed ibn-i hanbel", "imam-ı ahmed"]),
    ("buhari", "İmam-ı Buhârî", "Sahîh-i Buhârî", ["buhari"]),
    ("cami", "Molla Câmî", "Şâir ve mutasavvıf", ["molla cami", "abdurrahman-ı cami"]),
    ("hulusi", "Hulusi Bey", "Risale-i Nur'un birinci talebesi", ["hulusi"]),
    ("sabri", "Sabri Efendi", "Barla'dan talebe", ["sabri"]),
    ("hafizali", "Hâfız Ali", "Nur'un kahraman talebesi", ["hafız ali"]),
    ("zubeyir", "Zübeyir Gündüzalp", "Hizmetin sadık talebesi", ["zübeyir", "zübeyr"]),
    ("tahiripasa", "Van Valisi Tahir Paşa", "Van yıllarında hâmisi", ["tahir paşa"]),
]
YER = [
    ("nurs", "Nurs", "Doğduğu köy (Bitlis, Hizan)", ["nurs$"]),
    ("bitlis", "Bitlis", "Medrese yılları, harp", ["bitlis"]),
    ("van", "Van", "Medrese, Erek Dağı, Horhor", ["van'", "van vilayet", "van kalesi", "van'da", "van'a", "van'ın", "erek dağı", "horhor"]),
    ("istanbul", "İstanbul", "Eski Said dönemi", ["istanbul"]),
    ("barla", "Barla", "Sözler ve Mektubat'ın yazıldığı yer", ["barla"]),
    ("isparta", "Isparta", "Nur'un merkezi", ["isparta"]),
    ("egirdir", "Eğirdir", "Barla'nın ilçesi", ["eğirdir"]),
    ("eskisehir", "Eskişehir", "Mahkeme ve hapis (1935)", ["eskişehir"]),
    ("kastamonu", "Kastamonu", "Sürgün yılları (1936–1943)", ["kastamonu"]),
    ("denizli", "Denizli", "Hapis ve Meyve Risalesi", ["denizli"]),
    ("emirdag", "Emirdağ", "Sürgün yılları (1944–1951)", ["emirdağ"]),
    ("afyon", "Afyon", "Mahkeme ve hapis (1948–1949)", ["afyon"]),
    ("ankara", "Ankara", "Meclis'e davet (1922)", ["ankara"]),
    ("urfa", "Urfa", "Vefat ettiği yer (1960)", ["urfa"]),
    ("burdur", "Burdur", "İlk sürgün yeri", ["burdur"]),
    ("erzurum", "Erzurum", "Harp ve gönüllü alay", ["erzurum"]),
    ("kosturma", "Kosturma", "Rusya'daki esaret", ["kosturma"]),
    ("sam", "Şam", "Hutbe-i Şamiye (1911)", ["şam'", "şam-ı şerif", "emeviye", "şam'da"]),
    ("mekke", "Mekke", "Mekke-i Mükerreme", ["mekke"]),
    ("medine", "Medine", "Medine-i Münevvere", ["medine"]),
    ("kudus", "Kudüs", "Mescid-i Aksa", ["kudüs", "mescid-i aksa", "beyt-i makdis"]),
    ("kabe", "Kâbe", "Beytullah", ["kabe", "beytullah", "kâbe"]),
    ("misir", "Mısır", "Câmi-ül Ezher, Firavun", ["mısır"]),
    ("bagdat", "Bağdat", "İlim ve tasavvuf merkezi", ["bağdad", "bağdat"]),
    ("hicaz", "Hicaz", "Arabistan'ın kutsal bölgesi", ["hicaz"]),
    ("rusya", "Rusya", "Esaret ve komünizm", ["rusya", "moskof"]),
    ("avrupa", "Avrupa", "Medeniyet ve felsefe", ["avrupa"]),
    ("hindistan", "Hindistan", "İslâm âlemi", ["hindistan"]),
    ("pakistan", "Pakistan", "Risale-i Nur'un yurtdışına yayılışı", ["pakistan"]),
]

def words_in(text):
    return len(re.findall(r"[a-z0-9']+", text))
def count(text, kws):
    n = 0
    for k in kws:
        end = k.endswith("$"); k = k.rstrip("$")
        i = text.find(k)
        while i >= 0:
            j = i + len(k)
            if (i == 0 or not text[i - 1].isalnum()) and (not end or j >= len(text) or not text[j].isalnum()):
                n += 1
            i = text.find(k, i + len(k))
    return n
segs = []
for bid, p, ch, sub, parts in segments:
    text = plain(" ".join(parts))
    w = words_in(text)
    if w >= 30:
        segs.append((bid, p, ch, sub, text, w, plain(ch + " " + (sub or ""))))

def index(lst):
    out = []
    for tid, title, desc, kws in lst:
        kws = [plain(k) for k in kws]
        scored, per_book = [], collections.Counter()
        for bid, p, ch, sub, text, w, head in segs:
            n = count(text, kws)
            if not n:
                continue
            per_book[bid] += n
            boost = 1.6 if count(head, kws) else 1.0
            scored.append((math.log1p(n) * math.sqrt(1000 * n / w) * boost, bid, p, ch, sub, n))
        scored.sort(reverse=True)
        out.append({"id": tid, "t": title, "d": desc, "total": sum(per_book.values()), "places": len(scored),
                    "books": per_book.most_common(8), "items": [[b, p, ch, sub, n] for _, b, p, ch, sub, n in scored[:25]]})
    out.sort(key=lambda x: -x["total"])
    return out

kisiler, yerler = index(KISI), index(YER)
for x in kisiler[:6] + yerler[:6]:
    print(f"  {x['t']}: {x['total']} geçiş, {x['places']} yer")
(BOOKS / "dizin.json").write_text(json.dumps({"hadisler": hadisler, "kisiler": kisiler, "yerler": yerler}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
