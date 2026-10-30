/* NurRisale — Vocabulary learning and spaced repetition.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Kelime Öğren: en sık kelimelerden başlayan kartlar ---------- */
let LEARN = null, RANK = null;
function loadRank() {
  return fetch("books/kelime-sira.json").then((r) => r.json()).then((x) => {
    LEARN = x; RANK = new Map(x.words.map((w, i) => [bk(w[0]), [i + 1, w[1]]]));
  }).catch(() => {});
}
/* Aralıklı tekrar (Leitner): bilinen kelime 1, 3, 7, 16, 35, 90 gün sonra yeniden sorulur (nr-srs) */
const SRS_DAYS = [0, 1, 3, 7, 16, 35, 90];
let SRS = store.get("nr-srs", null);
if (!SRS) {   // önceden "biliyorum" denen kelimeler önümüzdeki bir haftaya yayılarak tekrara girer
  SRS = {}; [...KNOWN].forEach((k, i) => { SRS[k] = { b: 1, due: Date.now() + (i % 7) * 864e5 }; });
  store.set("nr-srs", SRS);
}
const saveSrs = () => store.set("nr-srs", SRS);
function srsAdd(key) { if (!SRS[key] || SRS[key].b === 0) { SRS[key] = { b: 1, due: Date.now() + 864e5 }; saveSrs(); } }
function srsDue() { const now = Date.now(); return Object.keys(SRS).filter((k) => SRS[k].due <= now).sort((a, b) => SRS[a].due - SRS[b].due); }
function wordInfo(key) {
  const r = RANK && RANK.get(key);
  if (r && LEARN) { const w = LEARN.words[r[0] - 1]; return { w: w[0], m: w[2], r: r[0], f: w[1] }; }
  const v = BIG && BIG[key];
  if (v) { const [d, m] = v.split("|"); return { w: d || key, m: m || "" }; }
  return { w: key, m: "" };
}
/* Okurken bir kelimeyi "biliyorum" diye işaretle: aynı kelime sayfada hemen düz yazıya döner */
function toggleKnown(key) {
  if (KNOWN.has(key)) { KNOWN.delete(key); delete SRS[key]; saveSrs(); toast("Bilmediğin kelimelere eklendi"); } else { KNOWN.add(key); srsAdd(key); toast("Bildiğin kelimelere eklendi · tekrar listesine girdi"); }
  store.set("nr-known", [...KNOWN]);
  app.querySelectorAll(".w[data-l]").forEach((x) => { if (x.dataset.l === key) x.classList.toggle("kn", KNOWN.has(key)); });
  _knownAtOpen.size = KNOWN.size;
}
async function openLearn(mode = "learn") {
  showModal(`<h2>Kelime Öğren</h2><div class="learn-mode" id="learn-mode"></div><div id="learn-body"><div class="lug-n">Liste yükleniyor…</div></div>`);
  if (!LEARN) await loadRank();
  if (!LEARN) { $("#learn-body").textContent = "Liste yüklenemedi. Bağlantını kontrol et."; return; }
  if (!BIG) loadBig();
  let level = store.get("nr-learn-level", 100), queue = null, shown = false, rq = null, rshown = false, rdone = 0;
  const saveKnown = () => store.set("nr-known", [...KNOWN]);
  const drawMode = () => {
    const n = srsDue().length;
    $("#learn-mode").innerHTML = `<button data-md="learn" class="${mode === "learn" ? "on" : ""}">Yeni kelimeler</button><button data-md="review" class="${mode === "review" ? "on" : ""}">Tekrar${n ? `<span class="cnt">${n}</span>` : ""}</button>`;
    $("#learn-mode").querySelectorAll("[data-md]").forEach((b) => b.onclick = () => { mode = b.dataset.md; queue = null; rq = null; shown = rshown = false; render(); });
  };
  const review = () => {
    if (!rq) { rq = srsDue(); rdone = 0; }
    const key = rq[0], all = Object.values(SRS);
    const boxes = [["Yeni öğrenilen", all.filter((x) => x.b <= 2).length], ["Pekişiyor", all.filter((x) => x.b === 3 || x.b === 4).length], ["Sağlam", all.filter((x) => x.b === 5).length], ["Ustalaşıldı", all.filter((x) => x.b >= 6).length]];
    const tomorrow = Object.values(SRS).filter((x) => x.due <= Date.now() + 864e5 && x.due > Date.now()).length;
    let html;
    if (key) {
      const i = wordInfo(key), x = SRS[key];
      html = `<p style="margin:0 0 12px;color:var(--muted);font-size:14px">Bildiğin kelimeler unutulmadan önce yeniden sorulur. Hatırladıkça aralık uzar: 1, 3, 7, 16, 35, 90 gün.</p>
        <div class="flash"><div class="fr">${rq.length} kelime kaldı${rdone ? ` · bugün ${rdone} tekrar` : ""}${x.b ? ` · ${SRS_DAYS[x.b]} günlük aralıkta` : " · yeniden öğreniliyor"}</div><div class="fw">${escapeHtml(i.w)}</div>${rshown ? `<div class="fm">${escapeHtml(i.m || "Anlam bulunamadı")}</div>` : ""}</div>
        <div class="flash-acts">${rshown ? `<button class="no" id="sr-no">Unuttum</button><button class="ok" id="sr-ok">Hatırladım ✓</button>` : `<button class="show" id="sr-show">Anlamını göster</button>`}</div>`;
    } else {
      html = `<div class="flash"><div class="fw" style="font-size:26px">${rdone ? "Bugünkü tekrar bitti ✓" : "Şu an tekrar edilecek kelime yok"}</div><div class="fm">${Object.keys(SRS).length ? `Yarına kadar ${tomorrow} kelime tekrar bekliyor.` : "Yeni kelimeler bölümünde \"Biliyorum\" dediğin ya da okurken işaretlediğin kelimeler burada aralıklarla sorulur."}</div></div>`;
    }
    html += `<div class="srs-boxes">${boxes.map(([t, n]) => `<div><b>${n}</b>${t}</div>`).join("")}</div>`;
    $("#learn-body").innerHTML = html;
    $("#sr-show") && ($("#sr-show").onclick = () => { rshown = true; render(); });
    $("#sr-ok") && ($("#sr-ok").onclick = () => { const x = SRS[key]; x.b = Math.min(6, x.b + 1); x.due = Date.now() + SRS_DAYS[x.b] * 864e5 - 36e5; if (!KNOWN.has(key)) { KNOWN.add(key); saveKnown(); } saveSrs(); rq.shift(); rdone++; rshown = false; render(); });
    $("#sr-no") && ($("#sr-no").onclick = () => { SRS[key] = { b: 0, due: Date.now() }; KNOWN.delete(key); saveKnown(); saveSrs(); rq.push(rq.shift()); rdone++; rshown = false; render(); });
  };
  const render = () => { drawMode(); mode === "review" ? review() : draw(); };
  const words = () => LEARN.words.slice(0, level);
  const coverage = () => { const k = LEARN.words.filter((w) => KNOWN.has(bk(w[0]))).reduce((n, w) => n + w[1], 0); return (100 * k / LEARN.total).toLocaleString("tr", { maximumFractionDigits: 1 }); };
  const draw = () => {
    const list = words(), known = list.filter((w) => KNOWN.has(bk(w[0]))).length;
    if (!queue) queue = list.filter((w) => !KNOWN.has(bk(w[0])));
    const cur = queue[0];
    $("#learn-body").innerHTML = `
      <p style="margin:0 0 12px;color:var(--muted);font-size:14px">Risale-i Nur'da en çok tekrar eden kelimelerden başla. En sık 100 kelime, lugata bakma ihtiyacının yaklaşık dörtte birini karşılar. Yüzdelikler yalnız lugatta anlamı olan kelimelere göre hesaplanır.</p>
      <div class="learn-top">${[100, 300, 500, 1000].map((n) => `<button data-lv="${n}" class="${n === level ? "on" : ""}">İlk ${n}</button>`).join("")}</div>
      <div class="learn-prog"><span><b style="color:var(--ink)">${known} / ${list.length}</b> kelimeyi biliyorsun · lugata bakma ihtiyacın <b style="color:var(--ink)">%${coverage()}</b> azaldı</span><div class="learn-bar"><div style="width:${100 * known / list.length}%"></div></div></div>
      ${cur ? `<div class="flash"><div class="fr">${LEARN.words.indexOf(cur) + 1}. sıradaki kelime · lugattaki kelime geçişlerinin %${(100 * cur[1] / LEARN.total).toLocaleString("tr", { maximumFractionDigits: 2 })}'i</div><div class="fw">${escapeHtml(cur[0])}</div>${shown ? `<div class="fm">${escapeHtml(cur[2])}</div>` : ""}</div>
        <div class="flash-acts">${shown ? `<button id="fl-again">Tekrar et</button><button class="ok" id="fl-ok">Biliyorum ✓</button>` : `<button class="show" id="fl-show">Anlamını göster</button><button id="fl-skip">Tekrar et</button><button class="ok" id="fl-ok">Zaten biliyorum ✓</button>`}</div>`
        : `<div class="flash"><div class="fw">Tebrikler!</div><div class="fm">Bu seviyedeki bütün kelimeleri biliyorsun. Bir üst seviyeye geçebilirsin.</div></div>`}
      <details style="margin-top:14px"><summary style="cursor:pointer;color:var(--muted);font-size:14px">Bu seviyenin listesi (işaretle / kaldır)</summary>
        <div class="learn-list">${list.map((w, i) => `<label><input type="checkbox" data-kw="${escapeHtml(bk(w[0]))}" ${KNOWN.has(bk(w[0])) ? "checked" : ""}><b>${escapeHtml(w[0])}</b><span>${escapeHtml(w[2])}</span><small>${i + 1}</small></label>`).join("")}</div></details>`;
    $("#learn-body").querySelectorAll("[data-lv]").forEach((b) => b.onclick = () => { level = +b.dataset.lv; store.set("nr-learn-level", level); queue = null; shown = false; render(); });
    $("#fl-show") && ($("#fl-show").onclick = () => { shown = true; render(); });
    $("#fl-ok") && ($("#fl-ok").onclick = () => { KNOWN.add(bk(cur[0])); srsAdd(bk(cur[0])); saveKnown(); queue.shift(); shown = false; render(); });
    const again = () => { queue.push(queue.shift()); shown = false; render(); };
    $("#fl-again") && ($("#fl-again").onclick = again); $("#fl-skip") && ($("#fl-skip").onclick = again);
    $("#learn-body").querySelectorAll("[data-kw]").forEach((c) => c.onchange = () => { if (c.checked) { KNOWN.add(c.dataset.kw); srsAdd(c.dataset.kw); } else { KNOWN.delete(c.dataset.kw); delete SRS[c.dataset.kw]; saveSrs(); } saveKnown(); queue = null; render(); });
  };
  render();
}
// Pencere kapanınca okunan bölümü yeniden çiz ki bilinen kelimeler güncellensin
const _knownAtOpen = { size: KNOWN.size };
function showModal(html) { toggleSettings(false); closeMenu(); $("#modal-body").innerHTML = html; $("#modal").hidden = false; }
function closeModal() {
  $("#modal").hidden = true;
  if (current.id && KNOWN.size !== _knownAtOpen.size) { _knownAtOpen.size = KNOWN.size; rendered = null; current.chapter = null; showChapter(current.id, current.page); }
}
$("#modal-x").onclick = closeModal;
$("#modal").addEventListener("click", (e) => { if (e.target.id === "modal") closeModal(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") { if (!$("#modal").hidden) closeModal(); closeMenu(); } });

/* Sayfa modunda telefonda kaydırarak sayfa çevir */
let touch0 = null;
app.addEventListener("touchstart", (e) => { if (e.touches.length === 1) touch0 = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; }, { passive: true });
app.addEventListener("touchend", (e) => {
  if (!touch0 || settings.mode !== "page" || !current.id) return;
  const dx = e.changedTouches[0].clientX - touch0.x, dy = e.changedTouches[0].clientY - touch0.y, quick = Date.now() - touch0.t < 600;
  touch0 = null;
  if (!quick || Math.abs(dx) < 70 || Math.abs(dy) > Math.abs(dx) * 0.6 || selectedText()) return;
  (dx < 0 ? $("#next-pg") : $("#prev-pg"))?.click();
}, { passive: true });
