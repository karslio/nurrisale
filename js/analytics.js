/* NurRisale — Word statistics, verse index and topic index.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Kelime istatistikleri (#istatistik, #istatistik-<kitap>) ---------- */
let STATS = null;
async function loadStats() { if (!STATS) STATS = await fetch("books/stats.json").then((r) => { if (!r.ok) throw 0; return r.json(); }); return STATS; }
const fmtN = (n) => n.toLocaleString("tr");
const fmtP = (p) => "%" + p.toLocaleString("tr", { maximumFractionDigits: p >= 10 ? 1 : p >= 1 ? 2 : p >= 0.1 ? 2 : 3 });
const statCache = new Map();
function statText(book) {
  let t = statCache.get(book.id);
  if (!t) { t = indexOf(book).map((r) => r.plain).join("\n").replace(/[’`]/g, "'"); statCache.set(book.id, t); }
  return t;
}
// Kelime başında eşleşme; "ekli hâller" kapalıysa kelime sonunda da sınır aranır
function countIn(text, term, suf) {
  const isW = (c) => (c >= 97 && c <= 122) || (c >= 48 && c <= 57);
  let n = 0, i = text.indexOf(term);
  while (i >= 0) {
    if (!isW(i ? text.charCodeAt(i - 1) : 32) && (suf || !isW(text.charCodeAt(i + term.length)))) n++;
    i = text.indexOf(term, i + term.length);
  }
  return n;
}
async function showStats(bookId) {
  current = { id: null, page: 0, chapter: null }; rendered = null;
  stopSpeaking(); $("#fab").hidden = true; $("#progress").style.width = "0";
  renderCrumbs(); renderSide();
  document.title = "Kelime İstatistikleri · NurRisale";
  app.innerHTML = `<div class="loading">İstatistikler hazırlanıyor…</div>`;
  try { await loadStats(); } catch { app.innerHTML = `<div class="loading">İstatistikler yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  const S = STATS;
  if (bookId && (!metaOf(bookId) || !S.books[bookId])) bookId = null;
  const meta = bookId && metaOf(bookId), sc = bookId ? S.books[bookId] : S;
  const books = LIBRARY.filter((b) => S.books[b.id]).map((b) => ({ b, s: S.books[b.id] })).sort((x, y) => y.s.total - x.s.total);
  const maxT = books[0].s.total;
  document.title = `${bookId ? meta.title + " · " : ""}Kelime İstatistikleri · NurRisale`;
  app.innerHTML = `<section class="stv">
    ${swHtml("istatistik", bookId)}
    <h1 class="stv-h">Kelime İstatistikleri${bookId ? ` <span style="color:var(--red)">· ${escapeHtml(meta.title)}</span>` : ""}</h1>
    <p class="stv-sub">Türkçe metindeki kelimeler sayıldı; Arapça satırlar ve haşiyeler sayıma dahil değil.</p>
    <div class="stv-ask">
      <form id="stq-form"><input id="stq" type="search" placeholder="Kelime ya da ifade (ör. Cenâb-ı Hak)" autocomplete="off" aria-label="Kelime ya da ifade"><button class="btn">Say</button></form>
      <label class="stv-opt"><input type="checkbox" id="stq-suf" checked> Ekli hâllerini de say (Hakk'a, Hakk'ın…)</label>
      <div id="stq-res"></div>
    </div>
    <div class="stv-scope"><label for="st-book">Kitap</label><select id="st-book"><option value="">Bütün Risale-i Nur (${books.length} kitap)</option>${SHELVES.map((sh) => `<optgroup label="${sh.title}">${LIBRARY.filter((b) => (b.shelf || "kulliyat") === sh.id && S.books[b.id]).map((b) => `<option value="${b.id}" ${b.id === bookId ? "selected" : ""}>${escapeHtml(b.title)}</option>`).join("")}</optgroup>`).join("")}</select></div>
    <div class="stv-cards">
      <div><b>${fmtN(sc.total)}</b><span>toplam kelime</span></div>
      <div><b>${fmtN(sc.unique)}</b><span>farklı kelime (tekrarlar hariç)</span></div>
      ${bookId ? `<div><b>${fmtP(100 * sc.total / S.total)}</b><span>bütün Risale-i Nur içindeki payı</span></div><div><b>${fmtN(meta.pages)}</b><span>sayfa · sayfa başına ${fmtN(Math.round(sc.total / meta.pages))} kelime</span></div>`
        : `<div><b>${books.length}</b><span>kitap</span></div><div><b>${fmtN(LIBRARY.reduce((n, b) => n + b.pages, 0))}</b><span>sayfa</span></div>`}
    </div>
    <div class="stv-head"><h2>En sık geçen kelimeler</h2><label class="stv-opt"><input type="checkbox" id="st-stop" checked> Bağlaçları ve çok sık Türkçe kelimeleri çıkar</label></div>
    <div class="tbl-wrap tall"><table class="stv-tbl" id="st-top"></table></div>
    <div class="stv-head"><h2>Kitaplara göre</h2><span class="stq-note">Bir kitaba tıklayınca onun istatistikleri açılır</span></div>
    <div class="tbl-wrap tall"><table class="stv-tbl books">
      <thead><tr><th>Kitap</th><th class="n">Kelime</th><th class="n">Farklı kelime</th><th>Bütün içindeki payı</th></tr></thead>
      <tbody>${books.map(({ b, s }) => `<tr data-bk="${b.id}" class="${b.id === bookId ? "on" : ""}"><td>${escapeHtml(b.title)}</td><td class="n">${fmtN(s.total)}</td><td class="n">${fmtN(s.unique)}</td><td><span class="bar"><i style="width:${100 * s.total / maxT}%"></i></span>${fmtP(100 * s.total / S.total)}</td></tr>`).join("")}</tbody></table></div>
    <p class="stq-note">"Farklı kelime" sayılırken özel isimlerdeki ekler (Nur'un → Nur) ve izafet ekleri (risale-i → risale) ayrıldı.</p>
  </section>`;

  const drawTop = () => {
    const list = $("#st-stop").checked ? sc.top : sc.topAll;
    $("#st-top").innerHTML = `<thead><tr><th class="n">#</th><th>Kelime</th><th class="n">Geçiş</th><th class="n">${bookId ? "Kitaptaki payı" : "Bütündeki payı"}</th>${bookId ? `<th class="n">Bütün Risale'de</th><th>Bu kitaptakilerin payı</th>` : ""}</tr></thead><tbody>` +
      list.map(([w, n], i) => {
        const g = S.counts[plain(w)] || n;
        return `<tr><td class="n">${i + 1}</td><td><button class="wlink">${escapeHtml(w)}</button></td><td class="n">${fmtN(n)}</td><td class="n">${fmtP(100 * n / sc.total)}</td>${bookId ? `<td class="n">${fmtN(g)}</td><td><span class="bar"><i style="width:${100 * n / g}%"></i></span>${fmtP(100 * n / g)}</td>` : ""}</tr>`;
      }).join("") + `</tbody>`;
    $("#st-top").querySelectorAll(".wlink").forEach((b) => b.onclick = () => { $("#stq").value = b.textContent; $("#stq-suf").checked = true; countTerm(); $(".stv-ask").scrollIntoView({ block: "start", behavior: "smooth" }); });
  };
  const countTerm = async () => {
    const raw = $("#stq").value.trim(), res = $("#stq-res");
    const term = plain(raw).replace(/[’`]/g, "'").replace(/\s+/g, " ").trim();
    if (term.replace(/[^a-z0-9]/g, "").length < 2) { res.innerHTML = `<div class="empty">En az 2 harf yaz.</div>`; return; }
    const suf = $("#stq-suf").checked, ids = books.map((x) => x.b.id);
    res.innerHTML = `<div class="empty">Kitaplar hazırlanıyor…</div>`;
    try { await ensureBooks(ids, (d, n) => { res.innerHTML = `<div class="empty">Kitaplar hazırlanıyor: ${d} / ${n}</div>`; }); }
    catch { res.innerHTML = `<div class="empty">Kitaplar yüklenemedi. Bağlantını kontrol et.</div>`; return; }
    if (!$("#stq") || $("#stq").value.trim() !== raw) return;
    const rows = ids.map((id) => ({ id, n: countIn(statText(BOOKS.get(id)), term, suf) }));
    const tot = rows.reduce((a, r) => a + r.n, 0);
    if (!tot) { res.innerHTML = `<div class="empty">“${escapeHtml(raw)}” hiçbir kitapta geçmiyor.</div>`; return; }
    const hit = rows.filter((r) => r.n).sort((a, b) => b.n - a.n), maxN = hit[0].n;
    const mine = bookId ? rows.find((r) => r.id === bookId) : null;
    const short = suf && !term.includes(" ") && term.length < 5;
    res.innerHTML = `<div class="stq-sum">
        <div><b>${fmtN(tot)}</b><span>kez geçiyor · ${hit.length} kitapta</span></div>
        <div><b>${fmtP(100 * tot / S.total)}</b><span>bütün Risale-i Nur'daki kelimeler içindeki payı</span></div>
        ${mine ? `<div><b>${fmtN(mine.n)}</b><span>kez ${escapeHtml(meta.title)} içinde · kitaptaki payı ${fmtP(100 * mine.n / S.books[bookId].total)}</span></div>
          <div><b>${fmtP(100 * mine.n / tot)}</b><span>bütün geçişlerin ${escapeHtml(meta.title)} içindeki payı</span></div>` : ""}
      </div>
      ${distChart(ids, term, suf, bookId)}
      <div class="tbl-wrap tall"><table class="stv-tbl"><thead><tr><th>Kitap</th><th class="n">Geçiş</th><th class="n">Kitaptaki payı</th><th>Geçişlerin payı</th></tr></thead><tbody>
        ${hit.map((r) => `<tr class="${r.id === bookId ? "on" : ""}"><td>${escapeHtml(metaOf(r.id).title)}</td><td class="n">${fmtN(r.n)}</td><td class="n">${fmtP(100 * r.n / S.books[r.id].total)}</td><td><span class="bar"><i style="width:${100 * r.n / maxN}%"></i></span>${fmtP(100 * r.n / tot)}</td></tr>`).join("")}
      </tbody></table></div>
      ${hit.length < ids.length ? `<div class="stq-note">${ids.length - hit.length} kitapta hiç geçmiyor.</div>` : ""}
      ${short ? `<div class="stq-note">Kısa kelimelerde ekli sayım, aynı harflerle başlayan başka kelimeleri de kapsayabilir (hak → hakikat). Daha kesin sonuç için "Ekli hâllerini de say" işaretini kaldır.</div>` : ""}
      <button class="link-btn" id="stq-find">Geçtiği yerleri aramada göster →</button>`;
    res.querySelectorAll(".dist rect").forEach((r) => r.addEventListener("mouseenter", () => { res.querySelector("[data-tip]").textContent = r.dataset.t; }));
    $("#stq-find").onclick = () => { searchPanel.hidden = false; q.value = raw.includes(" ") ? `"${raw}"` : raw; $("#scope").hidden = true; runSearch(); };
  };
  $("#st-stop").onchange = drawTop; drawTop();
  $("#st-book").onchange = (e) => { location.hash = e.target.value ? "#istatistik-" + e.target.value : "#istatistik"; };
  app.querySelectorAll("[data-bk]").forEach((r) => r.onclick = () => { location.hash = "#istatistik-" + r.dataset.bk; });
  $("#stq-form").onsubmit = (e) => { e.preventDefault(); countTerm(); };
  $("#stq-suf").onchange = () => { if ($("#stq").value.trim()) countTerm(); };
  window.scrollTo(0, 0);
}

/* ---------- Ayet dizini (#ayetler, #ayetler-<kitap>) ---------- */
async function showAyetler(bookId) {
  current = { id: null, page: 0, chapter: null }; rendered = null;
  stopSpeaking(); $("#fab").hidden = true; $("#progress").style.width = "0";
  renderCrumbs(); renderSide();
  app.innerHTML = `<div class="loading">Ayetler hazırlanıyor…</div>`;
  await loadAyet();
  if (!AY) { app.innerHTML = `<div class="loading">Ayet listesi yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  if (bookId && !AY.bloklar[bookId]) bookId = null;
  const meta = bookId && metaOf(bookId);
  let book = null;
  if (bookId) { try { book = await loadBook(bookId); } catch {} }
  // ayet → geçtiği yerler
  const where = new Map();
  for (const [bid, m] of Object.entries(AY.bloklar)) {
    if (bookId && bid !== bookId) continue;
    for (const [k, refs] of Object.entries(m)) {
      const p = +k.split(":")[0];
      for (const [s0, a1, a2] of refs) for (let a = a1; a <= a2; a++) {
        const key = `${s0}:${a}`; if (!where.has(key)) where.set(key, []);
        const list = where.get(key); if (!list.some((x) => x.b === bid && x.p === p)) list.push({ b: bid, p });
      }
    }
  }
  const keys = [...where.keys()].sort((x, y) => { const [s1, a1] = x.split(":").map(Number), [s2, a2] = y.split(":").map(Number); return s1 - s2 || a1 - a2; });
  // Kitaptaki sıra: kitapların kütüphane sırası, sonra sayfa; her ayet ilk geçtiği yere göre
  const bIdx = new Map(LIBRARY.map((b, i) => [b.id, i])), rank = (x) => (bIdx.get(x.b) ?? 999) * 1e5 + x.p;
  for (const l of where.values()) l.sort((x, y) => rank(x) - rank(y));
  const bookKeys = [...keys].sort((x, y) => rank(where.get(x)[0]) - rank(where.get(y)[0]) || keys.indexOf(x) - keys.indexOf(y));
  let order = store.get("nr-ay-order", "sure");
  const places = [...where.values()].reduce((n, l) => n + l.length, 0);
  const surahs = new Set(keys.map((k) => k.split(":")[0]));
  const top = [...where.entries()].filter(([k]) => k !== "1:1").sort((a, b) => b[1].length - a[1].length).slice(0, 10);
  const bookList = LIBRARY.filter((b) => AY.bloklar[b.id]);
  document.title = `${meta ? meta.title + " · " : ""}Ayetler · NurRisale`;
  const place = (x) => { const t = metaOf(x.b).title; const ch = book && x.b === bookId ? chapterOf(book, x.p).title : null; return `<a class="pl" href="#${x.b}-${x.p}">${escapeHtml(bookId ? (ch || t) : t)} · s. ${x.p}</a>`; };
  app.innerHTML = `<section class="stv">
    ${swHtml("ayetler", bookId)}
    <h1 class="stv-h">Ayetler${meta ? ` <span style="color:var(--red)">· ${escapeHtml(meta.title)}</span>` : ""}</h1>
    <p class="stv-sub">Arapça satırlarda geçen ayetler Kur'an metniyle eşleştirildi. Meal: Rowwad Tercüme Merkezi (QuranEnc.com). Bazı kısa alıntılar ve birleşik okunan ayetler eşleşmemiş olabilir.</p>
    <div class="stv-scope"><label for="ay-book">Kitap</label><select id="ay-book"><option value="">Bütün Risale-i Nur</option>${bookList.map((b) => `<option value="${b.id}" ${b.id === bookId ? "selected" : ""}>${escapeHtml(b.title)}</option>`).join("")}</select></div>
    <div class="stv-cards">
      <div><b>${fmtN(keys.length)}</b><span>farklı ayet</span></div>
      <div><b>${fmtN(surahs.size)}</b><span>sureden</span></div>
      <div><b>${fmtN(places)}</b><span>yerde geçiyor</span></div>
    </div>
    <div class="stv-head"><h2>En çok geçen ayetler</h2></div>
    <div class="ay-top">${top.map(([k, l]) => { const [s0, a] = k.split(":").map(Number); return `<button class="ay" data-ay="${s0},${a},${a}">${escapeHtml(refText([s0, a, a]))} · ${l.length} yerde</button>`; }).join("")}</div>
    <div class="stv-head"><div class="dz-tabs" id="ay-order"><a href="#" data-o="sure">Sure sırasıyla</a><a href="#" data-o="kitap">${bookId ? "Kitaptaki sırasıyla" : "Kitaplardaki sırasıyla"}</a></div><input id="ay-q" class="ay-q" type="search" placeholder="Sure adı, sure:ayet ya da meal içinde ara" autocomplete="off"></div>
    <div id="ay-list" class="ay-list"></div>
  </section>`;
  const draw = () => {
    const t = plain($("#ay-q").value.trim());
    const ref = t.match(/^(\d+)(?::(\d+))?$/);
    let html = "", last = null, shown = 0;
    app.querySelectorAll("#ay-order [data-o]").forEach((x) => x.classList.toggle("on", x.dataset.o === order));
    for (const k of order === "kitap" ? bookKeys : keys) {
      const [s0, a] = k.split(":").map(Number);
      const name = AY.sure[s0 - 1], m = AY.meal[k] || [""];
      if (t && !(ref ? (s0 === +ref[1] && (!ref[2] || a === +ref[2])) : plain(name).includes(t) || plain(m[0]).includes(t))) continue;
      let grp, label;
      if (order === "kitap") { const f = where.get(k)[0]; grp = bookId ? chapterOf(book, f.p).title : f.b; label = bookId ? `${escapeHtml(grp)} <small style="color:var(--muted);font-weight:500">· s. ${chapterOf(book, f.p).start}</small>` : escapeHtml(metaOf(f.b).title); }
      else { grp = s0; label = `${s0}. ${escapeHtml(name)} Sûresi`; }
      if (grp !== last) { html += `<h3 class="ay-s">${label}</h3>`; last = grp; }
      html += `<div class="ay-row"><div class="ay-n">${order === "kitap" ? `<span style="display:block;font-size:11.5px;font-weight:500">${escapeHtml(name)}</span>` : ""}${s0}:${a}</div><div><div class="ay-m">${escapeHtml(m[0])}</div><div class="ay-w">${where.get(k).slice(0, 12).map(place).join("")}${where.get(k).length > 12 ? `<span class="pl">+${where.get(k).length - 12}</span>` : ""}</div></div></div>`;
      if (++shown >= 400) { html += `<div class="stq-note">İlk 400 ayet gösteriliyor; aramayla daralt.</div>`; break; }
    }
    $("#ay-list").innerHTML = html || `<div class="empty">Sonuç yok.</div>`;
  };
  let tm; $("#ay-q").oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 150); };
  app.querySelectorAll("#ay-order [data-o]").forEach((x) => x.onclick = (e) => { e.preventDefault(); order = x.dataset.o; store.set("nr-ay-order", order); draw(); });
  $("#ay-book").onchange = (e) => { location.hash = e.target.value ? "#ayetler-" + e.target.value : "#ayetler"; };
  draw(); window.scrollTo(0, 0);
}

/* ---------- Konu dizini (#konular, #konular-<konu>) ---------- */
async function showKonular(topicId) {
  current = { id: null, page: 0, chapter: null }; rendered = null;
  stopSpeaking(); $("#fab").hidden = true; $("#progress").style.width = "0";
  renderCrumbs(); renderSide();
  app.innerHTML = `<div class="loading">Konular hazırlanıyor…</div>`;
  await loadKonu();
  if (!KONU) { app.innerHTML = `<div class="loading">Konu dizini yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  const sw = swHtml("konular");
  const T = topicId && KONU.find((x) => x.id === topicId);
  if (!T) {
    document.title = "Konu dizini · NurRisale";
    app.innerHTML = `<section class="stv">${sw}
      <h1 class="stv-h">Konu dizini</h1>
      <p class="stv-sub">Risale-i Nur'da her konunun en yoğun işlendiği bölüm ve alt başlıklar. Yerler, konunun anahtar kelimelerinin sayısına ve yoğunluğuna göre sıralandı.</p>
      <input id="kn-q" class="ay-q" type="search" placeholder="Konu ara: kader, namaz, gençlik…" autocomplete="off" style="max-width:none">
      <div class="kn-grid" id="kn-grid">${KONU.map((t) => `<a class="kn-card" href="#konular-${t.id}" data-s="${escapeHtml(plain(t.t + " " + t.d + " " + t.kw.join(" ")))}"><b>${escapeHtml(t.t)}</b><small>${escapeHtml(t.d)}</small><span class="kn-n">${fmtN(t.places)} yer · ${fmtN(t.total)} geçiş</span></a>`).join("")}</div>
    </section>`;
    $("#kn-q").oninput = (e) => { const q = plain(e.target.value.trim()); app.querySelectorAll(".kn-card").forEach((c) => { c.hidden = q && !c.dataset.s.includes(q); }); };
    window.scrollTo(0, 0); return;
  }
  document.title = `${T.t} · Konu dizini · NurRisale`;
  const hl = T.kw.filter((k) => !/[\s\u00a0]/.test(k)).map((k) => plain(k).replace(/-.*$/, "")).filter((k) => k.length >= 4);
  const maxB = T.books.length ? T.books[0][1] : 1;
  app.innerHTML = `<section class="stv">${sw}
    <div><a class="pl" href="#konular">← Bütün konular</a></div>
    <h1 class="stv-h">${escapeHtml(T.t)}</h1>
    <p class="stv-sub">${escapeHtml(T.d)}</p>
    <div class="kn-kw">${T.kw.map((k) => `<span>${escapeHtml(k)}</span>`).join("")}</div>
    <div class="stv-cards">
      <div><b>${fmtN(T.total)}</b><span>anahtar kelime geçişi</span></div>
      <div><b>${fmtN(T.places)}</b><span>bölüm ve alt başlıkta işleniyor</span></div>
      ${T.books.length ? `<div><b style="font-size:18px;line-height:1.35">${escapeHtml(metaOf(T.books[0][0])?.title || T.books[0][0])}</b><span>en çok geçtiği kitap</span></div>` : ""}
    </div>
    <div class="stv-head"><h2>En çok işlendiği yerler</h2></div>
    <div class="kn-list">${T.items.map(([b, p, ch, sub, n, w]) => { const m = metaOf(b); return `<a class="kn-row" href="#${b}-${p}" data-hl="1"><span><span class="t">${escapeHtml(sub || ch)}</span><span class="w">${escapeHtml(m ? m.title : b)}${sub ? " · " + escapeHtml(ch) : ""} · s. ${p}</span></span><span class="c"><b>${n}</b>geçiş · ${fmtN(w)} kelime</span></a>`; }).join("")}</div>
    <div class="stv-head"><h2>Kitaplara göre</h2></div>
    <div class="kn-books">${T.books.filter((b) => b[1] > 0).map(([b, n]) => { const m = metaOf(b); return `<a href="#${b}-1" title="${escapeHtml(m ? m.title : b)}"><span>${escapeHtml(m ? m.title : b)}</span><i style="width:${Math.max(3, Math.round(n / maxB * 100))}%"></i><em>${fmtN(n)}</em></a>`; }).join("")}</div>
    <p class="stq-note">Sayım, anahtar kelimelerin ekli hâllerini de içerir (kader → kaderin, kadere). Arapça satırlar ve haşiyeler sayılmadı.</p>
  </section>`;
  app.querySelectorAll(".kn-row[data-hl]").forEach((a) => a.addEventListener("click", () => { pendingHighlight = hl.length ? hl : null; current.chapter = null; rendered = null; }));
  window.scrollTo(0, 0);
}
