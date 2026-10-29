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

# Kitapların sitedeki adı, sırası, kapak rengi ve kısa açıklaması
META = {
    "sozler":   {"title": "Sözler",   "order": 1, "color": "green",    "desc": "İman hakikatlerini temsillerle anlatan otuz üç Söz."},
    "mektubat": {"title": "Mektubat", "order": 2, "color": "maroon",   "desc": "Suallere cevap olarak yazılmış otuz üç Mektub."},
    "lemalar":  {"title": "Lem'alar", "order": 3, "color": "navy",     "desc": "Kısa ve parlak hakikat parıltıları."},
    "sualar":   {"title": "Şualar",   "order": 4, "color": "brown",    "desc": "Tevhid, iman ve müdafaa üzerine Şualar."},
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


def convert(epub_path):
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
    meta = META.get(book_id, {"title": raw_title.title(), "order": 99, "color": "green", "desc": ""})

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
                is_chapter = bool(CHAPTER.match(visible)) or (tag == "h1" and slug(visible) != book_id)
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

    book = {"id": book_id, "title": meta["title"], "pages": pages, "toc": toc, "footnotes": footnotes}
    OUT.mkdir(exist_ok=True)
    (OUT / f"{book_id}.json").write_text(json.dumps(book, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return {"id": book_id, "title": meta["title"], "desc": meta["desc"], "color": meta["color"],
            "order": meta["order"], "pages": len(pages), "chapters": sum(1 for t in toc if t["l"] == 1)}


def main(paths):
    index_file = OUT / "index.json"
    index = {b["id"]: b for b in json.loads(index_file.read_text(encoding="utf-8"))} if index_file.exists() else {}
    for p in paths:
        info = convert(p)
        index[info["id"]] = info
        print(f"{info['title']}: {info['pages']} sayfa, {info['chapters']} bölüm")
    books = sorted(index.values(), key=lambda b: b["order"])
    index_file.write_text(json.dumps(books, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main(sys.argv[1:])
