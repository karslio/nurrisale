/* NurRisale — Shared helpers, data loading, dictionary and text rendering.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   2) YARDIMCILAR
   ========================================================= */
const $ = (s) => document.querySelector(s);
const lower = (s) => s.toLocaleLowerCase("tr");
const plain = (s) => lower(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ı/g, "i");
const escapeHtml = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const FN_RE = /⟦([^|⟧]+)\|([^⟧]*)⟧/g;
const stripFn = (s) => s.replace(FN_RE, "");
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
const narrow = () => matchMedia("(max-width: 960px)").matches;
const ICON_BOOK = `<svg class="ic" viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="1.5" width="11" height="13" rx="1.5" fill="currentColor" opacity=".85"/><path d="M5 5h6M5 7.5h6" stroke="#fff" stroke-width="1.2"/></svg>`;
const ICON_SHELF = `<svg class="ic" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.3" aria-hidden="true"><path d="M2 2.5v11M5 2.5v11M8.5 3l3 10.5M1 14h14"/></svg>`;

async function loadLibrary() {
  const r = await fetch("books/index.json");
  if (!r.ok) throw new Error("liste");
  LIBRARY = await r.json();
}
async function loadLugat() {
  try { const r = await fetch("books/lugat.json"); if (r.ok) { const x = await r.json(); for (const k in x) LUGAT[lower(k)] = x[k]; indexLugat(); } } catch {}
}
async function loadBook(id) {
  if (BOOKS.has(id)) return BOOKS.get(id);
  const r = await fetch(`books/${id}.json`);
  if (!r.ok) throw new Error("kitap");
  const book = await r.json();
  book.chapters = buildChapters(book);
  BOOKS.set(id, book);
  return book;
}
const metaOf = (id) => LIBRARY.find((b) => b.id === id);
/* Külliyat kitapları için çizilmiş kapak; cep kitapları kendi resmini kullanır */
function coverHtml(b, style = "") {
  if ((b.shelf || "kulliyat") !== "kulliyat") return `<img src="${b.cover}" alt="" loading="lazy" style="${style}">`;
  const len = b.title.length, fs = len <= 7 ? 19 : len <= 11 ? 16 : len <= 16 ? 14 : 12;
  return `<span class="bind" style="--fs:${fs}cqw;${style}"><span class="fr"></span><span class="in">
    <span class="top">Risale-i Nur Külliyatından</span><span class="ttl">${escapeHtml(b.title)}</span>
    <span class="au">Bediüzzaman<br>Said Nursî</span><span class="seal"></span></span></span>`;
}

/* Bölümler: aynı bölüm adını taşıyan ardışık sayfalar. Çok uzun olanlar parçalara ayrılır. */
function buildChapters(book) {
  const out = [];
  book.pages.forEach((p, i) => {
    const last = out[out.length - 1];
    if (last && last.title === p.s && i + 1 - last.start < 120) last.end = i + 1;
    else out.push({ title: p.s, start: i + 1, end: i + 1 });
  });
  out.forEach((c, i) => {
    c.idx = i;
    if (i === 0 && plain(c.title).replace(/[^a-z]/g, "") === plain(book.title).replace(/[^a-z]/g, "")) c.title = "Giriş";
    c.subs = book.toc.filter((t) => t.l > 1 && t.p >= c.start && t.p <= c.end);
  });
  return out;
}
const chapterOf = (book, page) => book.chapters.find((c) => page >= c.start && page <= c.end) || book.chapters[0];

/* Lugat eşleştirme */
let LUGAT_KEYS = [];
function indexLugat() { LUGAT_KEYS = Object.keys(LUGAT).sort((a, b) => b.length - a.length); }
indexLugat();
function findLugat(word) {
  const w = lower(word.replace(/['’].*$/, ""));
  if (LUGAT[w]) return w;
  return LUGAT_KEYS.find((k) => k.length >= 4 && w.startsWith(k)) || null;
}
const WORD = /([A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’-]+)/;
/* Büyük lugat (eRisale ve SorularlaRisale sayfa altı lugatlarından derlenmiş, CC0):
   tek kelimeler ve "derd-i maîşet" gibi tamlamalar. Anahtarlar şapkasız, küçük harf. */
let BIG = null, BIG_P = null;
let KNOWN = new Set(store.get("nr-known", []));
const bk = (s) => plain(s).replace(/['’`]/g, "");
function loadBig() {
  if (!BIG_P) BIG_P = fetch("books/lugat-big.json").then((r) => r.ok ? r.json() : {}).then((x) => { BIG = x; }).catch(() => { BIG = {}; });
  return BIG_P;
}
// Tek kelime: önce tam hâli, sonra ekleri kırparak (hikmet-i → hikmet, nefsine → nefs)
function bigLookup(raw) {
  const w = bk(raw.replace(/['’].*$/, ""));
  if (!BIG || w.length < 3) return null;
  if (BIG[w]) return w;
  for (let L = w.length - 1; L >= Math.max(4, w.length - 6); L--) { const k = w.slice(0, L); if (BIG[k]) return k; }
  return null;
}
// Tamlama: son kelimenin ekleri kırpılabilir (Cenâb-ı Hakk’a → cenab-i hak)
function phraseLookup(toks) {
  const pre = toks.slice(0, -1).map(bk).join(" ") + " ";
  const last = bk(toks[toks.length - 1].replace(/['’].*$/, ""));
  if (BIG[pre + last]) return pre + last;
  for (let L = last.length - 1; L >= Math.max(2, last.length - 5); L--) { const k = pre + last.slice(0, L); if (BIG[k]) return k; }
  return null;
}
function renderWords(text, highlight) {
  const parts = text.split(WORD);   // çift sıra: ayırıcılar, tek sıra: kelimeler
  const hs = highlight ? (Array.isArray(highlight) ? highlight : [highlight]) : null;
  const wordHtml = (w) => { const h = escapeHtml(w); return hs && hs.some((x) => plain(w).includes(x)) ? `<mark>${h}</mark>` : h; };
  const span = (key, inner) => `<span class="w${KNOWN.has(key) ? " kn" : ""}" data-l="${escapeHtml(key)}">${inner}</span>`;
  let out = "";
  for (let i = 0; i < parts.length; i++) {
    if (i % 2 === 0) { out += escapeHtml(parts[i]); continue; }
    let done = false;
    if (BIG) for (let n = 4; n >= 2 && !done; n--) {
      const end = i + (n - 1) * 2; if (end >= parts.length) continue;
      let ok = true; for (let j = i + 1; j < end; j += 2) if (!/^ +$/.test(parts[j])) { ok = false; break; }
      if (!ok) continue;
      const toks = []; for (let j = i; j <= end; j += 2) toks.push(parts[j]);
      const key = phraseLookup(toks);
      if (key) { let inner = ""; for (let j = i; j <= end; j++) inner += j % 2 ? wordHtml(parts[j]) : escapeHtml(parts[j]); out += span(key, inner); i = end; done = true; }
    }
    if (done) continue;
    const w = parts[i], key = bigLookup(w);
    if (key) { out += span(key, wordHtml(w)); continue; }
    const k2 = findLugat(w);
    out += k2 ? `<span class="w" data-k="${escapeHtml(k2)}">${wordHtml(w)}</span>` : wordHtml(w);
  }
  return out;
}
function renderText(text, highlight) {
  let out = "", last = 0;
  for (const m of text.matchAll(FN_RE)) {
    out += renderWords(text.slice(last, m.index), highlight);
    out += `<button class="fn" data-fn="${escapeHtml(m[1])}" aria-label="Haşiye ${escapeHtml(m[2])}">${escapeHtml(m[2] || "*")}</button>`;
    last = m.index + m[0].length;
  }
  return out + renderWords(text.slice(last), highlight);
}
/* Ayetler: books/ayetler.json (Tanzil metniyle eşleştirildi; meal: Rowwad Tercüme Merkezi, QuranEnc.com) */
let AY = null, AY_P = null;
function loadAyet() {
  if (!AY_P) AY_P = fetch("books/ayetler.json").then((r) => r.ok ? r.json() : null).then((x) => { AY = x; }).catch(() => { AY = null; });
  return AY_P;
}
/* Konu dizini: books/konular.json (tools/build_konular.py) */
let KONU = null, KONU_P = null;
function loadKonu() {
  if (!KONU_P) KONU_P = fetch("books/konular.json").then((r) => r.ok ? r.json() : null).then((x) => { KONU = x; }).catch(() => { KONU = null; KONU_P = null; });
  return KONU_P;
}
/* Ayet olmayan Arapça/Farsça satırların meali: books/arapca.json (NurRisale çalışma tercümesi) */
let ARM = null, ARM_P = null;
function loadArm() {
  if (!ARM_P) ARM_P = fetch("books/arapca.json").then((r) => r.ok ? r.json() : null).then((x) => { ARM = x; }).catch(() => { ARM = null; });
  return ARM_P;
}
const refText = ([s, a1, a2]) => `${AY.sure[s - 1]} ${s}:${a1}${a2 !== a1 ? "-" + a2 : ""}`;
/* Hayat haritasındaki duraklara bağlanan paragraflar: "kitap:sayfa:blok" -> durak no */
let HYREF = {};
function loadHy() {
  return loadJson("hayat").then((H) => {
    const m = {};
    H.stops.forEach((st, n) => { const refs = [...(st.q ? [st.q[1]] : []), ...st.src.map((x) => x[0])]; refs.forEach((r) => { const k = r.replace(/-(\d+)-(\d+)$/, ":$1:$2"); if (!(k in m)) m[k] = n + 1; }); });
    HYREF = m;
  }).catch(() => {});
}
function blockHtml(book, p, i, b, highlight) {
  let html = renderBlock(b, highlight).replace(/^<(\w+)/, `<$1 data-b="${p}:${i}"`);
  const refs = b[0] === "ar" && AY && AY.bloklar[book.id] && AY.bloklar[book.id][`${p}:${i}`];
  // Yalnız Besmele olan satırlara etiket koyma (her bölüm başında var)
  if (refs && !(refs.length === 1 && refs[0][0] === 1 && refs[0][1] === 1 && refs[0][2] === 1)) html += `<div class="ayref">${refs.map((r, n) => `<button class="ay" data-ay="${r.join(",")}">${escapeHtml(refText(r))}</button>`).join("")}</div>`;
  else if (!refs && b[0] === "ar" && ARM && ARM.bloklar[book.id]) {
    const j = ARM.bloklar[book.id][`${p}:${i}`];
    if (j != null) html += `<div class="ayref"><button class="ay arm" data-arm="${j}">Türkçesi</button></div>`;
  }
  const hy = HYREF[`${book.id}:${p}:${i}`];
  if (hy) html += `<div class="ayref hyref"><a class="hyl" href="#hayat-${hy}" title="Hayat haritasında ${hy}. durak">📍 Hayat haritasında gör</a></div>`;
  return html;
}
function renderBlock([k, t], highlight) {
  if (k === "ar") return `<p class="arabic" lang="ar">${renderArabic(stripFn(t))}</p>`;
  if (k === "h") return `<h4>${renderText(t, highlight)}</h4>`;
  return `<p${k === "c" ? ' class="c"' : ""} dir="auto">${renderText(t, highlight)}</p>`;
}
