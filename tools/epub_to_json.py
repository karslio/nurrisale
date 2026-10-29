"""EPUB → NurRisale JSON dönüştürücü.

Kullanım:
    python3 tools/epub_to_json.py Sozler.epub Mektubat.epub ...

Her EPUB için books/<id>.json yazar ve books/index.json listesini günceller.
Bir EPUB aslında bir ZIP arşividir:
    META-INF/container.xml → content.opf (kitap bilgisi + okuma sırası "spine")
    → her XHTML dosyasındaki h1-h4 başlıkları ve p paragrafları.
"""
import json
import posixpath
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from urllib.parse import unquote

from lxml import etree, html

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "books"

# Kitapların sitedeki adı, sırası, rafı (külliyat / cep) ve kısa açıklaması
META = {
    'sozler': {"title": 'Sözler', "order": 1, "shelf": "kulliyat", "color": "red", "desc": 'İman hakikatlerini temsillerle anlatan otuz üç Söz.'},
    'mektubat': {"title": 'Mektubat', "order": 2, "shelf": "kulliyat", "color": "red", "desc": 'Suallere cevap olarak yazılmış otuz üç Mektub.'},
    'lemalar': {"title": "Lem'alar", "order": 3, "shelf": "kulliyat", "color": "red", "desc": 'Kısa ve parlak hakikat parıltıları.'},
    'sualar': {"title": 'Şualar', "order": 4, "shelf": "kulliyat", "color": "red", "desc": 'Tevhid, iman ve müdafaa üzerine Şualar.'},
    'tarihceihayat': {"title": 'Tarihçe-i Hayat', "order": 5, "shelf": "kulliyat", "color": "red", "desc": "Bediüzzaman'ın hayatı ve Risale-i Nur'un hizmeti."},
    'mesneviinuriye': {"title": 'Mesnevî-i Nuriye', "order": 6, "shelf": "kulliyat", "color": "red", "desc": 'Marifetullah üzerine Arapça risalelerin tercümesi.'},
    'isaratulicaz': {"title": "İşarat-ül İ'caz", "order": 7, "shelf": "kulliyat", "color": "red", "desc": "Fâtiha ve Bakara'nın ilk ayetlerinin tefsiri."},
    'asayimusa': {"title": 'Asâ-yı Musa', "order": 8, "shelf": "kulliyat", "color": "red", "desc": 'İman hakikatlerine dair seçme risaleler.'},
    'sikkeitasdikigaybi': {"title": 'Sikke-i Tasdik-i Gaybî', "order": 9, "shelf": "kulliyat", "color": "red", "desc": "Risale-i Nur'a dair gaybî işaretler."},
    'barlalahikasi': {"title": 'Barla Lâhikası', "order": 10, "shelf": "kulliyat", "color": "red", "desc": 'Barla dönemi mektupları.'},
    'kastamonulahikasi': {"title": 'Kastamonu Lâhikası', "order": 11, "shelf": "kulliyat", "color": "red", "desc": 'Kastamonu dönemi mektupları.'},
    'emirdaglahikasi': {"title": 'Emirdağ Lâhikası', "order": 12, "shelf": "kulliyat", "color": "red", "desc": 'Emirdağ dönemi mektupları.'},
    'muhakemat': {"title": 'Muhâkemat', "order": 13, "shelf": "kulliyat", "color": "red", "desc": "Kur'an'ı anlamanın usûlüne dair."},
    'munazarat': {"title": 'Münâzarât', "order": 14, "shelf": "kulliyat", "color": "red", "desc": 'Doğu aşiretleriyle soru-cevap.'},
    'divaniharbiorfi': {"title": 'Divan-ı Harb-i Örfî', "order": 15, "shelf": "kulliyat", "color": "red", "desc": '1909 mahkemesindeki müdafaa.'},
    'imanvekufurmuvazeneleri': {"title": 'İman ve Küfür Muvazeneleri', "order": 16, "shelf": "kulliyat", "color": "red", "desc": 'İman ile küfrün karşılaştırması.'},
    'asaribediye': {"title": 'Âsâr-ı Bediiyye', "order": 17, "shelf": "kulliyat", "color": "red", "desc": 'Eski Said dönemi eserleri.'},
    'kucuksozler': {"title": 'Küçük Sözler', "order": 18, "shelf": "cep", "color": "red", "desc": 'İlk on Söz, kısa ve özlü.'},
    'yirmiucuncusoz': {"title": 'Yirmiüçüncü Söz', "order": 19, "shelf": "cep", "color": "red", "desc": 'İmanın ve insanın kıymeti.'},
    'ayetulkubra': {"title": 'Âyet-ül Kübrâ', "order": 20, "shelf": "cep", "color": "red", "desc": 'Kâinatın Yaratıcısını soran yolcu.'},
    'hasirrisalesi': {"title": 'Haşir Risalesi', "order": 21, "shelf": "cep", "color": "red", "desc": 'Öldükten sonra dirilişin isbatı.'},
    'tabiatrisalesi': {"title": 'Tabiat Risalesi', "order": 22, "shelf": "cep", "color": "red", "desc": 'Tabiatçılığın reddi.'},
    'miftahuliman': {"title": 'Miftah-ul İman', "order": 23, "shelf": "cep", "color": "red", "desc": 'İmanın anahtarı.'},
    'meyverisalesi': {"title": 'Meyve Risalesi', "order": 24, "shelf": "cep", "color": "red", "desc": 'Denizli hapsinin meyvesi.'},
    'genclikrehberi': {"title": 'Gençlik Rehberi', "order": 25, "shelf": "cep", "color": "red", "desc": 'Gençlere iman dersi.'},
    'hanimlarrehberi': {"title": 'Hanımlar Rehberi', "order": 26, "shelf": "cep", "color": "red", "desc": 'Hanımlara mahsus risaleler.'},
    'hastalarrisalesi': {"title": 'Hastalar Risalesi', "order": 27, "shelf": "cep", "color": "red", "desc": 'Hastalara teselli.'},
    'ihlasrisaleleri': {"title": 'İhlas Risaleleri', "order": 28, "shelf": "cep", "color": "red", "desc": 'İhlas ve uhuvvet dersleri.'},
    'uhuvvetrisalesi': {"title": 'Uhuvvet Risalesi', "order": 29, "shelf": "cep", "color": "red", "desc": 'Kardeşlik ve birlik.'},
    'hizmetrehberi': {"title": 'Hizmet Rehberi', "order": 30, "shelf": "cep", "color": "red", "desc": 'İman hizmetinin esasları.'},
    'ramazaniktisadsukurrisaleleri': {"title": 'Ramazan, İktisad, Şükür', "order": 31, "shelf": "cep", "color": "red", "desc": 'Ramazan, iktisat ve şükür risaleleri.'},
    'miracvesakkikamerrisaleleri': {"title": "Mi'rac ve Şakk-ı Kamer", "order": 32, "shelf": "cep", "color": "red", "desc": "Mi'rac ve Ay'ın ikiye bölünmesi."},
    'mucizatikuraniyerisalesi': {"title": "Mu'cizat-ı Kur'aniye", "order": 33, "shelf": "cep", "color": "red", "desc": "Kur'an'ın mu'cizeliği."},
    'otuzucpencere': {"title": 'Otuzüç Pencere', "order": 34, "shelf": "cep", "color": "red", "desc": 'Marifetullaha açılan otuz üç pencere.'},
    'nurunilkkapisi': {"title": "Nur'un İlk Kapısı", "order": 35, "shelf": "cep", "color": "red", "desc": "Risale-i Nur'un ilk dersleri."},
    'zuhretunnur': {"title": 'Zühretünnur', "order": 36, "shelf": "cep", "color": "red", "desc": "Mesnevî'den seçmeler."},
    'munacat': {"title": 'Münâcât', "order": 37, "shelf": "cep", "color": "red", "desc": 'Yalvarış ve dua.'},
    'hutbeisamiye': {"title": 'Hutbe-i Şamiye', "order": 38, "shelf": "cep", "color": "red", "desc": "Şam Emeviye Camii'ndeki hutbe."},
    'konferans': {"title": 'Konferans', "order": 39, "shelf": "cep", "color": "red", "desc": 'Gençlere hitaben bir ders.'},
    'bediuzzamancevapveriyor': {"title": 'Bediüzzaman Cevap Veriyor', "order": 40, "shelf": "cep", "color": "red", "desc": 'Sorulara cevaplar.'},
}

PAGE_CHARS = 2200  # bir sayfaya sığacak yaklaşık harf sayısı
ARABIC = re.compile(r"[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]")
# "Birinci Söz", "Onikinci Mektub", "Yirmi Dördüncü Lem'a", "Birinci Şua" gibi bölüm başlıkları
CHAPTER = re.compile(r"^[\wÇĞİÖŞÜçğıöşüâîû ]+ (Söz|Mektub|Mektup|Lem[’']a|Şua|Şuâ)\s*$", re.I)


def slug(s):
    s = s.replace("ı", "i").replace("İ", "i").lower()
    s = unicodedata.normalize("NFD", s)
    return re.sub(r"[^a-z]", "", "".join(c for c in s if not unicodedata.combining(c)))


def clean(s):
    return re.sub(r"\s+", " ", s).strip()


def local(el):
    return etree.QName(el).localname if isinstance(el.tag, str) else ""


def text_of(el):
    """Elementin metni; haşiye linkleri ⟦kimlik|numara⟧ işaretine dönüşür."""
    out = [el.text or ""]
    for child in el:
        href = child.get("href", "") if isinstance(child.tag, str) else ""
        if local(child) == "a" and "#" in href and re.search(r"foot|note", href, re.I):
            out.append(f"⟦{href.split('#')[1]}|{clean(''.join(child.itertext()))}⟧")
        elif isinstance(child.tag, str):
            out.append(text_of(child))
        out.append(child.tail or "")
    return "".join(out)


def parse_doc(data):
    try:
        return etree.fromstring(data, etree.XMLParser(recover=True, resolve_entities=False, load_dtd=False))
    except Exception:
        return html.fromstring(data)


def convert(epub_path, chapter_tags=("h1",)):
    z = zipfile.ZipFile(epub_path)
    container = etree.fromstring(z.read("META-INF/container.xml"))
    opf_path = container.xpath("//*[local-name()='rootfile']/@full-path")[0]
    base = posixpath.dirname(opf_path)
    opf = etree.fromstring(z.read(opf_path))
    raw_title = clean("".join(opf.xpath("//*[local-name()='title']//text()")))

    manifest = {i.get("id"): i.get("href") for i in opf.xpath("//*[local-name()='item']")}
    spine = [manifest[r.get("idref")] for r in opf.xpath("//*[local-name()='itemref']") if r.get("idref") in manifest]
    path = lambda href: posixpath.normpath(posixpath.join(base, unquote(href.split("#")[0])))

    book_id = slug(raw_title)
    # Her ana kitabın kendi bölüm adı var; başka kitabın birimi (ör. Sözler içindeki "Birinci Şua") bölüm sayılmaz
    unit = {"sozler": "Söz", "mektubat": "Mektub|Mektup", "lemalar": "Lem[’']a", "sualar": "Şua|Şuâ"}.get(book_id)
    unit_re = re.compile(rf"^[\wÇĞİÖŞÜçğıöşüâîû ]+ ({unit})\s*$", re.I) if unit else None
    meta = META.get(book_id, {"title": raw_title.title(), "order": 99, "shelf": "cep", "color": "red", "desc": ""})

    # Haşiyeler
    foot_files = [h for h in manifest.values() if re.search(r"foot|note", h, re.I) and re.search(r"x?html?$", h)]
    footnotes = {}
    for h in foot_files:
        doc = parse_doc(z.read(path(h)))
        for box in doc.xpath("//*[@id]"):
            fid = box.get("id")
            if local(box) == "a" or not re.search(r"foot|note", fid, re.I):
                continue
            for a in box.xpath(".//*[local-name()='a'][@href]"):
                if re.search(r"return|back|ref", a.get("href"), re.I):
                    a.getparent().remove(a)
            paras = box.xpath(".//*[local-name()='p']")
            txt = " ".join(text_of(p) for p in paras) if paras else text_of(box)
            footnotes[fid] = clean(re.sub(r"⟦[^⟧]*⟧", "", txt))

    # Bütün dosyaları sırayla blok akışına çevir
    pages, toc = [], []
    state = {"section": meta["title"], "page": None, "size": 0}

    def new_page():
        p = state["page"]
        if p and p["b"]:
            pages.append(p)
        state["page"] = {"s": state["section"], "b": []}
        state["size"] = 0

    new_page()
    for href in spine:
        if href in foot_files:
            continue
        doc = parse_doc(z.read(path(href)))
        for el in doc.xpath("//*[local-name()='h1' or local-name()='h2' or local-name()='h3' or local-name()='h4' or local-name()='p']"):
            tag = local(el)
            if el.xpath("ancestor::*[contains(@class,'footnote')]") or (tag == "p" and el.xpath("ancestor::*[local-name()='p' or local-name()='h1' or local-name()='h2' or local-name()='h3' or local-name()='h4']")):
                continue
            raw = clean(text_of(el))
            visible = clean(re.sub(r"⟦[^⟧]*⟧", "", raw))
            if not visible:
                continue

            if tag.startswith("h"):
                is_chapter = (bool(unit_re and unit_re.match(visible)) or tag in chapter_tags) and slug(visible) != book_id
                if is_chapter:
                    state["section"] = visible
                    new_page()
                    toc.append({"t": visible, "p": len(pages) + 1, "l": 1})
                    continue
                if slug(visible) == book_id:  # kitabın kendi adı ("SÖZLER") atlanır
                    continue
                if state["size"] > PAGE_CHARS * 0.55:
                    new_page()
                toc.append({"t": visible, "p": len(pages) + 1, "l": 2 if tag in ("h1", "h2") else 3})
                state["page"]["b"].append(["h", raw])
                state["size"] += len(visible) + 200
                continue

            letters = re.sub(r"\s", "", visible)
            arabic_share = len(ARABIC.findall(visible)) / max(1, len(letters))
            kind = "ar" if arabic_share > 0.5 else "c" if "center" in (el.get("class") or "") else "p"
            if state["size"] > 0 and state["size"] + len(visible) > PAGE_CHARS:
                new_page()
            state["page"]["b"].append([kind, raw])
            state["size"] += len(visible)
    new_page()

    cover = save_cover(z, opf, manifest, path, book_id)

    book = {"id": book_id, "title": meta["title"], "pages": pages, "toc": toc, "footnotes": footnotes}
    OUT.mkdir(exist_ok=True)
    (OUT / f"{book_id}.json").write_text(json.dumps(book, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {"id": book_id, "title": meta["title"], "desc": meta["desc"], "color": meta["color"], "cover": cover, "shelf": meta["shelf"],
            "order": meta["order"], "pages": len(pages), "chapters": sum(1 for t in toc if t["l"] == 1)}


def save_cover(z, opf, manifest, path, book_id):
    """EPUB'daki kapak resmini books/covers/<id>.jpg olarak kaydet.
    Kenardaki parlak çerçeveyi kırpar: kırmızı cildin başladığı yeri bulur."""
    from io import BytesIO
    from PIL import Image

    cover_id = (opf.xpath("//*[local-name()='meta'][@name='cover']/@content") or [None])[0]
    href = manifest.get(cover_id) or next((h for h in manifest.values() if re.search(r"cover\.(jpe?g|png)$", h, re.I)), None)
    if not href:
        return None
    img = Image.open(BytesIO(z.read(path(href)))).convert("RGB")
    w, h = img.size
    px = img.load()

    def is_binding(x, y):  # koyu kırmızı cilt rengi
        r, g, b = px[x, y]
        return r > 110 and g < 70 and b < 90

    def first(line):
        return next((i for i, ok in enumerate(line) if ok), 0)

    mid_y, mid_x = h // 2, w // 2
    left = first(is_binding(x, mid_y) for x in range(w))
    right = w - first(is_binding(x, mid_y) for x in reversed(range(w)))
    # Üstte ortada ışık parlaması var; birkaç sütunda ölçüp en içtekini al
    cols = [int(w * f) for f in (0.15, 0.3, 0.7, 0.85)]
    top = sorted(first(is_binding(x, y) for y in range(h)) for x in cols)[2] + 2  # aykırı değeri at
    bottom = h - sorted(first(is_binding(x, y) for y in reversed(range(h))) for x in cols)[2] - 2
    # Sadece kenardaki ince çerçeveyi kes: bir kenardan en fazla %10
    left = left if left <= w * 0.1 else 0
    right = right if w - right <= w * 0.1 else w
    top = top if top <= h * 0.1 else 0
    bottom = bottom if h - bottom <= h * 0.1 else h
    img = img.crop((left, top, right, bottom))
    img.thumbnail((360, 540))
    (OUT / "covers").mkdir(parents=True, exist_ok=True)
    img.save(OUT / "covers" / f"{book_id}.jpg", quality=84, optimize=True, progressive=True)
    return f"books/covers/{book_id}.jpg"


def main(paths):
    index_file = OUT / "index.json"
    index = {b["id"]: b for b in json.loads(index_file.read_text(encoding="utf-8"))} if index_file.exists() else {}
    for p in paths:
        info = convert(p)
        if info["chapters"] < 3:  # bu kitapta bölümler h2 ile işaretlenmiş
            info = convert(p, ("h1", "h2"))
        index[info["id"]] = info
        print(f"{info['title']}: {info['pages']} sayfa, {info['chapters']} bölüm")
    books = sorted(index.values(), key=lambda b: b["order"])
    index_file.write_text(json.dumps(books, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])
