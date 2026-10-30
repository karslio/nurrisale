/* NurRisale — Book reader, continuous scrolling, reading progress and plans.
   Classic script; deliberately shares the app's global lexical scope. */

/* Bir bölümün HTML'i (sürekli kaydırmada bölümler art arda eklenir) */
/* Sürekli kaydırma: uzun bölümler parça parça (CHUNK sayfa) çizilir; aşağı inildikçe sıradaki sayfalar,
   bölüm bitince sonraki bölüm eklenir. */
const CHUNK = 10;
function pagesHtml(book, from, to, highlight) {
  let html = "";
  for (let p = from; p <= to; p++) {
    const chap = chapterOf(book, p);
    html += p > chap.start ? `<div class="pmark" data-p="${p}">${p}</div>` : `<div data-p="${p}"></div>`;
    html += book.pages[p - 1].b.map((b, i) => blockHtml(book, p, i, b, highlight)).join("");
  }
  return html;
}
function chapterHtml(book, chap, to, highlight) {
  return `<section class="chap-sec" data-ch="${chap.idx}"><div class="chap-book">${escapeHtml(book.title)}</div><h1 class="chap-title">${escapeHtml(chap.title)}</h1><div class="text">${pagesHtml(book, chap.start, Math.min(to, chap.end), highlight)}</div></section>`;
}
let rendered = null;   // { bookId, lo, hi, until } — ekrandaki bölümler ve çizilen son sayfa
function appendMore() {
  if (!rendered || settings.mode === "page") return false;
  const book = BOOKS.get(rendered.bookId); if (!book) return false;
  const cur = book.chapters[rendered.hi];
  if (rendered.until < cur.end) {             // aynı bölümün kalan sayfaları
    const to = Math.min(cur.end, rendered.until + CHUNK);
    const box = app.querySelector(`.chap-sec[data-ch="${cur.idx}"] .text`); if (!box) return false;   // ekran değişmiş
    box.insertAdjacentHTML("beforeend", pagesHtml(book, rendered.until + 1, to));
    rendered.until = to;
  } else {                                     // sonraki bölüm
    const next = book.chapters[rendered.hi + 1];
    if (!next) return false;
    const to = Math.min(next.end, next.start + CHUNK - 1);
    if (!$("#more")) return false;
    $("#more").insertAdjacentHTML("beforebegin", `<div class="chap-sep" aria-hidden="true">✦ ✦ ✦</div>` + chapterHtml(book, next, to));
    rendered.hi = next.idx; rendered.until = to;
  }
  applyHighlights(book);
  if (!book.chapters[rendered.hi + 1] && rendered.until >= book.chapters[rendered.hi].end) $("#more").innerHTML = `<div class="book-end">${escapeHtml(book.title)} burada bitti.</div>`;
  return true;
}
const appendNextChapter = appendMore;
function inRendered(bookId, pageNo) {
  if (!rendered || rendered.bookId !== bookId || settings.mode === "page") return false;
  const book = BOOKS.get(bookId);
  return pageNo >= book.chapters[rendered.lo].start && pageNo <= rendered.until;
}

async function showChapter(bookId, pageNo, highlight, para = null) {
  const meta = metaOf(bookId);
  if (!meta) return showLibrary();
  if (!BOOKS.has(bookId)) {
    app.innerHTML = `<div class="loading">${escapeHtml(meta.title)} açılıyor…</div>`;
    try { await loadBook(bookId); } catch { app.innerHTML = `<div class="loading">Kitap açılamadı. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  }
  if (!BIG || !AY || !ARM) { if (!BIG) app.innerHTML = `<div class="loading">Lugat hazırlanıyor…</div>`; await Promise.all([loadBig(), loadAyet(), loadArm()]); }
  const book = BOOKS.get(bookId);
  pageNo = Math.min(Math.max(1, pageNo), book.pages.length);
  const chap = chapterOf(book, pageNo);
  const pageMode = settings.mode === "page";
  const same = !highlight && (pageMode ? (current.id === bookId && current.page === pageNo && !!app.querySelector(".reader .page-nav")) : inRendered(bookId, pageNo));
  current = { id: bookId, page: pageNo, chapter: chap.idx };
  openNodes.add("shelf:" + (meta.shelf || "kulliyat")); openNodes.add("book:" + bookId); saveOpen();
  setRead(bookId);
  addRecent(book, chap, pageNo);
  const prev = book.chapters[chap.idx - 1], next = book.chapters[chap.idx + 1];

  if (!same && pageMode) {
    rendered = null;
    const showTitle = pageNo === chap.start;
    let html = `<article class="reader"><div class="chap-book">${escapeHtml(book.title)}${showTitle ? "" : " · " + escapeHtml(chap.title)}</div>${showTitle ? `<h1 class="chap-title">${escapeHtml(chap.title)}</h1>` : ""}<div class="text"><div data-p="${pageNo}"></div>`;
    html += book.pages[pageNo - 1].b.map((b, i) => blockHtml(book, pageNo, i, b, highlight)).join("");
    html += `</div><nav class="page-nav"><button id="prev-pg" ${pageNo <= 1 ? "disabled" : ""}>← Önceki sayfa</button><span>${pageNo} / ${book.pages.length}</span><button id="next-pg" ${pageNo >= book.pages.length ? "disabled" : ""}>Sonraki sayfa →</button></nav>
      <nav class="chap-nav">${prev ? `<button id="prev-ch"><small>← Önceki bölüm</small>${escapeHtml(prev.title)}</button>` : "<span></span>"}${next ? `<button id="next-ch"><small>Sonraki bölüm →</small>${escapeHtml(next.title)}</button>` : ""}</nav></article>`;
    app.innerHTML = html;
    if (prev) $("#prev-ch").onclick = () => go(bookId, prev.start);
    if (next) $("#next-ch").onclick = () => go(bookId, next.start);
    $("#prev-pg").onclick = () => go(bookId, pageNo - 1); $("#next-pg").onclick = () => go(bookId, pageNo + 1);
    observePages(book); applyHighlights(book);
    window.scrollTo(0, 0);
  } else if (!same) {
    // Sürekli kaydırma: bu bölümden başla, aşağı indikçe sonraki bölümler eklenir
    const until = Math.min(chap.end, Math.max(chap.start + CHUNK - 1, pageNo + 3));
    rendered = { bookId, lo: chap.idx, hi: chap.idx, until };
    app.innerHTML = `<article class="reader">
      ${prev ? `<button class="prev-top" id="prev-ch">↑ Önceki bölüm: ${escapeHtml(prev.title)}</button>` : ""}
      ${chapterHtml(book, chap, until, highlight)}
      <div id="more" class="more">${next || until < chap.end ? "" : `<div class="book-end">${escapeHtml(book.title)} burada bitti.</div>`}</div></article>`;
    if (prev) $("#prev-ch").onclick = () => go(bookId, prev.start);
    observePages(book); applyHighlights(book);
    // Kısa parçalar ekranı doldurmuyorsa hemen biraz daha ekle
    for (let n = 0; n < 6 && document.documentElement.scrollHeight < innerHeight * 2.5 && appendMore(); n++);
  }
  // İstenen sayfaya kaydır
  if (!pageMode) {
    const sec = app.querySelector(`.chap-sec[data-ch="${chap.idx}"]`);
    const target = pageNo === chap.start ? sec : app.querySelector(`[data-p="${pageNo}"]`);
    if (target && (same || pageNo !== chap.start)) { const y = target.getBoundingClientRect().top + scrollY - $("#bars").getBoundingClientRect().bottom - 8; window.scrollTo(0, Math.max(0, y)); }
    else if (!same) window.scrollTo(0, 0);
  }
  if (highlight) setTimeout(() => app.querySelector("mark")?.scrollIntoView({ block: "center" }), 60);
  if (para != null) setTimeout(() => flashPara(pageNo, para), 90);
  $("#fab").hidden = false;
  refreshListenBtn();
  updatePage(pageNo);
  renderSide(); if (!narrow()) setTimeout(scrollSideToCurrent, 30);
  document.title = `${chap.title} · ${book.title} · NurRisale`;
  renderTabs();
  if (speaking && !same) setTimeout(speakFrom, 300);
  setTimeout(() => updateSub(book, $("#bars").getBoundingClientRect().bottom + 40), 50);
}

/* Görünen sayfayı takip et: sayfa kutusu, ilerleme, bölüm adı; sona yaklaşınca sonraki bölümü ekle */
function observePages(book) {
  if (pageObserver) pageObserver.disconnect();
  let ticking = false;
  const onScroll = () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (document.documentElement.scrollHeight - (scrollY + innerHeight) < 1600) appendNextChapter();
      const marks = [...app.querySelectorAll("[data-p]")]; if (!marks.length) return;
      const top = $("#bars").getBoundingClientRect().bottom + 40;
      let p = +marks[0].dataset.p;
      for (const m of marks) { if (m.getBoundingClientRect().top <= top) p = +m.dataset.p; else break; }
      if (settings.mode === "page" && innerHeight + scrollY >= document.documentElement.scrollHeight - 4) p = +marks[marks.length - 1].dataset.p;
      if (p !== current.page) updatePage(p);
      updateSub(book, top);
    });
  };
  pageObserver = { disconnect() { window.removeEventListener("scroll", onScroll); } };
  window.addEventListener("scroll", onScroll, { passive: true });
}
/* Ekranın üstündeki alt başlığı bul; değişince yol ve sol liste güncellenir */
function updateSub(book, top) {
  const chap = book.chapters[current.chapter]; if (!chap) return;
  let idx = null;
  const sec = app.querySelector(`.chap-sec[data-ch="${chap.idx}"]`);
  if (sec) {
    const hs = [...sec.querySelectorAll(".text > h4")];
    hs.forEach((h, k) => { if (h.getBoundingClientRect().top <= top) idx = k; });
    if (idx != null && idx >= chap.subs.length) idx = chap.subs.length - 1;
  } else {
    chap.subs.forEach((x, k) => { if (x.p <= current.page) idx = k; });   // sayfa modunda sayfaya göre
  }
  if (idx === current.sub) return;
  current.sub = idx;
  if (idx != null) { openNodes.add(`chap:${book.id}:${chap.idx}`); saveOpen(); }
  renderCrumbs(); renderSide();
  if (!narrow()) { const r = side.querySelector(".row.cur"); if (r) { const sr = side.getBoundingClientRect(), rr = r.getBoundingClientRect(); if (rr.top < sr.top + 40 || rr.bottom > sr.bottom - 40) r.scrollIntoView({ block: "center" }); } }
}
let pageTimer, readTimer;
const READ_MS = 4000;
function updatePage(p) {
  const book = BOOKS.get(current.id); if (!book) return;
  current.page = p;
  updLessonBar();
  // Sayfa ekranda 4 saniye kalınca okunmuş sayılır; hızlıca kaydırıp geçilen sayfalar sayılmaz
  clearTimeout(readTimer);
  readTimer = setTimeout(() => { if (current.id === book.id && current.page === p && !document.hidden) trackRead(book.id, p); }, READ_MS);
  const ch = chapterOf(book, p);
  if (ch.idx !== current.chapter) {
    current.chapter = ch.idx; current.sub = null;
    document.title = `${ch.title} · ${book.title} · NurRisale`;
    const t = tabs.find((x) => x.k === activeTab); if (t) { t.h = `#${book.id}-${p}`; saveTabs(); }
    addRecent(book, ch, p); renderSide(); renderTabs();
  }
  renderCrumbs();
  $("#progress").style.width = (p / book.pages.length * 100) + "%";
  clearTimeout(pageTimer);
  const tabK = activeTab;
  pageTimer = setTimeout(() => {
    if (current.id !== book.id || activeTab !== tabK) return;  // bu arada sekme ya da kitap değiştiyse yazma
    store.set("nr-last", { book: book.id, page: p });
    history.replaceState(null, "", `#${book.id}-${p}`);
    const t = tabs.find((x) => x.k === activeTab); if (t) { t.h = `#${book.id}-${p}`; saveTabs(); }
  }, 400);
}
/* Okuma takibi: gün gün okunan sayfalar */
const dayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
function trackRead(bookId, p) {
  const st = store.get("nr-stats", {}), k = dayKey(), key = bookId + ":" + p;
  st[k] = st[k] || [];
  planTrack(bookId, p);
  if (st[k].includes(key)) return;
  st[k].push(key);
  const days = Object.keys(st).sort(); while (days.length > 90) delete st[days.shift()];
  store.set("nr-stats", st);
}
/* ---------- Okuma planı: bir kitabı belirli günde bitir (nr-plan) ---------- */
const getPlan = () => store.get("nr-plan", null);
function planInfo(pl = getPlan()) {
  if (!pl) return null;
  const meta = metaOf(pl.book); if (!meta) return null;
  const today = dayKey(), total = meta.pages, read = pl.read || {};
  const n = Object.keys(read).length, before = Object.values(read).filter((d) => d < today).length, todayN = n - before;
  const day = Math.floor((new Date(today + "T12:00") - new Date(pl.start + "T12:00")) / 864e5) + 1;
  const daysLeft = Math.max(1, pl.days - day + 1);
  const target = Math.max(1, Math.ceil((total - before) / daysLeft));
  let next = (pl.last || 0) + 1; while (next <= total && read[next]) next++;
  if (next > total) { next = 1; while (next <= total && read[next]) next++; }
  const expected = Math.min(total, Math.round(total * Math.min(day, pl.days) / pl.days));
  return { meta, total, n, todayN, target: Math.min(target, total - before), day, days: pl.days, done: n >= total, late: day > pl.days, next: Math.min(next, total), pct: 100 * n / total, expectedPct: 100 * expected / total, behind: Math.max(0, Math.round(total * (day - 1) / pl.days) - before) };
}
function planTrack(bookId, p) {
  const pl = getPlan(); if (!pl || pl.book !== bookId) return;
  pl.last = p;
  if (pl.read[p]) { store.set("nr-plan", pl); return; }
  const was = planInfo(pl);
  pl.read[p] = dayKey(); store.set("nr-plan", pl);
  const now = planInfo(pl);
  if (now.done && !was.done) toast(`Tebrikler! ${now.meta.title} planını bitirdin`);
  else if (was.todayN < was.target && now.todayN >= now.target) toast(`Bugünkü hedef tamam: ${now.todayN} sayfa ✓`);
}
function planCardHtml() {
  const i = planInfo();
  if (!i) return `<div class="sec"><div class="card"><div class="row2"><div><div class="h">Okuma planı</div><strong>Bir kitabı belirlediğin günde bitir</strong><div style="color:var(--muted);font-size:13.5px;margin-top:2px">Ör. Sözler'i 60 günde: her gün kaç sayfa okuman gerektiğini hesaplar, takip eder</div></div><button class="btn" data-plan>Plan yap</button></div></div></div>`;
  const msg = i.done ? "Plan tamamlandı. Tebrikler!" : i.late ? `Süre doldu; kalan ${i.total - i.n} sayfa için bugün ${i.target} sayfa` : i.todayN >= i.target ? `Bugünkü hedef tamam ✓ (${i.todayN} sayfa)` : `Bugün ${i.todayN} / ${i.target} sayfa${i.behind > 0 ? ` · plana göre ${i.behind} sayfa geridesin` : ""}`;
  return `<div class="sec"><div class="card stats"><div class="row2"><div><div class="h">Okuma planı</div><strong>${escapeHtml(i.meta.title)}</strong> <span style="color:var(--muted)">· ${i.days} günde · ${Math.min(i.day, i.days)}. gün</span></div>${i.done ? `<button class="btn" data-plan>Yeni plan</button>` : `<button class="btn" data-plan-go>Okumaya devam</button>`}</div>
    <div class="plan-st"><div><b>${fmtN(i.n)}</b><span>/ ${fmtN(i.total)} sayfa okundu</span></div><div><b>%${Math.floor(i.pct)}</b><span>tamamlandı</span></div><div><b>${i.done ? 0 : Math.max(0, i.target - i.todayN)}</b><span>bugün kalan sayfa</span></div></div>
    <div class="plan-bar"><div style="width:${i.pct}%"></div>${i.done ? "" : `<i style="left:${i.expectedPct}%" title="Plana göre bugün sonunda olman gereken yer"></i>`}</div>
    <div class="plan-note">${msg} · <a href="#" data-plan style="color:inherit">planı düzenle</a></div></div></div>`;
}
function bindPlanCard(root) {
  root.querySelectorAll("[data-plan]").forEach((b) => b.onclick = (e) => { e.preventDefault(); openPlan(); });
  root.querySelectorAll("[data-plan-go]").forEach((b) => b.onclick = () => { const i = planInfo(); if (i) go(i.meta.id, i.next); });
}
function openPlan() {
  const pl = getPlan(), last = store.get("nr-last", null);
  const bookId = pl ? pl.book : (last && last.book) || "sozler";
  showModal(`<h2>Okuma planı</h2>
    <form class="plan-f" id="plan-f">
      <label>Kitap<select id="pl-book">${LIBRARY.map((b) => `<option value="${b.id}" ${b.id === bookId ? "selected" : ""}>${escapeHtml(b.title)} · ${fmtN(b.pages)} sayfa</option>`).join("")}</select></label>
      <div class="row">
        <label>Kaç günde?<input id="pl-days" type="number" min="1" max="730" value="${pl ? pl.days : 30}" list="pl-dl"><datalist id="pl-dl">${[7, 15, 30, 40, 60, 90, 120, 180, 365].map((n) => `<option value="${n}">`).join("")}</datalist></label>
        <label>Başlangıç sayfası<input id="pl-from" type="number" min="1" value="1"></label>
      </div>
      <div class="calc" id="pl-calc"></div>
      <div class="plan-acts"><button class="pri" type="submit">${pl ? "Yeni planı başlat" : "Planı başlat"}</button>${pl ? `<button type="button" id="pl-del">Planı sil</button>` : ""}</div>
      ${pl ? `<div class="plan-note">Yeni plan başlatınca şimdiki planın ilerlemesi silinir.</div>` : ""}
    </form>`);
  const calc = () => {
    const m = metaOf($("#pl-book").value), d = Math.max(1, +$("#pl-days").value || 1), f = Math.min(m.pages, Math.max(1, +$("#pl-from").value || 1));
    const left = m.pages - f + 1, per = Math.ceil(left / d), end = new Date(); end.setDate(end.getDate() + d - 1);
    $("#pl-calc").innerHTML = `Günde <b>${per} sayfa</b> okursan ${fmtN(left)} sayfa <b>${end.toLocaleDateString("tr", { day: "numeric", month: "long", year: "numeric" })}</b> günü biter.${per > 60 ? " Bu biraz yoğun; günleri artırmayı düşünebilirsin." : ""}`;
  };
  const setFrom = () => { const b = $("#pl-book").value; $("#pl-from").max = metaOf(b).pages; $("#pl-from").value = last && last.book === b ? last.page : 1; calc(); };
  $("#pl-book").onchange = setFrom; $("#pl-days").oninput = calc; $("#pl-from").oninput = calc; setFrom();
  $("#plan-f").onsubmit = (e) => {
    e.preventDefault();
    const b = $("#pl-book").value, m = metaOf(b), f = Math.min(m.pages, Math.max(1, +$("#pl-from").value || 1));
    const read = {}; for (let p = 1; p < f; p++) read[p] = "0";       // başlangıçtan önceki sayfalar okunmuş sayılır
    store.set("nr-plan", { book: b, days: Math.max(1, Math.min(730, +$("#pl-days").value || 30)), start: dayKey(), read, last: f - 1 });
    closeModal(); toast("Okuma planı başladı"); go(b, f);
  };
  if ($("#pl-del")) $("#pl-del").onclick = () => { store.set("nr-plan", null); closeModal(); toast("Plan silindi"); if (!current.id) route(); };
}
function readingStats() {
  const st = store.get("nr-stats", {}), today = new Date();
  const last7 = [...Array(7)].map((_, i) => { const d = new Date(today); d.setDate(d.getDate() - (6 - i)); return { d, n: (st[dayKey(d)] || []).length }; });
  let streak = 0; const d = new Date(today);
  if (!(st[dayKey(d)] || []).length) d.setDate(d.getDate() - 1);
  while ((st[dayKey(d)] || []).length) { streak++; d.setDate(d.getDate() - 1); }
  const total = Object.values(st).reduce((n, a) => n + a.length, 0);
  return { today: last7[6].n, last7, streak, total };
}
function setRead(id) { const r = store.get("nr-read", {}); r[id] = 1; store.set("nr-read", r); }
function addRecent(book, chap, page) {
  let list = store.get("nr-recent", []).filter((x) => !(x.book === book.id && x.chap === chap.title));
  list.unshift({ book: book.id, title: book.title, chap: chap.title, page, at: Date.now() });
  store.set("nr-recent", list.slice(0, 8));
}

/* =========================================================
   5) YÖNLENDİRME (#sozler-30 gibi)
   ========================================================= */
let pendingHighlight = null;
function go(bookId, page) { location.hash = `${bookId}-${page}`; }
