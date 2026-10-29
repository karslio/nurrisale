"""Ayet olmayan Arapça/Farsça satırların meali: books/arapca.json

Kullanım:
    python3 tools/build_arapca.py

Kaynak: tools/arapca_tercume.json — [{"ar": satır, "m": Türkçe meal}] (NurRisale çalışma tercümesi).
Satırlar harekesiz ve harf çeşitleri birleştirilerek karşılaştırılır; aynı satır kitapların neresinde geçerse geçsin
meali bağlanır. Ayet bulunan satırlar (books/ayetler.json) atlanır.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BOOKS = ROOT / "books"
MARKS = re.compile(r"[ؐ-ًؚ-ٰٟۖ-ۭـ]")

def norm(s):
    s = re.sub(r"⟦[^⟧]*⟧", "", s)
    s = MARKS.sub("", s)
    s = re.sub("[أإآٱ]", "ا", s).replace("ى", "ي").replace("ة", "ه").replace("ؤ", "و").replace("ئ", "ي").replace("ک", "ك")
    return re.sub(r"[^ء-يپچگی]", "", s).replace("ی", "ي")

src = json.loads((ROOT / "tools/arapca_tercume.json").read_text(encoding="utf-8"))
meal, key2i = [], {}
for x in src:
    k = norm(x["ar"])
    if k and k not in key2i:
        key2i[k] = len(meal); meal.append(x["m"])

AY = json.loads((BOOKS / "ayetler.json").read_text(encoding="utf-8"))
idx = json.loads((BOOKS / "index.json").read_text(encoding="utf-8"))
blocks, total, found = {}, 0, 0
for meta in idx:
    data = json.loads((BOOKS / f"{meta['id']}.json").read_text(encoding="utf-8"))
    ay = AY["bloklar"].get(meta["id"], {})
    m = {}
    for p, page in enumerate(data["pages"], 1):
        for i, (k, t) in enumerate(page["b"]):
            if k != "ar":
                continue
            total += 1
            if f"{p}:{i}" in ay:
                continue
            j = key2i.get(norm(t))
            if j is not None:
                m[f"{p}:{i}"] = j; found += 1
    if m:
        blocks[meta["id"]] = m
out = {"kaynak": "NurRisale çalışma tercümesi (yaklaşık meal)", "meal": meal, "bloklar": blocks}
(BOOKS / "arapca.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{len(meal)} tercüme · {found} satıra bağlandı (ayet olmayan Arapça satırların)")
