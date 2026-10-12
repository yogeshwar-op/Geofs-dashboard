
(() => {
  const ID = "geofs-companion";

  // Toggle the dashboard with the bookmarklet.
  if (document.getElementById(ID)) {
    document.getElementById(ID).remove();
    return;
  }

  const panel = document.createElement("div");
  panel.id = ID;
  panel.style.cssText = `
    position:fixed;top:50px;left:30px;z-index:999999;
    width:760px;height:520px;max-width:95vw;max-height:85vh;
    background:#081018;color:white;border:1px solid #456;
    border-radius:8px;overflow:hidden;resize:both;
    font:14px Arial;box-shadow:0 5px 25px #0009;
  `;

  panel.innerHTML = `
    <header id="gfc-title" style="background:#193344;padding:10px;
      cursor:move;font-weight:bold">
      GEOFS COMPANION
      <button id="gfc-close" style="float:right">✕</button>
    </header>
    <div style="display:flex;height:calc(100% - 38px)">
      <canvas id="gfc-pfd" style="width:55%;height:100%"></canvas>
      <div id="gfc-map" style="width:45%;height:100%;background:#15232c">
        <div style="padding:12px">Loading map…</div>
      </div>
    </div>
  `;
  document.body.appendChild(panel);

  panel.querySelector("#gfc-close").onclick = () => panel.remove();

  // Drag the window.
  const bar = panel.querySelector("#gfc-title");
  let drag = null;

  bar.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;
    drag = { x: e.clientX - panel.offsetLeft,
             y: e.clientY - panel.offsetTop };
    bar.setPointerCapture(e.pointerId);
  });
  bar.addEventListener("pointermove", e => {
    if (!drag) return;
    panel.style.left = `${e.clientX - drag.x}px`;
    panel.style.top = `${e.clientY - drag.y}px`;
  });
  bar.addEventListener("pointerup", () => drag = null);
  bar.addEventListener("pointercancel", () => drag = null);

  const canvas = panel.querySelector("#gfc-pfd");
  const ctx = canvas.getContext("2d");

  const num = value => {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  };
  const fmt = (v, digits = 0) =>
    v === null ? "---" : v.toFixed(digits);

  function draw(d) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * scale);
    canvas.height = Math.round(rect.height * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    const w = rect.width, h = rect.height;
    const cx = w / 2, cy = h / 2;
    const r = Math.min(w * 0.31, h * 0.31);

    ctx.fillStyle = "#080d12";
    ctx.fillRect(0, 0, w, h);

    // Artificial horizon.
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(cx, cy);
    ctx.rotate(-(d.roll || 0) * Math.PI / 180);

    const offset = (d.pitch || 0) * r / 30;
    ctx.fillStyle = "#087bb3";
    ctx.fillRect(-r * 2, -r * 2, r * 4, r * 2 + offset);
    ctx.fillStyle = "#85502e";
    ctx.fillRect(-r * 2, offset, r * 4, r * 2);

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-r * 2, offset);
    ctx.lineTo(r * 2, offset);
    ctx.stroke();

    for (let angle = -20; angle <= 20; angle += 10) {
      if (!angle) continue;
      const y = offset - angle * r / 30;
      ctx.beginPath();
      ctx.moveTo(-24, y);
      ctx.lineTo(24, y);
      ctx.stroke();
    }
    ctx.restore();

    // Aircraft reference symbol.
    ctx.strokeStyle = "#ffdc35";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(cx - 38, cy);
    ctx.lineTo(cx - 10, cy);
    ctx.moveTo(cx + 10, cy);
    ctx.lineTo(cx + 38, cy);
    ctx.moveTo(cx, cy - 8);
    ctx.lineTo(cx, cy + 8);
    ctx.stroke();

    // Basic PFD readouts.
    ctx.textAlign = "center";
    ctx.fillStyle = "#9bdcf5";
    ctx.font = "bold 13px Arial";
    ctx.fillText("IAS (KT)", 48, 25);
    ctx.fillText("ALT (FT)", w - 48, 25);

    ctx.fillStyle = "white";
    ctx.font = "bold 17px monospace";
    ctx.fillText(fmt(d.ias), 48, cy + 6);
    ctx.fillText(fmt(d.altitude), w - 48, cy + 6);
    ctx.fillText(
      `HDG ${d.heading === null ? "---" :
        String(Math.round(d.heading)).padStart(3, "0") + "°"}`,
      cx, h - 42
    );

    ctx.font = "12px monospace";
    ctx.fillText(`GS ${fmt(d.gs)} KT`, cx, h - 24);
    ctx.fillText(`V/S ${fmt(d.vs)} FPM`, cx, h - 8);

    ctx.textAlign = "left";
    ctx.fillStyle = d.live ? "#75f0a5" : "#ff8585";
    ctx.fillText(d.live ? "GEOFS DATA FOUND" : "WAITING FOR GEOFS", 8, h - 8);
  }

  // Load Leaflet and OpenStreetMap.
  function setupMap() {
    if (!document.getElementById("gfc-map")) return;

    if (!window.L) {
      if (document.getElementById("gfc-leaflet-script")) return;

      if (!document.getElementById("gfc-leaflet-css")) {
        const css = document.createElement("link");
        css.id = "gfc-leaflet-css";
        css.rel = "stylesheet";
        css.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(css);
      }

      const script = document.createElement("script");
      script.id = "gfc-leaflet-script";
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = setupMap;
      script.onerror = () => {
        const el = document.getElementById("gfc-map");
        if (el) el.textContent = "Map library failed to load.";
      };
      document.head.appendChild(script);
      return;
    }

    const el = document.getElementById("gfc-map");
    if (!el || el.dataset.ready) return;
    el.dataset.ready = "1";
    el.innerHTML = "";

    const map = L.map(el).setView([20, 78], 4);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    let marker = null;
    const track = L.polyline([], { color: "#ffdc35" }).addTo(map);
    const points = [];

    panel._gfcUpdateMap = (lat, lon, heading) => {
      if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

      const icon = L.divIcon({
        className: "",
        html: `<div style="font-size:24px;color:#ffdc35;
          transform:rotate(${heading || 0}deg)">▲</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });

      if (!marker) {
        marker = L.marker([lat, lon], { icon }).addTo(map);
        map.setView([lat, lon], 7);
      } else {
        marker.setLatLng([lat, lon]);
        marker.setIcon(icon);
      }

      points.push([lat, lon]);
      if (points.length > 300) points.shift();
      track.setLatLngs(points);
    };

    setTimeout(() => map.invalidateSize(), 300);
  }

  function findCoordinates(values, aircraft) {
    const candidates = [
      [values?.latitude, values?.longitude],
      [values?.lat, values?.lon],
      [aircraft?.llaLocation?.[0], aircraft?.llaLocation?.[1]],
      [aircraft?.llaLocation?.lat, aircraft?.llaLocation?.lon]
    ];

    for (const [a, b] of candidates) {
      const lat = num(a), lon = num(b);
      if (lat !== null && lon !== null &&
          Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
        return { lat, lon };
      }
    }
    return null;
  }

  function update() {
    if (!document.getElementById(ID)) {
      clearInterval(timer);
      return;
    }

    const values = window.geofs?.animation?.values;
    if (!values) {
      draw({
        live: false, ias: null, altitude: null,
        heading: null, gs: null, vs: null,
        pitch: null, roll: null
      });
      return;
    }

    const aircraft = window.geofs?.aircraft?.instance;
    const d = {
      live: true,
      ias: num(values.kias),
      altitude: num(values.altitude),
      heading: num(values.heading360),
      gs: num(values.groundSpeedKnt ?? values.groundSpeed),
      vs: num(values.verticalSpeed),
      pitch: num(values.atilt ?? values.pitch),
      roll: num(values.aroll ?? values.roll)
    };

    draw(d);

    const pos = findCoordinates(values, aircraft);
    if (pos && panel._gfcUpdateMap) {
      panel._gfcUpdateMap(pos.lat, pos.lon, d.heading);
    }
  }

  setupMap();
  const timer = setInterval(update, 200);
  update();
})();
