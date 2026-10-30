/* NurRisale — User-data backup and restore.
   Classic script; deliberately shares the app's global lexical scope. */

/* ---------- Yedekleme: kişisel veriler JSON dosyasına ---------- */
const BACKUP_KEYS = ["nr-marks", "nr-hl", "nr-known", "nr-srs", "nr-plan", "nr-stats", "nr-read", "nr-recent", "nr-last", "nr-settings3", "nr-learn-level"];
function backupData() { const d = {}; BACKUP_KEYS.forEach((k) => { const v = store.get(k, undefined); if (v !== undefined) d[k] = v; }); return d; }
function openBackup() {
  const d = backupData();
  const cnt = [[(d["nr-marks"] || []).length, "yer imi"], [(d["nr-hl"] || []).length, "vurgu ve not"], [(d["nr-known"] || []).length, "bilinen kelime"], [Object.values(d["nr-stats"] || {}).reduce((n, a) => n + a.length, 0), "okunan sayfa kaydı"]];
  showModal(`<h2>Yedekle ve aktar</h2>
    <p style="margin:0 0 12px;color:var(--muted);font-size:14px">Verilerin yalnızca bu tarayıcıda saklanıyor. Yedek dosyasını indirip başka bir cihazda (telefon, bilgisayar) geri yükleyerek aynı yerden devam edebilirsin.</p>
    <div class="srs-boxes">${cnt.map(([n, t]) => `<div><b>${fmtN(n)}</b>${t}</div>`).join("")}</div>
    ${d["nr-plan"] ? `<p class="plan-note">Okuma planı da yedeğe dahil.</p>` : ""}
    <div class="plan-acts" style="margin-top:14px"><button class="pri" id="bk-save">Yedeği indir</button><button id="bk-load">Yedekten geri yükle</button><input type="file" id="bk-file" accept=".json,application/json" hidden></div>
    <p class="plan-note">Geri yükleme bu cihazdaki verilerle birleştirir: yer imleri ve vurgular eklenir, okuma kayıtları toplanır, plan ve ayarlar yedekteki hâliyle gelir.</p>`);
  $("#bk-save").onclick = () => {
    const blob = new Blob([JSON.stringify({ app: "NurRisale", v: 1, at: new Date().toISOString(), data: backupData() })], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `nurrisale-yedek-${dayKey()}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast("Yedek dosyası indirildi");
  };
  $("#bk-load").onclick = () => $("#bk-file").click();
  $("#bk-file").onchange = async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== "NurRisale" || !j.data) throw 0;
      mergeBackup(j.data); toast("Yedek geri yüklendi"); setTimeout(() => location.reload(), 700);
    } catch { toast("Bu dosya bir NurRisale yedeği değil"); }
  };
}
function mergeBackup(d) {
  const uniq = (a, key) => { const m = new Map(); a.forEach((x) => m.set(key(x), x)); return [...m.values()]; };
  if (d["nr-marks"]) store.set("nr-marks", uniq([...store.get("nr-marks", []), ...d["nr-marks"]], (x) => JSON.stringify([x.book, x.page])));
  if (d["nr-hl"]) store.set("nr-hl", uniq([...store.get("nr-hl", []), ...d["nr-hl"]], (x) => x.id || JSON.stringify(x)));
  if (d["nr-known"]) store.set("nr-known", [...new Set([...store.get("nr-known", []), ...d["nr-known"]])]);
  if (d["nr-srs"]) { const cur = store.get("nr-srs", {}) || {}; for (const [k, v] of Object.entries(d["nr-srs"])) if (!cur[k] || cur[k].b < v.b) cur[k] = v; store.set("nr-srs", cur); }
  if (d["nr-stats"]) { const cur = store.get("nr-stats", {}); for (const [k, a] of Object.entries(d["nr-stats"])) cur[k] = [...new Set([...(cur[k] || []), ...a])]; const days = Object.keys(cur).sort(); while (days.length > 90) delete cur[days.shift()]; store.set("nr-stats", cur); }
  if (d["nr-read"]) store.set("nr-read", { ...store.get("nr-read", {}), ...d["nr-read"] });
  if (d["nr-recent"]) store.set("nr-recent", uniq([...d["nr-recent"], ...store.get("nr-recent", [])].sort((a, b) => (b.at || 0) - (a.at || 0)), (x) => x.book + x.chap).slice(0, 8));
  ["nr-plan", "nr-last", "nr-settings3", "nr-learn-level"].forEach((k) => { if (d[k] !== undefined) store.set(k, d[k]); });
}
