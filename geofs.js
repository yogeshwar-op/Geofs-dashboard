
(() => {
  "use strict";

  const ID = "geofs-companion";
  const previous = document.getElementById(ID);
  if (previous) {
    previous.remove();
    return;
  }

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
      <button id="gfc-pfd-tab" style="padding:7px 12px;background:#26394a;color:#fff;border:1px solid #6c8ba6;border-radius:5px;cursor:pointer">PFD</button>
      <button id="gfc-map-tab" style="padding:7px 12px;background:#1b242e;color:#d8e2ed;border:1px solid #394654;border-radius:5px;cursor:pointer">NEXT PAGE → MAP</button>
      <span id="gfc-status" style="margin-left:auto;color:#a3b2c2;font:11px monospace">WAITING FOR GEOFS DATA</span>
    </nav>
    <main id="gfc-pfd-page" style="height:calc(100% - 94px);box-sizing:border-box;padding:12px;display:flex;justify-content:center;align-items:center;background:#0d1218;overflow:auto">
      <div style="width:min(100%,390px);height:100%;min-height:300px;max-height:530px;aspect-ratio:.66;border:4px solid #050608;box-sizing:border-box;background:#080c11;overflow:hidden;flex-shrink:0">
        <canvas id="gfc-pfd" style="display:block;width:100%;height:100%"></canvas>
      </div>
    </main>
    <main id="gfc-map-page" style="display:none;height:calc(100% - 94px);position:relative;background:#111821">
      <div id="gfc-map" style="position:absolute;inset:0;background:#17212b"></div>
      <div id="gfc-map-message" style="position:absolute;z-index:500;left:12px;top:12px;background:#10151cdd;color:#dce7f2;padding:8px 10px;border:1px solid #394654;border-radius:5px">Waiting for aircraft position…</div>
      <button id="gfc-pfd-back" style="position:absolute;z-index:600;right:12px;top:12px;background:#172330;color:white;border:1px solid #52677c;border-radius:5px;padding:8px 12px;cursor:pointer">← PFD</button>
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

  const pfdPage = $("#gfc-pfd-page");
  const mapPage = $("#gfc-map-page");

  function showPage(which) {
    page = which;
    pfdPage.style.display = which === "pfd" ? "flex" : "none";
    mapPage.style.display = which === "map" ? "block" : "none";

    $("#gfc-pfd-tab").style.background =
      which === "pfd" ? "#26394a" : "#1b242e";
    $("#gfc-map-tab").style.background =
      which === "map" ? "#26394a" : "#1b242e";

    if (which === "map") {
      loadLeaflet();
      setTimeout(() => map && map.invalidateSize(), 180);
    }
  }

  $("#gfc-pfd-tab").onclick = () => showPage("pfd");

  $("#gfc-map-tab").onclick = () => {
    userInteracted = false;
    followAircraft = true;
    showPage("map");
  };

  $("#gfc-pfd-back").onclick = () => showPage("pfd");

  const canvas = $("#gfc-pfd");
  const ctx = canvas.getContext("2d");

  const number = v => {
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };

  const valueText = (v, digits = 0) =>
    v === null ? "---" : v.toFixed(digits);

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

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "#080c11";
    ctx.fillRect(0, 0, w, h);

    // Sky, ground, horizon and pitch marks.
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, w, h * 0.88);
    ctx.clip();

    ctx.translate(cx, cy);
    ctx.rotate(-(d.roll ?? 0) * Math.PI / 180);
    ctx.translate(0, (d.pitch ?? 0) * h / 70);

    ctx.fillStyle = "#079fd8";
    ctx.fillRect(-w * 2, -h * 2, w * 4, h * 2);

    ctx.fillStyle = "#b47b59";
    ctx.fillRect(-w * 2, 0, w * 4, h * 2);

    ctx.strokeStyle = "#f4f7fb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-w * 2, 0);
    ctx.lineTo(w * 2, 0);
    ctx.stroke();

    ctx.lineWidth = 2.5;

    for (let i = -3; i <= 3; i++) {
      if (!i) continue;

      const y = -i * h * 0.075;
      const len = w * 0.37;

      ctx.beginPath();
      ctx.moveTo(-len / 2, y);
      ctx.lineTo(len / 2, y);
      ctx.stroke();
    }

    ctx.restore();

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

    // Yellow aircraft / flight-director cue.
    ctx.strokeStyle = "#ffd52a";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.moveTo(cx - w * 0.23, cy);
    ctx.lineTo(cx - w * 0.045, cy);
    ctx.moveTo(cx + w * 0.045, cy);
    ctx.lineTo(cx + w * 0.23, cy);
    ctx.moveTo(cx - w * 0.04, cy - 4);
    ctx.lineTo(cx - w * 0.04, cy + 22);
    ctx.moveTo(cx + w * 0.04, cy - 4);
    ctx.lineTo(cx + w * 0.055, cy + 22);
    ctx.stroke();

    ctx.lineCap = "butt";

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

    const heading = d.hdg === null
      ? "---"
      : String(Math.round((d.hdg % 360 + 360) % 360)).padStart(3, "0") + "°";

    ctx.fillText("HDG " + heading, cx, stripY + stripH * 0.53);

    ctx.font = "11px monospace";
    ctx.fillStyle = "#c3d1de";
    ctx.fillText(
      `GS ${valueText(d.gs)} KT  •  V/S ${valueText(d.vs)} FPM`,
      cx,
      h * 0.86
    );

    if (d.pitch === null || d.roll === null) {
      ctx.fillStyle = "#10151c";
      ctx.fillRect(4, 4, w - 8, 20);
      ctx.fillStyle = "#ffcf70";
      ctx.font = "11px monospace";
      ctx.fillText("ATTITUDE DATA UNAVAILABLE", cx, 14);
    }
  }

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
      html: `<div style="width:30px;height:34px;display:flex;align-items:center;justify-content:center;transform:rotate(${heading === null ? 0 : heading}deg);filter:drop-shadow(0 1px 2px #000);color:#ffd43b;font-size:29px;line-height:1">✈</div>`,
      iconSize: [30, 34],
      iconAnchor: [15, 17]
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

      drawPFD({
        ias: null,
        alt: null,
        hdg: null,
        gs: null,
        vs: null,
        pitch: null,
        roll: null
      });

      updateMap(null, null);
      return;
    }

    const d = {
      ias: number(values.kias),
      alt: number(values.altitude),
      hdg: number(values.heading360),
      gs: number(values.groundSpeedKnt ?? values.groundSpeed),
      vs: number(values.verticalSpeed),
      pitch: number(values.atilt ?? values.pitch),
      roll: number(values.aroll ?? values.roll)
    };

    $("#gfc-status").textContent = "GEOFS TELEMETRY CONNECTED";
    $("#gfc-status").style.color = "#86e6b0";

    drawPFD(d);
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
  update();
})();
