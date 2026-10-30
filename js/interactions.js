/* NurRisale — Settings, bookmarks, speech, selection, highlights and quote cards.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   8) OKUMA AYARLARI
   ========================================================= */
const settings = Object.assign({ size: 100, theme: "system", font: "book", lh: "1.7", mode: "scroll", justify: !narrow(), width: "m", lugat: true, hover: true, hls: true, meal: true, fn: true, pnum: true, hideknown: true }, store.get("nr-settings3", {}));
const FONTS = { book: "var(--font-body)", literata: '"Literata", "Hamdullah", "Amiri", Georgia, serif', classic: '"EB Garamond", "Hamdullah", "Amiri", Georgia, serif', sans: 'var(--font-ui), "Hamdullah", "Amiri", sans-serif' };
const WIDTHS = { w: "900px", m: "760px", n: "620px" };
function applySettings() {
  const root = document.documentElement;
  root.style.setProperty("--reader-size", (19 * settings.size / 100).toFixed(1) + "px");
  root.style.setProperty("--reader-lh", settings.lh);
  root.style.setProperty("--reader-font", FONTS[settings.font] || FONTS.book);
  root.style.setProperty("--reader-w", WIDTHS[settings.width] || WIDTHS.m);
  root.style.setProperty("--reader-align", settings.justify ? "justify" : "left");
  if (settings.theme === "sepia") { root.dataset.theme = "light"; root.dataset.tone = "sepia"; }
  else { delete root.dataset.tone; if (settings.theme && settings.theme !== "system") root.dataset.theme = settings.theme; else delete root.dataset.theme; }
  $("#size-out").textContent = settings.size + "%";
  $("#set-font").value = settings.font;
  for (const [id, val] of [["#set-theme", settings.theme || "system"], ["#set-lh", settings.lh], ["#set-width", settings.width], ["#set-mode", settings.mode]])
    $(id).querySelectorAll("button").forEach((b) => b.classList.toggle("on", b.dataset.v === String(val)));
  for (const k of ["justify", "lugat", "hover", "hls", "meal", "fn", "pnum", "hideknown"]) $("#set-" + k).checked = !!settings[k];
  document.body.classList.toggle("hide-known", !!settings.hideknown);
  document.body.classList.toggle("no-lugat", !settings.lugat);
  document.body.classList.toggle("no-meal", !settings.meal);
  document.body.classList.toggle("no-fn", !settings.fn);
  document.body.classList.toggle("no-pnum", !settings.pnum);
  document.body.classList.toggle("no-hls", !settings.hls);
  store.set("nr-settings3", settings);
}
for (const [id, key] of [["#set-theme", "theme"], ["#set-lh", "lh"], ["#set-width", "width"], ["#set-mode", "mode"]])
  $(id).addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    const changedMode = key === "mode" && settings.mode !== b.dataset.v;
    settings[key] = b.dataset.v; applySettings();
    if (changedMode && current.id) { current.chapter = null; rendered = null; showChapter(current.id, current.page); }
  });
for (const k of ["justify", "lugat", "hover", "hls", "meal", "fn", "pnum", "hideknown"]) $("#set-" + k).onchange = (e) => { settings[k] = e.target.checked; applySettings(); };
$("#set-font").onchange = (e) => { settings.font = e.target.value; applySettings(); };
$("#btn-theme").onclick = () => {
  const dark = settings.theme === "dark" || ((!settings.theme || settings.theme === "system") && matchMedia("(prefers-color-scheme: dark)").matches);
  settings.theme = dark ? "light" : "dark"; applySettings();
};
$("#btn-smaller").onclick = () => { settings.size = Math.max(70, settings.size - 10); applySettings(); };
$("#btn-bigger").onclick = () => { settings.size = Math.min(180, settings.size + 10); applySettings(); };
const settingsPanel = $("#settings");
function toggleSettings(open = settingsPanel.hidden) { if (open) { closeMenu(); if (!$("#modal").hidden) closeModal(); hidePop(); } settingsPanel.hidden = !open; $("#btn-settings").setAttribute("aria-expanded", open); }
$("#btn-settings").onclick = (e) => { e.stopPropagation(); toggleSettings(); };
$("#set-close").onclick = () => toggleSettings(false);
document.addEventListener("click", (e) => { if (!settingsPanel.hidden && !e.target.closest("#settings, #btn-settings")) toggleSettings(false); });

/* =========================================================
   9) YER İMLERİ
   ========================================================= */
const getMarks = () => store.get("nr-marks", []);
const isMarked = (id, page) => getMarks().some((m) => m.book === id && m.page === page);
function toggleMarkHere() {
  const book = BOOKS.get(current.id); if (!book) return;
  const page = current.page, section = book.pages[page - 1].s;
  let marks = getMarks();
  if (marks.some((m) => m.book === book.id && m.page === page)) { marks = marks.filter((m) => !(m.book === book.id && m.page === page)); toast("Yer imi kaldırıldı"); }
  else { marks.unshift({ book: book.id, title: book.title, section, page, at: Date.now() }); toast(`Sayfa ${page} işaretlendi`); }
  store.set("nr-marks", marks.slice(0, 100));
  renderCrumbs(); renderSide(); refreshListenBtn();
}
function bindMarks(root, after) {
  root.querySelectorAll("[data-unmark]").forEach((b) => b.onclick = (e) => {
    e.stopPropagation();
    const marks = getMarks(); marks.splice(+b.dataset.unmark, 1); store.set("nr-marks", marks); after();
  });
}
$("#fab-mark").onclick = toggleMarkHere;
$("#fab-top").onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });

/* =========================================================
   10) SESLİ OKUMA
   ========================================================= */
const speechOK = "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
if (!speechOK) $("#fab-listen").hidden = true;
let speaking = false, speakToken = 0;
function refreshListenBtn() {
  $("#fab-listen").classList.toggle("on", speaking);
  $("#fab-mark").classList.toggle("on", !!current.id && isMarked(current.id, current.page));
}
function stopSpeaking() {
  if (!speechOK) return;
  speaking = false; speakToken++; speechSynthesis.cancel();
  document.querySelectorAll(".speaking").forEach((e) => e.classList.remove("speaking"));
  refreshListenBtn();
}
function speakFrom() {
  if (!speaking) return;
  speechSynthesis.cancel();
  const token = ++speakToken;
  const top = $("#bars").getBoundingClientRect().bottom;
  let all = [...document.querySelectorAll(".text > p:not(.arabic), .text > h4")];
  let i = all.findIndex((el) => el.getBoundingClientRect().bottom > top + 10); if (i < 0) i = 0;
  const voice = speechSynthesis.getVoices().find((v) => /^tr/i.test(v.lang)) || null;
  const next = (k) => {
    if (token !== speakToken) return;
    document.querySelectorAll(".speaking").forEach((e) => e.classList.remove("speaking"));
    if (k >= all.length) {
      if (settings.mode === "page") { const n = $("#next-pg"); if (n && !n.disabled) n.click(); else stopSpeaking(); return; }
      if (appendNextChapter()) { all.push(...[...document.querySelectorAll(".text > p:not(.arabic), .text > h4")].slice(all.length)); return next(k); }
      stopSpeaking(); return;
    }
    const el = all[k], text = el.textContent.trim();
    if (!text) return next(k + 1);
    el.classList.add("speaking"); el.scrollIntoView({ block: "center", behavior: "smooth" });
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "tr-TR"; if (voice) u.voice = voice; u.rate = 0.95;
    u.onend = () => next(k + 1);
    u.onerror = () => { if (token === speakToken) stopSpeaking(); };
    speechSynthesis.speak(u);
  };
  next(i);
}
$("#fab-listen").onclick = () => { if (speaking) stopSpeaking(); else { speaking = true; refreshListenBtn(); speakFrom(); } };

/* =========================================================
   11) SEÇİLEN METNİ KAYNAĞIYLA KOPYALAMA
   ========================================================= */
const seltool = $("#seltool");
function selectedText() {
  const sel = getSelection(); if (!sel || sel.isCollapsed) return "";
  const node = sel.anchorNode && (sel.anchorNode.nodeType === 1 ? sel.anchorNode : sel.anchorNode.parentElement);
  return node && node.closest(".text") ? sel.toString().trim() : "";
}
function placeSeltool() {
  const text = selectedText();
  if (!text || !current.id) { seltool.hidden = true; return; }
  const r = getSelection().getRangeAt(0).getBoundingClientRect();
  seltool.hidden = false;
  const w = seltool.offsetWidth;
  seltool.style.left = Math.min(Math.max(12, r.left + r.width / 2 - w / 2), innerWidth - w - 12) + "px";
  seltool.style.top = Math.max($("#bars").getBoundingClientRect().bottom + 8, r.top - seltool.offsetHeight - 10) + "px";
}
document.addEventListener("mouseup", () => setTimeout(placeSeltool, 10));
document.addEventListener("touchend", () => setTimeout(placeSeltool, 250));
document.addEventListener("selectionchange", () => { if (!selectedText()) seltool.hidden = true; });
$("#sel-copy").onclick = async () => {
  const text = selectedText(), book = BOOKS.get(current.id), chap = chapterOf(book, current.page);
  const cite = `"${text}"\n— ${book.title}, ${chap.title}, s. ${current.page}`;
  try { await navigator.clipboard.writeText(cite); toast("Kaynağıyla kopyalandı"); } catch { toast("Kopyalanamadı; Ctrl+C ile kopyalayabilirsin"); }
  seltool.hidden = true;
};
/* ---------- Vurgular ve notlar ---------- */
const getHls = () => store.get("nr-hl", []);
const saveHls = (x) => store.set("nr-hl", x);
function selectionInfo() {
  const sel = getSelection(); if (!sel || sel.isCollapsed || !sel.rangeCount) return null;
  const range = sel.getRangeAt(0);
  const startEl = (range.startContainer.nodeType === 1 ? range.startContainer : range.startContainer.parentElement).closest("[data-b]");
  if (!startEl) return null;
  const pre = document.createRange(); pre.setStart(startEl, 0); pre.setEnd(range.startContainer, range.startOffset);
  const s = pre.toString().length;
  let e = s + range.toString().length;
  e = Math.min(e, startEl.textContent.length);         // vurgu tek paragrafta kalır
  const [p, bi] = startEl.dataset.b.split(":").map(Number);
  return { p, bi, s, e, text: startEl.textContent.slice(s, e).trim() };
}
function addHl(color, note = "") {
  const info = selectionInfo(); if (!info || !info.text) return null;
  const book = BOOKS.get(current.id);
  const h = { id: Date.now().toString(36), book: book.id, title: book.title, c: color, note, at: Date.now(), ...info };
  const all = getHls(); all.unshift(h); saveHls(all.slice(0, 500));
  getSelection().removeAllRanges(); seltool.hidden = true;
  applyHighlights(book, chapterOf(book, info.p)); renderSide();
  return h;
}
function removeHl(id) {
  saveHls(getHls().filter((h) => h.id !== id));
  hidePop(); toast("Vurgu silindi");
  if (current.id) { const book = BOOKS.get(current.id); unwrapHls(); applyHighlights(book, chapterOf(book, current.page)); }
  renderSide();
}
function unwrapHls() { app.querySelectorAll("span.hl[data-hl]").forEach((m) => m.replaceWith(...m.childNodes)); }
/* Kayıtlı vurguları metne uygula: paragrafın metin düğümlerinde [s, e) aralığını sar */
function applyHighlights(book) {
  unwrapHls();
  for (const h of getHls()) {
    if (h.book !== book.id) continue;
    const el = app.querySelector(`[data-b="${h.p}:${h.bi}"]`); if (!el) continue;
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; let pos = 0, n;
    while ((n = walker.nextNode())) { nodes.push([n, pos]); pos += n.nodeValue.length; }
    for (const [node, start] of nodes) {
      const end = start + node.nodeValue.length;
      const a = Math.max(h.s, start), b = Math.min(h.e, end);
      if (a >= b) continue;
      const r = document.createRange(); r.setStart(node, a - start); r.setEnd(node, b - start);
      const span = document.createElement("span");
      span.className = `hl ${h.c}${h.note ? " note" : ""}`; span.dataset.hl = h.id;
      try { r.surroundContents(span); } catch {}
    }
  }
}
function openHl(el) {
  const h = getHls().find((x) => x.id === el.dataset.hl); if (!h) return;
  showPop(el, `<div class="lbl">${h.note ? "Not" : "Vurgu"}</div>
    ${h.note ? `<div style="white-space:pre-wrap">${escapeHtml(h.note)}</div>` : ""}
    <div class="acts"><button data-act="note">${h.note ? "Notu düzenle" : "Not ekle"}</button><button data-act="del">Sil</button></div>`);
  pop.querySelector('[data-act="del"]').onclick = () => removeHl(h.id);
  pop.querySelector('[data-act="note"]').onclick = () => editNote(el, h);
}
function editNote(anchor, h) {
  showPop(anchor, `<div class="lbl">Not</div><div class="q">${escapeHtml(h.text.slice(0, 120))}</div>
    <textarea id="note-ta" placeholder="Notunu yaz">${escapeHtml(h.note || "")}</textarea>
    <div class="acts"><button data-act="cancel">Vazgeç</button><button class="pri" data-act="save">Kaydet</button></div>`);
  const ta = $("#note-ta"); ta.focus();
  pop.querySelector('[data-act="cancel"]').onclick = hidePop;
  pop.querySelector('[data-act="save"]').onclick = () => {
    const all = getHls(), x = all.find((y) => y.id === h.id); if (x) x.note = ta.value.trim(); saveHls(all);
    hidePop(); toast("Not kaydedildi");
    const book = BOOKS.get(current.id); applyHighlights(book, chapterOf(book, current.page)); renderSide();
  };
}
seltool.addEventListener("mousedown", (e) => e.preventDefault()); // seçim kaybolmasın
seltool.querySelectorAll("[data-hl-color]").forEach((b) => b.onclick = () => { if (addHl(b.dataset.hlColor)) toast("Vurgulandı"); });
$("#sel-note").onclick = () => {
  const r = getSelection().rangeCount ? getSelection().getRangeAt(0).getBoundingClientRect() : null;
  const h = addHl("y"); if (!h) return;
  const el = app.querySelector(`span.hl[data-hl="${h.id}"]`); if (el) editNote(el, h);
};
$("#sel-link").onclick = async () => {
  const info = selectionInfo();
  if (info) await copyPara(current.id, info.p, info.bi);
  else { const url = location.href.split("#")[0] + `#${current.id}-${current.page}`; try { await navigator.clipboard.writeText(url); toast("Bağlantı kopyalandı"); } catch { toast(url); } }
  seltool.hidden = true;
};
/* ---------- Vecize kartı: seçili metni kare görsele çevir ---------- */
async function makeCard(text, book, chap, page) {
  const W = 1080, H = 1080, c = document.createElement("canvas"); c.width = W; c.height = H;
  const g = c.getContext("2d");
  try { await document.fonts.load('40px "Souvenir NR"'); await document.fonts.load('60px "UnifrakturMaguntia"'); } catch {}
  // zemin ve çerçeve
  g.fillStyle = "#FBF7EC"; g.fillRect(0, 0, W, H);
  g.strokeStyle = "#C81E2B"; g.lineWidth = 10; g.strokeRect(40, 40, W - 80, H - 80);
  g.strokeStyle = "#D9B25F"; g.lineWidth = 3; g.strokeRect(62, 62, W - 124, H - 124);
  g.fillStyle = "#C81E2B"; g.textAlign = "center";
  g.font = '64px "UnifrakturMaguntia", serif'; g.fillText(chap, W / 2, 170, W - 220);
  g.fillStyle = "#D9B25F"; g.font = "28px serif"; g.fillText("✦  ✦  ✦", W / 2, 220);
  // metni sığdır: yazı boyutunu küçülterek satırlara böl
  const clean = text.replace(/\s+/g, " ").trim();
  let size = 46, lines = [];
  const wrap = (sz) => {
    g.font = `${sz}px "Souvenir NR", Georgia, serif`;
    const out = []; let line = "";
    for (const w of clean.split(" ")) { const t = line ? line + " " + w : w; if (g.measureText(t).width > W - 260 && line) { out.push(line); line = w; } else line = t; }
    if (line) out.push(line); return out;
  };
  do { lines = wrap(size); size -= 2; } while (lines.length * size * 1.5 > 560 && size > 22);
  size += 2; const lh = size * 1.5;
  let y = 260 + (600 - lines.length * lh) / 2 + size;
  g.fillStyle = "#2A2722"; g.textAlign = "center";
  if (lines.length > 14) { lines = lines.slice(0, 14); lines[13] += " …"; }
  for (const l of lines) { g.fillText(l, W / 2, y); y += lh; }
  g.fillStyle = "#7C766A"; g.font = '30px "Souvenir NR", Georgia, serif';
  g.fillText(`${book} · Sayfa ${page}`, W / 2, H - 150);
  g.fillStyle = "#C81E2B"; g.font = 'bold 30px "IBM Plex Sans", sans-serif'; g.fillText("NurRisale", W / 2, H - 100);
  return c;
}
$("#sel-card").onclick = async () => {
  const info = selectionInfo(); const text = selectedText();
  if (!text) return;
  const book = BOOKS.get(current.id), page = info ? info.p : current.page, chap = chapterOf(book, page).title;
  seltool.hidden = true; getSelection().removeAllRanges();
  const canvas = await makeCard(text.length > 900 ? text.slice(0, 900) + "…" : text, book.title, chap, page);
  const url = canvas.toDataURL("image/png");
  showModal(`<h2>Vecize kartı</h2><img class="card-prev" src="${url}" alt="Vecize kartı">
    <div class="card-acts"><a class="pri" href="${url}" download="nurrisale-${book.id}-${page}.png">Görseli indir</a><button id="card-share">Paylaş</button></div>
    <p style="color:var(--muted);font-size:13px;margin:10px 0 0">İndirme çalışmazsa görsele basılı tutup kaydedebilirsin.</p>`);
  $("#card-share").onclick = async () => {
    try {
      const blob = await new Promise((r) => canvas.toBlob(r, "image/png"));
      const file = new File([blob], `nurrisale-${book.id}-${page}.png`, { type: "image/png" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], title: chap, text: `${book.title} · Sayfa ${page}` });
      else { await navigator.clipboard.writeText(`"${text}"\n— ${book.title}, ${chap}, s. ${page}`); toast("Paylaşım desteklenmiyor; metin kopyalandı"); }
    } catch {}
  };
};
$("#sel-search").onclick = () => { const t = selectedText(); seltool.hidden = true; q.value = t.slice(0, 60); openSearch(); };
let toastTimer;
function toast(msg) { const t = $("#toast"); t.textContent = msg; t.hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => t.hidden = true, 2200); }
