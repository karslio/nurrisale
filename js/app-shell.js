/* NurRisale — Focus mode, install prompt, service worker registration and app menu.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Odak modu ---------- */
function toggleFocus(on = !document.body.classList.contains("focus")) {
  document.body.classList.toggle("focus", on);
  if (on) toast("Odak modu: çıkmak için Esc ya da sağ alttaki düğme");
}
$("#fab-focus").onclick = () => toggleFocus();
$("#btn-full").onclick = async () => {
  if (!current.id) { const t = tabs.find((x) => x.h) ; if (t) { activeTab = t.k; saveTabs(); location.hash = t.h; } else return toast("Önce bir eser aç"); }
  toggleFocus(true);
  try { await document.documentElement.requestFullscreen(); } catch {}
};
document.addEventListener("fullscreenchange", () => { if (!document.fullscreenElement && document.body.classList.contains("focus")) toggleFocus(false); });
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && document.body.classList.contains("focus")) toggleFocus(false);
  if ((e.key === "f" || e.key === "F") && current.id && !e.target.closest("input, textarea") && $("#search").hidden) toggleFocus();
});

/* ---------- Uygulama ve çevrimdışı (yalnız GitHub Pages'te) ---------- */
if ("serviceWorker" in navigator && /github\.io$/.test(location.hostname)) {
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then((reg) => { $("#offline-row").hidden = false; reg.update().catch(() => {}); }).catch(() => {});
  // Yeni sürüm devreye girince sayfayı bir kez yenile, eski kopya kalmasın
  let reloaded = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (hadController && !reloaded) { reloaded = true; location.reload(); } });
}
$("#btn-offline").onclick = async () => {
  const btn = $("#btn-offline"), msg = $("#offline-msg");
  btn.disabled = true;
  let done = 0;
  const urls = [...LIBRARY.map((b) => `books/${b.id}.json`), ...LIBRARY.map((b) => b.cover)];
  for (let i = 0; i < urls.length; i += 6) {
    await Promise.all(urls.slice(i, i + 6).map((u) => fetch(u).catch(() => {})));
    done = Math.min(urls.length, i + 6);
    msg.textContent = `Kaydediliyor: ${done} / ${urls.length}`;
  }
  msg.textContent = "Bütün kitaplar bu cihaza kaydedildi. Artık internetsiz de okuyabilirsin.";
  btn.disabled = false;
};

/* ---------- Uygulama menüsü, açık sekmeler, pencereler ---------- */
const menu = $("#menu");
const MI = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
let installEvt = null;
window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); installEvt = e; });
function openMenu(kind) {
  toggleSettings(false);
  if (!menu.hidden && menu.dataset.kind === kind) return closeMenu();
  menu.dataset.kind = kind;
  if (kind === "apps") {
    const items = [
      ["home", MI('<path d="M3 11l9-8 9 8M5 10v10h14V10"/>'), "Ana sayfa", "Arama, eser grupları ve günün vecizesi"],
      ["notes", MI('<path d="M6 4h12v16l-6-4-6 4z"/>'), "Yer imleri ve notlarım", "İşaretlediğin sayfalar ve vurgular"],
      ["stats", MI('<path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/>'), "Kelime istatistikleri", "Kitaplara göre kelime sayıları ve sıklıklar"],
      ["ayet", MI('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M12 7v6M9 10h6"/>'), "Ayet dizini", "Risale'de geçen ayetler, mealleri ve geçtiği yerler"],
      ["konu", MI('<path d="M4 6h16M4 12h10M4 18h7"/><circle cx="18" cy="16" r="3"/><path d="m20.2 18.2 1.8 1.8"/>'), "Konu dizini", "Haşir, kader, namaz… Risale'de nerelerde işleniyor"],
      ["ders", MI('<rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>'), "Ders modu", "Perdeye yansıtmak için büyük yazı, tam ekran (D)"],
      ["hayat", MI('<path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2z"/><path d="M9 4v14M15 6v14"/>'), "Bediüzzaman'ın hayatı", "57 duraklı harita ve zaman çizgisi, 1877–1960"],
      ["dizin", MI('<path d="M4 4h12a4 4 0 0 1 4 4v12H8a4 4 0 0 1-4-4z"/><path d="M8 9h8M8 13h5"/>'), "Hadis, kişi ve yer dizini", "Hadisler, peygamberler, âlimler, şehirler"],
      ["vecize", MI('<path d="M7 7h4v4c0 3-2 5-4 6M15 7h4v4c0 3-2 5-4 6"/>'), "Vecize ezberi", "Küçük Sözler'den her gün yeni vecize"],
      ["offline", MI('<path d="M12 4v11M7 10l5 5 5-5M4 20h16"/>'), "Çevrimdışı kütüphane", "Bütün kitapları cihaza indir"],
      ["plan", MI('<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 15l2.5 2.5L16 13"/>'), "Okuma planı", "Bir kitabı belirlediğin günde bitir"],
      ["learn", MI('<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 2 9 2 12 0v-5"/>'), "Kelime Öğren", "En sık geçen kelimelerden başlayarak öğren"],
      ["lugat", MI('<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5z"/><path d="M8 7h8M8 11h6"/>'), "Lugat", "Bütün kelimeler ve anlamları, aranabilir"],
      ["backup", MI('<path d="M12 3v12M7 8l5-5 5 5M5 14v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/>'), "Yedekle ve aktar", "Notlar, vurgular, plan ve kelimeleri başka cihaza taşı"],
      ["keys", MI('<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8"/>'), "Kısayollar ve yardım", "Klavye kısayolları, nasıl kullanılır"],
      ["about", MI('<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v4h1"/>'), "NurRisale hakkında", "Proje, kaynaklar ve özellikler"],
    ];
    if (installEvt) items.push(["install", MI('<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>'), "Uygulama olarak yükle", "Telefona ya da bilgisayara ekle"]);
    menu.innerHTML = items.map(([k, ic, t, d]) => `<button class="it" data-m="${k}">${ic}<span><b>${t}</b><small>${d}</small></span></button>`).join("") +
      `<a class="it" href="https://github.com/karslio/nurrisale" target="_blank" rel="noopener">${MI('<path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 0 0-.8-2.3c2.8-.3 5.8-1.4 5.8-6.3a5 5 0 0 0-1.3-3.4 4.6 4.6 0 0 0-.1-3.4s-1.1-.3-3.5 1.3a12 12 0 0 0-6.2 0C6.4 1.8 5.3 2.1 5.3 2.1a4.6 4.6 0 0 0-.1 3.4A5 5 0 0 0 3.9 9c0 4.9 3 6 5.8 6.3a3 3 0 0 0-.8 2.3V21"/>')}<span><b>Kaynak kodu</b><small>GitHub'da NurRisale</small></span></a>`;
  } else {
    menu.innerHTML = `<div class="it" style="cursor:default"><span><b>Açık sekmeler</b><small>${tabs.length} okuma sekmesi</small></span></div>` +
      `<div class="tab-it ${activeTab === "search" ? "on" : ""}" data-go="search"><span>Arama</span></div>` +
      tabs.map((t) => `<div class="tab-it ${activeTab === t.k ? "on" : ""}" data-go="${t.k}"><span>${escapeHtml(tabLabel(t.h))}</span><small>${t.h ? escapeHtml(metaOf(t.h.slice(1).split("-")[0])?.title || "") : ""}</small><button data-x="${t.k}" aria-label="Kapat">✕</button></div>`).join("") +
      `<button class="it" data-m="newtab">${MI('<path d="M12 5v14M5 12h14"/>')}<span><b>Yeni sekme</b></span></button>`;
  }
  menu.hidden = false; $("#menu-scrim").hidden = false;
}
function closeMenu() { menu.hidden = true; $("#menu-scrim").hidden = true; }
/* Menü açıkken arkadaki sayfa kilitli: tıklama menüyü kapatır, kaydırma ve ok/boşluk tuşları arkaya geçmez */
{
  const sc = $("#menu-scrim");
  sc.addEventListener("click", (e) => { e.preventDefault(); e.stopPropagation(); closeMenu(); });
  ["wheel", "touchmove"].forEach((ev) => sc.addEventListener(ev, (e) => e.preventDefault(), { passive: false }));
  menu.addEventListener("wheel", (e) => { if (menu.scrollHeight <= menu.clientHeight) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if (!menu.hidden && [" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"].includes(e.key) && !e.target.closest("#menu")) e.preventDefault(); }, true);
}
$("#btn-apps").onclick = (e) => { e.stopPropagation(); openMenu("apps"); };
$("#btn-tabs").onclick = (e) => { e.stopPropagation(); openMenu("tabs"); };
document.addEventListener("click", (e) => { if (!menu.hidden && !e.target.closest("#menu, #btn-apps, #btn-tabs")) closeMenu(); });
menu.addEventListener("click", async (e) => {
  const x = e.target.closest("[data-x]");
  if (x) { e.stopPropagation(); $(`#tabs [data-close="${x.dataset.x}"]`)?.click(); menu.dataset.kind = ""; openMenu("tabs"); return; }
  const g = e.target.closest("[data-go]");
  if (g) { closeMenu(); $(`#tabs [data-tab="${g.dataset.go}"]`)?.click(); return; }
  const m = e.target.closest("[data-m]")?.dataset.m; if (!m) return;
  closeMenu();
  if (m === "home") { activeTab = "search"; saveTabs(); location.hash = ""; route(); }
  if (m === "newtab") newTab();
  if (m === "notes") { if (narrow()) openSide(); else { renderSide(); side.scrollTo({ top: 0, behavior: "smooth" }); } if (!getMarks().length && !getHls().length) toast("Henüz yer imi ya da vurgu yok"); }
  if (m === "learn") openLearn();
  if (m === "plan") openPlan();
  if (m === "ders") toggleLesson(true);
  if (m === "hayat") location.hash = "#hayat";
  if (m === "dizin") location.hash = "#dizin";
  if (m === "vecize") openVecize();
  if (m === "offline") openOffline();
  if (m === "stats") location.hash = "#istatistik";
  if (m === "ayet") location.hash = "#ayetler";
  if (m === "konu") location.hash = "#konular";
  if (m === "lugat") {
    showModal(`<h2>Lugat</h2><input id="lug-q" class="lug-q" type="search" placeholder="Kelime, tamlama ya da anlam ara" autocomplete="off"><div id="lug-list" class="lug-list"><div class="lug-n">Lugat yükleniyor…</div></div>`);
    loadBig().then(() => {
      const keys = Object.keys(BIG).sort((a, b) => a.localeCompare(b, "tr"));
      const draw = () => {
        const t = bk($("#lug-q").value.trim());
        const list = t ? keys.filter((k) => k.includes(t) || plain(BIG[k]).includes(t)).sort((a, b) => (b.startsWith(t) - a.startsWith(t)) || a.length - b.length) : keys;
        $("#lug-list").innerHTML = `<div class="lug-n">${list.length.toLocaleString("tr")} kayıt${list.length > 300 ? ", ilk 300 gösteriliyor" : ""}</div>` +
          list.slice(0, 300).map((k) => { const [d, mm] = BIG[k].split("|"); return `<div><b>${escapeHtml(d)}</b> ${escapeHtml(mm)}</div>`; }).join("");
      };
      $("#lug-q").oninput = draw; draw(); $("#lug-q").focus();
    });
  }
  if (m === "backup") openBackup();
  if (m === "keys") showModal(`<h2>Kısayollar ve yardım</h2><table>
      <tr><td><kbd>←</kbd> <kbd>→</kbd></td><td>Önceki / sonraki bölüm (sayfa modunda sayfa)</td></tr>
      <tr><td><kbd>F</kbd></td><td>Odak modu</td></tr><tr><td><kbd>Esc</kbd></td><td>Açık pencereleri kapat</td></tr></table>
      <ul><li>Renkli kelimelerin ve Arapça ifadelerin <b>üstüne gel</b> ya da dokun: anlamı açılır.</li>
      <li>Küçük kırmızı numaralar <b>haşiyedir</b>.</li><li>Metni seçince <b>vurgula, not ekle, kopyala, bağlantı al</b>.</li>
      <li>Üstteki yolda kitap ya da bölüm adına tıklayınca <b>listede o yere</b> gidersin.</li>
      <li>Ayarlardan <b>sayfa sayfa okuma</b>, tema, yazı tipi ve boyutu değişir.</li></ul>`);
  if (m === "about") showModal(`<h2>NurRisale hakkında</h2>
      <p>NurRisale, Risale-i Nur Külliyatı'nı rahatça okumak için yapılmış bir öğrenme projesidir.</p>
      <ul><li>${LIBRARY.length} kitap, ${LIBRARY.reduce((n, b) => n + b.pages, 0).toLocaleString("tr")} sayfa</li>
      <li>${BIG ? Object.keys(BIG).length.toLocaleString("tr") : "40.000"}+ kelime ve tamlamalık lugat, sık geçen Arapça ifadelerin meâli</li>
      <li>Kelime Öğren: en sık geçen 1000 kelime, sıklık sırasıyla</li>
      <li>Haşiyeler, yer imleri, vurgular ve notlar, sesli okuma, çevrimdışı okuma</li></ul>
      <p style="color:var(--muted);font-size:14px">Lugat ve kelime sıklıkları <a href="https://github.com/alitekdemir/Risale-i-Nur-Kelime-Frekans" target="_blank" rel="noopener">Risale-i Nur Kelime Frekansı</a> çalışmasından alındı (Ali Tekdemir, CC0). Ayetler <a href="https://tanzil.net" target="_blank" rel="noopener">Tanzil</a> Kur'an metniyle (CC BY 3.0) eşleştirildi; meal: Türkçe Tercüme, Rowwad Tercüme Merkezi, <a href="https://quranenc.com/tr/browse/turkish_rwwad" target="_blank" rel="noopener">QuranEnc.com</a>, sürüm 1.0.4. Sayfa numaraları sitenin kendi sayfalamasıdır, basılı kitapla aynı değildir.</p>`);
  if (m === "install" && installEvt) { installEvt.prompt(); installEvt = null; }
});
