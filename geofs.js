(() => {
  "use strict";

  const ID = "geofs-companion";
  const previous = document.getElementById(ID);
  if (previous) {
    previous.remove();
    return;
  }

  /* ---------- TUNING ---------- */
  // Flip pitch + roll direction of the PFD horizon. Set to false to get the old direction back.
  const INVERT_PFD = true;
  // Horizon movement per degree of pitch, as a fraction of PFD height.
  // (Old value was 1/70 = 0.0143. Bigger number = horizon moves more.)
  const PITCH_PER_DEG = 0.032;

  const BTN =
    "padding:7px 12px;background:#26394a;color:#fff;border:1px solid #50677d;border-radius:5px;cursor:pointer";
  const BTN_SMALL =
    "padding:6px 9px;background:#1b242e;color:#e8eef5;border:1px solid #435264;border-radius:5px;cursor:pointer;font:12px monospace;min-width:48px";

  const panel = document.createElement("section");
  panel.id = ID;
  panel.style.cssText =
    "position:fixed;left:28px;top:35px;z-index:999999;width:760px;height:650px;max-width:95vw;max-height:90vh;min-width:340px;min-height:420px;resize:both;overflow:hidden;background:#10151c;color:#e8eef5;border:1px solid #3b4857;border-radius:10px;box-shadow:0 12px 38px #000b;font:13px Arial,sans-serif";

  panel.innerHTML = `
    <header id="gfc-drag" style="height:40px;box-sizing:border-box;padding:12px;background:#171f29;border-bottom:1px solid #34404d;cursor:move;user-select:none;font-weight:bold;letter-spacing:.6px">
      GEOFS COMPANION <span style="font-weight:normal;color:#8da0b4"> / FLIGHT DISPLAY</span>
      <button id="gfc-close" style="float:right;margin-top:-4px;background:#293441;color:#fff;border:1px solid #435264;border-radius:4px;cursor:pointer">✕</button>
    </header>
    <nav style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:#111821;border-bottom:1px solid #303b48">
      <button id="gfc-pfd-tab" style="padding:7px 12px;background:#26394a;color:#fff;border:1px solid #6c8ba6;border-radius:5px;cursor:pointer">PFD + CHECKLIST</button>
      <button id="gfc-ap-tab" style="padding:7px 12px;background:#1b242e;color:#d8e2ed;border:1px solid #394654;border-radius:5px;cursor:pointer">AUTOPILOT →</button>
      <button id="gfc-map-tab" style="padding:7px 12px;background:#1b242e;color:#d8e2ed;border:1px solid #394654;border-radius:5px;cursor:pointer">MAP →</button>
      <span id="gfc-status" style="margin-left:auto;color:#a3b2c2;font:11px monospace">WAITING FOR GEOFS DATA</span>
    </nav>

    <main id="gfc-pfd-page" style="height:calc(100% - 94px);box-sizing:border-box;padding:12px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center;align-items:flex-start;background:#0d1218;overflow:auto">
      <div style="height:100%;min-height:300px;max-height:540px;max-width:100%;aspect-ratio:.66;border:4px solid #050608;box-sizing:border-box;background:#080c11;overflow:hidden;flex:0 1 auto">
        <canvas id="gfc-pfd" style="display:block;width:100%;height:100%"></canvas>
      </div>
      <div id="gfc-checklist-slot" style="flex:1 1 280px;min-width:240px;max-width:420px;height:100%;min-height:300px;overflow:auto;box-sizing:border-box"></div>
    </main>

    <main id="gfc-ap-page" style="display:none;height:calc(100% - 94px);box-sizing:border-box;padding:14px;background:#0d1218;overflow:auto">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:12px">
        <button id="gfc-ap-toggle" style="${BTN};min-width:90px;font-weight:bold">AP OFF</button>
        <label style="color:#9eafc0">MODE
          <select id="gfc-ap-mode" style="padding:6px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px">
            <option value="HDG">HDG</option>
            <option value="NAV">NAV</option>
          </select>
        </label>
        <label style="color:#9eafc0">SPD UNIT
          <select id="gfc-ap-spdmode" style="padding:6px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px">
            <option value="knots">KNOTS</option>
            <option value="mach">MACH</option>
          </select>
        </label>
        <button id="gfc-ap-sync" style="${BTN}">SYNC TO CURRENT</button>
        <button id="gfc-ap-vsclr" style="${BTN}">V/S AUTO</button>
      </div>
      <div id="gfc-ap-info" style="font:12px monospace;color:#8edbb0;margin-bottom:10px"></div>
      <div id="gfc-ap-rows"></div>
      <div id="gfc-ap-msg" style="font:12px monospace;color:#ffcf70"></div>
    </main>

    <main id="gfc-map-page" style="display:none;height:calc(100% - 94px);position:relative;background:#111821">
      <div id="gfc-map" style="position:absolute;inset:0;background:#17212b"></div>
      <div id="gfc-map-message" style="position:absolute;z-index:500;left:12px;top:12px;background:#10151cdd;color:#dce7f2;padding:8px 10px;border:1px solid #394654;border-radius:5px">Waiting for aircraft position…</div>
      <button id="gfc-pfd-back" style="position:absolute;z-index:600;right:12px;top:12px;background:#172330;color:white;border:1px solid #52677c;border-radius:5px;padding:8px 12px;cursor:pointer">← AUTOPILOT</button>
    </main>`;

  document.body.appendChild(panel);

  const $ = s => panel.querySelector(s);
  $("#gfc-close").onclick = () => panel.remove();

  // Drag the dashboard by its title bar.
  const bar = $("#gfc-drag");
  let drag = null;

  bar.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    drag = {
      x: e.clientX - panel.offsetLeft,
      y: e.clientY - panel.offsetTop
    };
    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", e => {
    if (drag) {
      panel.style.left = Math.max(0, e.clientX - drag.x) + "px";
      panel.style.top = Math.max(0, e.clientY - drag.y) + "px";
    }
  });

  ["pointerup", "pointercancel"].forEach(ev =>
    bar.addEventListener(ev, () => drag = null)
  );

  let page = "pfd";
  let map = null;
  let marker = null;
  let trail = null;
  let leafletLoading = false;
  let leafletLoadFailed = false;
  let followAircraft = true;
  let userInteracted = false;
  const points = [];
  let lastPoint = null;

  const pages = {
    pfd: $("#gfc-pfd-page"),
    ap: $("#gfc-ap-page"),
    map: $("#gfc-map-page")
  };
  const tabs = {
    pfd: $("#gfc-pfd-tab"),
    ap: $("#gfc-ap-tab"),
    map: $("#gfc-map-tab")
  };

  function showPage(which) {
    page = which;

    Object.keys(pages).forEach(k => {
      pages[k].style.display =
        k === which ? (k === "pfd" ? "flex" : "block") : "none";
      tabs[k].style.background = k === which ? "#26394a" : "#1b242e";
    });

    if (which === "map") {
      loadLeaflet();
      setTimeout(() => map && map.invalidateSize(), 180);
    }

    update();
  }

  tabs.pfd.onclick = () => showPage("pfd");
  tabs.ap.onclick = () => showPage("ap");
  tabs.map.onclick = () => {
    userInteracted = false;
    followAircraft = true;
    showPage("map");
  };
  $("#gfc-pfd-back").onclick = () => showPage("ap");

  const canvas = $("#gfc-pfd");
  const ctx = canvas.getContext("2d");

  const number = v => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const valueText = (v, digits = 0) =>
    v === null ? "---" : v.toFixed(digits);

  const pad3 = v =>
    String(Math.round((v % 360 + 360) % 360)).padStart(3, "0");

  /* ---------- PFD ---------- */

  // Classic yellow "bracket" aircraft reference symbol with a centre dot.
  function drawBird(cx, cy, w) {
    const half = w * 0.26;
    const gap = w * 0.085;
    const th = 7;
    const drop = 16;

    const p = new Path2D();

    p.moveTo(cx - half, cy - th / 2);
    p.lineTo(cx - gap, cy - th / 2);
    p.lineTo(cx - gap, cy + drop);
    p.lineTo(cx - gap - th, cy + drop);
    p.lineTo(cx - gap - th, cy + th / 2);
    p.lineTo(cx - half, cy + th / 2);
    p.closePath();

    p.moveTo(cx + half, cy - th / 2);
    p.lineTo(cx + gap, cy - th / 2);
    p.lineTo(cx + gap, cy + drop);
    p.lineTo(cx + gap + th, cy + drop);
    p.lineTo(cx + gap + th, cy + th / 2);
    p.lineTo(cx + half, cy + th / 2);
    p.closePath();

    p.rect(cx - 3.5, cy - 3.5, 7, 7);

    ctx.lineJoin = "miter";
    ctx.lineWidth = 3;
    ctx.strokeStyle = "#000";
    ctx.stroke(p);
    ctx.fillStyle = "#ffd52a";
    ctx.fill(p);
  }

  function drawPFD(d) {
    const r = canvas.getBoundingClientRect();
    if (!r.width || !r.height) return;

    const ratio = window.devicePixelRatio || 1;
    const pw = Math.round(r.width * ratio);
    const ph = Math.round(r.height * ratio);

    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw;
      canvas.height = ph;
    }

    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

    const w = r.width;
    const h = r.height;
    const cx = w / 2;
    const cy = h * 0.47;

    const sgn = INVERT_PFD ? -1 : 1;
    const pitch = (d.pitch ?? 0) * sgn;
    const roll = (d.roll ?? 0) * sgn;
    const k = h * PITCH_PER_DEG; // pixels per degree of pitch

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#080c11";
    ctx.fillRect(0, 0, w, h);

    // Sky, ground, horizon and pitch ladder.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h * 0.88);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(-roll * Math.PI / 180);
    ctx.translate(0, pitch * k);

    ctx.fillStyle = "#079fd8";
    ctx.fillRect(-w * 3, -h * 8, w * 6, h * 8);

    ctx.fillStyle = "#b47b59";
    ctx.fillRect(-w * 3, 0, w * 6, h * 8);

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(-w * 3, 0);
    ctx.lineTo(w * 3, 0);
    ctx.stroke();

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(10, Math.min(14, w * 0.036))}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    for (let deg = -40; deg <= 40; deg += 5) {
      if (!deg) continue;

      const y = -deg * k;
      const major = deg % 10 === 0;
      const len = w * (major ? 0.26 : 0.12);

      ctx.beginPath();
      ctx.moveTo(-len / 2, y);
      ctx.lineTo(len / 2, y);
      ctx.stroke();

      if (major) {
        ctx.fillText(String(Math.abs(deg)), -len / 2 - 14, y);
        ctx.fillText(String(Math.abs(deg)), len / 2 + 14, y);
      }
    }

    ctx.restore();

    // Roll scale (fixed) and bank pointer (rotates with the horizon).
    {
      const R = h * 0.33;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;

      [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60].forEach(a => {
        const rad = a * Math.PI / 180;
        const major = a === 0 || Math.abs(a) === 30 || Math.abs(a) === 60;
        const len = major ? 14 : 8;

        ctx.beginPath();
        ctx.moveTo(Math.sin(rad) * R, -Math.cos(rad) * R);
        ctx.lineTo(Math.sin(rad) * (R - len), -Math.cos(rad) * (R - len));
        ctx.stroke();
      });

      // fixed marker
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.moveTo(0, -R - 1);
      ctx.lineTo(-6, -R - 12);
      ctx.lineTo(6, -R - 12);
      ctx.closePath();
      ctx.fill();

      // bank pointer
      ctx.rotate(-roll * Math.PI / 180);
      ctx.fillStyle = "#ffd52a";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, -R + 2);
      ctx.lineTo(-7, -R + 16);
      ctx.lineTo(7, -R + 16);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.restore();
    }

    // Speed and altitude display boxes.
    const tapeTop = h * 0.34;
    const tapeH = h * 0.28;
    const tapeW = Math.min(w * 0.19, 64);

    ctx.fillStyle = "#07111bd9";
    ctx.fillRect(3, tapeTop + 3, tapeW - 5, tapeH - 6);
    ctx.fillRect(w - tapeW - 2, tapeTop + 3, tapeW - 2, tapeH - 6);

    ctx.strokeStyle = "#f5f7fa";
    ctx.lineWidth = 2;
    ctx.strokeRect(2, tapeTop, tapeW, tapeH);
    ctx.strokeRect(w - tapeW - 2, tapeTop, tapeW, tapeH);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(11, Math.min(16, w * 0.043))}px monospace`;

    ctx.fillText("SPD", tapeW / 2 + 2, tapeTop + tapeH * 0.27);
    ctx.fillText("ALT", w - tapeW / 2 - 2, tapeTop + tapeH * 0.27);

    ctx.font = `bold ${Math.max(12, Math.min(18, w * 0.05))}px monospace`;
    ctx.fillText(valueText(d.ias), tapeW / 2 + 2, tapeTop + tapeH * 0.56);
    ctx.fillText(valueText(d.alt), w - tapeW / 2 - 2, tapeTop + tapeH * 0.56);

    // Aircraft reference symbol ("birdie").
    drawBird(cx, cy, w);

    // Heading strip and flight data.
    const stripY = h * 0.88;
    const stripH = h * 0.105;

    ctx.fillStyle = "#111923";
    ctx.fillRect(0, stripY, w, stripH);

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.17, stripY + 2, w * 0.66, stripH - 4);

    ctx.fillStyle = "#fff";
    ctx.font = `bold ${Math.max(12, Math.min(18, w * 0.05))}px monospace`;

    const heading = d.hdg === null ? "---" : pad3(d.hdg) + "°";

    ctx.fillText("HDG " + heading, cx, stripY + stripH * 0.53);

    ctx.font = "11px monospace";
    ctx.fillStyle = "#c3d1de";
    ctx.fillText(
      `GS ${valueText(d.gs)} KT  •  V/S ${valueText(d.vs)} FPM`,
      cx,
      h * 0.86
    );

    // Autopilot status line.
    if (d.ap && d.ap.on) {
      ctx.fillStyle = "#67d59b";
      ctx.font = "bold 11px monospace";
      ctx.fillText(
        `AP ${d.ap.mode || ""}  HDG ${d.ap.course === null ? "---" : pad3(d.ap.course)}  ALT ${d.ap.altitude === null ? "---" : Math.round(d.ap.altitude)}`,
        cx,
        14
      );
    }

    if (d.pitch === null || d.roll === null) {
      ctx.fillStyle = "#10151c";
      ctx.fillRect(4, 24, w - 8, 20);
      ctx.fillStyle = "#ffcf70";
      ctx.font = "11px monospace";
      ctx.fillText("ATTITUDE DATA UNAVAILABLE", cx, 34);
    }
  }

  /* ---------- AUTOPILOT PAGE ---------- */

  const apApi = () => window.geofs?.autopilot || null;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

  const apRows = [
    {
      key: "course", label: "HEADING", setter: "setCourse", wrap: true,
      steps: [-10, -1, 1, 10]
    },
    {
      key: "altitude", label: "ALTITUDE", setter: "setAltitude",
      min: 0, max: 60000, steps: [-1000, -100, 100, 1000]
    },
    {
      key: "speed", label: "SPEED", setter: "setSpeed",
      min: 0, max: 800, steps: [-10, -1, 1, 10]
    },
    {
      key: "verticalSpeed", label: "VERTICAL SPEED", setter: "setVerticalSpeed",
      min: -6000, max: 6000, steps: [-500, -100, 100, 500]
    }
  ];

  const isMach = ap => ap && ap.speedMode === "mach";

  function stepsFor(row, ap) {
    if (row.key === "speed" && isMach(ap)) return [-0.1, -0.01, 0.01, 0.1];
    return row.steps;
  }

  function fmtAp(row, v, ap) {
    if (v === null || v === undefined || !Number.isFinite(Number(v))) {
      return row.key === "verticalSpeed" ? "AUTO" : "---";
    }
    v = Number(v);
    if (row.key === "course") return pad3(v);
    if (row.key === "speed" && isMach(ap)) return v.toFixed(2);
    return String(Math.round(v));
  }

  let lastD = null;

  function actualFor(row, d) {
    if (!d) return null;
    const ap = apApi();
    if (row.key === "course") return d.hdg;
    if (row.key === "altitude") return d.alt;
    if (row.key === "speed") return isMach(ap) ? d.mach : d.ias;
    return d.vs;
  }

  function apSet(row, val) {
    const ap = apApi();
    const msg = $("#gfc-ap-msg");

    if (!ap || typeof ap[row.setter] !== "function") {
      msg.textContent = "Autopilot not available.";
      return;
    }

    let v = Number(val);
    if (!Number.isFinite(v)) return;

    if (row.wrap) {
      v = ((v % 360) + 360) % 360;
    } else {
      let lo = row.min, hi = row.max;
      if (row.key === "speed" && isMach(ap)) { lo = 0; hi = 3; }
      v = clamp(v, lo, hi);
    }

    if (row.key === "speed" && isMach(ap)) v = Math.round(v * 100) / 100;
    else v = Math.round(v);

    try {
      ap[row.setter](v);
      msg.textContent = "";
    } catch (err) {
      msg.textContent = "Could not set " + row.label + ": " + err.message;
    }

    update();
  }

  const apEls = {};

  function buildAP() {
    const host = $("#gfc-ap-rows");

    apRows.forEach(row => {
      const wrap = document.createElement("div");
      wrap.style.cssText =
        "background:#171f29;border:1px solid #303d4b;border-radius:6px;padding:10px;margin-bottom:10px";

      const head = document.createElement("div");
      head.style.cssText =
        "display:flex;justify-content:space-between;align-items:baseline;gap:8px;flex-wrap:wrap;margin-bottom:8px";
      head.innerHTML = `
        <span style="color:#9eafc0;font-weight:bold;letter-spacing:.5px">${row.label}</span>
        <span style="font:12px monospace;color:#a3b2c2">ACTUAL <b data-a style="color:#fff">---</b></span>
        <span style="font:16px monospace;color:#67d59b">SEL <b data-s>---</b> <small data-u style="color:#8fa0b2"></small></span>`;

      const ctl = document.createElement("div");
      ctl.style.cssText =
        "display:flex;gap:6px;flex-wrap:wrap;align-items:center";

      const mkBtn = i => {
        const b = document.createElement("button");
        b.style.cssText = BTN_SMALL;
        b.onclick = () => {
          const ap = apApi();
          const sel = number(ap?.values?.[row.key]);
          const base = sel ?? number(actualFor(row, lastD)) ?? 0;
          apSet(row, base + stepsFor(row, ap)[i]);
        };
        return b;
      };

      const b0 = mkBtn(0), b1 = mkBtn(1), b2 = mkBtn(2), b3 = mkBtn(3);

      const input = document.createElement("input");
      input.type = "number";
      input.step = "any";
      input.placeholder = "value";
      input.style.cssText =
        "width:90px;padding:6px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px";

      // Keep GeoFS keyboard shortcuts from firing while typing.
      ["keydown", "keyup", "keypress"].forEach(ev =>
        input.addEventListener(ev, e => e.stopPropagation())
      );

      const set = document.createElement("button");
      set.textContent = "SET";
      set.style.cssText = BTN_SMALL;

      const apply = () => {
        if (input.value === "") return;
        apSet(row, input.value);
        input.value = "";
      };

      set.onclick = apply;
      input.addEventListener("keydown", e => {
        if (e.key === "Enter") apply();
      });

      ctl.append(b0, b1, input, set, b2, b3);
      wrap.append(head, ctl);
      host.appendChild(wrap);

      apEls[row.key] = {
        a: head.querySelector("[data-a]"),
        s: head.querySelector("[data-s]"),
        u: head.querySelector("[data-u]"),
        btns: [b0, b1, b2, b3]
      };
    });
  }

  buildAP();

  $("#gfc-ap-toggle").onclick = () => {
    const ap = apApi();
    if (!ap) return;

    try {
      if (ap.on) ap.turnOff();
      else ap.turnOn();
    } catch (err) {
      $("#gfc-ap-msg").textContent = "AP toggle failed: " + err.message;
    }

    update();
  };

  $("#gfc-ap-mode").onchange = e => {
    const ap = apApi();
    try { ap && ap.setMode(e.target.value); } catch (err) {
      $("#gfc-ap-msg").textContent = "Mode change failed: " + err.message;
    }
    update();
  };

  $("#gfc-ap-spdmode").onchange = e => {
    const ap = apApi();
    try { ap && ap.setSpeedMode(e.target.value); } catch (err) {
      $("#gfc-ap-msg").textContent = "Speed unit change failed: " + err.message;
    }
    update();
  };

  $("#gfc-ap-sync").onclick = () => {
    const d = lastD;
    const ap = apApi();
    if (!d || !ap) return;

    if (d.hdg !== null) apSet(apRows[0], d.hdg);
    if (d.alt !== null) apSet(apRows[1], Math.round(d.alt / 100) * 100);

    const spd = isMach(ap) ? d.mach : d.ias;
    if (spd !== null) apSet(apRows[2], spd);
  };

  $("#gfc-ap-vsclr").onclick = () => {
    const ap = apApi();
    if (!ap || !ap.values) return;
    ap.values.verticalSpeed = null;
    update();
  };

  function updateAP(d) {
    if (page !== "ap") return;

    const ap = apApi();
    const tog = $("#gfc-ap-toggle");
    const info = $("#gfc-ap-info");

    if (!ap) {
      $("#gfc-ap-msg").textContent =
        "geofs.autopilot not found. Is a flight loaded?";
      return;
    }

    tog.textContent = ap.on ? "AP ON" : "AP OFF";
    tog.style.background = ap.on ? "#1f6b46" : "#26394a";

    const ms = $("#gfc-ap-mode");
    if (document.activeElement !== ms && ap.mode) ms.value = ap.mode;

    const ss = $("#gfc-ap-spdmode");
    if (document.activeElement !== ss && ap.speedMode) ss.value = ap.speedMode;

    const tvs = number(ap.targetVerticalSpeed);
    info.textContent =
      `STATUS ${ap.on ? "ENGAGED" : "OFF"}  •  MODE ${ap.mode ?? "---"}` +
      (tvs !== null ? `  •  TARGET V/S ${Math.round(tvs)} FPM` : "");

    apRows.forEach(row => {
      const el = apEls[row.key];
      const act = number(actualFor(row, d));

      el.a.textContent =
        act === null ? "---" : fmtAp(row, act, ap);
      el.s.textContent = fmtAp(row, ap.values?.[row.key], ap);

      el.u.textContent =
        row.key === "course" ? "°" :
        row.key === "altitude" ? "ft" :
        row.key === "speed" ? (isMach(ap) ? "M" : "kt") : "fpm";

      stepsFor(row, ap).forEach((s, i) => {
        el.btns[i].textContent = (s > 0 ? "+" : "") + s;
      });
    });
  }

  /* ---------- MAP ---------- */

  function getPosition(values, aircraft) {
    const loc = aircraft?.llaLocation ?? values?.llaLocation;

    const candidates = [
      [values?.latitude, values?.longitude],
      [values?.lat, values?.lon],
      [loc?.[0], loc?.[1]],
      [loc?.lat, loc?.lon],
      [loc?.latitude, loc?.longitude]
    ];

    for (const pair of candidates) {
      const lat = number(pair[0]);
      const lon = number(pair[1]);

      if (
        lat !== null && lon !== null &&
        Math.abs(lat) <= 90 && Math.abs(lon) <= 180
      ) {
        return { lat, lon };
      }
    }

    return null;
  }

  function loadLeaflet() {
    if (map || leafletLoading || leafletLoadFailed) return;

    if (window.L) {
      createMap();
      return;
    }

    leafletLoading = true;

    if (!document.getElementById("gfc-leaflet-css")) {
      const css = document.createElement("link");
      css.id = "gfc-leaflet-css";
      css.rel = "stylesheet";
      css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(css);
    }

    let script = document.getElementById("gfc-leaflet-script");

    if (!script) {
      script = document.createElement("script");
      script.id = "gfc-leaflet-script";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = createMap;

      script.onerror = () => {
        leafletLoading = false;
        leafletLoadFailed = true;
        $("#gfc-map-message").textContent =
          "Map library could not load. Check your connection.";
      };

      document.head.appendChild(script);
    } else {
      script.addEventListener("load", createMap, { once: true });

      script.addEventListener("error", () => {
        leafletLoading = false;
        leafletLoadFailed = true;
      }, { once: true });
    }
  }

  function createMap() {
    leafletLoading = false;

    if (!window.L || map || !$("#gfc-map")) return;

    map = L.map($("#gfc-map"), { zoomControl: true }).setView([20, 78], 4);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>'
    }).addTo(map);

    trail = L.polyline([], {
      color: "#f5c842",
      weight: 3,
      opacity: 0.9
    }).addTo(map);

    map.on("dragstart zoomstart", () => {
      userInteracted = true;
      followAircraft = false;
    });

    setTimeout(() => map && map.invalidateSize(), 180);
  }

  // Top-down airplane drawn as SVG, nose pointing UP (= north at 0°),
  // so rotating by the heading gives the correct direction.
  // (The old ✈ glyph points toward the upper-right, which is why it was off by ~45°.)
  const PLANE_SVG = `
    <svg viewBox="0 0 24 24" width="32" height="32" xmlns="http://www.w3.org/2000/svg">
      <path d="M12 1.5 L13.6 8 L22.5 13 L22.5 15.2 L13.6 12.8 L13.2 19 L16 21 L16 22.5 L12 21.4 L8 22.5 L8 21 L10.8 19 L10.4 12.8 L1.5 15.2 L1.5 13 L10.4 8 Z"
            fill="#ffd43b" stroke="#000" stroke-width="1" stroke-linejoin="round"/>
    </svg>`;

  function updateMap(pos, heading) {
    const msg = $("#gfc-map-message");

    if (!pos) {
      if (!marker) msg.textContent = "Waiting for aircraft position…";
      return;
    }

    if (!map || !window.L) return;

    msg.textContent =
      `LAT ${pos.lat.toFixed(4)}  LON ${pos.lon.toFixed(4)}`;

    const icon = L.divIcon({
      className: "gfc-aircraft-icon",
      html: `<div style="width:32px;height:32px;transform:rotate(${heading === null ? 0 : heading}deg);transform-origin:50% 50%;filter:drop-shadow(0 1px 2px #000)">${PLANE_SVG}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    if (!marker) {
      marker = L.marker([pos.lat, pos.lon], {
        icon,
        title: "Aircraft position"
      }).addTo(map);

      map.setView([pos.lat, pos.lon], 7);
    } else {
      marker.setLatLng([pos.lat, pos.lon]);
      marker.setIcon(icon);
    }

    const point = [pos.lat, pos.lon];

    if (
      !lastPoint ||
      Math.abs(lastPoint[0] - point[0]) +
      Math.abs(lastPoint[1] - point[1]) > 0.00002
    ) {
      points.push(point);
      lastPoint = point;

      if (points.length > 250) points.shift();
      trail.setLatLngs(points);
    }

    if (page === "map" && followAircraft && !userInteracted) {
      map.panTo(point, { animate: false });
    }
  }

  /* ---------- MAIN LOOP ---------- */

  function update() {
    if (!document.getElementById(ID)) {
      clearInterval(timer);
      if (observer) observer.disconnect();
      return;
    }

    const values = window.geofs?.animation?.values;
    const aircraft = window.geofs?.aircraft?.instance;

    if (!values) {
      $("#gfc-status").textContent = "WAITING FOR GEOFS DATA";

      lastD = {
        ias: null, alt: null, hdg: null, gs: null,
        vs: null, pitch: null, roll: null, mach: null, ap: null
      };

      drawPFD(lastD);
      updateAP(lastD);
      updateMap(null, null);
      return;
    }

    const ap = apApi();

    const d = {
      ias: number(values.kias),
      alt: number(values.altitude),
      hdg: number(values.heading360),
      gs: number(values.groundSpeedKnt ?? values.groundSpeed),
      vs: number(values.verticalSpeed),
      pitch: number(values.atilt ?? values.pitch),
      roll: number(values.aroll ?? values.roll),
      mach: number(values.mach),
      ap: ap
        ? {
            on: !!ap.on,
            mode: ap.mode,
            course: number(ap.values?.course),
            altitude: number(ap.values?.altitude),
            speed: number(ap.values?.speed)
          }
        : null
    };

    lastD = d;

    $("#gfc-status").textContent = "GEOFS TELEMETRY CONNECTED";
    $("#gfc-status").style.color = "#86e6b0";

    drawPFD(d);
    updateAP(d);
    updateMap(getPosition(values, aircraft), d.hdg);
  }

  const timer = setInterval(update, 250);

  const observer = typeof ResizeObserver !== "undefined"
    ? new ResizeObserver(() => {
        if (map) map.invalidateSize();
        update();
      })
    : null;

  if (observer) observer.observe(panel);

  // Checklist slot: checklists.js docks itself here (on the PFD page).
  $("#gfc-checklist-slot").innerHTML =
    '<div style="padding:12px;color:#8fa0b2;font-size:12px;border:1px dashed #394654;border-radius:8px">Checklist not loaded.<br>Run <b>checklists.js</b> and it will dock here.</div>';
  document.dispatchEvent(new CustomEvent("gfc:companion-ready"));

  update();
})();
