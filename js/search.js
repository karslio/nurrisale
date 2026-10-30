/* NurRisale — Tabs, hash routing and full-text search.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Sekmeler (Arama + okuma sekmeleri) ---------- */
let tabs = store.get("nr-tabs", []);        // [{k, h}] h: "#sozler-27" ya da "" (yeni sekme)
let activeTab = store.get("nr-tab", "search");
// Eski sürümlerden kalan fazla boş sekmeleri temizle: en fazla bir boş sekme kalsın
{
  const blanks = tabs.filter((t) => !t.h);
  const keep = blanks.find((t) => t.k === activeTab) || blanks[blanks.length - 1];
  tabs = tabs.filter((t) => t.h || t === keep);
}
if (tabs.length > 6) tabs = tabs.slice(-6);
let tabSeq = tabs.reduce((m, t) => Math.max(m, t.k), 0);
const saveTabs = () => { store.set("nr-tabs", tabs); store.set("nr-tab", activeTab); };
function tabLabel(h) {
  const m = h.match(/^#([a-z]+)-(\d+)$/); if (!m) return "Yeni Sekme";
  const bk = BOOKS.get(m[1]); if (bk) return chapterOf(bk, +m[2]).title;
  return metaOf(m[1])?.title || "Kitap";
}
function syncTabs() {
  const h = location.hash;
  if (/^#(istatistik|ayetler|konular|dizin|hayat)/.test(h)) { activeTab = "stats"; saveTabs(); renderTabs(); return; }
  const isBook = /^#[a-z]+-\d+(-\d+)?$/.test(h);
  let t = tabs.find((x) => x.k === activeTab);
  if (isBook) {
    if (!t) {
      // Aynı kitap açık bir sekmede varsa ona geç; yoksa boş sekmeyi ya da yeni sekme kullan
      const bookId = h.slice(1).split("-")[0];
      t = tabs.find((x) => x.h && x.h.slice(1).split("-")[0] === bookId) || tabs.find((x) => !x.h);
      if (!t) { t = { k: ++tabSeq, h: "" }; tabs.push(t); }
      activeTab = t.k;
    }
    t.h = h.replace(/^(#[a-z]+-\d+)-\d+$/, "$1");
    while (tabs.length > 6) { const i = tabs.findIndex((x) => x.k !== activeTab); tabs.splice(i, 1); }
  } else if (!t || t.h) activeTab = "search";
  saveTabs(); renderTabs();
}
function renderTabs() {
  const tc = document.getElementById("tabs-count"); if (tc) tc.textContent = tabs.length;
  const ICON_OPEN = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"><path d="M3 5.5c3-1 6-1 9 1 3-2 6-2 9-1V19c-3-1-6-1-9 1-3-2-6-2-9-1z"/><path d="M12 6.5V20"/></svg>`;
  $("#tabs").innerHTML = `<button class="tab ${activeTab === "search" ? "on" : ""}" data-tab="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg><span class="t">Arama</span></button>` +
    `<button class="tab ${activeTab === "stats" ? "on" : ""}" data-tab="stats"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/></svg><span class="t">İstatistik</span></button>` +
    tabs.map((t) => `<div class="tab ${activeTab === t.k ? "on" : ""}" data-tab="${t.k}" role="button" tabindex="0">${ICON_OPEN}<span class="t">${escapeHtml(tabLabel(t.h))}</span><button class="x" data-close="${t.k}" aria-label="Sekmeyi kapat">✕</button></div>`).join("") +
    `<button class="tab-add" id="tab-add" aria-label="Yeni sekme">+</button>`;
}
/* Yeni sekme: boş bir sekme zaten varsa yenisini açma, ona geç */
function newTab() {
  const blank = tabs.find((t) => !t.h);
  if (blank) {
    if (activeTab === blank.k) toast("Önce bu sekmede bir eser seç");
    activeTab = blank.k;
  } else { tabs.push({ k: ++tabSeq, h: "" }); activeTab = tabSeq; }
  saveTabs(); location.hash = ""; route();
}
$("#tabs").addEventListener("click", (e) => {
  const close = e.target.closest("[data-close]");
  if (close) {
    const k = +close.dataset.close, i = tabs.findIndex((t) => t.k === k);
    tabs.splice(i, 1);
    if (activeTab === k) { const n = tabs[i] || tabs[i - 1]; activeTab = n ? n.k : "search"; saveTabs(); location.hash = n ? n.h : ""; route(); }
    else { saveTabs(); renderTabs(); }
    return;
  }
  if (e.target.closest("#tab-add")) { newTab(); return; }
  const t = e.target.closest("[data-tab]"); if (!t) return;
  if (t.dataset.tab === "stats") { activeTab = "stats"; saveTabs(); if (location.hash === "#istatistik") route(); else location.hash = "#istatistik"; return; }
  if (t.dataset.tab === "search") { activeTab = "search"; saveTabs(); location.hash = ""; route(); return; }
  const tab = tabs.find((x) => x.k === +t.dataset.tab); activeTab = tab.k; saveTabs();
  if (location.hash === tab.h) route(); else location.hash = tab.h;
});

function showPick() {
  current = { id: null, page: 0, chapter: null }; rendered = null;
  stopSpeaking(); $("#fab").hidden = true; $("#progress").style.width = "0";
  renderCrumbs(); renderSide();
  app.innerHTML = `<div class="pick">
    <svg viewBox="0 0 220 220" aria-hidden="true">
      <circle cx="110" cy="110" r="96" fill="var(--soft)"/>
      <circle cx="104" cy="100" r="58" fill="var(--paper)" stroke="var(--lugat)" stroke-width="6"/>
      <path d="M146 142l34 34" stroke="var(--lugat)" stroke-width="12" stroke-linecap="round"/>
      <g fill="var(--red)"><path d="M72 76c12-6 24-6 32 2v52c-8-7-20-7-32-2z" opacity=".85"/><path d="M136 76c-12-6-24-6-32 2v52c8-7 20-7 32-2z"/></g>
      <path d="M80 92h16M80 104h16M112 92h16M112 104h16" stroke="var(--paper)" stroke-width="4" stroke-linecap="round"/>
      <circle cx="40" cy="58" r="6" fill="var(--lugat)"/><circle cx="182" cy="66" r="5" fill="var(--lugat)"/><circle cx="34" cy="150" r="7" fill="var(--lugat)" opacity=".7"/>
    </svg>
    <p>Risale-i Nur Külliyatı'ndan<br>bir eser seçiniz</p>
    <small>Soldaki listeden bir kitap ve bölüm seç.</small>
  </div>`;
  document.title = "Yeni Sekme · NurRisale";
  if (narrow()) openSide();
}

function route() {
  hidePop();
  clearTimeout(pageTimer);
  syncTabs();
  if (!location.hash && activeTab !== "search") { if (pageObserver) pageObserver.disconnect(); return showPick(); }
  if (location.hash.startsWith("#istatistik")) { if (pageObserver) pageObserver.disconnect(); return showStats(location.hash.slice(12) || null); }
  if (location.hash.startsWith("#ayetler")) { if (pageObserver) pageObserver.disconnect(); return showAyetler(location.hash.slice(9) || null); }
  if (location.hash.startsWith("#konular")) { if (pageObserver) pageObserver.disconnect(); return showKonular(location.hash.slice(9) || null); }
  if (location.hash.startsWith("#dizin")) { if (pageObserver) pageObserver.disconnect(); return showDizin(location.hash.slice(7) || null); }
  if (location.hash.startsWith("#hayat")) { if (pageObserver) pageObserver.disconnect(); return showHayat(location.hash.slice(7)); }
  clearInterval(hyTimer);
  const m = location.hash.match(/^#([a-z]+)-(\d+)(?:-(\d+))?$/);
  if (m) showChapter(m[1], +m[2], pendingHighlight, m[3] != null ? +m[3] : null); else { if (pageObserver) pageObserver.disconnect(); showLibrary(); }
  pendingHighlight = null;
}
window.addEventListener("hashchange", route);
document.addEventListener("keydown", (e) => {
  if (!current.id || e.target.closest("input, textarea") || !$("#search").hidden) return;
  if (settings.mode === "page") {
    if (e.key === "ArrowRight") $("#next-pg")?.click();
    if (e.key === "ArrowLeft") $("#prev-pg")?.click();
    return;
  }
  const book = BOOKS.get(current.id), ch = book && book.chapters[current.chapter + (e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0)];
  if ((e.key === "ArrowRight" || e.key === "ArrowLeft") && ch && ch.idx !== current.chapter) go(book.id, ch.start);
});
$("#home").onclick = (e) => { e.preventDefault(); closeSide(); activeTab = "search"; saveTabs(); location.hash = ""; route(); };

/* =========================================================
   6) LUGAT, MEÂL VE HAŞİYE BALONCUĞU
   ========================================================= */
const pop = $("#pop");
let popFor = null;
function hidePop() { pop.hidden = true; popFor = null; document.querySelectorAll(".w.on, .aw.on").forEach((e) => e.classList.remove("on")); }
function showPop(el, html) {
  hidePop();
  pop.innerHTML = html; pop.hidden = false;
  const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
  pop.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12) + "px";
  let top = r.top - h - 8;
  if (top < $("#bars").getBoundingClientRect().bottom + 6) top = r.bottom + 8;
  pop.style.top = top + "px";
}
function openFor(el) {
  if (popFor === el && !pop.hidden) return;
  if (el.classList.contains("arm")) {
    const m = ARM && ARM.meal[+el.dataset.arm];
    showPop(el, `<div class="lbl">Türkçesi · yaklaşık meal</div><div class="ayl">${escapeHtml(m || "")}</div><div class="ref">NurRisale çalışma tercümesidir; kelime kelime değil, mânâca verilmiştir.</div>`);
  } else if (el.classList.contains("ay")) {
    const [s0, a1, a2] = el.dataset.ay.split(",").map(Number);
    let body = "";
    for (let a = a1; a <= Math.min(a2, a1 + 9); a++) {
      const m = AY.meal[`${s0}:${a}`]; if (!m) continue;
      body += `<div class="ayl">${a1 !== a2 ? `<b>${a}.</b> ` : ""}${escapeHtml(m[0])}</div>${m[1] ? `<div class="ayfn">${escapeHtml(m[1])}</div>` : ""}`;
    }
    if (a2 - a1 > 9) body += `<div class="ref">… ve ${a2 - a1 - 9} ayet daha</div>`;
    showPop(el, `<div class="lbl">Kur'ân-ı Kerîm · ${escapeHtml(refText([s0, a1, a2]))}</div>${body}
      <div class="ref">Meal: Rowwad Tercüme Merkezi (QuranEnc.com) · <a href="https://quranenc.com/tr/browse/turkish_rwwad/${s0}#${a1}" target="_blank" rel="noopener">QuranEnc'de aç</a></div>`);
  } else if (el.classList.contains("aw")) {
    const x = ARAPCA[+el.dataset.a];
    showPop(el, `<div class="lbl">Meâl</div><div>${escapeHtml(x.m)}</div>${x.r ? `<div class="ref">${escapeHtml(x.r)}</div>` : ""}`);
  } else if (el.classList.contains("w")) {
    if (el.dataset.l && BIG && BIG[el.dataset.l]) {
      const key = el.dataset.l, m = BIG[key].split("|")[1];
      const known = KNOWN.has(key);
      showPop(el, `<div class="lgrow"><div class="lgm">${escapeHtml(m)}</div><button data-know class="kn ${known ? "on" : ""}" aria-label="${known ? "Bildiklerimden çıkar" : "Biliyorum"}" title="${known ? "Bildiklerimden çıkar" : "Biliyorum"}">✓</button></div>`);
      pop.querySelector("[data-know]").onclick = () => { toggleKnown(key); hidePop(); };
    } else showPop(el, escapeHtml(LUGAT[el.dataset.k] || ""));
  } else {
    const txt = BOOKS.get(current.id)?.footnotes[el.dataset.fn];
    showPop(el, `<div class="lbl">Haşiye ${escapeHtml(el.textContent)}</div><div style="font-family:var(--font-body)">${txt ? escapeHtml(txt) : "Bu haşiyenin metni bulunamadı."}</div>`);
  }
  el.classList.add("on"); popFor = el;
}
document.addEventListener("click", (e) => {
  if (e.target.closest("#pop, #seltool")) return;
  const el = e.target.closest(".w, .fn, .aw, .ay");
  if (el) return openFor(el);
  const hl = e.target.closest("span.hl[data-hl]");
  if (hl && !selectedText()) return openHl(hl);
  hidePop();
});
const canHover = matchMedia("(hover: hover) and (pointer: fine)").matches;
let hoverTimer;
document.addEventListener("mouseover", (e) => {
  if (!canHover || !settings.hover) return;
  if (e.target.closest("#pop")) { clearTimeout(hoverTimer); return; }
  const el = e.target.closest(".w, .fn, .aw, .ay"); if (!el) return;
  clearTimeout(hoverTimer); hoverTimer = setTimeout(() => openFor(el), 100);
});
document.addEventListener("mouseout", (e) => {
  if (!canHover) return;
  const from = e.target.closest(".w, .fn, .aw, .ay, #pop");
  const to = e.relatedTarget && e.relatedTarget.closest ? e.relatedTarget.closest(".w, .fn, .aw, .ay, #pop") : null;
  if (from && !to) { clearTimeout(hoverTimer); hoverTimer = setTimeout(hidePop, 200); }
});
window.addEventListener("scroll", () => { if (!pop.hidden && !canHover) hidePop(); }, { passive: true });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { hidePop(); closeSearch(); closeSide(); toggleSettings(false); } });

/* =========================================================
   7) ARAMA
   ========================================================= */
const searchPanel = $("#search"), q = $("#q"), results = $("#results");
const indexCache = new Map();
function indexOf(book) {
  if (!indexCache.has(book.id)) {
    const rows = [];
    book.pages.forEach((p, i) => p.b.forEach(([k, t]) => {
      if (k === "ar") return;
      const text = stripFn(t);
      rows.push({ page: i + 1, section: p.s, text, plain: plain(text) });
    }));
    indexCache.set(book.id, rows);
  }
  return indexCache.get(book.id);
}
async function ensureBooks(ids, onProgress) {
  let done = 0;
  await Promise.all(ids.map(async (id) => { await loadBook(id); onProgress && onProgress(++done, ids.length); }));
}
/* Sorgu: "tırnaklı" ise tam ifade, değilse bütün kelimeler geçmeli */
function parseQuery(raw) {
  const r = raw.trim();
  const m = r.match(/^["“](.+)["”]$/);
  if (m) { const phrase = plain(m[1]).replace(/\s+/g, " ").trim(); return { phrase, words: phrase.split(" ").filter((w) => w.length > 1), raw: r }; }
  const words = r.split(/\s+/).map(plain).map((w) => w.replace(/[^a-z0-9]/g, "")).filter((w) => w.length > 1);
  return { phrase: null, words, raw: r };
}
const queryOk = (qy) => (qy.phrase || qy.words.join("")).length >= 3;
function findHits(qy, ids, onlyBook = null) {
  const hits = [], perBook = {}; let total = 0;
  for (const id of ids) for (const r of indexOf(BOOKS.get(id))) {
    const ok = qy.phrase ? r.plain.includes(qy.phrase) : qy.words.every((w) => r.plain.includes(w));
    if (!ok) continue;
    perBook[id] = (perBook[id] || 0) + 1; total++;
    if (onlyBook && id !== onlyBook) continue;
    if (hits.length < 80) hits.push({ book: BOOKS.get(id), ...r, idx: r.plain.indexOf(qy.phrase || qy.words[0]) });
  }
  return { hits, total, perBook };
}
function lugatMatches(qy) {
  const w = qy.phrase || qy.words.join(" ");
  if (!w || w.length < 3) return [];
  const out = [];
  if (BIG) { if (BIG[w]) out.push(w); for (const k in BIG) { if (out.length >= 5) break; if (k !== w && k.startsWith(w) && !k.includes(" ", w.length)) out.push(k); } }
  return out.map((k) => BIG[k].split("|"));
}
function renderHits(container, qy, res, ids, onlyBook = null) {
  const lug = lugatMatches(qy);
  let html = lug.length ? `<div class="lug-box">${lug.map(([d, m]) => `<div><b>${escapeHtml(d)}</b> <span>${escapeHtml(m)}</span></div>`).join("")}</div>` : "";
  if (!res.total) { container.innerHTML = html + `<div class="empty">“${escapeHtml(qy.raw)}” için sonuç yok.${qy.words.length > 1 && !qy.phrase ? " Kelimelerin hepsinin geçtiği paragraf bulunamadı." : ""}</div>`; return; }
  const books = Object.entries(res.perBook).sort((a, b) => b[1] - a[1]);
  if (books.length > 1) html += `<div class="book-chips"><button class="${onlyBook ? "" : "on"}" data-fb="">Hepsi <small>${res.total.toLocaleString("tr")}</small></button>${books.map(([id, n]) => `<button class="${onlyBook === id ? "on" : ""}" data-fb="${id}">${escapeHtml(metaOf(id).title)} <small>${n.toLocaleString("tr")}</small></button>`).join("")}</div>`;
  const shown = onlyBook ? res.perBook[onlyBook] : res.total;
  html += `<div class="empty">${shown.toLocaleString("tr")} paragrafta geçiyor${shown > res.hits.length ? `, ilk ${res.hits.length} tanesi gösteriliyor` : ""}.</div>`;
  const hl = (qy.phrase ? qy.phrase.split(" ") : qy.words).filter((w) => w.length >= 3);
  html += res.hits.map((h, n) => {
    const start = Math.max(0, h.idx - 60);
    const snip = (start ? "…" : "") + h.text.slice(start, h.idx + 140) + "…";
    return `<button class="result" data-n="${n}"><div class="where">${escapeHtml(h.book.title)} · ${escapeHtml(h.section)} · Sayfa ${h.page}</div>
      <div class="snip">${renderWords(snip, hl).replace(/<span[^>]*>|<\/span>/g, "")}</div></button>`;
  }).join("");
  container.innerHTML = html;
  container.querySelectorAll("[data-fb]").forEach((b) => b.onclick = () => renderHits(container, qy, findHits(qy, ids, b.dataset.fb || null), ids, b.dataset.fb || null));
  container.querySelectorAll(".result").forEach((el) => el.onclick = () => {
    const h = res.hits[+el.dataset.n];
    pendingHighlight = hl; closeSearch();
    const target = `#${h.book.id}-${h.page}`;
    current.chapter = null; rendered = null;
    if (location.hash === target) route(); else location.hash = target;
  });
}
async function homeSearch(raw) {
  const qy = parseQuery(raw), box = $("#home-results");
  if (!queryOk(qy)) { box.innerHTML = `<div class="empty">En az 3 harf yaz.</div>`; return; }
  const ids = LIBRARY.map((b) => b.id);
  box.innerHTML = `<div class="empty">Kitaplar hazırlanıyor…</div>`;
  try { await ensureBooks(ids, (d, n) => { box.innerHTML = `<div class="empty">Kitaplar hazırlanıyor: ${d} / ${n}</div>`; }); }
  catch { box.innerHTML = `<div class="empty">Kitaplar yüklenemedi. Bağlantını kontrol et.</div>`; return; }
  renderHits(box, qy, findHits(qy, ids), ids);
}
let scope = "book";
$("#scope").addEventListener("click", (e) => {
  const b = e.target.closest("button"); if (!b) return;
  scope = b.dataset.v;
  $("#scope").querySelectorAll("button").forEach((x) => x.classList.toggle("on", x === b));
  runSearch(); q.focus();
});
function openSearch() {
  if (!current.id) { const hq = $("#home-q"); if (hq) { hq.focus(); window.scrollTo(0, 0); return; } }
  searchPanel.hidden = false; q.focus();
  $("#scope").hidden = !current.id;
  runSearch();
}
function closeSearch() { searchPanel.hidden = true; }
let searchTimer;
async function runSearch() {
  const raw = q.value, qy = parseQuery(raw);
  if (!queryOk(qy)) { results.innerHTML = `<div class="empty">En az 3 harf yaz. Birden çok kelime yazarsan hepsinin geçtiği yerler, "tırnak içinde" yazarsan tam ifade aranır.</div>`; return; }
  const ids = current.id && scope === "book" ? [current.id] : LIBRARY.map((b) => b.id);
  try { await ensureBooks(ids, (d, n) => { if (ids.length > 1) results.innerHTML = `<div class="empty">Kitaplar hazırlanıyor: ${d} / ${n}</div>`; }); }
  catch { results.innerHTML = `<div class="empty">Kitaplar yüklenemedi.</div>`; return; }
  if (q.value !== raw) return;
  renderHits(results, qy, findHits(qy, ids), ids);
}
q.addEventListener("input", () => { clearTimeout(searchTimer); searchTimer = setTimeout(runSearch, 220); });
searchPanel.addEventListener("click", (e) => { if (e.target === searchPanel) closeSearch(); });
$("#btn-search").onclick = openSearch;
