"""Konu dizini: books/konular.json

Kullanım:
    python3 tools/build_konular.py

Her konu için anahtar kelimeler (kelime başında, ekli hâlleriyle) her alt başlıkta sayılır.
Bir yerin puanı = geçiş sayısı ve yoğunluğun (1000 kelimedeki geçiş) birleşimi. Bölüm ya da alt başlık
adında anahtar kelime geçen yerler öne çıkar. Her konu için en yüksek puanlı yerler listelenir.
"""
import collections
import json
import math
import re
import unicodedata
from pathlib import Path

BOOKS = Path(__file__).resolve().parent.parent / "books"

def plain(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("ı", "i")
    return re.sub(r"[’`]", "'", s)

# (kimlik, başlık, açıklama, anahtar kelimeler)
TOPICS = [
    ("tevhid", "Tevhid ve marifetullah", "Allah'ın birliği ve tanınması", "tevhid vahdaniyet vahdet ehadiyet marifetullah şirk"),
    ("hasir", "Haşir ve âhiret", "Öldükten sonra dirilme, kıyamet, cennet ve cehennem", "haşir haşr âhiret kıyamet cennet cehennem mahşer mizan"),
    ("nubuvvet", "Nübüvvet ve Peygamberimiz", "Peygamberlik ve Peygamber Efendimiz (asm)", "nübüvvet risalet peygamber muhammed ahmed-i resul-i resûl-i mu'cize mucize"),
    ("kuran", "Kur'an ve i'caz", "Kur'an'ın mu'cizeliği ve hakikatleri", "kur'an kuran i'caz icaz tefsir"),
    ("iman", "İman ve küfür", "İmanın kıymeti, küfür ve dalaletin zararı", "iman küfr küfür kâfir dalalet inkâr"),
    ("namaz", "Namaz ve ibadet", "Namaz, ibadet ve kulluk", "namaz ibadet ubudiyet secde rükû abdest"),
    ("kader", "Kader ve cüz-i ihtiyarî", "Kader, irade ve insanın sorumluluğu", "kader cüz' cüz-i cüzi irade-i"),
    ("esma", "Esmâ-i Hüsnâ", "İlâhî isimler ve kâinattaki tecellileri", "esma esmâ ism-i cilve tecelli"),
    ("kainat", "Kâinat ve tefekkür", "Kâinat kitabını okumak, varlıklar üzerinde düşünmek", "kâinat tefekkür mevcudat zerre"),
    ("tabiat", "Tabiat ve sebepler", "Tabiatçılık, sebepler ve tesadüf", "tabiat esbab sebeb tesadüf maddiyyun"),
    ("melek", "Melekler ve ruhanîler", "Melekler, ruhlar ve görünmeyen âlem", "melaike melek ruhaniyat ruhaniye cinn"),
    ("nefis", "Nefis ve şeytan", "Nefsin ve şeytanın tuzakları", "nefs nefis şeytan vesvese heva"),
    ("ihlas", "İhlas ve uhuvvet", "İhlas, kardeşlik ve dayanışma", "ihlas uhuvvet tesanüd ittihad"),
    ("hastalik", "Hastalık, musibet ve sabır", "Hastalara ve musibete uğrayanlara teselli", "hastalık hasta musibet sabır sabr teselli şifa"),
    ("olum", "Ölüm ve kabir", "Ölüm, kabir ve ecel", "ölüm mevt kabir ecel vefat"),
    ("ihtiyarlik", "İhtiyarlık", "Yaşlılara teselli ve ümit", "ihtiyarlık ihtiyarlara ihtiyarların şeyhuhet"),
    ("genclik", "Gençlik", "Gençlik nimeti ve gençlere dersler", "gençlik genç"),
    ("sukur", "Şükür, iktisat ve kanaat", "Nimete şükür, tutumluluk ve kanaat", "şükür şükr iktisad israf kanaat"),
    ("dua", "Dua, zikir ve münacat", "Dua, zikir, tesbih ve yalvarış", "dua zikir zikr münacat istiğfar tesbih"),
    ("ramazan", "Ramazan ve oruç", "Ramazan-ı Şerif ve orucun hikmetleri", "ramazan oruç savm"),
    ("kadin", "Hanımlar ve aile", "Hanımlar, aile, evlat ve tesettür", "hanım kadın valide aile tesettür evlad"),
    ("velayet", "Velayet ve tasavvuf", "Velilik, tarikat, keramet", "velayet tarikat tasavvuf keramet evliya"),
    ("mirac", "Mi'rac ve Şakk-ı Kamer", "Mi'rac hadisesi ve Ay'ın ikiye bölünmesi", "mi'rac mirac şakk-ı"),
    ("ahirzaman", "Âhir zaman", "Âhir zaman, Deccal, Süfyan ve Mehdi", "deccal süfyan mehdi âhir zaman"),
    ("risalenur", "Risale-i Nur hizmeti", "Risale-i Nur'un hizmeti ve talebeleri", "risale-i nur şakird talebe hizmet-i"),
    ("hapis", "Hapis ve mahkemeler", "Mahkemeler, müdafaalar ve hapishane hayatı", "hapis hapishane mahkeme müdafaa zindan"),
    ("medeniyet", "Medeniyet ve siyaset", "Medeniyet, siyaset ve hürriyet", "medeniyet siyaset hürriyet meşrutiyet avrupa"),
    ("sahabe", "Ehl-i Beyt ve Sahabe", "Âl-i Beyt, Sahabe ve İslâm büyükleri", "ehl-i beyt sahabe ashab hulefa"),
]

def words_in(text):
    return len(re.findall(r"[a-z0-9']+", text))

def count(text, kws):
    n = 0
    for k in kws:
        i = text.find(k)
        while i >= 0:
            if i == 0 or not text[i - 1].isalnum():
                n += 1
            i = text.find(k, i + len(k))
    return n

idx = json.loads((BOOKS / "index.json").read_text(encoding="utf-8"))
segments = []   # (bookId, page, chapter, sub, text)
for meta in idx:
    data = json.loads((BOOKS / f"{meta['id']}.json").read_text(encoding="utf-8"))
    # bölümler: sitedeki gibi aynı bölüm adını taşıyan ardışık sayfalar (en fazla 120 sayfa)
    chap, chap_start, seg = None, 0, None
    for p, page in enumerate(data["pages"], 1):
        if page["s"] != chap or p - chap_start >= 120:
            if seg: segments.append(seg)
            chap, chap_start = page["s"], p
            seg = [meta["id"], p, chap, None, []]
        for k, t in page["b"]:
            t = re.sub(r"⟦[^⟧]*⟧", "", t)
            if k == "h":
                if seg[4]: segments.append(seg)
                seg = [meta["id"], p, chap, re.sub(r"[\ue000-\uf8ff]", "", t).strip(), []]
                continue
            if k != "ar":
                seg[4].append(t)
    if seg: segments.append(seg)

segs = []
for bid, p, ch, sub, parts in segments:
    text = plain(" ".join(parts))
    w = words_in(text)
    if w >= 40:
        segs.append((bid, p, ch, sub, text, w, plain(ch + " " + (sub or ""))))
print(f"{len(segs)} bölüm parçası tarandı")

out = []
for tid, title, desc, kw in TOPICS:
    # birden fazla kelimelik anahtarlar ("âhir zaman", "risale-i nur") tek anahtar sayılır
    kws = [plain(k) for k in kw.replace("âhir zaman", "âhir_zaman").replace("risale-i nur", "risale-i_nur").replace("ehl-i beyt", "ehl-i_beyt").split()]
    kws = [k.replace("_", " ") for k in kws]
    scored, per_book = [], collections.Counter()
    for bid, p, ch, sub, text, w, head in segs:
        n = count(text, kws)
        per_book[bid] += n
        if n < 4:
            continue
        dens = 1000 * n / w
        boost = 1.6 if count(head, kws) else 1.0
        score = math.log1p(n) * math.sqrt(dens) * boost
        scored.append((score, bid, p, ch, sub, n, w))
    scored.sort(reverse=True)
    items = [[bid, p, ch, sub, n, w] for _, bid, p, ch, sub, n, w in scored[:30]]
    out.append({"id": tid, "t": title, "d": desc, "kw": kw.replace("âhir zaman", "âhir_zaman").replace("risale-i nur", "risale-i_nur").replace("ehl-i beyt", "ehl-i_beyt").replace("_", "\u00a0").split(), "total": sum(per_book.values()),
                "places": len(scored), "books": per_book.most_common(8), "items": items})
    top = items[0] if items else None
    print(f"  {title}: {sum(per_book.values())} geçiş, {len(scored)} yer; ilk: {top and (top[0], top[2], top[3])}")

(BOOKS / "konular.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
