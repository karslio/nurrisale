/* NurRisale — Hadith/person/place directory and Bediüzzaman life map.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Hadis, kişi ve yer dizini (#dizin, #dizin-kisiler, #dizin-kisi-<id>, …) ---------- */
async function showDizin(arg) {
  toolPage();
  app.innerHTML = `<div class="loading">Dizin hazırlanıyor…</div>`;
  let D; try { D = await loadJson("dizin"); } catch { app.innerHTML = `<div class="loading">Dizin yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  const [kind0, ...rest] = (arg || "hadisler").split("-"); const id = rest.join("-");
  const kind = { hadis: "hadisler", hadisler: "hadisler", kisi: "kisiler", kisiler: "kisiler", yer: "yerler", yerler: "yerler" }[kind0] || "hadisler";
  const tabsHtml = `<div class="dz-tabs">${[["hadisler", "Hadisler", D.hadisler.length], ["kisiler", "Kişiler", D.kisiler.length], ["yerler", "Yerler", D.yerler.length]].map(([k, t, n]) => `<a class="${k === kind ? "on" : ""}" href="#dizin-${k}">${t}<span>${n}</span></a>`).join("")}</div>`;
  const place = ([b, p]) => `<a class="pl" href="#${b}-${p}">${escapeHtml(metaOf(b)?.title || b)} · s. ${p}</a>`;
  const head = (h, sub) => `<section class="stv">${swHtml("dizin")}<h1 class="stv-h">${h}</h1><p class="stv-sub">${sub}</p>${tabsHtml}`;
  if (kind === "hadisler") {
    document.title = "Hadis dizini · NurRisale";
    app.innerHTML = head("Hadis dizini", "Risale-i Nur'da hadis olarak anılan Arapça ifadeler, açıklamaları ve geçtiği yerler. Açıklama varsa Risale'nin kendi ifadesidir; yoksa yaklaşık meal verildi.") +
      `<input id="dz-q" class="ay-q" type="search" placeholder="Hadis içinde ara (Türkçe ya da Arapça)" autocomplete="off" style="max-width:none"><div id="dz-list"></div></section>`;
    const draw = () => {
      const t = plain($("#dz-q").value.trim());
      const list = D.hadisler.filter((h) => !t || plain(h[1] || "").includes(t) || h[0].includes($("#dz-q").value.trim()));
      $("#dz-list").innerHTML = list.map((h) => `<div class="dz-row"><div class="dz-n">${h[3].length}<small>yerde</small></div><div><div class="dz-ar" dir="rtl">${escapeHtml(h[0])}</div>${h[1] ? `<div class="dz-m">${escapeHtml(h[1])}</div><div class="dz-src">${h[2] === "r" ? "Risale-i Nur'daki açıklaması" : "Yaklaşık meal"}</div>` : ""}<div class="ay-w">${h[3].slice(0, 10).map(place).join("")}${h[3].length > 10 ? `<span class="pl">+${h[3].length - 10}</span>` : ""}</div></div></div>`).join("") || `<div class="empty">Sonuç yok.</div>`;
    };
    let tm; $("#dz-q").oninput = () => { clearTimeout(tm); tm = setTimeout(draw, 150); }; draw(); window.scrollTo(0, 0); return;
  }
  const L = D[kind], label = kind === "kisiler" ? "Kişiler" : "Yerler", one = kind === "kisiler" ? "kisi" : "yer";
  const T = id && L.find((x) => x.id === id);
  if (!T) {
    document.title = `${label} dizini · NurRisale`;
    app.innerHTML = head(`${label} dizini`, kind === "kisiler" ? "Peygamberler, sahabe, âlimler ve Risale-i Nur talebeleri; isimlerinin en çok geçtiği yerler." : "Bediüzzaman'ın hayatındaki şehirler ve Risale-i Nur'da anılan diyarlar; en çok geçtiği yerler.") +
      `<input id="dz-q" class="ay-q" type="search" placeholder="${kind === "kisiler" ? "Kişi ara" : "Yer ara"}" autocomplete="off" style="max-width:none">
      <div class="kn-grid">${L.filter((x) => x.total).map((x) => `<a class="kn-card" href="#dizin-${one}-${x.id}" data-s="${escapeHtml(plain(x.t + " " + x.d))}"><b>${escapeHtml(x.t)}</b><small>${escapeHtml(x.d)}</small><span class="kn-n">${fmtN(x.total)} geçiş · ${fmtN(x.places)} yer</span></a>`).join("")}</div></section>`;
    $("#dz-q").oninput = (e) => { const q = plain(e.target.value.trim()); app.querySelectorAll(".kn-card").forEach((c) => { c.hidden = q && !c.dataset.s.includes(q); }); };
    window.scrollTo(0, 0); return;
  }
  document.title = `${T.t} · ${label} dizini · NurRisale`;
  const maxB = T.books.length ? T.books[0][1] : 1;
  app.innerHTML = head(escapeHtml(T.t), escapeHtml(T.d)) + `
    <div><a class="pl" href="#dizin-${kind}">← Bütün ${label.toLowerCase()}</a></div>
    <div class="stv-cards"><div><b>${fmtN(T.total)}</b><span>kez geçiyor</span></div><div><b>${fmtN(T.places)}</b><span>bölüm ve alt başlıkta</span></div>${T.books.length ? `<div><b style="font-size:18px;line-height:1.35">${escapeHtml(metaOf(T.books[0][0])?.title || "")}</b><span>en çok geçtiği kitap</span></div>` : ""}</div>
    <div class="stv-head"><h2>En çok geçtiği yerler</h2></div>
    <div class="kn-list">${T.items.map(([b, p, ch, sub, n]) => `<a class="kn-row" href="#${b}-${p}"><span><span class="t">${escapeHtml(sub || ch)}</span><span class="w">${escapeHtml(metaOf(b)?.title || b)}${sub ? " · " + escapeHtml(ch) : ""} · s. ${p}</span></span><span class="c"><b>${n}</b>geçiş</span></a>`).join("")}</div>
    <div class="stv-head"><h2>Kitaplara göre</h2></div>
    <div class="kn-books">${T.books.map(([b, n]) => `<a href="#${b}-1"><span>${escapeHtml(metaOf(b)?.title || b)}</span><i style="width:${Math.max(3, Math.round(n / maxB * 100))}%"></i><em>${fmtN(n)}</em></a>`).join("")}</div>
  </section>`;
  window.scrollTo(0, 0);
}

/* ---------- Bediüzzaman'ın hayatı: harita ve zaman çizelgesi (#hayat) ---------- */
let hyTimer = null;
async function showHayat(arg) {
  toolPage(); clearInterval(hyTimer); hyTimer = null;
  app.innerHTML = `<div class="loading">Harita hazırlanıyor…</div>`;
  let H; try { H = await loadJson("hayat"); } catch { app.innerHTML = `<div class="loading">Harita yüklenemedi. Bağlantını kontrol edip sayfayı yenile.</div>`; return; }
  document.title = "Bediüzzaman'ın hayatı · NurRisale";
  const S = H.stops, P = H.pts, eraIx = (e) => H.eras.findIndex((x) => x[0] === e);
  const byPt = {}; S.forEach((s, i) => (byPt[s.pt] ||= []).push(i));
  const firstYear = (y) => parseInt(y, 10), Y0 = 1877, Y1 = 1960, yPos = (y) => (100 * (firstYear(y) - Y0) / (Y1 - Y0)).toFixed(2);
  const routeD = (upto) => S.slice(0, upto + 1).map((s, k) => `${k ? "L" : "M"}${P[s.pt].x},${P[s.pt].y}`).join("");
  const link = (ref, label) => `<a class="pl" href="#${ref}">${escapeHtml(label)}</a>`;
  const refName = (ref) => { const id = ref.replace(/-\d+-\d+$/, ""), m = metaOf(id); return m ? m.title : id; };
  let auto = store.get("nr-hy-auto", true);
  // Liste: dönem başlıkları + duraklar
  let list = "", lastEra = "";
  S.forEach((s, i) => {
    if (s.e !== lastEra) { const e = H.eras[eraIx(s.e)]; list += `<li class="hy-era" id="hy-era-${eraIx(s.e)}"><b>${escapeHtml(e[0])}</b> <span>${e[1]}</span><p>${escapeHtml(e[2])}</p></li>`; lastEra = s.e; }
    const works = s.w.map((w) => metaOf(w) ? `<a class="pl bk" href="#${w}-1">📖 ${escapeHtml(metaOf(w).title)}</a>` : "").join("");
    const src = s.src.map(([r, l]) => link(r, l)).join("");
    list += `<li class="hy-it" data-i="${i}" id="hy-${i}"><span class="dot">${i + 1}</span><div class="yr">${s.y}</div><h3>${escapeHtml(s.t)} <small>· ${escapeHtml(s.pl)}</small></h3><p>${escapeHtml(s.d)}</p>
      ${s.q ? `<blockquote class="hy-q"><a href="#${s.q[1]}">“${escapeHtml(s.q[0])}”</a><cite>${escapeHtml(refName(s.q[1]))}</cite></blockquote>` : ""}
      ${works || src ? `<div class="lk">${works}${src}</div>` : ""}</li>`;
  });
  const ptSvg = Object.entries(P).map(([k, p]) => {
    const yrs = byPt[k].map((i) => S[i].y).join(", ");
    if (p.off) return `<g class="pt off" data-pt="${k}" transform="translate(${p.x},${p.y})"><title>${escapeHtml(p.n)} · ${yrs}</title><rect x="-8" y="-4" width="16" height="16" fill="transparent"/><text y="12" text-anchor="middle">${p.off} ${escapeHtml(p.n)}</text></g>`;
    const [dx, dy, an] = p.l;
    return `<g class="pt${p.m ? "" : " minor"}" data-pt="${k}" transform="translate(${p.x},${p.y})"><title>${escapeHtml(p.n)} · ${yrs}</title><circle class="ring"/><circle class="c" r="${p.m ? 9 : 7}"/><text x="${dx}" y="${dy}" text-anchor="${an}">${escapeHtml(p.n)}</text></g>`;
  }).join("");
  const tr = H.reg.tr;
  app.innerHTML = `<section class="stv">${swHtml("hayat")}
    <h1 class="stv-h">Bediüzzaman Said Nursî'nin hayatı</h1>
    <p class="stv-sub">Nurs'tan Urfa'ya, 1877–1960: ${S.length} durak. Her durak Tarihçe-i Hayat'ın ve Lâhikaların ilgili paragrafına bağlı; alıntıya tıklayınca o paragraf açılır.</p>
    <div class="hy-eras">${H.eras.map((e, k) => `<button data-era="${k}"><b>${escapeHtml(e[0])}</b><small>${e[1]}</small></button>`).join("")}</div>
    <div class="hy">
      <div class="hy-map"><div class="hy-svgw">
        <svg id="hy-svg" viewBox="${tr.join(" ")}" role="img" aria-label="Bediüzzaman'ın hayatındaki duraklar haritası">
          <rect class="sea" x="-2000" y="-2000" width="5000" height="5000"/>
          <g>${H.ulke.map(([n, d]) => `<path class="ulke" d="${d}"><title>${escapeHtml(n)}</title></path>`).join("")}</g>
          <g>${H.il.map(([n, d]) => `<path class="il" d="${d}"><title>${escapeHtml(n)}</title></path>`).join("")}</g>
          <g>${H.gol.map(([n, d]) => `<path class="gol" d="${d}"><title>${escapeHtml(n)}</title></path>`).join("")}</g>
          <path class="route" d="${routeD(S.length - 1)}"/><path class="route-done" id="hy-done" d=""/><path class="route-last" id="hy-last" d=""/>
          ${ptSvg}
        </svg>
        <div class="hy-card" id="hy-card"></div></div>
        <div class="hy-tl" id="hy-tl" title="Zaman çizgisi">${H.eras.map((e) => { const [a, b] = e[1].split("–").map(Number); return `<span class="band e${eraIx(e[0])}" style="left:${yPos(a)}%;width:${(100 * (b - a) / (Y1 - Y0)).toFixed(2)}%"></span>`; }).join("")}
          ${S.map((s, i) => `<i data-i="${i}" style="left:${yPos(s.y)}%"></i>`).join("")}<em id="hy-tlc"></em><span class="t0">1877</span><span class="t1">1960</span></div>
        <div class="hy-ctl"><button class="pri" id="hy-play">▶ Oynat</button><button id="hy-prev" aria-label="Önceki durak">◀</button><button id="hy-next" aria-label="Sonraki durak">▶</button>
          <button id="hy-auto" aria-pressed="${auto}">${auto ? "🔍 Yakınlaş: açık" : "🔍 Yakınlaş: kapalı"}</button><span class="yr" id="hy-yr"></span></div>
      </div>
      <ol class="hy-list">${list}</ol>
    </div>
    <p class="stq-note">${escapeHtml(H.kaynak)}. Tarihler Tarihçe-i Hayat'a göre yaklaşık verilmiştir; bazı küçük yerler (Tağ, Tillo, Sav, Çam Dağı) yakınlarındaki noktada gösterilir.</p>
  </section>`;
  const svg = $("#hy-svg");
  // viewBox yumuşak geçiş; noktalar ve yazılar ekranda hep aynı boyda kalsın
  let vb = tr.slice(), anim = 0;
  const applyVb = () => {
    svg.setAttribute("viewBox", vb.map((v) => v.toFixed(1)).join(" "));
    const k = vb[2] / H.w * (narrow() ? 1.45 : 1);
    svg.classList.toggle("far", vb[2] / H.w > 0.75);
    app.querySelectorAll("#hy-svg .pt").forEach((g) => { const p = P[g.dataset.pt]; g.setAttribute("transform", `translate(${p.x},${p.y}) scale(${k.toFixed(3)})`); });
  };
  const zoomTo = (box) => {
    cancelAnimationFrame(anim);
    const from = vb.slice(), t0 = performance.now(), dur = matchMedia("(prefers-reduced-motion: reduce)").matches ? 1 : 750;
    const step = (t) => { const u = Math.min(1, (t - t0) / dur), e = u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2; vb = from.map((v, j) => v + (box[j] - v) * e); applyVb(); if (u < 1) anim = requestAnimationFrame(step); };
    anim = requestAnimationFrame(step);
  };
  let cur = -1;
  const sel = (i, scroll = true) => {
    cur = Math.max(0, Math.min(S.length - 1, i));
    const s = S[cur], p = P[s.pt];
    app.querySelectorAll(".hy-it").forEach((el) => el.classList.toggle("cur", +el.dataset.i === cur));
    app.querySelectorAll("#hy-svg .pt").forEach((g) => { const ix = byPt[g.dataset.pt]; g.classList.toggle("cur", ix.includes(cur)); g.classList.toggle("on", ix.some((k) => k < cur)); });
    app.querySelectorAll(".hy-tl i").forEach((el) => el.classList.toggle("on", +el.dataset.i <= cur));
    app.querySelectorAll(".hy-eras button").forEach((b) => b.classList.toggle("on", +b.dataset.era === eraIx(s.e)));
    $("#hy-tlc").style.left = yPos(s.y) + "%";
    $("#hy-done").setAttribute("d", routeD(cur));
    const pv = cur > 0 ? P[S[cur - 1].pt] : null;
    $("#hy-last").setAttribute("d", pv ? `M${pv.x},${pv.y}L${p.x},${p.y}` : "");
    $("#hy-yr").textContent = s.y;
    $("#hy-card").innerHTML = `<b>${cur + 1}. ${escapeHtml(s.t)}</b><span>${escapeHtml(s.pl)} · ${s.y} · ${escapeHtml(s.e)}</span>`;
    const box = auto ? H.reg[p.r] : tr, fx = (p.x - box[0]) / box[2], fy = (p.y - box[1]) / box[3];
    $("#hy-card").classList.toggle("tr", fx < 0.6 && fy > 0.55);
    zoomTo(box);
    try { history.replaceState(null, "", "#hayat-" + (cur + 1)); } catch {}
    if (scroll) { const el = $("#hy-" + cur), r = el.getBoundingClientRect(), mapB = narrow() ? app.querySelector(".hy-map").getBoundingClientRect().bottom : $("#bars").getBoundingClientRect().bottom; if (r.top < mapB + 10 || r.bottom > innerHeight - 10) window.scrollTo({ top: scrollY + r.top - mapB - 16, behavior: "smooth" }); }
  };
  const stop = () => { clearInterval(hyTimer); hyTimer = null; const b = $("#hy-play"); if (b) b.textContent = "▶ Oynat"; };
  app.querySelectorAll(".hy-it").forEach((el) => el.addEventListener("click", (e) => { if (!e.target.closest("a")) { stop(); sel(+el.dataset.i, false); } }));
  app.querySelectorAll("#hy-svg .pt").forEach((g) => g.addEventListener("click", () => { stop(); const ix = byPt[g.dataset.pt]; sel(ix.find((k) => k > cur) ?? ix[0]); }));
  app.querySelectorAll(".hy-tl i").forEach((el) => el.addEventListener("click", () => { stop(); sel(+el.dataset.i); }));
  app.querySelectorAll(".hy-eras button").forEach((b) => b.addEventListener("click", () => { stop(); sel(S.findIndex((s) => eraIx(s.e) === +b.dataset.era)); }));
  $("#hy-play").onclick = () => {
    if (hyTimer) return stop();
    if (cur >= S.length - 1) cur = -1;
    $("#hy-play").textContent = "❚❚ Durdur"; sel(cur + 1);
    hyTimer = setInterval(() => { if (!$("#hy-play")) return stop(); if (cur >= S.length - 1) return stop(); sel(cur + 1); }, 3800);
  };
  $("#hy-prev").onclick = () => { stop(); sel(cur - 1); }; $("#hy-next").onclick = () => { stop(); sel(cur + 1); };
  $("#hy-auto").onclick = () => { auto = !auto; store.set("nr-hy-auto", auto); const b = $("#hy-auto"); b.setAttribute("aria-pressed", auto); b.textContent = auto ? "🔍 Yakınlaş: açık" : "🔍 Yakınlaş: kapalı"; zoomTo(auto ? H.reg[P[S[cur].pt].r] : tr); };
  const want = Math.max(0, Math.min(S.length - 1, (parseInt(arg, 10) || 1) - 1));
  applyVb(); sel(want, false);
  if (want > 0) setTimeout(() => sel(want), 50); else window.scrollTo(0, 0);
}
