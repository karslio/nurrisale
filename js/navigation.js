/* NurRisale — Book tree, navigation sidebar and breadcrumbs.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   3) SOL KİTAP AĞACI
   ========================================================= */
let current = { id: null, page: 0, chapter: null };
const openNodes = new Set(store.get("nr-open", ["shelf:kulliyat"]));
const saveOpen = () => store.set("nr-open", [...openNodes]);
const side = $("#side");

function renderSide() {
  const book = current.id && BOOKS.get(current.id);
  const curChap = book ? chapterOf(book, current.page) : null;
  let html = "";
  const marks = getMarks();
  if (marks.length) {
    html += `<div class="marks-h">Yer imlerim</div>` + marks.slice(0, 8).map((m, i) => `
      <div class="mk"><a href="#${m.book}-${m.page}">${escapeHtml(m.section)}<small>${escapeHtml(m.title)} · Sayfa ${m.page}</small></a>
      <button data-unmark="${i}" aria-label="Yer imini kaldır">✕</button></div>`).join("");
    html += `<div class="marks-h">Kitaplar</div>`;
  }
  const hls = getHls();
  if (hls.length) {
    html += `<div class="marks-h">Vurgu ve notlarım</div>` + hls.slice(0, 8).map((h) => `
      <div class="mk"><a href="#${h.book}-${h.p}"><span class="hl ${h.c}" style="padding:0 3px">${escapeHtml(h.text.slice(0, 60))}${h.text.length > 60 ? "…" : ""}</span>${h.note ? `<small>📝 ${escapeHtml(h.note.slice(0, 50))}</small>` : ""}<small>${escapeHtml(h.title)} · Sayfa ${h.p}</small></a>
      <button data-unhl="${h.id}" aria-label="Vurguyu sil">✕</button></div>`).join("");
    if (!marks.length) html += `<div class="marks-h">Kitaplar</div>`;
  }
  html += `<ul class="tree">`;
  for (const sh of SHELVES) {
    const list = LIBRARY.filter((b) => (b.shelf || "kulliyat") === sh.id);
    if (!list.length) continue;
    const shOpen = openNodes.has("shelf:" + sh.id);
    html += row(0, "shelf:" + sh.id, sh.title, true, shOpen, ICON_SHELF);
    if (!shOpen) continue;
    for (const b of list) {
      const bOpen = openNodes.has("book:" + b.id);
      html += row(1, "book:" + b.id, b.title, true, bOpen, ICON_BOOK, b.id === current.id && !curChap ? "cur" : "", BOOKS.has(b.id) && store.get("nr-read", {})[b.id] ? "✓" : "");
      if (!bOpen) continue;
      const bk = BOOKS.get(b.id);
      if (!bk) { html += `<li class="row d2" style="color:var(--muted)"><span class="lbl">Yükleniyor…</span></li>`; continue; }
      for (const c of bk.chapters) {
        const key = `chap:${b.id}:${c.idx}`;
        const cOpen = openNodes.has(key);
        const isCur = b.id === current.id && curChap && curChap.idx === c.idx;
        const chapCls = isCur && (current.sub == null || !openNodes.has(key)) ? "cur" : "";
        html += row(2, key, c.title, c.subs.length > 0, cOpen, "", chapCls, "", `${b.id}-${c.start}`);
        if (cOpen) c.subs.forEach((s, i) => { html += row(s.l === 2 ? 3 : 4, `sub:${b.id}:${c.idx}:${i}`, s.t, false, false, "", isCur && current.sub === i ? "cur" : "", "", `${b.id}-${s.p}`); });
      }
    }
  }
  html += `</ul>`;
  side.innerHTML = html;
  bindMarks(side, renderSide);
  side.querySelectorAll("[data-unhl]").forEach((b) => b.onclick = (e) => { e.stopPropagation(); removeHl(b.dataset.unhl); });
}
function row(depth, key, label, hasKids, open, icon = "", cls = "", tail = "", href = "") {
  return `<li class="row d${depth} ${cls}" data-key="${escapeHtml(key)}" ${href ? `data-href="${href}"` : ""}>
    <span class="tw ${hasKids ? (open ? "open" : "") : "none"}" data-tw>▶</span>${icon}<span class="lbl">${escapeHtml(label)}</span>${tail ? `<span class="ok">${tail}</span>` : ""}</li>`;
}
side.addEventListener("click", async (e) => {
  const r = e.target.closest(".row"); if (!r) return;
  const key = r.dataset.key, href = r.dataset.href;
  const onToggle = e.target.closest("[data-tw]") && !e.target.closest(".tw.none");
  if (key && (key.startsWith("shelf:") || key.startsWith("book:") || (onToggle && key.startsWith("chap:")))) {
    if (openNodes.has(key)) openNodes.delete(key); else openNodes.add(key);
    saveOpen(); renderSide();
    if (key.startsWith("book:") && openNodes.has(key)) { try { await loadBook(key.slice(5)); } catch {} renderSide(); }
    return;
  }
  if (href) {
    if (key && key.startsWith("chap:")) { openNodes.add(key); saveOpen(); }
    closeSide();
    location.hash = href;
  }
});
/* Hızlı gezinme: yoldaki seviyeye tıklayınca listede o yeri aç ve göster */
function jumpTree(level) {
  const book = BOOKS.get(current.id); if (!book) return;
  const meta = metaOf(book.id), chap = chapterOf(book, current.page);
  openNodes.add("shelf:" + (meta.shelf || "kulliyat")); openNodes.add("book:" + book.id);
  if (level === "chap" && chap.subs.length) openNodes.add(`chap:${book.id}:${chap.idx}`);
  saveOpen();
  if (narrow()) openSide(); else renderSide();
  const key = level === "book" ? `book:${book.id}` : `chap:${book.id}:${chap.idx}`;
  setTimeout(() => {
    const row = side.querySelector(`.row[data-key="${key}"]`);
    if (row) { row.scrollIntoView({ block: level === "book" ? "start" : "center", behavior: "smooth" }); row.animate([{ background: "var(--select)" }, { background: "transparent" }], { duration: 1200 }); }
  }, 60);
}
function scrollSideToCurrent() {
  const c = side.querySelector(".row.cur");
  if (c) c.scrollIntoView({ block: "center" });
}
function openSide() { renderSide(); document.body.classList.add("side-open"); setTimeout(scrollSideToCurrent, 50); }
function closeSide() { document.body.classList.remove("side-open"); }
$("#btn-side").onclick = () => { if (narrow()) { document.body.classList.contains("side-open") ? closeSide() : openSide(); } else scrollSideToCurrent(); };
$("#scrim").onclick = closeSide;

/* Üstteki yol: Kitap / Bölüm + sayfa kutusu */
function renderCrumbs() {
  const c = $("#crumbs");
  if (!current.id) { c.innerHTML = `<span>Risale-i Nur Külliyatı</span>`; return; }
  const book = BOOKS.get(current.id), chap = chapterOf(book, current.page);
  // Alt başlık zinciri: geçerli alt başlık ve (3. seviyeyse) üstündeki 2. seviye başlık
  const chain = [];
  if (current.sub != null && chap.subs[current.sub]) {
    const sub = chap.subs[current.sub];
    if (sub.l === 3) { for (let i = current.sub - 1; i >= 0; i--) if (chap.subs[i].l === 2) { chain.push([i, chap.subs[i]]); break; } }
    chain.push([current.sub, sub]);
  }
  const last = chain.length ? chain.length - 1 : -1;
  c.innerHTML = `${ICON_BOOK.replace('class="ic"', "")}<button class="crumb-btn" data-crumb="book">${escapeHtml(book.title)}</button><span>/</span><button class="crumb-btn ${last < 0 ? "cur" : "mid"}" data-crumb="chap">${escapeHtml(chap.title)}</button>` +
    chain.map(([i, x], n) => `<span>/</span><button class="crumb-btn ${n === last ? "cur" : "mid"}" data-crumb="sub:${i}">${escapeHtml(x.t)}</button>`).join("") + `
    <span class="pagebox">
      <button class="bar-btn" id="crumb-stats" aria-label="Bu kitabın kelime istatistikleri" title="Kelime istatistikleri"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/></svg></button>
      <button class="bar-btn ${isMarked(book.id, current.page) ? "on" : ""}" id="crumb-mark" aria-label="Sayfayı işaretle"><svg viewBox="0 0 24 24" fill="${isMarked(book.id, current.page) ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 4h12v16l-6-4-6 4z"/></svg></button>
      <input id="pageinput" type="number" min="1" max="${book.pages.length}" value="${current.page}" aria-label="Sayfa"><span class="tot">/ ${book.pages.length}</span>
    </span>`;
  $("#pageinput").onchange = (e) => go(book.id, +e.target.value || 1);
  $("#crumb-mark").onclick = () => toggleMarkHere();
  $("#crumb-stats").onclick = () => { location.hash = "#istatistik-" + book.id; };
  c.querySelectorAll("[data-crumb]").forEach((b) => b.onclick = () => {
    const v = b.dataset.crumb;
    if (v.startsWith("sub:")) { const sub = chap.subs[+v.slice(4)]; jumpTree("chap"); setTimeout(() => side.querySelector(`.row[data-key="sub:${book.id}:${chap.idx}:${v.slice(4)}"]`)?.scrollIntoView({ block: "center", behavior: "smooth" }), 120); return; }
    jumpTree(v);
  });
}
