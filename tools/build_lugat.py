"""Büyük lugat ve kelime öğrenme listesi üretir.

Kaynak: https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans (CC0)
  data/*/raw/*.csv                    → kelime, anlam (sayfa altı lugatları)
  data/eRisale/analysis/terkipsiz/*   → kitaplara göre kelime sıklıkları

Kullanım:
    python3 tools/build_lugat.py /yol/Risale-i-Nur-Kelime-Frekans

Çıktılar:
    books/lugat-big.json   {sade_anahtar: "Yazılış|anlam"}  (tek kelimeler ve tamlamalar)
    books/kelime-sira.json {"total": toplam tekrar, "words": [[kelime, sıklık, anlam], ...]}  en sık 1000 kelime
"""
import collections
import csv
import glob
import json
import re
import sys
import unicodedata
from pathlib import Path

SRC = Path(sys.argv[1])
OUT = Path(__file__).resolve().parent.parent / "books"

# Lugatta işaretlenmesi gereksiz, her yerde geçen Türkçe kelimeler
STOP = set("""
ve veya ya yahut ile bir bu şu o ki de da mi mı mu mü ne her çok daha hem en ama fakat lakin için gibi kadar
ise iken olan olarak olup olur oldu olmak etmek eder eden ettiği edip etti iki üç dört beş altı yedi sekiz dokuz on
yüz bin ben sen biz siz onlar bana sana ona beni seni onu bizi sizi onları benim senin onun bizim sizin onların
var yok değil evet hayır şey şeyi şeyler zaman sonra önce şimdi böyle öyle şöyle nasıl niçin neden çünki çünkü
belki dahi bile hep hiç pek gayet biri birisi diğer başka kendi kendini insan gün gece büyük küçük güzel iyi kötü
""".split())

def plain(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("ı", "i")
    s = re.sub(r"[’'`]", "", s)
    return re.sub(r"\s+", " ", s).strip()

# 1) Anlamlar: her kelime için en sık verilen anlam (eşitlikte kısa olan)
meanings = collections.defaultdict(collections.Counter)
display = {}
for f in glob.glob(str(SRC / "data/*/raw/*.csv")):
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r, None)
        for row in r:
            if len(row) < 2:
                continue
            k, v = row[0].strip().strip('"'), re.sub(r"\s+", " ", row[1]).strip()
            if not k or not v or len(k) > 60:
                continue
            key = plain(k)
            if len(key) < 3 or key in STOP or not re.search(r"[a-z]", key):
                continue
            meanings[key][v] += 1
            display.setdefault(key, k)

lugat = {}
for key, cnt in meanings.items():
    best = sorted(cnt.items(), key=lambda kv: (-kv[1], len(kv[0])))[0][0]
    lugat[key] = f"{display[key]}|{best}"
OUT.mkdir(exist_ok=True)
(OUT / "lugat-big.json").write_text(json.dumps(lugat, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
single = sum(1 for k in lugat if " " not in k)
print(f"lugat-big.json: {len(lugat)} kayıt ({single} tek kelime, {len(lugat) - single} tamlama)")

# 2) Öğrenme sırası: bütün kitaplardaki sıklıkların toplamı (terkipsiz)
freq = collections.Counter()
for f in glob.glob(str(SRC / "data/eRisale/analysis/terkipsiz/*_frekans.txt")):
    name = Path(f).name
    if "ilk" in name or name.startswith("1-10"):
        continue  # Sözler'in parça listeleri; tamamı zaten var
    with open(f, encoding="utf-8") as fh:
        r = csv.reader(fh)
        next(r, None)
        for row in r:
            if len(row) >= 2 and row[1].strip().isdigit():
                freq[row[0].strip()] += int(row[1])
order = []
for w, n in freq.most_common():
    key = plain(w)
    if key in STOP or len(key) < 3 or key not in lugat:
        continue
    order.append([display.get(key, w), n, lugat[key].split("|", 1)[1]])
    if len(order) == 1000:
        break
total = sum(n for w, n in freq.items() if plain(w) not in STOP)
(OUT / "kelime-sira.json").write_text(json.dumps({"total": total, "words": order}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"kelime-sira.json: {len(order)} kelime; ilk 10: {[o[0] for o in order[:10]]}")
