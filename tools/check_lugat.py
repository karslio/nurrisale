"""Yerel sözlük kaynaklarını ve üretilen sözlük/istatistik dosyalarını denetler."""
import csv
import json
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
BOOKS = ROOT / "books"

def plain(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("ı", "i")
    return re.sub(r"[’'\x60]", "", s)

errors = []
warnings = []
files = sorted((DATA / "eRisale/raw").glob("*.csv")) + sorted((DATA / "SorularlaRisale/raw").glob("*.csv"))
for folder in ("eRisale/raw", "SorularlaRisale/raw"):
    if not list((DATA / folder).glob("*.csv")):
        errors.append(f"{folder}: CSV bulunamadı")

row_count = skipped = 0
for path in files:
    try:
        with path.open(encoding="utf-8-sig", newline="") as handle:
            rows = csv.reader(handle)
            header = next(rows, None)
            if not header or len(header) < 2:
                errors.append(f"{path.relative_to(ROOT)}: en az iki sütunlu başlık yok")
                continue
            if [plain(cell.strip()) for cell in header[:2]] != ["kelime", "anlam"]:
                errors.append(f"{path.relative_to(ROOT)}: başlık sütunları 'kelime, anlam' değil")
                continue
            for row in rows:
                if not row or not any(cell.strip() for cell in row):
                    continue
                row_count += 1
                if len(row) < 2 or not row[0].strip() or not row[1].strip():
                    skipped += 1
    except (OSError, UnicodeError, csv.Error) as exc:
        errors.append(f"{path.relative_to(ROOT)}: okunamadı ({exc})")

try:
    lugat = json.loads((BOOKS / "lugat-big.json").read_text(encoding="utf-8"))
    if not isinstance(lugat, dict) or not lugat:
        errors.append("books/lugat-big.json boş veya nesne değil")
        lugat = {}
except (OSError, json.JSONDecodeError) as exc:
    errors.append(f"books/lugat-big.json okunamadı ({exc})")
    lugat = {}

for key, value in lugat.items():
    if not isinstance(key, str) or not key or key != plain(key):
        errors.append(f"Lugat anahtarı normalize değil: {key!r}")
    if not isinstance(value, str) or "|" not in value or not value.split("|", 1)[1].strip():
        errors.append(f"Lugat kaydının yazılışı/anlamı eksik: {key!r}")

word_keys = {key for key in lugat if " " not in key}
try:
    stats = json.loads((BOOKS / "stats.json").read_text(encoding="utf-8"))
    unknown = sorted({plain(key) for key in stats.get("counts", {})} - word_keys)
    if unknown:
        errors.append(f"İstatistiklerde sözlükte olmayan {len(unknown)} kelime var (örnek: {unknown[:5]})")
    total = sum(book.get("total", 0) for book in stats.get("books", {}).values())
    if total != stats.get("total"):
        errors.append(f"İstatistik toplamı tutarsız: genel {stats.get('total')}, kitapların toplamı {total}")
except (OSError, json.JSONDecodeError, AttributeError) as exc:
    errors.append(f"books/stats.json okunamadı veya biçimi hatalı ({exc})")

try:
    review = json.loads((BOOKS / "lugat-review.json").read_text(encoding="utf-8"))
    if not isinstance(review, list):
        errors.append("books/lugat-review.json liste biçiminde değil")
        review = []
    missing = [item.get("key") for item in review if item.get("key") not in lugat]
    if missing:
        errors.append(f"İnceleme raporunda sözlükte olmayan {len(missing)} kayıt var")
except (OSError, json.JSONDecodeError) as exc:
    errors.append(f"books/lugat-review.json okunamadı ({exc})")
    review = []

try:
    overrides = json.loads((DATA / "lugat-overrides.json").read_text(encoding="utf-8"))
    if not isinstance(overrides, dict):
        errors.append("data/lugat-overrides.json JSON nesnesi olmalı")
        overrides = {}
except (OSError, json.JSONDecodeError) as exc:
    errors.append(f"data/lugat-overrides.json okunamadı ({exc})")
    overrides = {}

unused = sorted(set(overrides) - set(lugat))
if unused:
    warnings.append(f"{len(unused)} düzeltme bu kitaplarda kullanılmıyor (örnek: {unused[:5]})")
if skipped:
    warnings.append(f"{skipped} ham CSV satırında kelime/anlam eksik; lugat üreticisi bunları atlar")

print(f"Ham sözlük: {len(files)} CSV, {row_count:,} veri satırı")
print(f"Üretilmiş lugat: {len(lugat):,} kayıt ({len(word_keys):,} tek kelime)")
print(f"İnceleme kuyruğu: {len(review):,} birden fazla anlam adayı")
print(f"Manuel düzeltme: {len(overrides):,}; boşa çıkan: {len(unused):,}")
print(f"İstatistik: {stats.get('total', 0):,} sözlük kelimesi kullanımı" if "stats" in locals() else "İstatistik: okunamadı")
for message in warnings:
    print(f"UYARI: {message}")
for message in errors:
    print(f"HATA: {message}")
if errors:
    sys.exit(1)
print("Sözlük denetimi başarılı.")
