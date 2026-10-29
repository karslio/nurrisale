"""Kitaplara göre kelime istatistikleri: books/stats.json

Kullanım:
    python3 tools/build_stats.py

Sayım kuralları (sitedeki sayaçla aynı):
- Türkçe metin sayılır; Arapça satırlar ve haşiye metinleri sayılmaz.
- Kelime: harfler, araya giren kesme (') ve tire (-) ile birlikte ("Cenâb-ı", "Hakk'a").
- Karşılaştırma şapkasız ve küçük harfle yapılır (â→a, ç→c, ı→i ...).
- "Farklı kelime" ve listelerde kesme sonrası ekler ve izafet ekleri ayrılır (Nur'un → Nur, risale-i → risale).
"""
import collections
import json
import re
import unicodedata
from pathlib import Path

BOOKS = Path(__file__).resolve().parent.parent / "books"
L = "A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîûÊêÔô"
TOKEN = re.compile(rf"[{L}]+(?:['’`\-][{L}]+)*")

def plain(s):
    s = s.replace("I", "ı").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c)).replace("ı", "i")
    return re.sub(r"[’`]", "'", s)

def tr_lower(s):
    return s.replace("I", "ı").replace("İ", "i").lower().replace("’", "'").replace("`", "'")

# Kelimenin kendisi: özel isimlerde kesmeden sonraki ek ("Nur'un" → nur, "Allah'ın" → allah) ve izafet "-ı/-i/-u/-ü"
# ("risale-i" → risale) ayrılır. Kelimenin içindeki kesme korunur (Kur'an, mes'ele, san'at, kat'î).
SUFFIX = re.compile(r"['’`](y?[ıiuü]n?|y?[ae]|[dt][ae]n?|n?[ıiuü]n|n[ıiuü]|n[ae]|nd[ae]n?|y?l[ae]|[dt][ıiuü]r|[ıiuü]m[ıiuü]z?|[ıiuü]n[ıiuü]z?|s[ıiuü]|ki)$")
def base(tok):
    t = tok.replace("’", "'").replace("`", "'")
    if t[:1].isupper():
        t = SUFFIX.sub("", t)
    t = re.sub(r"-y?[ıiuü]$", "", t)
    return t

# Bağlaçlar ve çok sık Türkçe kelimeler (listede "hariç" seçeneği için)
STOP = {plain(w) for w in """
ve veya ya yahut ile bir bu şu o ki de da mi mı mu mü ne her çok daha hem en ama fakat lakin lâkin amma için gibi kadar
ise iken olan olarak olup olur oldu olmak olmaz olsa olsun olduğu olduğunu olduğundan olmuş olmayan olmuştur oluyor olacak
etmek eder eden ettiği edip etti ederek edilen ediyor ederler ettikleri etmiş etmez etsin etse eyler edecek edilir
var yok değil değildir vardır yoktur şey şeyi şeyler şeyin şeye ben sen biz siz onlar bana sana ona beni seni onu bizi sizi
onları benim senin onun bizim sizin onların onlara onda ondan bunu buna bunun bunlar bunları bunların şunu şuna şunun
kendi kendini kendine kendisi o'nun o'na o'nu bunda burada orada şimdi sonra önce böyle öyle şöyle nasıl niçin neden
çünki çünkü belki dahi bile hep hiç hiçbir herbir birer birisi biri diğer başka bazı bütün evet işte madem eğer hattâ hatta
yani yine artık gayet pek elbette meselâ mesela zîra zira halbuki hâlbuki ancak sair dair üzere göre karşı beraber
iki üç dört beş altı yedi sekiz dokuz on yüz bin içinde içine içindeki büyük küçük güzel yalnız ayrı halde surette
birinci ikinci üçüncü dördüncü beşinci bazan bazen hususan aynı ondan buna bundan şunu kendileri kendilerini
""".split()}

idx = json.loads((BOOKS / "index.json").read_text(encoding="utf-8"))
book_counts, forms = {}, collections.defaultdict(collections.Counter)
grand = collections.Counter()
out_books = {}
for meta in idx:
    data = json.loads((BOOKS / f"{meta['id']}.json").read_text(encoding="utf-8"))
    c = collections.Counter()
    for p in data["pages"]:
        for k, t in p["b"]:
            if k == "ar":
                continue
            t = re.sub(r"⟦[^⟧]*⟧", "", t)
            for tok in TOKEN.findall(t):
                b0 = base(tok)
                key = plain(b0)
                if not key:
                    continue
                c[key] += 1
                forms[key][tr_lower(b0)] += 1
    book_counts[meta["id"]] = c
    grand.update(c)

def disp(key):
    return forms[key].most_common(1)[0][0]

def top(counter, n, skip_stop):
    res = []
    for w, k in counter.most_common():
        if skip_stop and (w in STOP or len(w) < 3):
            continue
        res.append([disp(w), k])
        if len(res) == n:
            break
    return res

union = set()
for meta in idx:
    c = book_counts[meta["id"]]
    t = top(c, 100, True)
    ta = top(c, 40, False)
    out_books[meta["id"]] = {"total": sum(c.values()), "unique": len(c), "top": t, "topAll": ta}
    union.update(plain(w) for w, _ in t + ta)
g_top, g_all = top(grand, 200, True), top(grand, 60, False)
union.update(plain(w) for w, _ in g_top + g_all)

stats = {
    "total": sum(grand.values()), "unique": len(grand),
    "top": g_top, "topAll": g_all,
    "counts": {w: grand[w] for w in sorted(union)},
    "books": out_books,
}
(BOOKS / "stats.json").write_text(json.dumps(stats, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"Toplam kelime {stats['total']:,} · farklı {stats['unique']:,} · {len(out_books)} kitap")
for meta in idx[:4]:
    b = out_books[meta["id"]]
    print(f"  {meta['title']}: {b['total']:,} kelime, {b['unique']:,} farklı; ilk 8: {[w for w, _ in b['top'][:8]]}")
print("  Genel ilk 10:", [w for w, _ in g_top[:10]])
