/* NurRisale — Tool navigation, paragraph links, lesson mode and offline library.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Araçlar sekmesindeki geçiş düğmeleri ---------- */
const SW_ITEMS = [["istatistik", "Kelimeler", true], ["ayetler", "Ayetler", true], ["konular", "Konular"], ["dizin", "Dizin"], ["hayat", "Hayatı"]];
function swHtml(on, bookId) {
  return `<div class="stv-switch">${SW_ITEMS.map(([h, t, b]) => `<a class="${h === on ? "on" : ""}" href="#${h}${b && bookId ? "-" + bookId : ""}">${t}</a>`).join("")}</div>`;
}
const toolPage = () => { current = { id: null, page: 0, chapter: null }; rendered = null; stopSpeaking(); $("#fab").hidden = true; $("#progress").style.width = "0"; renderCrumbs(); renderSide(); };
const jsonCache = {};
function loadJson(name) {
  if (!jsonCache[name]) jsonCache[name] = fetch(`books/${name}.json`).then((r) => { if (!r.ok) throw 0; return r.json(); }).catch((e) => { delete jsonCache[name]; throw e; });
  return jsonCache[name];
}

/* ---------- Paragraf bağlantısı ---------- */
function paraUrl(bookId, p, bi) { return location.href.split("#")[0] + `#${bookId}-${p}-${bi}`; }
async function copyPara(bookId, p, bi) {
  const url = paraUrl(bookId, p, bi);
  try { await navigator.clipboard.writeText(url); toast("Paragraf bağlantısı kopyalandı"); } catch { toast(url); }
}
function flashPara(p, bi) {
  let el = app.querySelector(`[data-b="${p}:${bi}"]`);
  if (!el) { const all = app.querySelectorAll(`[data-b^="${p}:"]`); el = all[all.length - 1]; }
  if (!el) return;
  const y = el.getBoundingClientRect().top + scrollY - innerHeight * 0.3;
  window.scrollTo(0, Math.max(0, y));
  el.classList.add("pflash"); setTimeout(() => el.classList.remove("pflash"), 3500);
}
const plink = document.createElement("button");
plink.id = "plink"; plink.hidden = true; plink.textContent = "¶"; plink.title = "Bu paragrafın bağlantısını kopyala"; plink.setAttribute("aria-label", plink.title);
document.body.appendChild(plink);
let plinkFor = null;
app.addEventListener("mouseover", (e) => {
  if (!current.id || document.body.classList.contains("lesson")) return;
  const el = e.target.closest(".text [data-b]"); if (!el || el === plinkFor) return;
  if (el.tagName === "H4") return;
  plinkFor = el;
  const r = el.getBoundingClientRect();
  plink.style.left = Math.max(4, r.left + scrollX - 36) + "px"; plink.style.top = r.top + scrollY + 2 + "px"; plink.hidden = false;
});
app.addEventListener("mouseleave", () => { setTimeout(() => { if (!plink.matches(":hover")) { plink.hidden = true; plinkFor = null; } }, 200); });
plink.onclick = () => { if (!plinkFor) return; const [p, bi] = plinkFor.dataset.b.split(":"); copyPara(current.id, p, bi); };

/* ---------- Ders modu (projeksiyon) ---------- */
let lessonK = store.get("nr-lesson-k", 1.7);
const lessonBar = document.createElement("div");
lessonBar.id = "lesson-bar"; lessonBar.hidden = true;
lessonBar.innerHTML = `<button data-l="prev" aria-label="Geri">◀</button><button data-l="next" aria-label="İleri">▶</button><div class="info" id="lesson-info"></div><button data-l="minus" aria-label="Yazıyı küçült">A−</button><button data-l="plus" aria-label="Yazıyı büyüt">A+</button><button data-l="x" class="x" aria-label="Ders modundan çık">✕</button>`;
document.body.appendChild(lessonBar);
const inLesson = () => document.body.classList.contains("lesson");
function updLessonBar() {
  if (!inLesson()) return;
  const book = BOOKS.get(current.id); if (!book) return;
  const ch = chapterOf(book, current.page);
  $("#lesson-info").innerHTML = `<b>${escapeHtml(ch.title)}</b> · ${escapeHtml(book.title)} · s. ${current.page}`;
}
function toggleLesson(on = !inLesson()) {
  if (on && !current.id) { const t = tabs.find((x) => x.h); if (t) { activeTab = t.k; saveTabs(); location.hash = t.h; setTimeout(() => toggleLesson(true), 600); return; } return toast("Önce bir eser aç"); }
  document.body.classList.toggle("lesson", on); lessonBar.hidden = !on; plink.hidden = true; hidePop();
  document.documentElement.style.setProperty("--lesson-k", lessonK);
  if (on) { try { document.documentElement.requestFullscreen().catch(() => {}); } catch {} updLessonBar(); toast("Ders modu: boşluk / → ileri, ← geri, Esc çıkış"); }
  else if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
}
function lessonStep(dir) {
  if (settings.mode === "page") { (dir > 0 ? $("#next-pg") : $("#prev-pg"))?.click(); return; }
  window.scrollBy({ top: dir * innerHeight * 0.8, behavior: "smooth" });
}
function lessonSize(d) { lessonK = Math.min(3, Math.max(1, +(lessonK + d).toFixed(2))); store.set("nr-lesson-k", lessonK); document.documentElement.style.setProperty("--lesson-k", lessonK); }
lessonBar.addEventListener("click", (e) => {
  const a = e.target.closest("[data-l]")?.dataset.l; if (!a) return;
  if (a === "prev") lessonStep(-1); if (a === "next") lessonStep(1);
  if (a === "minus") lessonSize(-0.15); if (a === "plus") lessonSize(0.15); if (a === "x") toggleLesson(false);
});
document.addEventListener("keydown", (e) => {
  if (!inLesson() || e.target.closest("input, textarea, select")) return;
  const k = e.key; let used = true;
  if (k === "ArrowRight" || k === "ArrowDown" || k === "PageDown" || k === " ") lessonStep(1);
  else if (k === "ArrowLeft" || k === "ArrowUp" || k === "PageUp") lessonStep(-1);
  else if (k === "+" || k === "=") lessonSize(0.15);
  else if (k === "-") lessonSize(-0.15);
  else if (k === "Escape") toggleLesson(false);
  else used = false;
  if (used) { e.preventDefault(); e.stopImmediatePropagation(); }
}, true);
app.addEventListener("click", (e) => {
  if (!inLesson() || e.target.closest("a, button, .w, .aw, .ay, .fn, .hl") || String(getSelection())) return;
  lessonStep(e.clientX > innerWidth / 2 ? 1 : -1);
});
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && inLesson()) toggleLesson(false); });
document.addEventListener("keydown", (e) => { if ((e.key === "d" || e.key === "D") && current.id && !inLesson() && !e.target.closest("input, textarea, select") && $("#search").hidden && !e.ctrlKey && !e.metaKey) toggleLesson(true); });

/* ---------- Çevrimdışı kütüphane ---------- */
async function openOffline() {
  const files = [...LIBRARY.map((b) => `books/${b.id}.json`), ...LIBRARY.map((b) => b.cover).filter(Boolean), "books/dizin.json", "books/hayat.json", "books/konular.json", "books/arapca.json", "books/ayetler.json", "books/stats.json", "books/lugat-big.json"];
  const sw = "serviceWorker" in navigator && navigator.serviceWorker.controller;
  let have = 0;
  if (sw && window.caches) for (const f of LIBRARY) if (await caches.match(`books/${f.id}.json`)) have++;
  showModal(`<h2>Çevrimdışı kütüphane</h2>
    <p style="margin:0 0 12px;color:var(--muted);font-size:14px">Bütün kitapları, kapakları, lugatı ve dizinleri bu cihaza indirir. Sonra internet olmadan da her kitabı okuyabilir, arayabilirsin. Toplam yaklaşık 45 MB.</p>
    ${sw ? `<div class="learn-prog"><span><b style="color:var(--ink)">${have} / ${LIBRARY.length}</b> kitap şu an cihazda</span><div class="learn-bar"><div id="off-bar" style="width:${100 * have / LIBRARY.length}%"></div></div></div>
      <div class="plan-acts"><button class="pri" id="off-go">${have >= LIBRARY.length ? "Güncelle" : "Hepsini indir"}</button></div><p class="plan-note" id="off-st"></p>`
      : `<p class="plan-note">Çevrimdışı indirme yalnız sitenin kendi adresinde (karslio.github.io/nurrisale) ya da telefona yüklenen uygulamada çalışır.</p>`}`);
  if (!sw) return;
  $("#off-go").onclick = async () => {
    $("#off-go").disabled = true; let done = 0, fail = 0;
    const step = async (f) => { try { const r = await fetch(f); if (!r.ok) fail++; await r.arrayBuffer(); } catch { fail++; } done++; $("#off-bar").style.width = (100 * done / files.length) + "%"; $("#off-st").textContent = `İndiriliyor: ${done} / ${files.length}`; };
    for (let i = 0; i < files.length; i += 4) await Promise.all(files.slice(i, i + 4).map(step));
    store.set("nr-offline", { at: Date.now(), n: files.length - fail });
    $("#off-st").textContent = fail ? `${fail} dosya indirilemedi; bağlantını kontrol edip tekrar dene.` : "Tamam! Bütün kütüphane artık bu cihazda.";
    $("#off-go").disabled = false; $("#off-go").textContent = "Güncelle";
  };
}
