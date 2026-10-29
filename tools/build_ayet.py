"""Risale metinlerindeki Arapça satırlarda geçen ayetleri bulur: books/ayetler.json

Kullanım:
    python3 tools/build_ayet.py /yol/quran-json

Kaynaklar (https://github.com/risan/quran-json):
- data/tanzil/simple-clean.json  — Kur'an metni (Tanzil, CC BY 3.0); yalnız eşleştirme için kullanılır, gösterilmez
- data/quranenc/turkish_rwwad.json — Türkçe meal (Rowwad Tercüme Merkezi, QuranEnc.com); değiştirilmeden gösterilir

Eşleştirme: harekeler ve uzun ünlüler (ا و ي) atılarak her kelimenin iskeleti çıkarılır; satırdaki
ardışık üçlü kelime grupları ayetlerle karşılaştırılır. Satırın en az %60'ı ayetlerle örtüşüyorsa kabul edilir.
"""
import collections
import json
import re
import sys
from pathlib import Path

SRC = Path(sys.argv[1])
BOOKS = Path(__file__).resolve().parent.parent / "books"

SURE = """Fâtiha Bakara Âl-i_İmrân Nisâ Mâide En'âm A'râf Enfâl Tevbe Yûnus Hûd Yûsuf Ra'd İbrâhîm Hicr Nahl İsrâ Kehf
Meryem Tâhâ Enbiyâ Hac Mü'minûn Nûr Furkân Şuarâ Neml Kasas Ankebût Rûm Lokmân Secde Ahzâb Sebe' Fâtır Yâsîn Sâffât Sâd
Zümer Mü'min Fussilet Şûrâ Zuhruf Duhân Câsiye Ahkâf Muhammed Fetih Hucurât Kâf Zâriyât Tûr Necm Kamer Rahmân Vâkıa
Hadîd Mücâdele Haşr Mümtehine Saf Cuma Münâfikûn Teğâbün Talâk Tahrîm Mülk Kalem Hâkka Meâric Nûh Cin Müzzemmil
Müddessir Kıyâme İnsân Mürselât Nebe' Nâziât Abese Tekvîr İnfitâr Mutaffifîn İnşikâk Bürûc Târık A'lâ Gâşiye Fecr
Beled Şems Leyl Duhâ İnşirâh Tîn Alak Kadr Beyyine Zilzâl Âdiyât Kâria Tekâsür Asr Hümeze Fîl Kureyş Mâûn Kevser
Kâfirûn Nasr Tebbet İhlâs Felak Nâs""".split()
SURE = [x.replace("_", " ") for x in SURE]
assert len(SURE) == 114, len(SURE)

MARKS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")
def words(s):
    s = MARKS.sub("", s)
    s = re.sub("[أإآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي")
    s = re.sub(r"[^ء-ي ]", " ", s)
    out = []
    for w in s.split():
        k = re.sub("[اويء]", "", w)          # iskelet: uzun ünlüler ve hemze atılır
        if k:
            out.append(k)
    return out

quran = json.loads((SRC / "data/tanzil/simple-clean.json").read_text(encoding="utf-8"))
meal_src = json.loads((SRC / "data/quranenc/turkish_rwwad.json").read_text(encoding="utf-8"))
BESMELE = words("بسم الله الرحمن الرحيم")

verses, index = {}, collections.defaultdict(list)
for ch, arr in quran.items():
    for v in arr:
        w = words(v["text"])
        s, a = int(v["chapter"]), int(v["verse"])
        if a == 1 and s not in (1, 9) and w[:4] == BESMELE:   # veri setinde 1. ayetlerin başına eklenmiş besmele
            w = w[4:]
        verses[(s, a)] = w
        for n in (2, 3):
            for i in range(len(w) - n + 1):
                index[(n, tuple(w[i:i + n]))].append((s, a))

def match_seg(w):
    """Bir parçadaki kelimeleri ayetlerle eşleştir: (seçilen ayetler [(sıra, (sure, ayet))], kapsanan kelime sayısı)"""
    if len(w) < 2:
        return [], 0
    if len(w) <= 3:                                   # kısa parça: tamamı bir ayette geçmeli ve ayırt edici olmalı
        cands = index.get((len(w), tuple(w)), [])
        if 0 < len(set(cands)) <= 3:
            va = min(set(cands), key=lambda x: abs(len(verses[x]) - len(w)))
            return [(0, va)], len(w)
        return [], 0
    n = 3
    grams = [tuple(w[i:i + n]) for i in range(len(w) - n + 1)]
    hits = [set(index.get((n, g), ())) for g in grams]
    covered = [False] * len(w)
    chosen, remaining = [], set(range(len(grams)))
    while True:
        score = collections.Counter()
        for j in remaining:
            for va in hits[j]:
                score[va] += 1
        if not score:
            break
        best = max(score.items(), key=lambda kv: (kv[1], -abs(len(verses[kv[0]]) - len(w))))
        need = 1 if (len(w) <= 4 or len(verses[best[0]]) <= 4) else 2
        if best[1] < need:
            break
        va = best[0]
        used = [j for j in remaining if va in hits[j]]
        for j in used:
            for k in range(j, j + n):
                covered[k] = True
        remaining -= set(used)
        chosen.append((min(used), va))
        if len(chosen) > 12:
            break
    return chosen, sum(covered)

SPLIT = re.compile(r"[❊۞﴿﴾\(\)\[\]«»\.:،؛!؟\*]")
def match(text):
    segs = [words(x) for x in SPLIT.split(text)]
    total = sum(len(x) for x in segs)
    if total < 2:
        return None
    chosen, cov, offset = [], 0, 0
    for w in segs:
        c, k = match_seg(w)
        chosen += [(offset + pos, va) for pos, va in c]
        cov += k
        offset += len(w)
    if not chosen or cov / total < 0.6:
        return None
    chosen.sort()
    refs = []
    for _, (s, a) in chosen:                       # ardışık ayetleri aralık olarak birleştir
        if refs and refs[-1][0] == s and refs[-1][2] + 1 == a:
            refs[-1][2] = a
        elif not any(r[0] == s and r[1] <= a <= r[2] for r in refs):
            refs.append([s, a, a])
    return refs

idx = json.loads((BOOKS / "index.json").read_text(encoding="utf-8"))
blocks, used, cache = {}, set(), {}
total = found = 0
for meta in idx:
    data = json.loads((BOOKS / f"{meta['id']}.json").read_text(encoding="utf-8"))
    m = {}
    for p, page in enumerate(data["pages"], 1):
        for i, (k, t) in enumerate(page["b"]):
            if k != "ar":
                continue
            total += 1
            t = re.sub(r"⟦[^⟧]*⟧", "", t)
            if t not in cache:
                cache[t] = match(t)
            r = cache[t]
            if r:
                found += 1
                m[f"{p}:{i}"] = r
                for s, a1, a2 in r:
                    used.update((s, a) for a in range(a1, a2 + 1))
    if m:
        blocks[meta["id"]] = m

meal = {}
for s, a in sorted(used):
    v = meal_src[str(s)][a - 1]
    assert v["verse"] == a
    meal[f"{s}:{a}"] = [v["text"], v.get("footnotes", "")] if v.get("footnotes") else [v["text"]]

out = {
    "kaynak": {
        "meal": "Türkçe Tercüme — Rowwad Tercüme Merkezi (QuranEnc.com, sürüm 1.0.4)",
        "meal_url": "https://quranenc.com/tr/browse/turkish_rwwad",
        "metin": "Kur'an metni eşleştirme için: Tanzil Quran Text (CC BY 3.0), tanzil.net",
    },
    "sure": SURE,
    "meal": meal,
    "bloklar": blocks,
}
(BOOKS / "ayetler.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Arapça satır {total}, ayet bulunan {found} (%{100 * found / total:.1f}); farklı ayet {len(meal)}")
