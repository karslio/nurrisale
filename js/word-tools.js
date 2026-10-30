/* NurRisale — Word distribution chart and quote memorization.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Kelimenin dağılımı (istatistik sayacının altında) ---------- */
function distChart(ids, term, suf, bookId) {
  let bars;
  if (bookId) {
    const book = BOOKS.get(bookId), n = book.pages.length, bins = Math.min(60, n), per = n / bins;
    const cnt = Array(bins).fill(0), words = Array(bins).fill(0);
    for (const r of indexOf(book)) { const b = Math.min(bins - 1, Math.floor((r.page - 1) / per)); const t = r.plain.replace(/[’`]/g, "'"); cnt[b] += countIn(t, term, suf); words[b] += t.split(/\s+/).length; }
    bars = cnt.map((c, i) => { const p1 = Math.floor(i * per) + 1, p2 = Math.floor((i + 1) * per); return { v: words[i] ? 1000 * c / words[i] : 0, c, label: `s. ${p1}–${p2}: ${c} kez`, href: `#${bookId}-${p1}`, title: chapterOf(book, p1).title }; });
  } else {
    bars = ids.map((id) => { const t = statText(BOOKS.get(id)); const c = countIn(t, term, suf); return { v: 1000 * c / Math.max(1, STATS.books[id].total), c, label: `${metaOf(id).title}: ${c} kez`, href: `#istatistik-${id}`, title: "" }; });
  }
  const max = Math.max(...bars.map((b) => b.v)) || 1, W = 1000, Hh = 140, bw = W / bars.length;
  return `<div class="dist"><h3>${bookId ? "Kitap boyunca dağılımı (1000 kelimede)" : "Kitaplara göre yoğunluk (1000 kelimede)"}</h3>
    <svg viewBox="0 0 ${W} ${Hh + 12}" preserveAspectRatio="none">${bars.map((b, i) => `<a href="${b.href}"><rect x="${(i * bw + bw * 0.12).toFixed(1)}" y="${(Hh - Hh * b.v / max).toFixed(1)}" width="${(bw * 0.76).toFixed(1)}" height="${Math.max(b.c ? 2 : 0, Hh * b.v / max).toFixed(1)}" data-t="${escapeHtml(b.label + (b.title ? " · " + b.title : "") + " · " + b.v.toLocaleString("tr", { maximumFractionDigits: 2 }) + " / 1000")}"><title>${escapeHtml(b.label)}</title></rect></a>`).join("")}<line x1="0" y1="${Hh}" x2="${W}" y2="${Hh}" stroke="var(--rule)"/></svg>
    <div class="tip" data-tip>${bookId ? "Sütunun üstüne gel; tıklayınca o sayfalara gider." : "Sütunun üstüne gel; tıklayınca kitabın istatistiği açılır. Sıra, kütüphanedeki kitap sırasıdır."}</div></div>`;
}

/* ---------- Vecize ezberi (Küçük Sözler'den, aralıklı tekrar: nr-vsrs) ---------- */
async function openVecize(addKey) {
  showModal(`<h2>Vecize ezberi</h2><div id="vz-body"><div class="lug-n">Hazırlanıyor…</div></div>`);
  const id = "kucuksozler";
  try { await loadBook(id); } catch { $("#vz-body").textContent = "Kitap yüklenemedi."; return; }
  const book = BOOKS.get(id), pool = [];
  book.pages.forEach((p, i) => p.b.forEach(([k, t], bi) => { const x = stripFn(t); if (k === "p" && x.length > 60 && x.length < 420) pool.push({ key: `${i + 1}:${bi}`, t: x, page: i + 1 }); }));
  const V = store.get("nr-vsrs", {}), save = () => store.set("nr-vsrs", V);
  if (addKey && !V[addKey]) { V[addKey] = { b: 0, due: Date.now() }; save(); }
  const today = dayKey(), nw = store.get("nr-vnew", { d: today, n: 0 }); if (nw.d !== today) { nw.d = today; nw.n = 0; }
  const NEW_PER_DAY = 3;
  let queue = Object.keys(V).filter((k) => V[k].due <= Date.now());
  while (queue.length < 1 && nw.n < NEW_PER_DAY) { const c = pool.find((x) => !V[x.key]); if (!c) break; V[c.key] = { b: 0, due: Date.now() }; queue.push(c.key); nw.n++; }
  save(); store.set("nr-vnew", nw);
  let shown = false;
  const draw = () => {
    const all = Object.values(V), learnt = all.filter((x) => x.b >= 4).length;
    const st = `<div class="vz-st"><span><b>${all.length}</b> vecize listede</span><span><b>${learnt}</b> ezberlendi</span><span>Bugün <b>${queue.length}</b> tekrar</span></div>`;
    const key = queue[0], it = key && pool.find((x) => x.key === key);
    if (!it) { $("#vz-body").innerHTML = st + `<div class="flash"><div class="fw" style="font-size:24px">Bugünlük bu kadar ✓</div><div class="fm">Her gün ${NEW_PER_DAY} yeni vecize eklenir; ezberlediklerin 1, 3, 7, 16… gün aralıklarla tekrar sorulur.</div></div><div class="flash-acts"><button id="vz-more">Bir vecize daha ekle</button><button class="ok" id="vz-close">Kapat</button></div>`;
      $("#vz-more").onclick = () => { const c = pool.find((x) => !V[x.key]); if (!c) return toast("Bütün vecizeler listende"); V[c.key] = { b: 0, due: Date.now() }; save(); queue.push(c.key); draw(); };
      $("#vz-close").onclick = closeModal; return; }
    const words = it.t.split(/\s+/), cut = Math.max(3, Math.round(words.length * 0.4));
    const chap = chapterOf(book, it.page).title;
    $("#vz-body").innerHTML = st + `<div class="vz-card"><div class="src">${escapeHtml(chap)} · Küçük Sözler, s. ${it.page}${V[key].b ? ` · ${SRS_DAYS[V[key].b]} günlük aralıkta` : " · yeni"}</div>
      <div class="txt">${escapeHtml(words.slice(0, cut).join(" "))} <span class="hide ${shown ? "show" : ""}">${escapeHtml(words.slice(cut).join(" "))}</span></div></div>
      <div class="flash-acts">${shown ? `<button class="no" id="vz-no">Tekrar et</button><button class="ok" id="vz-ok">Hatırladım ✓</button>` : `<button class="show" id="vz-show">Devamını göster</button>`}</div>
      <p class="plan-note">Önce devamını içinden söylemeye çalış, sonra "Devamını göster"e bas.</p>`;
    $("#vz-show") && ($("#vz-show").onclick = () => { shown = true; draw(); });
    $("#vz-ok") && ($("#vz-ok").onclick = () => { const x = V[key]; x.b = Math.min(6, x.b + 1); x.due = Date.now() + SRS_DAYS[x.b] * 864e5 - 36e5; save(); queue.shift(); shown = false; draw(); });
    $("#vz-no") && ($("#vz-no").onclick = () => { V[key] = { b: 0, due: Date.now() }; save(); queue.push(queue.shift()); shown = false; draw(); });
  };
  draw();
}
