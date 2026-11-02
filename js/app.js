/* NurRisale — Application startup; loaded last.
   Classic script; deliberately shares the app's global lexical scope. */

/* =========================================================
   BAŞLAT
   ========================================================= */
applySettings();
loadRank();
// Lugat ve ayetler hemen arka planda inmeye başlasın; kitap açıldığında hazır olsunlar
loadBig(); loadAyet(); loadArm();
Promise.all([loadLibrary(), loadLugat(), loadHy()]).then(async () => {
  // Açık kalan kitapların bölümlerini yükle
  await Promise.all([...openNodes].filter((k) => k.startsWith("book:")).map((k) => loadBook(k.slice(5)).catch(() => {})));
  route();
}).catch(() => { app.innerHTML = `<div class="loading">Kitap listesi yüklenemedi. Sayfayı yenile.</div>`; });
