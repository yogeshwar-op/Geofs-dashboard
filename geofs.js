/* GeoFS Companion v2
 * Opens as a real popup window you can drag to another monitor.
 * Run it again to close it. Falls back to an in-page floating panel if popups are blocked.
 * Tabs: MAP · PFD · AP · SYS · CTRL · CHKL · VOICE · DATA
 */
(() => {
  "use strict";

  const KEY = "__gfcCompanion";
  const prev = window[KEY];
  if (prev) {
    const wasOpen = prev.isOpen();
    try { prev.close(); } catch (e) { /* ignore */ }
    if (wasOpen) return; // second run = toggle off
  }

  /* ================= storage / settings ================= */
  const store = {
    get(k, d) {
      try {
        const v = localStorage.getItem("gfc:" + k);
        return v === null ? d : JSON.parse(v);
      } catch (e) { return d; }
    },
    set(k, v) { try { localStorage.setItem("gfc:" + k, JSON.stringify(v)); } catch (e) { /* ignore */ } }
  };

  const settings = Object.assign(
    { scale: 1, invertPfd: true, pitchGain: 0.032, gearInvert: false },
    store.get("settings", {})
  );
  const saveSettings = () => store.set("settings", settings);

  /* ================= open the popup ================= */
  let win = null;
  let floating = false;
  try {
    win = window.open("", "gfc-companion", "popup=yes,width=920,height=800,left=80,top=40");
  } catch (e) { win = null; }
  if (!win || win.closed) { win = window; floating = true; }

  const doc = win.document;

  if (!floating) {
    doc.open();
    doc.write('<!doctype html><html><head><meta charset="utf-8"><title>GeoFS Companion</title></head><body style="margin:0;background:#0b0f14"></body></html>');
    doc.close();
  }

  /* ================= styles + shell ================= */
  const CSS = `
#gfc-root{position:absolute;inset:0;background:#0b0f14;color:#e8eef5;font:13px Arial,sans-serif;overflow:hidden}
#gfc-root.float{position:fixed;inset:auto;left:28px;top:35px;width:820px;height:680px;max-width:96vw;max-height:92vh;min-width:360px;min-height:420px;resize:both;z-index:999999;border:1px solid #3b4857;border-radius:10px;box-shadow:0 12px 38px #000b}
#gfc-root *{box-sizing:border-box}
#gfc-zoom{display:flex;flex-direction:column}
#gfc-root .hdr{display:flex;align-items:center;gap:10px;padding:8px 12px;background:#171f29;border-bottom:1px solid #34404d;user-select:none;font-weight:bold;letter-spacing:.6px;flex:0 0 auto}
#gfc-root .hdr .st{font:11px monospace;font-weight:normal;color:#a3b2c2;margin-left:auto}
#gfc-root .tabs{display:flex;gap:4px;padding:6px 8px;background:#111821;border-bottom:1px solid #303b48;overflow-x:auto;flex:0 0 auto}
#gfc-root .tab{padding:9px 14px;background:#1b242e;color:#d8e2ed;border:1px solid #394654;border-radius:6px;cursor:pointer;font-weight:bold;font-size:12px;white-space:nowrap}
#gfc-root .tab.on{background:#26394a;border-color:#6c8ba6;color:#fff}
#gfc-root .panes{flex:1;min-height:0;position:relative}
#gfc-root .pane{position:absolute;inset:0;display:none;overflow:auto;padding:10px;background:#0d1218}
#gfc-root .pane.on{display:block}
#gfc-root .pane.flex.on{display:flex;flex-direction:column}
#gfc-root .btn{padding:9px 12px;background:#26394a;color:#fff;border:1px solid #50677d;border-radius:6px;cursor:pointer;font-size:12px;touch-action:manipulation;user-select:none}
#gfc-root .btn:active,#gfc-root .btn.flash{background:#3c5f7e}
#gfc-root .btn.sm{padding:6px 9px;min-width:44px;background:#1b242e;border-color:#435264;font:12px monospace;color:#e8eef5}
#gfc-root .btn.on{background:#1f6b46;border-color:#67d59b}
#gfc-root .card{background:#171f29;border:1px solid #303d4b;border-radius:8px;padding:10px;margin-bottom:10px}
#gfc-root input,#gfc-root select{padding:6px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px;font-size:12px}
#gfc-root input[type=checkbox]{accent-color:#67d59b}
#gfc-root .mono{font:12px monospace}
#gfc-root .dim{color:#8fa0b2}
#gfc-root .grn{color:#67d59b}
#gfc-root .amb{color:#ffb000}
#gfc-root .red{color:#ff5d5d}
#gfc-root .row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
#gfc-root .subtabs{display:flex;gap:6px;padding:6px 8px;background:#111821;flex:0 0 auto}
#gfc-root .subpane{display:none;flex:1;min-height:0;overflow:auto;padding:8px 10px}
#gfc-root .subpane.on{display:block}
#gfc-root .overlay{position:absolute;z-index:1100;left:10px;top:10px;background:#10151cdd;color:#dce7f2;padding:7px 10px;border:1px solid #394654;border-radius:5px;font:12px monospace}
#gfc-root table{border-collapse:collapse;width:100%;font:12px monospace}
#gfc-root td,#gfc-root th{padding:3px 6px;border-bottom:1px solid #243040;text-align:left}
#gfc-root .kv{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}
#gfc-root .kv div{background:#171f29;border:1px solid #303d4b;border-radius:6px;padding:6px 8px}
#gfc-root .kv small{display:block;color:#8fa0b2;font-size:10px;letter-spacing:.5px}
#gfc-root .kv b{font:15px monospace}
#gfc-root .knob{width:130px;height:130px;touch-action:none;cursor:grab;flex:0 0 auto}
#gfc-root .apcard{display:flex;gap:14px;align-items:center;flex-wrap:wrap}
#gfc-root .sel{font:bold 26px monospace;color:#67d59b}
#gfc-root .lever{width:120px;text-align:center}
#gfc-root .lever .lt{font-weight:bold;letter-spacing:.5px;margin-bottom:6px}
#gfc-root .track{position:relative;height:230px;width:46px;margin:0 auto;background:#0a0f15;border:2px solid #435264;border-radius:8px;touch-action:none;cursor:pointer}
#gfc-root .track .ticks div{position:absolute;left:-2px;right:-2px;border-top:1px solid #50677d}
#gfc-root .track .ticks span{position:absolute;left:56px;top:-7px;font:11px monospace;color:#a3b2c2}
#gfc-root .track .handle{position:absolute;left:-10px;right:-10px;height:22px;margin-top:-11px;background:#d8e2ed;border:2px solid #fff;border-radius:5px;pointer-events:none}
#gfc-root .track .act{position:absolute;left:3px;right:3px;height:6px;margin-top:-3px;background:#67d59b;border-radius:3px;pointer-events:none}
#gfc-root .lread{font:12px monospace;margin-top:8px;color:#8edbb0}
#gfc-root .vbtns{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:8px}
#gfc-root .vbtns .btn{padding:16px 6px;font-weight:bold;font-size:13px}
#gfc-root .ecam{background:#05070a;border:1px solid #2a3440;border-radius:8px;padding:10px}
#gfc-root .ecam h4{margin:0 0 6px;font:bold 12px monospace;color:#9bd1ff;letter-spacing:1px}
#gfc-root .warnline{font:bold 15px monospace;padding:2px 0}
`;

  const styleEl = doc.createElement("style");
  styleEl.textContent = CSS;
  doc.head.appendChild(styleEl);

  const root = doc.createElement("div");
  root.id = "gfc-root";
  if (floating) root.className = "float";
  doc.body.appendChild(root);

  const TABS = [
    ["map", "MAP / INFO"],
    ["pfd", "PFD"],
    ["ap", "AUTOPILOT"],
    ["sys", "SYSTEMS"],
    ["ctl", "LEVERS & BUTTONS"],
    ["chk", "CHECKLISTS"],
    ["voice", "VOICE"],
    ["data", "DATA & SETTINGS"]
  ];

  root.innerHTML = `
  <div id="gfc-zoom">
    <div class="hdr" id="gfc-drag">GEOFS COMPANION <span class="st" id="gfc-status">WAITING FOR GEOFS DATA</span>${floating ? '<button class="btn sm" id="gfc-close">✕</button>' : ""}</div>
    <nav class="tabs" id="gfc-tabs">${TABS.map(t => `<button class="tab" data-tab="${t[0]}">${t[1]}</button>`).join("")}</nav>
    <div class="panes">

      <section class="pane flex" data-pane="map" style="padding:0">
        <div style="flex:1;min-height:150px;position:relative">
          <div id="gfc-map" style="position:absolute;inset:0;background:#17212b"></div>
          <div id="gfc-map-msg" class="overlay">Waiting for aircraft position…</div>
          <button class="btn" id="gfc-recenter" style="position:absolute;right:10px;top:10px;z-index:1100">RECENTER</button>
        </div>
        <div style="flex:0 0 250px;display:flex;flex-direction:column;border-top:1px solid #34404d;background:#0d1218">
          <div class="subtabs">
            <button class="btn sm on" data-sub="stats">FLIGHT INFO</button>
            <button class="btn sm" data-sub="metar">METAR</button>
            <button class="btn sm" data-sub="flpn">FLPN</button>
          </div>
          <div class="subpane on" data-subpane="stats"><div class="kv" id="gfc-stats"></div><div style="margin-top:8px"><button class="btn sm" id="gfc-stats-reset">RESET STATS</button></div></div>
          <div class="subpane" data-subpane="metar">
            <div class="row"><input id="gfc-icao" placeholder="ICAO e.g. VAAU" maxlength="4" style="width:120px;text-transform:uppercase"><button class="btn sm" id="gfc-metar-go">FETCH METAR</button></div>
            <div id="gfc-metar-out" class="mono" style="margin-top:8px;white-space:pre-wrap"></div>
            <div id="gfc-wx-local" class="mono dim" style="margin-top:8px"></div>
          </div>
          <div class="subpane" data-subpane="flpn"><div id="gfc-flpn"></div></div>
        </div>
      </section>

      <section class="pane" data-pane="pfd" style="padding:0;background:#080c11">
        <canvas id="gfc-pfd" style="display:block;width:100%;height:100%"></canvas>
      </section>

      <section class="pane" data-pane="ap">
        <div class="row" style="margin-bottom:10px">
          <button class="btn" id="gfc-ap-toggle" style="min-width:100px;font-weight:bold">AP OFF</button>
          <label class="dim">MODE <select id="gfc-ap-mode"><option value="HDG">HDG</option><option value="NAV">NAV</option></select></label>
          <label class="dim">SPD <select id="gfc-ap-spdmode"><option value="knots">KNOTS</option><option value="mach">MACH</option></select></label>
          <button class="btn" id="gfc-ap-sync">SYNC TO CURRENT</button>
          <button class="btn" id="gfc-ap-vsclr">V/S AUTO</button>
        </div>
        <div id="gfc-ap-info" class="mono grn" style="margin-bottom:10px"></div>
        <div id="gfc-ap-cards"></div>
        <div id="gfc-ap-msg" class="mono amb"></div>
        <div class="dim" style="font-size:11px;margin-top:6px">Drag a knob in a circle, or use the mouse wheel (Shift = coarse). Touch works too.</div>
      </section>

      <section class="pane" data-pane="sys"><div id="gfc-sys"></div></section>

      <section class="pane" data-pane="ctl">
        <div class="card"><div class="row" style="align-items:flex-start;gap:40px;justify-content:center" id="gfc-levers"></div></div>
        <div class="card">
          <div class="row" style="margin-bottom:8px"><b>VIRTUAL BUTTONS</b><span style="flex:1"></span><button class="btn sm" id="gfc-btn-edit">EDIT</button></div>
          <div class="vbtns" id="gfc-vbtns"></div>
          <div id="gfc-btn-msg" class="mono amb" style="margin-top:6px"></div>
          <div id="gfc-btn-editor" style="display:none;margin-top:10px"></div>
        </div>
      </section>

      <section class="pane" data-pane="chk" style="padding:8px">
        <div id="gfc-checklist-slot" style="height:100%"></div>
      </section>

      <section class="pane" data-pane="voice"><div id="gfc-voice"></div></section>
      <section class="pane" data-pane="data"><div id="gfc-data"></div></section>
    </div>
  </div>`;

  const $ = s => root.querySelector(s);
  const $$ = s => Array.from(root.querySelectorAll(s));

  // Keep keystrokes in our inputs away from GeoFS hotkeys (matters in floating mode).
  root.addEventListener("keydown", e => e.stopPropagation());
  root.addEventListener("keyup", e => e.stopPropagation());

  function applyScale() {
    const z = $("#gfc-zoom");
    const s = settings.scale || 1;
    z.style.zoom = s;
    z.style.width = `calc(100% / ${s})`;
    z.style.height = `calc(100% / ${s})`;
  }
  applyScale();

  /* ================= helpers ================= */
  const num = v => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const pad3 = v => String(Math.round(((v % 360) + 360) % 360)).padStart(3, "0");
  const fmt = (v, d = 0, dash = "---") => (v === null || v === undefined ? dash : Number(v).toFixed(d));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const hms = s => {
    s = Math.max(0, Math.floor(s));
    return [Math.floor(s / 3600), Math.floor(s / 60) % 60, s % 60].map(n => String(n).padStart(2, "0")).join(":");
  };
  const nm = (lat1, lon1, lat2, lon2) => {
    const R = 3440.065, t = Math.PI / 180;
    const a = Math.sin((lat2 - lat1) * t / 2) ** 2 +
      Math.cos(lat1 * t) * Math.cos(lat2 * t) * Math.sin((lon2 - lon1) * t / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(a));
  };

  /* ================= data snapshot ================= */
  function getPosition(v, ac) {
    const loc = ac?.llaLocation ?? v?.llaLocation;
    const cands = [
      [v?.latitude, v?.longitude], [v?.lat, v?.lon],
      [loc?.[0], loc?.[1]], [loc?.lat, loc?.lon], [loc?.latitude, loc?.longitude]
    ];
    for (const [a, b] of cands) {
      const lat = num(a), lon = num(b);
      if (lat !== null && lon !== null && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) return { lat, lon };
    }
    return null;
  }

  function snapshot() {
    const gf = window.geofs;
    const v = gf?.animation?.values;
    if (!v) return null;

    const ac = gf.aircraft?.instance;
    const ap = gf.autopilot;
    const c = window.controls;
    const alt = num(v.altitude);

    let agl = num(v.haglFeet);
    if (agl === null && alt !== null) {
      const ge = num(v.groundElevationFeet);
      if (ge !== null) agl = alt - ge;
    }

    const gp = num(v.gearPosition), ig = num(v.invGearPosition);
    let gearDown = ig !== null ? ig : gp !== null ? 1 - gp : null;
    if (gearDown !== null && settings.gearInvert) gearDown = 1 - gearDown;

    const gc = num(v.groundContact);
    const onGround = gc !== null ? gc > 0 : agl !== null ? agl < 3 : false;

    return {
      v, ac, ap,
      alt, agl,
      ias: num(v.kias), tas: num(v.ktas), mach: num(v.mach),
      hdg: num(v.heading360),
      gs: num(v.groundSpeedKnt ?? v.groundSpeed),
      vs: num(v.verticalSpeed ?? v.climbrate),
      pitch: num(v.atilt ?? v.pitch), roll: num(v.aroll ?? v.roll),
      hasAtt: num(v.atilt) !== null,
      gearDown, onGround,
      flapsValue: num(v.flapsValue), flapsPos: num(v.flapsPosition), flapsTarget: num(v.flapsTarget),
      flapsMax: num(c?.flaps?.maxPosition) ?? 0,
      airbrakes: num(v.airbrakesPosition), airbrakesTarget: num(v.airbrakesTarget),
      brakes: num(v.brakes), throttle: num(v.throttle), rpm: num(v.rpm), thrust: num(v.thrust),
      enginesOn: v.enginesOn, aoa: num(v.aoa), trim: num(v.trim),
      windSpeed: num(v.windSpeed), windDir: num(v.windDirection ?? v.windDir),
      stalling: !!(ac?.stalling ?? v.stalling),
      pos: getPosition(v, ac)
    };
  }

  let S = null;

  /* ================= voice config + warnings (ECAM and voice share thresholds) ================= */
  const VOICE_DEFAULT = {
    enabled: true, rate: 1, volume: 1, voiceName: "",
    callouts: {
      spd100: { on: true, val: 100, label: "Speed call on takeoff roll", unit: "kt" },
      v1: { on: true, val: 120, label: "V1", unit: "kt" },
      rotate: { on: true, val: 125, label: "Rotate", unit: "kt" },
      v2: { on: false, val: 135, label: "V2", unit: "kt" },
      positive: { on: true, label: "Positive rate" },
      gear: { on: true, label: "Gear up / down" },
      flaps: { on: true, label: "Flaps setting" },
      ap: { on: true, label: "Autopilot engaged / disengaged" },
      agl: { on: true, val: "1000,500,100,50,40,30,20,10", label: "Radio altitude (approach)", unit: "ft list" },
      minimums: { on: true, val: 200, label: "Minimums", unit: "ft AGL" },
      bank: { on: true, val: 35, label: "Bank angle", unit: "°" },
      sink: { on: true, label: "Sink rate / Pull up" },
      tooLowGear: { on: true, label: "Too low, gear" },
      stall: { on: true, label: "Stall" },
      overspeed: { on: false, val: 250, label: "Overspeed", unit: "kt" }
    }
  };

  const savedVoice = store.get("voice", {});
  const voiceCfg = Object.assign({}, VOICE_DEFAULT, savedVoice, { callouts: {} });
  Object.keys(VOICE_DEFAULT.callouts).forEach(k => {
    voiceCfg.callouts[k] = Object.assign({}, VOICE_DEFAULT.callouts[k], savedVoice.callouts?.[k]);
  });
  const saveVoice = () => store.set("voice", voiceCfg);

  function warnings(s) {
    const w = [];
    if (!s) return w;
    const C = voiceCfg.callouts;

    if (s.stalling) w.push({ lvl: "R", text: "STALL" });
    if (s.roll !== null && Math.abs(s.roll) > C.bank.val) w.push({ lvl: "A", text: "BANK ANGLE " + Math.round(s.roll) + "°" });

    if (!s.onGround && s.agl !== null && s.vs !== null) {
      if (s.vs < -2500 && s.agl < 1000) w.push({ lvl: "R", text: "PULL UP" });
      else if (s.vs < -2000 && s.agl < 2500) w.push({ lvl: "A", text: "SINK RATE" });
      if (s.gearDown !== null && s.gearDown < 0.9 && s.agl < 500 && s.vs < -200 && (s.ias ?? 0) < 250) {
        w.push({ lvl: "R", text: "GEAR NOT DOWN" });
      }
    }

    if (s.ias !== null && s.ias > C.overspeed.val) w.push({ lvl: "A", text: "OVERSPEED " + Math.round(s.ias) + " KT" });
    return w;
  }

  /* ================= tabs ================= */
  let tab = "map";

  function showTab(name) {
    tab = name;
    $$(".tab").forEach(b => b.classList.toggle("on", b.dataset.tab === name));
    $$(".pane").forEach(p => p.classList.toggle("on", p.dataset.pane === name));
    if (name === "map") {
      loadLeaflet();
      setTimeout(() => map && map.invalidateSize(), 120);
    }
    if (name === "voice") fillVoices();
    renderActive();
  }

  $$(".tab").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));

  /* ================= MAP + INFO ================= */
  let map = null, marker = null, trail = null, fpLine = null;
  let leafletLoading = false, leafletFailed = false;
  let follow = true;
  const trailPts = [];
  let lastPt = null;
  let lastIconHdg = null;

  function loadLeaflet() {
    if (map || leafletLoading || leafletFailed) return;
    if (win.L) { createMap(); return; }
    leafletLoading = true;

    const css = doc.createElement("link");
    css.rel = "stylesheet";
    css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    doc.head.appendChild(css);

    const sc = doc.createElement("script");
    sc.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    sc.onload = createMap;
    sc.onerror = () => {
      leafletLoading = false;
      leafletFailed = true;
      $("#gfc-map-msg").textContent = "Map library could not load. Check your connection.";
    };
    doc.head.appendChild(sc);
  }

  function createMap() {
    leafletLoading = false;
    const L = win.L;
    if (!L || map) return;

    map = L.map($("#gfc-map"), { zoomControl: true }).setView([20, 78], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);

    trail = L.polyline([], { color: "#f5c842", weight: 3, opacity: 0.9 }).addTo(map);
    fpLine = L.polyline([], { color: "#ff4fd8", weight: 2, opacity: 0.9, dashArray: "6 6" }).addTo(map);

    map.on("dragstart zoomstart", () => { follow = false; });
    setTimeout(() => map && map.invalidateSize(), 150);
  }

  $("#gfc-recenter").onclick = () => {
    follow = true;
    if (map && lastPt) map.panTo(lastPt, { animate: false });
  };

  // Nose points UP (north at 0 degrees), so rotating by the heading is exact.
  const PLANE_SVG = '<svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg"><path d="M12 1.5 L13.6 8 L22.5 13 L22.5 15.2 L13.6 12.8 L13.2 19 L16 21 L16 22.5 L12 21.4 L8 22.5 L8 21 L10.8 19 L10.4 12.8 L1.5 15.2 L1.5 13 L10.4 8 Z" fill="#ffd43b" stroke="#000" stroke-width="1" stroke-linejoin="round"/></svg>';

  function updateMap(s) {
    const msg = $("#gfc-map-msg");
    if (!s || !s.pos) { if (!marker) msg.textContent = "Waiting for aircraft position…"; return; }
    if (!map || !win.L) return;

    const L = win.L;
    const hdg = s.hdg === null ? 0 : Math.round(s.hdg);
    msg.textContent = `LAT ${s.pos.lat.toFixed(4)}  LON ${s.pos.lon.toFixed(4)}`;

    const mkIcon = () => L.divIcon({
      className: "gfc-aircraft-icon",
      html: `<div style="width:32px;height:32px;transform:rotate(${hdg}deg);transform-origin:50% 50%;filter:drop-shadow(0 1px 2px #000)">${PLANE_SVG}</div>`,
      iconSize: [32, 32], iconAnchor: [16, 16]
    });

    const pt = [s.pos.lat, s.pos.lon];
    lastPt = pt;

    if (!marker) {
      marker = L.marker(pt, { icon: mkIcon(), title: "Aircraft" }).addTo(map);
      map.setView(pt, 7);
      lastIconHdg = hdg;
    } else {
      marker.setLatLng(pt);
      if (hdg !== lastIconHdg) { marker.setIcon(mkIcon()); lastIconHdg = hdg; }
    }

    const lp = trailPts[trailPts.length - 1];
    if (!lp || Math.abs(lp[0] - pt[0]) + Math.abs(lp[1] - pt[1]) > 0.00002) {
      trailPts.push(pt);
      if (trailPts.length > 400) trailPts.shift();
      trail.setLatLngs(trailPts);
    }

    if (tab === "map" && follow) map.panTo(pt, { animate: false });
  }

  /* ---- flight statistics ---- */
  const newStats = () => ({ t0: Date.now(), last: Date.now(), air: 0, dist: 0, maxAlt: 0, maxGs: 0, maxClimb: 0, maxSink: 0 });
  let stats = newStats();

  function tickStats(s) {
    const now = Date.now();
    const dt = (now - stats.last) / 1000;
    stats.last = now;
    if (!s || dt > 5) return;
    if (!s.onGround) stats.air += dt;
    if (s.gs !== null) stats.dist += s.gs * dt / 3600;
    if (s.alt !== null) stats.maxAlt = Math.max(stats.maxAlt, s.alt);
    if (s.gs !== null) stats.maxGs = Math.max(stats.maxGs, s.gs);
    if (s.vs !== null) {
      stats.maxClimb = Math.max(stats.maxClimb, s.vs);
      stats.maxSink = Math.min(stats.maxSink, s.vs);
    }
  }

  $("#gfc-stats-reset").onclick = () => { stats = newStats(); };

  function renderStats(s) {
    const cell = (k, v) => `<div><small>${k}</small><b>${v}</b></div>`;
    $("#gfc-stats").innerHTML = [
      cell("BLOCK TIME", hms((Date.now() - stats.t0) / 1000)),
      cell("AIR TIME", hms(stats.air)),
      cell("DISTANCE NM", stats.dist.toFixed(1)),
      cell("ALT FT", fmt(s?.alt)),
      cell("AGL FT", fmt(s?.agl)),
      cell("IAS KT", fmt(s?.ias)),
      cell("GS KT", fmt(s?.gs)),
      cell("TAS KT", fmt(s?.tas)),
      cell("MACH", fmt(s?.mach, 3)),
      cell("V/S FPM", fmt(s?.vs)),
      cell("MAX ALT", Math.round(stats.maxAlt)),
      cell("MAX GS", Math.round(stats.maxGs)),
      cell("MAX CLIMB", Math.round(stats.maxClimb)),
      cell("MAX SINK", Math.round(stats.maxSink)),
      cell("WIND", s && s.windSpeed !== null ? `${s.windDir !== null ? pad3(s.windDir) : "---"}/${Math.round(s.windSpeed)}` : "---")
    ].join("");
  }

  const subActive = () => (root.querySelector("[data-sub].on") || {}).dataset?.sub;

  $$("[data-sub]").forEach(b => b.addEventListener("click", () => {
    $$("[data-sub]").forEach(x => x.classList.toggle("on", x === b));
    $$("[data-subpane]").forEach(p => p.classList.toggle("on", p.dataset.subpane === b.dataset.sub));
    renderActive();
  }));

  /* ---- METAR ---- */
  $("#gfc-icao").value = store.get("icao", "");

  async function fetchMetar() {
    const icao = $("#gfc-icao").value.trim().toUpperCase();
    const out = $("#gfc-metar-out");
    if (icao.length < 3) { out.textContent = "Enter a 4-letter ICAO code."; return; }
    store.set("icao", icao);
    out.textContent = "Fetching…";

    try {
      const r = await fetch("https://aviationweather.gov/api/data/metar?ids=" + encodeURIComponent(icao) + "&format=raw");
      if (!r.ok) throw new Error("HTTP " + r.status);
      const t = (await r.text()).trim();
      out.textContent = t ? t + "\n\n" + decodeMetar(t) : "No METAR returned for " + icao + ".";
    } catch (err) {
      out.textContent = "Could not fetch METAR (" + err.message + ").\nThe browser or the GeoFS page policy may be blocking the request. Local GeoFS wind is shown below.";
    }
  }

  function decodeMetar(t) {
    const out = [];
    let m = t.match(/\b(VRB|\d{3})(\d{2,3})(?:G(\d{2,3}))?KT\b/);
    if (m) out.push(`Wind ${m[1]}° ${m[2]} kt${m[3] ? " gust " + m[3] : ""}`);
    m = t.match(/\s(\d{4}|\d+SM|CAVOK)\s/);
    if (m) out.push("Visibility " + m[1]);
    m = t.match(/\b(M?\d{2})\/(M?\d{2})\b/);
    if (m) out.push(`Temp/Dew ${m[1].replace("M", "-")}/${m[2].replace("M", "-")} °C`);
    m = t.match(/\bQ(\d{4})\b/);
    if (m) out.push("QNH " + m[1] + " hPa");
    m = t.match(/\bA(\d{4})\b/);
    if (m) out.push("Altimeter " + (m[1] / 100).toFixed(2) + " inHg");
    const clouds = t.match(/\b(FEW|SCT|BKN|OVC)\d{3}\b/g);
    if (clouds) out.push("Clouds " + clouds.join(" "));
    return out.join("  •  ");
  }

  $("#gfc-metar-go").onclick = fetchMetar;

  /* ---- flight plan ---- */
  function getFlightPlan() {
    const fp = window.geofs?.flightPlan;
    if (!fp) return [];
    let arr = fp.waypointArray || fp.route || fp.waypoints;
    if (!arr && typeof fp.getRoute === "function") { try { arr = fp.getRoute(); } catch (e) { arr = null; } }
    if (!Array.isArray(arr)) return [];
    return arr.map(w => ({
      ident: w.ident || w.name || "",
      type: w.type || "",
      lat: num(w.lat ?? w.lla?.[0] ?? w.latlon?.[0]),
      lon: num(w.lon ?? w.lng ?? w.lla?.[1] ?? w.latlon?.[1]),
      alt: w.alt ?? null,
      spd: w.spd ?? null
    }));
  }

  let fpSig = "";

  function renderFlpn(s, force) {
    const wps = getFlightPlan();
    const sig = JSON.stringify(wps.map(w => [w.lat, w.lon]));
    const changed = sig !== fpSig;
    fpSig = sig;

    if (fpLine && changed) {
      fpLine.setLatLngs(wps.filter(w => w.lat !== null && w.lon !== null).map(w => [w.lat, w.lon]));
    }

    if (!force || subActive() !== "flpn") return;

    const host = $("#gfc-flpn");
    if (!wps.length) {
      host.innerHTML = '<div class="dim">No flight plan found in <span class="mono">geofs.flightPlan</span>. Build one in the GeoFS NAV panel. If it is stored elsewhere, find it in the DATA tab.</div>';
      return;
    }

    let total = 0, prevW = null;
    const rows = wps.map((w, i) => {
      let leg = null;
      if (prevW && prevW.lat !== null && w.lat !== null) { leg = nm(prevW.lat, prevW.lon, w.lat, w.lon); total += leg; }
      prevW = w;
      return `<tr><td>${i + 1}</td><td>${esc(w.ident || w.type || "WPT")}</td><td>${w.lat !== null ? w.lat.toFixed(3) : "---"}, ${w.lon !== null ? w.lon.toFixed(3) : "---"}</td><td>${esc(w.alt ?? "---")}</td><td>${esc(w.spd ?? "---")}</td><td>${leg !== null ? leg.toFixed(1) : "---"}</td></tr>`;
    }).join("");

    const eta = s && s.gs !== null && s.gs > 40 ? hms(total / s.gs * 3600) : "---";
    host.innerHTML = `<div class="mono grn" style="margin-bottom:6px">${wps.length} WAYPOINTS • ROUTE ${total.toFixed(1)} NM • TIME AT CURRENT GS ${eta}</div>
      <table><tr><th>#</th><th>WPT</th><th>LAT, LON</th><th>ALT</th><th>SPD</th><th>LEG NM</th></tr>${rows}</table>`;
  }

  function renderWxLocal(s) {
    $("#gfc-wx-local").textContent = s && s.windSpeed !== null
      ? `GeoFS local wind: ${s.windDir !== null ? pad3(s.windDir) + "°" : "---"} / ${Math.round(s.windSpeed)} kt`
      : "GeoFS local wind: not available";
  }

  /* ================= PFD ================= */
  const pfdCv = $("#gfc-pfd");
  const pc = pfdCv.getContext("2d");

  function drawBird(cx, cy, w) {
    const half = w * 0.13, gap = w * 0.045, th = 7, drop = 16;
    const p = new Path2D();
    p.moveTo(cx - half, cy - th / 2); p.lineTo(cx - gap, cy - th / 2); p.lineTo(cx - gap, cy + drop);
    p.lineTo(cx - gap - th, cy + drop); p.lineTo(cx - gap - th, cy + th / 2); p.lineTo(cx - half, cy + th / 2); p.closePath();
    p.moveTo(cx + half, cy - th / 2); p.lineTo(cx + gap, cy - th / 2); p.lineTo(cx + gap, cy + drop);
    p.lineTo(cx + gap + th, cy + drop); p.lineTo(cx + gap + th, cy + th / 2); p.lineTo(cx + half, cy + th / 2); p.closePath();
    p.rect(cx - 3.5, cy - 3.5, 7, 7);
    pc.lineJoin = "miter"; pc.lineWidth = 3; pc.strokeStyle = "#000"; pc.stroke(p);
    pc.fillStyle = "#ffd52a"; pc.fill(p);
  }

  function vtape(x, y, tw, th, val, span, tick, labelEvery, side, bug, bugColor, boxText) {
    pc.save();
    pc.fillStyle = "#0a121cd0";
    pc.fillRect(x, y, tw, th);
    pc.beginPath(); pc.rect(x, y, tw, th); pc.clip();

    if (val !== null) {
      const ppu = th / span;
      pc.strokeStyle = "#fff"; pc.fillStyle = "#fff"; pc.lineWidth = 2;
      pc.font = "bold 13px monospace"; pc.textBaseline = "middle";
      const xe = side === "left" ? x + tw : x;
      const dir = side === "left" ? -1 : 1;

      for (let t = Math.floor((val - span / 2) / tick) * tick; t <= val + span / 2 + tick; t += tick) {
        if (t < 0) continue;
        const yy = y + th / 2 - (t - val) * ppu;
        const major = t % labelEvery === 0;
        pc.beginPath(); pc.moveTo(xe, yy); pc.lineTo(xe + dir * (major ? 12 : 7), yy); pc.stroke();
        if (major) {
          pc.textAlign = side === "left" ? "right" : "left";
          pc.fillText(String(t), side === "left" ? x + tw - 16 : x + 16, yy);
        }
      }

      if (bug !== null && bug !== undefined) {
        const by = clamp(y + th / 2 - (bug - val) * ppu, y + 6, y + th - 6);
        pc.fillStyle = bugColor;
        pc.beginPath();
        if (side === "left") { pc.moveTo(x + tw, by); pc.lineTo(x + tw - 12, by - 7); pc.lineTo(x + tw - 12, by + 7); }
        else { pc.moveTo(x, by); pc.lineTo(x + 12, by - 7); pc.lineTo(x + 12, by + 7); }
        pc.closePath(); pc.fill();
      }
    }
    pc.restore();

    pc.strokeStyle = "#f5f7fa"; pc.lineWidth = 2; pc.strokeRect(x, y, tw, th);
    pc.fillStyle = "#000"; pc.fillRect(x, y + th / 2 - 15, tw, 30);
    pc.strokeStyle = "#ffd52a"; pc.strokeRect(x, y + th / 2 - 15, tw, 30);
    pc.fillStyle = "#fff"; pc.font = "bold 17px monospace"; pc.textAlign = "center"; pc.textBaseline = "middle";
    pc.fillText(boxText, x + tw / 2, y + th / 2);
  }

  function htape(x, y, tw, th, val, span, bug) {
    pc.save();
    pc.fillStyle = "#0a121cd0"; pc.fillRect(x, y, tw, th);
    pc.beginPath(); pc.rect(x, y, tw, th); pc.clip();

    if (val !== null) {
      const ppu = tw / span;
      pc.strokeStyle = "#fff"; pc.fillStyle = "#fff"; pc.lineWidth = 2;
      pc.font = "bold 12px monospace"; pc.textAlign = "center"; pc.textBaseline = "top";

      for (let t = Math.floor((val - span / 2) / 5) * 5; t <= val + span / 2 + 5; t += 5) {
        const xx = x + tw / 2 + (t - val) * ppu;
        const hd = ((t % 360) + 360) % 360;
        const major = hd % 10 === 0;
        pc.beginPath(); pc.moveTo(xx, y); pc.lineTo(xx, y + (major ? 11 : 6)); pc.stroke();
        if (major) pc.fillText(String(Math.round(hd / 10) % 36).padStart(2, "0"), xx, y + 13);
      }

      if (bug !== null && bug !== undefined) {
        const dlt = ((bug - val + 540) % 360) - 180;
        const bx = clamp(x + tw / 2 + dlt * ppu, x + 8, x + tw - 8);
        pc.fillStyle = "#37e0ff";
        pc.beginPath(); pc.moveTo(bx, y); pc.lineTo(bx - 7, y + 11); pc.lineTo(bx + 7, y + 11); pc.closePath(); pc.fill();
      }
    }
    pc.restore();

    pc.strokeStyle = "#f5f7fa"; pc.lineWidth = 2; pc.strokeRect(x, y, tw, th);
    pc.strokeStyle = "#ffd52a"; pc.beginPath(); pc.moveTo(x + tw / 2, y); pc.lineTo(x + tw / 2, y + th); pc.stroke();
  }

  function drawPFD(s) {
    const w = pfdCv.clientWidth, h = pfdCv.clientHeight;
    if (!w || !h) return;

    const ratio = (win.devicePixelRatio || 1) * (settings.scale || 1);
    const pw = Math.round(w * ratio), ph = Math.round(h * ratio);
    if (pfdCv.width !== pw || pfdCv.height !== ph) { pfdCv.width = pw; pfdCv.height = ph; }
    pc.setTransform(ratio, 0, 0, ratio, 0, 0);

    const d = s || { pitch: null, roll: null, ias: null, alt: null, hdg: null, gs: null, tas: null, vs: null, mach: null, agl: null, ap: null, hasAtt: false, v: {} };
    const sgn = settings.invertPfd ? -1 : 1;
    const pitch = (d.pitch ?? 0) * sgn;
    const roll = (d.roll ?? 0) * sgn;
    const k = h * settings.pitchGain;
    const cx = w / 2, cy = h * 0.46;

    pc.fillStyle = "#080c11"; pc.fillRect(0, 0, w, h);

    // horizon + pitch ladder
    pc.save();
    pc.beginPath(); pc.rect(0, 0, w, h * 0.88); pc.clip();
    pc.translate(cx, cy); pc.rotate(-roll * Math.PI / 180); pc.translate(0, pitch * k);
    pc.fillStyle = "#079fd8"; pc.fillRect(-w * 3, -h * 8, w * 6, h * 8);
    pc.fillStyle = "#b47b59"; pc.fillRect(-w * 3, 0, w * 6, h * 8);
    pc.strokeStyle = "#f4f7fb"; pc.lineWidth = 2.5;
    pc.beginPath(); pc.moveTo(-w * 3, 0); pc.lineTo(w * 3, 0); pc.stroke();
    pc.fillStyle = "#fff"; pc.font = "bold 13px monospace"; pc.textAlign = "center"; pc.textBaseline = "middle";
    for (let deg = -40; deg <= 40; deg += 5) {
      if (!deg) continue;
      const y = -deg * k, major = deg % 10 === 0, len = Math.min(w, h) * (major ? 0.3 : 0.14);
      pc.beginPath(); pc.moveTo(-len / 2, y); pc.lineTo(len / 2, y); pc.stroke();
      if (major) { pc.fillText(String(Math.abs(deg)), -len / 2 - 16, y); pc.fillText(String(Math.abs(deg)), len / 2 + 16, y); }
    }
    pc.restore();

    // roll scale + bank pointer
    const R = Math.min(w, h) * 0.36;
    pc.save(); pc.translate(cx, cy); pc.strokeStyle = "#fff"; pc.lineWidth = 2;
    [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].forEach(a => {
      const rad = a * Math.PI / 180, len = (a === 0 || Math.abs(a) % 30 === 0) ? 14 : 8;
      pc.beginPath(); pc.moveTo(Math.sin(rad) * R, -Math.cos(rad) * R);
      pc.lineTo(Math.sin(rad) * (R - len), -Math.cos(rad) * (R - len)); pc.stroke();
    });
    pc.fillStyle = "#fff"; pc.beginPath(); pc.moveTo(0, -R - 1); pc.lineTo(-6, -R - 12); pc.lineTo(6, -R - 12); pc.closePath(); pc.fill();
    pc.rotate(-roll * Math.PI / 180);
    pc.fillStyle = "#ffd52a"; pc.strokeStyle = "#000"; pc.lineWidth = 1.5;
    pc.beginPath(); pc.moveTo(0, -R + 2); pc.lineTo(-7, -R + 16); pc.lineTo(7, -R + 16); pc.closePath(); pc.fill(); pc.stroke();
    pc.restore();

    // speed + altitude tapes
    const apv = d.ap && d.ap.on ? d.ap : null;
    const apRaw = d.ap || null;
    const bandTop = h * 0.13, bandH = h * 0.58, tw = clamp(w * 0.15, 68, 120);
    const spdBug = apv && num(apRaw.values?.speed) !== null && !isMach(apRaw) ? num(apRaw.values.speed) : null;
    const altBug = apv ? num(apRaw.values?.altitude) : null;
    const crsBug = apv ? num(apRaw.values?.course) : null;

    vtape(6, bandTop, tw, bandH, d.ias, 80, 10, 20, "left", spdBug, "#ff4fd8", d.ias === null ? "---" : String(Math.round(d.ias)));
    vtape(w - 6 - tw, bandTop, tw, bandH, d.alt, 500, 20, 100, "right", altBug, "#ff4fd8", d.alt === null ? "---" : String(Math.round(d.alt)));

    pc.fillStyle = "#c3d1de"; pc.font = "12px monospace"; pc.textAlign = "left"; pc.textBaseline = "alphabetic";
    const by0 = bandTop + bandH + 16;
    pc.fillText("GS  " + fmt(d.gs), 8, by0);
    pc.fillText("TAS " + fmt(d.tas), 8, by0 + 15);
    pc.fillText("M " + fmt(d.mach, 3), 8, by0 + 30);
    pc.textAlign = "right";
    pc.fillStyle = (d.vs ?? 0) < -1500 ? "#ffb000" : "#c3d1de";
    pc.fillText("V/S " + (d.vs === null ? "---" : (d.vs > 0 ? "+" : "") + Math.round(d.vs)), w - 8, by0);
    pc.fillStyle = "#c3d1de";
    pc.fillText("AGL " + fmt(d.agl), w - 8, by0 + 15);

    // heading tape
    const hx = w * 0.22, hw = w * 0.56, hy = h * 0.895, hh = h * 0.085;
    htape(hx, hy, hw, hh, d.hdg, 60, crsBug);
    pc.fillStyle = "#000"; pc.fillRect(w / 2 - 28, hy - 22, 56, 20);
    pc.strokeStyle = "#ffd52a"; pc.lineWidth = 2; pc.strokeRect(w / 2 - 28, hy - 22, 56, 20);
    pc.fillStyle = "#fff"; pc.font = "bold 14px monospace"; pc.textAlign = "center"; pc.textBaseline = "middle";
    pc.fillText(d.hdg === null ? "---" : pad3(d.hdg) + "°", w / 2, hy - 12);

    // yoke input indicator (when atilt exists, v.pitch / v.roll are the control inputs)
    if (d.hasAtt) {
      const ele = num(d.v.pitch), ail = num(d.v.roll);
      const sz = 44, bx = 8, byy = h * 0.88 - sz - 6;
      pc.strokeStyle = "#50677d"; pc.lineWidth = 1.5; pc.strokeRect(bx, byy, sz, sz);
      pc.beginPath(); pc.moveTo(bx + sz / 2, byy); pc.lineTo(bx + sz / 2, byy + sz); pc.moveTo(bx, byy + sz / 2); pc.lineTo(bx + sz, byy + sz / 2); pc.stroke();
      if (ele !== null && ail !== null) {
        pc.fillStyle = "#67d59b"; pc.beginPath();
        pc.arc(bx + sz / 2 + clamp(ail, -1, 1) * sz / 2 * 0.9, byy + sz / 2 + clamp(ele, -1, 1) * sz / 2 * 0.9, 4, 0, 7); pc.fill();
      }
    }

    drawBird(cx, cy, w);

    // AP annunciator line
    pc.textAlign = "center"; pc.textBaseline = "middle"; pc.font = "bold 13px monospace";
    if (apv) {
      const v = apRaw.values || {};
      pc.fillStyle = "#67d59b";
      pc.fillText(`AP ${apRaw.mode || ""}   HDG ${num(v.course) === null ? "---" : pad3(num(v.course))}   ALT ${num(v.altitude) === null ? "---" : Math.round(num(v.altitude))}   SPD ${num(v.speed) === null ? "---" : v.speed}`, w / 2, 16);
    } else {
      pc.fillStyle = "#8fa0b2"; pc.fillText("AP OFF", w / 2, 16);
    }

    if (!s || d.pitch === null || d.roll === null) {
      pc.fillStyle = "#ffcf70"; pc.font = "12px monospace";
      pc.fillText("ATTITUDE DATA UNAVAILABLE", w / 2, 36);
    }
  }

  /* ================= AUTOPILOT + KNOBS ================= */
  const apApi = () => window.geofs?.autopilot || null;
  const isMach = ap => !!ap && ap.speedMode === "mach";

  const apSpecs = [
    { key: "course", label: "HEADING", setter: "setCourse", fine: 1, dragStep: 2, coarse: 10, wrap: true },
    { key: "altitude", label: "ALTITUDE", setter: "setAltitude", fine: 100, dragStep: 100, coarse: 1000, min: 0, max: 60000 },
    { key: "speed", label: "SPEED", setter: "setSpeed", fine: 1, dragStep: 2, coarse: 10, min: 0, max: 800 },
    { key: "verticalSpeed", label: "VERTICAL SPEED", setter: "setVerticalSpeed", fine: 100, dragStep: 100, coarse: 500, min: -6000, max: 6000 }
  ];

  const stepOf = (spec, name, ap) =>
    spec.key === "speed" && isMach(ap) ? { fine: 0.01, dragStep: 0.01, coarse: 0.1 }[name] : spec[name];

  const actualFor = (spec, s) => {
    if (!s) return null;
    if (spec.key === "course") return s.hdg;
    if (spec.key === "altitude") return s.alt;
    if (spec.key === "speed") return isMach(s.ap) ? s.mach : s.ias;
    return s.vs;
  };

  function fmtAp(spec, v, ap) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) return spec.key === "verticalSpeed" ? "AUTO" : "---";
    v = Number(v);
    if (spec.key === "course") return pad3(v);
    if (spec.key === "speed" && isMach(ap)) return v.toFixed(2);
    return String(Math.round(v));
  }

  function apSet(spec, val) {
    const ap = apApi(), msg = $("#gfc-ap-msg");
    if (!ap || typeof ap[spec.setter] !== "function") { msg.textContent = "Autopilot not available."; return; }
    let v = Number(val);
    if (!Number.isFinite(v)) return;

    if (spec.wrap) v = ((v % 360) + 360) % 360;
    else if (spec.key === "speed" && isMach(ap)) v = clamp(v, 0, 3);
    else v = clamp(v, spec.min, spec.max);

    v = spec.key === "speed" && isMach(ap) ? Math.round(v * 100) / 100 : Math.round(v);

    try { ap[spec.setter](v); msg.textContent = ""; }
    catch (err) { msg.textContent = `Could not set ${spec.label}: ${err.message}`; }
    renderActive();
  }

  const apEls = {};

  function buildAP() {
    const host = $("#gfc-ap-cards");
    const ticks = Array.from({ length: 24 }, (_, i) =>
      `<line x1="50" y1="4" x2="50" y2="${i % 6 === 0 ? 12 : 9}" stroke="#6c8ba6" stroke-width="2" transform="rotate(${i * 15} 50 50)"/>`).join("");

    apSpecs.forEach(spec => {
      const card = doc.createElement("div");
      card.className = "card apcard";
      card.innerHTML = `
        <svg class="knob" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="47" fill="#10171f" stroke="#50677d" stroke-width="2"/>
          ${ticks}
          <g data-rot><circle cx="50" cy="50" r="33" fill="#26323f" stroke="#8aa4bb" stroke-width="2"/>
            <line x1="50" y1="50" x2="50" y2="22" stroke="#ffd52a" stroke-width="5" stroke-linecap="round"/></g>
        </svg>
        <div style="flex:1;min-width:200px">
          <div class="row" style="justify-content:space-between"><b class="dim">${spec.label}</b><span class="mono dim">ACTUAL <b data-a style="color:#fff">---</b></span></div>
          <div><span class="sel" data-s>---</span> <small class="dim" data-u></small></div>
          <div class="row" style="margin-top:8px">
            <button class="btn sm" data-c="-1">−COARSE</button><button class="btn sm" data-c="1">+COARSE</button>
            <input type="number" step="any" placeholder="value" style="width:90px" data-i><button class="btn sm" data-set>SET</button>
          </div>
        </div>`;
      host.appendChild(card);

      const svg = card.querySelector("svg"), rot = card.querySelector("[data-rot]");
      let angle = 0;

      const adjust = (dir, name) => {
        const ap = apApi();
        const sel = num(ap?.values?.[spec.key]);
        let base = sel ?? num(actualFor(spec, S)) ?? 0;
        if (sel === null && spec.key === "altitude") base = Math.round(base / 100) * 100;
        apSet(spec, base + dir * stepOf(spec, name, ap));
      };

      const DETENT = 12;
      const turn = (dir, name) => {
        angle += dir * DETENT;
        rot.setAttribute("transform", `rotate(${angle} 50 50)`);
        adjust(dir, name);
      };

      let drag = null;
      svg.addEventListener("pointerdown", e => {
        e.preventDefault();
        svg.setPointerCapture(e.pointerId);
        const r = svg.getBoundingClientRect();
        const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        drag = { cx, cy, last: Math.atan2(e.clientY - cy, e.clientX - cx), acc: 0 };
      });
      svg.addEventListener("pointermove", e => {
        if (!drag) return;
        const a = Math.atan2(e.clientY - drag.cy, e.clientX - drag.cx);
        let dd = (a - drag.last) * 180 / Math.PI;
        if (dd > 180) dd -= 360;
        if (dd < -180) dd += 360;
        drag.last = a;
        drag.acc += dd;
        while (Math.abs(drag.acc) >= DETENT) {
          const dir = Math.sign(drag.acc);
          drag.acc -= dir * DETENT;
          turn(dir, "dragStep");
        }
      });
      ["pointerup", "pointercancel"].forEach(ev => svg.addEventListener(ev, () => { drag = null; }));
      svg.addEventListener("wheel", e => {
        e.preventDefault();
        turn(e.deltaY < 0 ? 1 : -1, e.shiftKey ? "coarse" : "fine");
      }, { passive: false });

      card.querySelectorAll("[data-c]").forEach(b => b.addEventListener("click", () => adjust(Number(b.dataset.c), "coarse")));

      const input = card.querySelector("[data-i]");
      const apply = () => { if (input.value !== "") { apSet(spec, input.value); input.value = ""; } };
      card.querySelector("[data-set]").onclick = apply;
      input.addEventListener("keydown", e => { if (e.key === "Enter") apply(); });

      apEls[spec.key] = { a: card.querySelector("[data-a]"), s: card.querySelector("[data-s]"), u: card.querySelector("[data-u]") };
    });
  }
  buildAP();

  $("#gfc-ap-toggle").onclick = () => {
    const ap = apApi();
    if (!ap) return;
    try { if (ap.on) ap.turnOff(); else ap.turnOn(); } catch (err) { $("#gfc-ap-msg").textContent = "AP toggle failed: " + err.message; }
    renderActive();
  };
  $("#gfc-ap-mode").onchange = e => {
    try { apApi()?.setMode(e.target.value); } catch (err) { $("#gfc-ap-msg").textContent = "Mode change failed: " + err.message; }
    renderActive();
  };
  $("#gfc-ap-spdmode").onchange = e => {
    try { apApi()?.setSpeedMode(e.target.value); } catch (err) { $("#gfc-ap-msg").textContent = "Speed unit change failed: " + err.message; }
    renderActive();
  };
  $("#gfc-ap-sync").onclick = () => {
    const ap = apApi();
    if (!S || !ap) return;
    if (S.hdg !== null) apSet(apSpecs[0], S.hdg);
    if (S.alt !== null) apSet(apSpecs[1], Math.round(S.alt / 100) * 100);
    const spd = isMach(ap) ? S.mach : S.ias;
    if (spd !== null) apSet(apSpecs[2], spd);
  };
  $("#gfc-ap-vsclr").onclick = () => {
    const ap = apApi();
    if (ap?.values) ap.values.verticalSpeed = null;
    renderActive();
  };

  function renderAP(s) {
    const ap = apApi();
    const tog = $("#gfc-ap-toggle");
    if (!ap) { $("#gfc-ap-msg").textContent = "geofs.autopilot not found. Is a flight loaded?"; return; }

    tog.textContent = ap.on ? "AP ON" : "AP OFF";
    tog.classList.toggle("on", !!ap.on);

    const ms = $("#gfc-ap-mode");
    if (doc.activeElement !== ms && ap.mode) ms.value = ap.mode;
    const ss = $("#gfc-ap-spdmode");
    if (doc.activeElement !== ss && ap.speedMode) ss.value = ap.speedMode;

    const tvs = num(ap.targetVerticalSpeed);
    $("#gfc-ap-info").textContent =
      `STATUS ${ap.on ? "ENGAGED" : "OFF"}  •  MODE ${ap.mode ?? "---"}` + (tvs !== null ? `  •  TARGET V/S ${Math.round(tvs)} FPM` : "");

    apSpecs.forEach(spec => {
      const el = apEls[spec.key];
      const act = num(actualFor(spec, s));
      el.a.textContent = act === null ? "---" : fmtAp(spec, act, ap);
      el.s.textContent = fmtAp(spec, ap.values?.[spec.key], ap);
      el.u.textContent = spec.key === "course" ? "°" : spec.key === "altitude" ? "ft" : spec.key === "speed" ? (isMach(ap) ? "M" : "kt") : "fpm";
    });
  }

  /* ================= SYSTEMS (ECAM-style) ================= */
  function gaugeSVG(label, frac, big, small, warn) {
    const R = 44, cx = 60, cy = 62;
    const pt = deg => [cx + R * Math.cos(deg * Math.PI / 180), cy + R * Math.sin(deg * Math.PI / 180)];
    const f = clamp(frac, 0, 1);
    const a0 = 135, a1 = 135 + 270, av = 135 + 270 * f;
    const [x0, y0] = pt(a0), [x1, y1] = pt(a1), [xv, yv] = pt(av);
    const col = warn ? "#ff5d5d" : f > 0.92 ? "#ffb000" : "#67d59b";
    return `<svg viewBox="0 0 120 100" width="150" height="125">
      <path d="M${x0} ${y0} A${R} ${R} 0 1 1 ${x1} ${y1}" fill="none" stroke="#2a3440" stroke-width="7"/>
      ${f > 0.004 ? `<path d="M${x0} ${y0} A${R} ${R} 0 ${f > 0.5 ? 1 : 0} 1 ${xv} ${yv}" fill="none" stroke="${col}" stroke-width="7"/>` : ""}
      <line x1="${cx}" y1="${cy}" x2="${xv}" y2="${yv}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>
      <text x="${cx}" y="14" fill="#9bd1ff" font-size="12" font-family="monospace" text-anchor="middle" font-weight="bold">${label}</text>
      <text x="${cx}" y="${cy + 30}" fill="${col}" font-size="15" font-family="monospace" text-anchor="middle" font-weight="bold">${big}</text>
      <text x="${cx}" y="${cy + 42}" fill="#8fa0b2" font-size="9" font-family="monospace" text-anchor="middle">${small}</text></svg>`;
  }

  const firstPos = (...a) => { for (const v of a) { const n = num(v); if (n !== null && n > 0) return n; } return 0; };

  function renderSys(s) {
    const host = $("#gfc-sys");
    if (!s) { host.innerHTML = '<div class="dim">Waiting for GeoFS data…</div>'; return; }

    const engines = s.ac?.engines && s.ac.engines.length ? Array.from(s.ac.engines).slice(0, 4) : [null];

    const engHtml = engines.map((e, i) => {
      const rpm = (e && num(e.rpm)) ?? s.rpm;
      const thr = (e && num(e.thrust)) ?? s.thrust;
      const max = firstPos(e?.maxRpm, e?.maxRPM, e?.definition?.maxRpm, e?.definition?.maxRPM, s.ac?.definition?.maxRPM);
      const frac = rpm === null ? 0 : max ? rpm / max : rpm <= 120 ? rpm / 100 : 0.8;
      const big = rpm === null ? "---" : max ? (rpm / max * 100).toFixed(1) + "%" : String(Math.round(rpm));
      const small = rpm === null ? "" : (max ? Math.round(rpm) + " RPM" : "RPM") + (thr !== null ? "  T " + Math.round(thr) : "");
      return `<div style="text-align:center">${gaugeSVG(engines.length > 1 ? "ENG " + (i + 1) : "ENG", frac, big, small, false)}</div>`;
    }).join("");

    const thrBar = s.throttle === null ? "---" : Math.round(s.throttle * 100) + "%";
    const engOn = s.enginesOn === undefined ? "---" : s.enginesOn ? "ON" : "OFF";

    const gd = s.gearDown;
    const gearTxt = gd === null ? ["---", "dim"] : gd > 0.98 ? ["DOWN", "grn"] : gd < 0.02 ? ["UP", "dim"] : ["IN TRANSIT", "amb"];
    const flapTxt = s.flapsMax ? `${Math.round(s.flapsPos ?? s.flapsTarget ?? 0)} / ${s.flapsMax}` : "---";
    const spoil = s.airbrakes === null ? "---" : Math.round(s.airbrakes * 100) + "%";
    const brk = s.brakes === null ? "---" : s.brakes > 0.05 ? "APPLIED" : "OFF";
    const ap = s.ap;

    const row = (k, v, cls = "") => `<tr><td class="dim">${k}</td><td class="${cls}" style="font-weight:bold">${v}</td></tr>`;

    const ws = warnings(s);
    const warnHtml = ws.length
      ? ws.map(w => `<div class="warnline ${w.lvl === "R" ? "red" : "amb"}">${esc(w.text)}</div>`).join("")
      : '<div class="warnline grn">NO WARNINGS</div>';

    const memos = [];
    if (s.onGround) memos.push("ON GROUND");
    if (gd !== null && gd > 0.98) memos.push("GEAR DOWN");
    if (s.flapsMax && (s.flapsTarget ?? 0) > 0) memos.push("FLAPS " + Math.round(s.flapsTarget));
    if ((s.airbrakes ?? 0) > 0.05) memos.push("SPOILERS");
    if (ap && ap.on) memos.push("AP " + (ap.mode || ""));

    host.innerHTML = `
      <div class="ecam" style="margin-bottom:10px"><h4>ENGINE / WARNING</h4>
        <div class="row" style="justify-content:center">${engHtml}</div>
        <div class="mono dim" style="text-align:center">THROTTLE ${thrBar} • ENGINES ${engOn}</div>
        <div style="margin-top:8px">${warnHtml}</div>
        <div class="mono grn" style="margin-top:6px">${memos.map(esc).join(" • ")}</div>
      </div>
      <div class="ecam"><h4>SYSTEMS</h4>
        <table>
          ${row("LANDING GEAR", gearTxt[0], gearTxt[1])}
          ${row("FLAPS", flapTxt)}
          ${row("SPOILERS / AIRBRAKES", spoil, (s.airbrakes ?? 0) > 0.05 ? "amb" : "")}
          ${row("BRAKES", brk, brk === "APPLIED" ? "amb" : "")}
          ${row("AUTOPILOT", ap && ap.on ? "ENGAGED " + esc(ap.mode || "") : "OFF", ap && ap.on ? "grn" : "dim")}
          ${row("ELEVATOR TRIM", fmt(s.trim, 2))}
          ${row("ANGLE OF ATTACK", fmt(s.aoa, 1) + "°")}
          ${row("ATTITUDE", `P ${fmt(s.pitch, 1)}° R ${fmt(s.roll, 1)}°`)}
          ${row("STATE", s.onGround ? "ON GROUND" : "AIRBORNE")}
        </table>
      </div>`;
  }

  /* ================= LEVERS + VIRTUAL BUTTONS ================= */
  const ctlObj = () => window.controls || null;

  function makeLever(host, cfg) {
    const wrap = doc.createElement("div");
    wrap.className = "lever";
    wrap.innerHTML = `<div class="lt">${cfg.title}</div><div class="track"><div class="ticks"></div><div class="act"></div><div class="handle"></div></div><div class="lread">---</div>`;
    host.appendChild(wrap);

    const track = wrap.querySelector(".track"), ticks = wrap.querySelector(".ticks");
    const handle = wrap.querySelector(".handle"), act = wrap.querySelector(".act"), read = wrap.querySelector(".lread");
    let max = 1;

    const valFromEvent = e => {
      const r = track.getBoundingClientRect();
      return clamp((e.clientY - r.top) / r.height, 0, 1) * max;
    };

    let dragging = false;
    track.addEventListener("pointerdown", e => { dragging = true; track.setPointerCapture(e.pointerId); cfg.onSet(cfg.snap(valFromEvent(e))); });
    track.addEventListener("pointermove", e => { if (dragging) cfg.onSet(cfg.snap(valFromEvent(e))); });
    ["pointerup", "pointercancel"].forEach(ev => track.addEventListener(ev, () => { dragging = false; }));

    return {
      wrap,
      layout(newMax, labels) {
        max = newMax;
        ticks.innerHTML = labels.map(l => `<div style="top:${(l.v / max) * 100}%"><span>${l.t}</span></div>`).join("");
      },
      update(target, actual) {
        handle.style.top = (max ? clamp(target / max, 0, 1) * 100 : 0) + "%";
        act.style.top = (max ? clamp(actual / max, 0, 1) * 100 : 0) + "%";
        read.textContent = cfg.fmt(target, actual);
      }
    };
  }

  function setFlaps(n) {
    const c = ctlObj();
    if (!c?.flaps) return;
    const max = c.flaps.maxPosition || 0;
    n = clamp(Math.round(n), 0, max);
    let d = n - Math.round(c.flaps.target);
    try {
      while (d > 0) { c.setters.setFlapsDown.set(); d--; }
      while (d < 0) { c.setters.setFlapsUp.set(); d++; }
    } catch (e) { /* fall through to direct assignment */ }
    if (Math.round(c.flaps.target) !== n) c.flaps.target = n;
  }

  function setSpoilers(v) {
    const c = ctlObj();
    if (!c?.airbrakes) return;
    c.airbrakes.target = clamp(v, 0, 1);
  }

  const flapsLever = makeLever($("#gfc-levers"), {
    title: "FLAPS",
    snap: v => Math.round(v),
    onSet: setFlaps,
    fmt: (t, a) => `SET ${Math.round(t)}  ACT ${a.toFixed(1)}`
  });
  const spoilLever = makeLever($("#gfc-levers"), {
    title: "SPOILERS",
    snap: v => Math.round(v * 20) / 20,
    onSet: setSpoilers,
    fmt: (t, a) => `SET ${Math.round(t * 100)}%  ACT ${Math.round(a * 100)}%`
  });
  spoilLever.layout(1, [{ v: 0, t: "RET" }, { v: 0.5, t: "½" }, { v: 1, t: "FULL" }]);

  let flapsMaxShown = -1;

  function renderLevers(s) {
    const c = ctlObj();
    const max = c?.flaps?.maxPosition || 0;

    if (max !== flapsMaxShown) {
      flapsMaxShown = max;
      if (max > 0) {
        flapsLever.layout(max, Array.from({ length: max + 1 }, (_, i) => ({ v: i, t: i === 0 ? "UP" : String(i) })));
      } else {
        flapsLever.layout(1, [{ v: 0, t: "NONE" }]);
      }
    }

    if (max > 0 && c?.flaps) {
      const pos = s?.flapsPos ?? s?.flapsTarget ?? c.flaps.position ?? 0;
      flapsLever.update(c.flaps.target ?? 0, pos);
    } else {
      flapsLever.update(0, 0);
    }

    if (c?.airbrakes) spoilLever.update(c.airbrakes.target ?? 0, s?.airbrakes ?? c.airbrakes.position ?? 0);
    else spoilLever.update(0, 0);
  }

  /* ---- virtual buttons ---- */
  const SETTER = (name, method = "set") => () => {
    const st = window.controls?.setters?.[name];
    if (!st) throw new Error("controls.setters." + name + " not found");
    if (typeof st[method] === "function") st[method]();
  };

  const ACTIONS = {
    gear: { down: SETTER("setGear") },
    parkbrk: { down: SETTER("toggleParkingBrake") },
    brakes: { down: SETTER("setBrakes", "set"), up: SETTER("setBrakes", "unset") },
    flapsUp: { down: SETTER("setFlapsUp") },
    flapsDn: { down: SETTER("setFlapsDown") },
    spoilers: { down: SETTER("setAirbrakes") },
    reverse: { down: SETTER("toggleReverse") },
    ap: { down: SETTER("toggleAutoPilot") },
    trimUp: { down: SETTER("setElevatorTrimUp", "set"), up: SETTER("setElevatorTrimUp", "unset") },
    trimDn: { down: SETTER("setElevatorTrimDown", "set"), up: SETTER("setElevatorTrimDown", "unset") },
    trimN: { down: SETTER("setElevatorTrimNeutral") },
    pause: { down: () => { if (typeof window.geofs?.togglePause === "function") window.geofs.togglePause(); else throw new Error("geofs.togglePause not found"); } }
  };

  const DEFAULT_BTNS = [
    { label: "GEAR", action: "gear" }, { label: "PARK BRAKE", action: "parkbrk" },
    { label: "BRAKES (HOLD)", action: "brakes" }, { label: "FLAPS ▲ RETRACT", action: "flapsUp" },
    { label: "FLAPS ▼ EXTEND", action: "flapsDn" }, { label: "SPOILERS", action: "spoilers" },
    { label: "REVERSE", action: "reverse" }, { label: "AP", action: "ap" },
    { label: "TRIM ▲", action: "trimUp" }, { label: "TRIM ▼", action: "trimDn" },
    { label: "TRIM CTR", action: "trimN" }, { label: "PAUSE", action: "pause" }
  ];

  let buttons = store.get("buttons", null) || DEFAULT_BTNS.map(b => Object.assign({}, b));
  const saveButtons = () => store.set("buttons", buttons);

  function runBtn(b, phase) {
    try {
      if (b.action) {
        const a = ACTIONS[b.action];
        if (a && a[phase]) a[phase]();
      } else {
        const code = phase === "down" ? b.code : b.upCode;
        if (code) new Function("geofs", "controls", "ui", code)(window.geofs, window.controls, { speak });
      }
      $("#gfc-btn-msg").textContent = "";
    } catch (err) {
      $("#gfc-btn-msg").textContent = `${b.label}: ${err.message}`;
    }
  }

  function renderButtons() {
    const host = $("#gfc-vbtns");
    host.innerHTML = "";

    buttons.forEach(b => {
      const el = doc.createElement("button");
      el.className = "btn";
      el.textContent = b.label;
      let isDown = false;
      el.addEventListener("pointerdown", e => {
        e.preventDefault();
        isDown = true;
        el.classList.add("flash");
        runBtn(b, "down");
      });
      const release = () => {
        if (!isDown) return;
        isDown = false;
        el.classList.remove("flash");
        runBtn(b, "up");
      };
      ["pointerup", "pointerleave", "pointercancel"].forEach(ev => el.addEventListener(ev, release));
      host.appendChild(el);
    });
  }

  function renderBtnEditor() {
    const ed = $("#gfc-btn-editor");
    ed.innerHTML = `
      <div class="dim" style="margin-bottom:6px">Custom buttons run JavaScript in the GeoFS page (<span class="mono">geofs</span>, <span class="mono">controls</span> and <span class="mono">ui.speak(text)</span> are available). Example: <span class="mono">controls.setters.setGear.set()</span></div>
      <div id="gfc-btn-list"></div>
      <div class="row" style="margin-top:8px">
        <input id="gfc-nb-label" placeholder="Label" style="width:110px">
        <input id="gfc-nb-code" placeholder="Code on press" style="flex:1;min-width:160px">
        <input id="gfc-nb-up" placeholder="Code on release (optional)" style="flex:1;min-width:130px">
        <button class="btn sm" id="gfc-nb-add">ADD</button>
        <button class="btn sm" id="gfc-nb-reset">RESET DEFAULTS</button>
      </div>`;

    const list = ed.querySelector("#gfc-btn-list");
    buttons.forEach((b, i) => {
      const r = doc.createElement("div");
      r.className = "row mono";
      r.style.padding = "2px 0";
      r.innerHTML = `<button class="btn sm" data-del>✕</button><span>${esc(b.label)}</span><span class="dim">${b.action ? "[" + esc(b.action) + "]" : esc((b.code || "").slice(0, 50))}</span>`;
      r.querySelector("[data-del]").onclick = () => { buttons.splice(i, 1); saveButtons(); renderButtons(); renderBtnEditor(); };
      list.appendChild(r);
    });

    ed.querySelector("#gfc-nb-add").onclick = () => {
      const label = ed.querySelector("#gfc-nb-label").value.trim();
      const code = ed.querySelector("#gfc-nb-code").value.trim();
      const upCode = ed.querySelector("#gfc-nb-up").value.trim();
      if (!label || !code) return;
      buttons.push({ label, code, upCode });
      saveButtons(); renderButtons(); renderBtnEditor();
    };
    ed.querySelector("#gfc-nb-reset").onclick = () => {
      buttons = DEFAULT_BTNS.map(b => Object.assign({}, b));
      saveButtons(); renderButtons(); renderBtnEditor();
    };
  }

  $("#gfc-btn-edit").onclick = () => {
    const ed = $("#gfc-btn-editor");
    const show = ed.style.display === "none";
    ed.style.display = show ? "block" : "none";
    if (show) renderBtnEditor();
  };

  renderButtons();

  /* ================= VOICE ANNUNCIATOR ================= */
  const synth = window.speechSynthesis;

  function speak(text, urgent) {
    if (!synth || !voiceCfg.enabled) return;
    const u = new window.SpeechSynthesisUtterance(text);
    u.rate = voiceCfg.rate;
    u.volume = voiceCfg.volume;
    u.lang = "en-US";
    if (voiceCfg.voiceName) {
      const vo = synth.getVoices().find(x => x.name === voiceCfg.voiceName);
      if (vo) u.voice = vo;
    }
    if (urgent) synth.cancel();
    synth.speak(u);
  }

  const vst = { init: false, ias: null, agl: null, gear: null, flaps: null, ap: null, roll: false, posDone: false, last: {} };

  function tickVoice(s) {
    if (!s || !voiceCfg.enabled || !synth) return;
    const C = voiceCfg.callouts, now = Date.now();
    const rises = (p, c, th) => p !== null && c !== null && p < th && c >= th;
    const falls = (p, c, th) => p !== null && c !== null && p > th && c <= th;
    const ready = vst.init;

    // takeoff roll arming
    if (s.onGround && s.ias !== null && s.ias < 30) { vst.roll = true; vst.posDone = false; }

    if (ready && vst.roll) {
      if (C.spd100.on && rises(vst.ias, s.ias, C.spd100.val)) speak(C.spd100.val + " knots");
      if (C.v1.on && rises(vst.ias, s.ias, C.v1.val)) speak("V one");
      if (C.rotate.on && rises(vst.ias, s.ias, C.rotate.val)) speak("Rotate");
      if (C.v2.on && rises(vst.ias, s.ias, C.v2.val)) speak("V two");
      if (!s.onGround && !vst.posDone && (s.vs ?? 0) > 100 && (s.agl === null || s.agl > 5)) {
        vst.posDone = true;
        vst.roll = false;
        if (C.positive.on) speak("Positive rate");
      }
    }

    // gear
    const gd = s.gearDown === null ? null : s.gearDown > 0.5;
    if (ready && C.gear.on && gd !== null && vst.gear !== null && gd !== vst.gear) speak(gd ? "Gear down" : "Gear up");
    vst.gear = gd;

    // flaps
    const fl = s.flapsTarget === null ? null : Math.round(s.flapsTarget);
    if (ready && C.flaps.on && fl !== null && vst.flaps !== null && fl !== vst.flaps) speak(fl === 0 ? "Flaps up" : "Flaps " + fl);
    vst.flaps = fl;

    // autopilot
    const apOn = s.ap ? !!s.ap.on : null;
    if (ready && C.ap.on && apOn !== null && vst.ap !== null && apOn !== vst.ap) speak(apOn ? "Autopilot engaged" : "Autopilot disengaged", true);
    vst.ap = apOn;

    // radio altitude callouts on descent
    if (ready && !s.onGround) {
      if (C.agl.on) {
        String(C.agl.val).split(",").map(x => Number(x.trim())).filter(x => x > 0).forEach(th => {
          if (falls(vst.agl, s.agl, th)) speak(String(th));
        });
      }
      if (C.minimums.on && falls(vst.agl, s.agl, C.minimums.val)) speak("Minimums");
    }

    // repeating alerts
    const alert = (key, text, cond, every, urgent) => {
      if (cond && now - (vst.last[key] || 0) > every && (urgent || !synth.speaking)) {
        vst.last[key] = now;
        speak(text, urgent);
      }
    };

    if (C.stall.on) alert("stall", "Stall", s.stalling, 2500, true);
    if (C.bank.on) alert("bank", "Bank angle", s.roll !== null && Math.abs(s.roll) > C.bank.val, 4000, false);
    if (C.overspeed.on) alert("ovs", "Overspeed", s.ias !== null && s.ias > C.overspeed.val, 4000, false);

    if (C.sink.on && !s.onGround && s.agl !== null && s.vs !== null) {
      if (s.vs < -2500 && s.agl < 1000) alert("pull", "Pull up", true, 2500, true);
      else if (s.vs < -2000 && s.agl < 2500) alert("sink", "Sink rate", true, 4000, false);
    }

    if (C.tooLowGear.on && !s.onGround && s.agl !== null && s.vs !== null && s.gearDown !== null) {
      alert("tlg", "Too low, gear", s.gearDown < 0.9 && s.agl < 500 && s.vs < -200 && (s.ias ?? 0) < 250, 5000, false);
    }

    vst.ias = s.ias;
    vst.agl = s.agl;
    vst.init = true;
  }

  const TEST_TEXT = {
    v1: "V one", rotate: "Rotate", v2: "V two", positive: "Positive rate", gear: "Gear down", flaps: "Flaps 1",
    ap: "Autopilot engaged", agl: "Five hundred", minimums: "Minimums", bank: "Bank angle", sink: "Sink rate",
    tooLowGear: "Too low, gear", stall: "Stall", overspeed: "Overspeed"
  };

  function fillVoices() {
    const sel = $("#v-voice");
    if (!sel || !synth) return;
    const vs = synth.getVoices();
    sel.innerHTML = '<option value="">Default voice</option>' +
      vs.map(v => `<option value="${esc(v.name)}"${v.name === voiceCfg.voiceName ? " selected" : ""}>${esc(v.name)} (${esc(v.lang)})</option>`).join("");
  }

  function buildVoice() {
    const host = $("#gfc-voice");
    host.innerHTML = `
      <div class="card">
        <div class="row">
          <label><input type="checkbox" id="v-en"> <b>Voice annunciator enabled</b></label>
          <button class="btn sm" id="v-test">TEST VOICE</button>
        </div>
        <div class="row" style="margin-top:8px">
          <label class="dim">Speed <input type="range" id="v-rate" min="0.6" max="1.6" step="0.1"></label>
          <label class="dim">Volume <input type="range" id="v-vol" min="0.1" max="1" step="0.1"></label>
          <select id="v-voice" style="max-width:260px"></select>
        </div>
        ${synth ? "" : '<div class="amb mono" style="margin-top:6px">Speech synthesis is not available in this browser.</div>'}
      </div>
      <div class="card" id="v-list"></div>
      <div class="dim" style="font-size:11px">Callouts trigger from live GeoFS data. Takeoff speeds arm when you are stopped on the ground, and approach callouts trigger while descending.</div>`;

    $("#v-en").checked = !!voiceCfg.enabled;
    $("#v-rate").value = voiceCfg.rate;
    $("#v-vol").value = voiceCfg.volume;

    $("#v-en").onchange = e => { voiceCfg.enabled = e.target.checked; saveVoice(); };
    $("#v-rate").oninput = e => { voiceCfg.rate = Number(e.target.value); saveVoice(); };
    $("#v-vol").oninput = e => { voiceCfg.volume = Number(e.target.value); saveVoice(); };
    $("#v-voice").onchange = e => { voiceCfg.voiceName = e.target.value; saveVoice(); };
    $("#v-test").onclick = () => speak("GeoFS companion voice test.", true);

    const list = $("#v-list");
    Object.keys(voiceCfg.callouts).forEach(k => {
      const c = voiceCfg.callouts[k];
      const row = doc.createElement("div");
      row.className = "row";
      row.style.cssText = "padding:5px 0;border-bottom:1px solid #243040";
      row.innerHTML = `<label style="flex:1;min-width:190px"><input type="checkbox" data-on> ${esc(c.label)}</label>
        ${c.val !== undefined ? `<input data-val style="width:${typeof c.val === "string" ? 190 : 70}px"> <span class="dim mono">${esc(c.unit || "")}</span>` : ""}
        <button class="btn sm" data-test>TEST</button>`;
      row.querySelector("[data-on]").checked = !!c.on;
      row.querySelector("[data-on]").onchange = e => { c.on = e.target.checked; saveVoice(); };

      const val = row.querySelector("[data-val]");
      if (val) {
        val.value = c.val;
        val.onchange = () => { c.val = typeof c.val === "string" ? val.value : (Number(val.value) || c.val); saveVoice(); };
      }

      row.querySelector("[data-test]").onclick = () =>
        speak(k === "spd100" ? c.val + " knots" : TEST_TEXT[k] || c.label, true);
      list.appendChild(row);
    });

    fillVoices();
  }
  buildVoice();

  if (synth) synth.onvoiceschanged = fillVoices;

  /* ================= DATA + SETTINGS ================= */
  function buildData() {
    const host = $("#gfc-data");
    host.innerHTML = `
      <div class="card">
        <b>RAW DATA INSPECTOR</b>
        <div class="row" style="margin-top:8px">
          <button class="btn sm" id="d-up">↑ UP</button>
          <input id="d-path" value="geofs.animation.values" style="flex:1;min-width:200px">
          <input id="d-filter" placeholder="filter…" style="width:130px">
          <select id="d-quick">
            <option value="">Quick paths…</option>
            <option>geofs.animation.values</option>
            <option>geofs.autopilot</option>
            <option>geofs.autopilot.values</option>
            <option>controls</option>
            <option>controls.flaps</option>
            <option>controls.airbrakes</option>
            <option>geofs.aircraft.instance</option>
            <option>geofs.flightPlan</option>
          </select>
        </div>
        <div id="d-table" style="max-height:300px;overflow:auto;margin-top:8px;border:1px solid #243040;border-radius:6px"></div>
        <div class="dim" style="font-size:11px;margin-top:4px">Click an [OBJECT] row to open it. Values refresh live.</div>
      </div>

      <div class="card">
        <b>INTERFACE SETTINGS</b>
        <div class="row" style="margin-top:8px">
          <label class="dim">UI scale <select id="s-scale"><option>0.8</option><option>0.9</option><option>1</option><option>1.1</option><option>1.25</option><option>1.5</option></select></label>
          <label><input type="checkbox" id="s-invert"> Invert PFD horizon</label>
          <label><input type="checkbox" id="s-gear"> Invert gear indication</label>
        </div>
        <div class="row" style="margin-top:8px">
          <label class="dim">PFD pitch sensitivity <input type="range" id="s-pitch" min="0.014" max="0.06" step="0.002"></label>
          <button class="btn sm" id="s-reset">RESET ALL SAVED SETTINGS</button>
        </div>
        <div id="s-msg" class="mono amb" style="margin-top:6px"></div>
      </div>

      <div class="card">
        <b>HARDWARE (GAMEPADS / JOYSTICKS)</b>
        <div id="d-pads" class="mono" style="margin-top:8px"></div>
        <div class="dim" style="font-size:11px;margin-top:4px">Read-only view of controllers the browser can see. Bind controls in GeoFS Options → Controls.</div>
      </div>`;

    $("#s-scale").value = String(settings.scale);
    $("#s-invert").checked = !!settings.invertPfd;
    $("#s-gear").checked = !!settings.gearInvert;
    $("#s-pitch").value = settings.pitchGain;

    $("#s-scale").onchange = e => { settings.scale = Number(e.target.value); saveSettings(); applyScale(); };
    $("#s-invert").onchange = e => { settings.invertPfd = e.target.checked; saveSettings(); };
    $("#s-gear").onchange = e => { settings.gearInvert = e.target.checked; saveSettings(); };
    $("#s-pitch").oninput = e => { settings.pitchGain = Number(e.target.value); saveSettings(); };
    $("#s-reset").onclick = () => {
      try { Object.keys(localStorage).filter(k => k.startsWith("gfc:")).forEach(k => localStorage.removeItem(k)); } catch (e) { /* ignore */ }
      $("#s-msg").textContent = "Saved settings cleared. Close and re-run the script to load defaults.";
    };

    $("#d-quick").onchange = e => { if (e.target.value) { $("#d-path").value = e.target.value; e.target.value = ""; renderData(); } };
    $("#d-path").addEventListener("change", renderData);
    $("#d-filter").addEventListener("input", renderData);
    $("#d-up").onclick = () => {
      const p = $("#d-path").value.split(".");
      if (p.length > 1) { p.pop(); $("#d-path").value = p.join("."); renderData(); }
    };
  }
  buildData();

  function resolvePath(p) {
    let o = window;
    for (const part of p.split(".").map(x => x.trim()).filter(Boolean)) {
      if (part === "window") continue;
      if (o === null || o === undefined) return undefined;
      o = o[part];
    }
    return o;
  }

  function showVal(v) {
    if (v === null) return "null";
    if (v === undefined) return "undefined";
    if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(4);
    if (typeof v === "string") return '"' + v.slice(0, 60) + '"';
    if (typeof v === "boolean") return String(v);
    if (typeof v === "function") return "[FUNCTION]";
    if (Array.isArray(v)) return "[ARRAY " + v.length + "]";
    return "[OBJECT]";
  }

  function renderData() {
    const box = $("#d-table");
    if (!box) return;
    const path = $("#d-path").value.trim();
    const f = $("#d-filter").value.toLowerCase();
    const o = resolvePath(path);

    const top = box.scrollTop;
    if (o === null || o === undefined || (typeof o !== "object" && typeof o !== "function")) {
      box.innerHTML = `<div style="padding:8px" class="mono">${esc(path)} = ${esc(showVal(o))}</div>`;
      return;
    }

    let keys = [];
    try { keys = Object.keys(o); } catch (e) { keys = []; }
    keys = keys.filter(k => !f || k.toLowerCase().includes(f)).sort().slice(0, 500);

    const rows = keys.map(k => {
      let v;
      try { v = o[k]; } catch (e) { v = "(error)"; }
      const drill = v !== null && typeof v === "object";
      return `<tr${drill ? ' data-k="' + esc(k) + '" style="cursor:pointer"' : ""}><td class="dim">${esc(k)}</td><td>${esc(showVal(v))}</td></tr>`;
    }).join("");

    box.innerHTML = `<table>${rows}</table>`;
    box.scrollTop = top;
    box.querySelectorAll("tr[data-k]").forEach(tr => tr.addEventListener("click", () => {
      $("#d-path").value = path + "." + tr.dataset.k;
      renderData();
    }));
  }

  function renderPads() {
    const host = $("#d-pads");
    if (!host) return;
    let pads = [];
    try { pads = Array.from(navigator.getGamepads ? navigator.getGamepads() : []).filter(Boolean); } catch (e) { pads = []; }
    host.innerHTML = pads.length
      ? pads.map(p => `<div>${esc(p.id)}<br><span class="dim">axes: ${Array.from(p.axes).map(a => a.toFixed(2)).join(" ")}  •  buttons: ${Array.from(p.buttons).map((b, i) => b.pressed ? i : null).filter(x => x !== null).join(",") || "none"}</span></div>`).join("")
      : "No gamepads detected. Connect a device and move a control.";
  }

  /* ================= render + main loop ================= */
  function renderActive() {
    if (tab === "map") {
      renderStats(S);
      renderWxLocal(S);
      if (subActive() === "flpn") renderFlpn(S, true);
    } else if (tab === "pfd") drawPFD(S);
    else if (tab === "ap") renderAP(S);
    else if (tab === "sys") renderSys(S);
    else if (tab === "ctl") renderLevers(S);
    else if (tab === "data") { renderData(); renderPads(); }
  }

  let lastFp = 0;
  let timer = null;
  let closed = false;

  function tick() {
    if (closed) return;
    if (win.closed || !root.isConnected) { closeAll(); return; }

    S = snapshot();

    tickStats(S);
    tickVoice(S);
    updateMap(S);

    if (Date.now() - lastFp > 2000) { lastFp = Date.now(); renderFlpn(S, false); }

    const st = $("#gfc-status");
    st.textContent = S ? "GEOFS TELEMETRY CONNECTED" : "WAITING FOR GEOFS DATA";
    st.style.color = S ? "#86e6b0" : "#a3b2c2";

    renderActive();
  }

  function closeAll() {
    if (closed) return;
    closed = true;
    clearInterval(timer);
    try { if (synth) synth.cancel(); } catch (e) { /* ignore */ }

    if (floating) root.remove();
    else { try { win.close(); } catch (e) { /* ignore */ } }

    if (window[KEY] === api) delete window[KEY];
  }

  const api = {
    win, doc,
    slots: { checklist: $("#gfc-checklist-slot") },
    isOpen: () => !closed && !win.closed && root.isConnected,
    close: closeAll,
    showTab,
    speak
  };
  window[KEY] = api;

  // Floating fallback: drag by the title bar.
  if (floating) {
    const bar = $("#gfc-drag");
    let drag = null;
    bar.style.cursor = "move";
    $("#gfc-close").onclick = closeAll;
    bar.addEventListener("pointerdown", e => {
      if (e.target.closest("button")) return;
      drag = { x: e.clientX - root.offsetLeft, y: e.clientY - root.offsetTop };
      bar.setPointerCapture(e.pointerId);
    });
    bar.addEventListener("pointermove", e => {
      if (drag) {
        root.style.left = Math.max(0, e.clientX - drag.x) + "px";
        root.style.top = Math.max(0, e.clientY - drag.y) + "px";
      }
    });
    ["pointerup", "pointercancel"].forEach(ev => bar.addEventListener(ev, () => { drag = null; }));
  } else {
    win.addEventListener("pagehide", closeAll);
    window.addEventListener("beforeunload", () => { try { win.close(); } catch (e) { /* ignore */ } });
  }

  $("#gfc-checklist-slot").innerHTML =
    '<div style="padding:14px;color:#8fa0b2;border:1px dashed #394654;border-radius:8px">Checklist module not loaded.<br>Run <b>checklists.js</b> and it will appear here.</div>';

  showTab("map");
  timer = setInterval(tick, 250);
  tick();

  document.dispatchEvent(new CustomEvent("gfc:companion-ready"));
})();
