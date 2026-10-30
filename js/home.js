/* NurRisale — Library home page and daily content.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   4) GÖRÜNÜMLER
   ========================================================= */
const app = $("#app");
const EXAMPLES = ["haşir", "tevekkül", "şükür", "ihlas", "gençlik", "hastalık", "kâinat", "namaz"];

function showLibrary() {
  current = { id: null, page: 0, chapter: null }; rendered = null;
  stopSpeaking();
  $("#fab").hidden = true;
  $("#progress").style.width = "0";
  renderCrumbs(); renderSide();
  const last = store.get("nr-last", null);
  const lastMeta = last && metaOf(last.book);
  const groupCard = (sh, desc) => {
    const list = LIBRARY.filter((b) => (b.shelf || "kulliyat") === sh.id);
    const picks = list.slice(0, 5), mid = (picks.length - 1) / 2;
    return `<button class="group" data-jump="shelf-${sh.id}">
      <div class="fan">${picks.map((b, i) => coverHtml(b, `--r:${(i - mid) * 9}deg; margin-left:${-48 + (i - mid) * 34}px; z-index:${10 - Math.abs(i - mid)}`)).join("")}</div>
      <div class="gt"><strong>${sh.title} →</strong><span>${desc(list)}</span></div></button>`;
  };
  app.innerHTML = `
    <div class="home-wrap">
    <div class="hero-band"><section class="home" style="padding-bottom:10px">
      <div class="emblem" lang="ar">بِسْمِ اللّٰهِ الرَّحْمٰنِ الرَّحِيمِ</div>
      <h1>Risale-i Nur</h1>
      <form class="home-search" id="home-form">
        <input id="home-q" type="search" placeholder="Aramak istediğin kelimeyi ya da ifadeyi yaz" autocomplete="off" aria-label="Ara">
        <button aria-label="Ara"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg></button>
      </form>
      <div class="chips-h">Örnek aramalar</div>
      <div class="chips">${EXAMPLES.map((x) => `<button class="chip" data-q="${x}">${x}</button>`).join("")}</div>
      <div class="home-results" id="home-results"></div>
    </section></div>
    <svg class="wave" viewBox="0 0 1440 46" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0h1440v18c-160 22-320 30-520 14S520 4 360 12 120 40 0 30z" fill="color-mix(in srgb, var(--red) 5%, var(--paper))" style="fill: color-mix(in srgb, var(--red) 5%, var(--paper))"/></svg>
    ${(() => { const r = readingStats(); if (!r.total) return ""; const pi = planInfo(), goal = pi && !pi.done ? pi.target : 10, max = Math.max(goal, ...r.last7.map((x) => x.n));
      const DAYS = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
      return `<div class="sec"><div class="card stats"><div class="h">Okuma takibi</div>
        <div class="st-row"><div><b>${r.today}</b><span>bugün okunan sayfa</span></div><div><b>${r.streak}</b><span>gün üst üste</span></div><div><b>${r.total.toLocaleString("tr")}</b><span>son 90 günde sayfa</span></div></div>
        <div class="goal"><div style="width:${Math.min(100, r.today / goal * 100)}%"></div></div><small>Günlük hedef: ${goal} sayfa${pi && !pi.done ? " (okuma planından)" : ""}${r.today >= goal ? " · tamamlandı ✓" : ""}</small>
        <div class="week">${r.last7.map((x) => `<div><i style="height:${Math.round(x.n / max * 100)}%" title="${x.n} sayfa"></i><span>${DAYS[x.d.getDay()]}</span></div>`).join("")}</div></div></div>`; })()}
    ${planCardHtml()}
    <div class="sec"><div class="card"><div class="row2"><div><div class="h">Kelime Öğren</div><strong>${srsDue().length ? `${srsDue().length} kelime tekrar bekliyor` : "En sık geçen kelimelerle başla"}</strong><div style="color:var(--muted);font-size:13.5px;margin-top:2px">${KNOWN.size ? `${KNOWN.size} kelime biliyorsun · öğrendiklerin aralıklarla (1, 3, 7, 16… gün) tekrar sorulur` : "İlk 100 kelime, lugata bakma ihtiyacının beşte birini karşılar"}</div></div><button class="btn" id="home-learn">${srsDue().length ? "Tekrar et" : "Başla"}</button></div></div></div>
    <div class="sec"><h2 class="sec-h">Keşfet</h2><div class="ex-grid">
      <a href="#hayat">${MI('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>')}<b>Bediüzzaman'ın hayatı</b><small>57 durak, üç dönem; Tarihçe ve Lâhikalardan alıntılarla</small></a>
      <a href="#konular">${MI('<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/>')}<b>Konu dizini</b><small>Haşir, kader, namaz… nerede anlatılıyor</small></a>
      <a href="#dizin">${MI('<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h5"/>')}<b>Hadis, kişi ve yer dizini</b><small>72 hadis, 38 kişi, 29 yer</small></a>
      <a href="#ayetler">${MI('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M12 7v6M9 10h6"/>')}<b>Ayet dizini</b><small>Geçen ayetler, mealleri ve yerleri</small></a>
      <a href="#istatistik">${MI('<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>')}<b>Kelime istatistikleri</b><small>Hangi kelime kaç kez, nerede yoğun</small></a>
      <button data-ex="vecize">${MI('<path d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6"/>')}<b>Vecize ezberi</b><small>Her gün üç vecize, aralıklı tekrar</small></button>
    </div></div>
    ${store.get("nr-recent", []).length > 1 ? `<div class="sec"><div class="card"><div class="h">Son okuduklarım</div><div class="recent">${store.get("nr-recent", []).slice(0, 5).map((r) => `<a href="#${r.book}-${r.page}"><span>${escapeHtml(r.chap)} <span style="color:var(--muted)">· ${escapeHtml(r.title)}</span></span><span>Sayfa ${r.page}</span></a>`).join("")}</div></div></div>` : ""}
    ${lastMeta ? `<div class="sec"><div class="card"><div class="h">Kaldığın yer</div><div class="row2"><div><strong>${escapeHtml(lastMeta.title)}</strong> <span style="color:var(--muted)">· Sayfa ${last.page}</span></div><button class="btn" id="resume">Devam et</button></div></div></div>` : ""}
    <div class="sec">
      <h2 class="sec-h">Eser Grupları</h2>
      <div class="groups">
        ${groupCard(SHELVES[0], (l) => `Sözler, Mektubat, Lem'alar, Şualar, Lâhikalar ve diğerleri. ${l.length} kitap.`)}
        ${groupCard(SHELVES[1], (l) => `Farklı konularda müstakil risaleler; küçük kitaplarda büyük hakikatler. ${l.length} kitap.`)}
      </div>
    </div>
    <div class="sec" id="daily"></div>
    ${SHELVES.map((sh) => {
      const list = LIBRARY.filter((b) => (b.shelf || "kulliyat") === sh.id);
      return list.length ? `<div class="sec" id="shelf-${sh.id}"><h2 class="sec-h">${sh.title}</h2>
        <div class="covers">${list.map((b) => `<button class="cv" data-open="${b.id}"><span class="img">${coverHtml(b)}</span><span>${escapeHtml(b.title)}</span></button>`).join("")}</div></div>` : "";
    }).join("")}
    <footer class="foot">
      <div class="logo-s">Nur<b>Risale</b></div>
      <div>${LIBRARY.length} kitap · ${LIBRARY.reduce((n, b) => n + b.pages, 0).toLocaleString("tr")} sayfa · 40.000+ kelime ve tamlamalık lugat</div>
      <div>Bir öğrenme projesi · <a href="https://github.com/karslio/nurrisale" target="_blank" rel="noopener">Kaynak kodu</a></div>
      <div>Ayet mealleri: Rowwad Tercüme Merkezi (<a href="https://quranenc.com/tr/browse/turkish_rwwad" target="_blank" rel="noopener">QuranEnc.com</a>, 1.0.4) · Kur'an metni: <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil</a> (CC BY 3.0)</div>
      <div>Ayet olmayan Arapça ve Farsça satırların Türkçesi: NurRisale çalışma tercümesi (yaklaşık meal)</div>
      <div>Lugat ve kelime sıklıkları: <a href="https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans" target="_blank" rel="noopener">Risale-i Nur Kelime Frekansı</a> (Ali Tekdemir, CC0)</div>
    </footer>
    </div>`;
  $("#home-learn").onclick = () => openLearn(srsDue().length ? "review" : "learn");
  bindPlanCard(app);
  app.querySelectorAll("[data-ex=vecize]").forEach((b) => b.onclick = () => openVecize());
  app.querySelectorAll("[data-jump]").forEach((el) => el.onclick = () => document.getElementById(el.dataset.jump)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  renderDaily();
  app.querySelectorAll("[data-open]").forEach((el) => el.onclick = () => go(el.dataset.open, 1));
  if (lastMeta) $("#resume").onclick = () => go(last.book, last.page);
  const hq = $("#home-q");
  $("#home-form").onsubmit = (e) => { e.preventDefault(); homeSearch(hq.value); };
  app.querySelectorAll(".chip").forEach((c) => c.onclick = () => { hq.value = c.dataset.q; homeSearch(c.dataset.q); });
  document.title = "NurRisale";
  window.scrollTo(0, 0);
}

/* Günün vecizesi: her gün Küçük Sözler'den kısa bir paragraf */
async function renderDaily() {
  const box = $("#daily"); if (!box) return;
  const id = metaOf("kucuksozler") ? "kucuksozler" : LIBRARY[0]?.id; if (!id) return;
  try { await loadBook(id); } catch { return; }
  const book = BOOKS.get(id), pool = [];
  book.pages.forEach((p, i) => p.b.forEach(([k, t], bi) => { const x = stripFn(t); if (k === "p" && x.length > 160 && x.length < 420) pool.push({ t, page: i + 1, key: `${i + 1}:${bi}` }); }));
  if (!pool.length || !$("#daily")) return;
  const day = Math.floor(Date.now() / 86400000), pick = pool[day % pool.length], chap = chapterOf(book, pick.page);
  box.innerHTML = `<h2 class="sec-h">Günün Vecizesi</h2><div class="quote">
    <div class="qimg"><img src="${metaOf(id).cover}" alt="${escapeHtml(book.title)} kapağı"></div>
    <div><h3>${escapeHtml(chap.title)}</h3><blockquote class="text" style="text-align:left">${renderText(pick.t)}</blockquote>
    <div class="src"><span>${escapeHtml(book.title)} · Sayfa ${pick.page}</span><span><button class="link-btn" id="daily-vz">Ezberle</button> · <a href="#${id}-${pick.page}">Devamını oku →</a></span></div></div></div>`;
  $("#daily-vz").onclick = () => openVecize(pick.key);
}

let pageObserver = null;
