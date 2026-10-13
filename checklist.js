
(() => {
  "use strict";

  const ID = "gfc-checklist";
  const old = document.getElementById(ID);

  if (old) {
    old.remove();
    return;
  }

  const phases = [
    {
      name: "PRE-FLIGHT",
      items: [
        "Flight plan reviewed",
        "Weather checked",
        "Aircraft and runway identified",
        "Fuel and payload checked",
        "Briefing completed"
      ]
    },
    {
      name: "BEFORE START",
      items: [
        "Parking brake set",
        "Doors and cabin checked",
        "Beacon light on",
        "Engine start procedure completed"
      ]
    },
    {
      name: "BEFORE TAKEOFF",
      items: [
        "Flight controls checked",
        "Flaps set for takeoff",
        "Trim checked",
        "Takeoff briefing reviewed"
      ]
    },
    {
      name: "CLIMB & CRUISE",
      items: [
        "Positive climb and gear up",
        "After-takeoff checks completed",
        "Cruise altitude checked"
      ]
    },
    {
      name: "DESCENT & APPROACH",
      items: [
        "Descent briefing completed",
        "Approach and runway confirmed",
        "Landing configuration checked"
      ]
    },
    {
      name: "AFTER LANDING",
      items: [
        "Runway vacated",
        "After-landing checks completed",
        "Aircraft secured at stand"
      ]
    }
  ];

  const checked = phases.map(p => p.items.map(() => false));

  const box = document.createElement("aside");
  box.id = ID;
  box.style.cssText =
    "position:fixed;top:60px;right:25px;z-index:999998;width:330px;max-width:90vw;max-height:82vh;overflow:auto;background:#10151c;color:#e8eef5;border:1px solid #3b4857;border-radius:9px;box-shadow:0 10px 32px #000b;font:13px Arial,sans-serif";

  box.innerHTML = `
    <header id="gfc-check-drag" style="position:sticky;top:0;background:#171f29;padding:12px;border-bottom:1px solid #34404d;cursor:move;font-weight:bold;user-select:none">
      FLIGHT CHECKLIST
      <button id="gfc-check-close" style="float:right;background:#293441;color:#fff;border:1px solid #435264;border-radius:4px;cursor:pointer">✕</button>
    </header>
    <div style="padding:12px">
      <label for="gfc-phase" style="display:block;color:#9eafc0;margin-bottom:5px">CHECKLIST PHASE</label>
      <select id="gfc-phase" style="width:100%;padding:8px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px"></select>
      <div id="gfc-progress" style="margin:10px 0;color:#8edbb0;font:12px monospace"></div>
      <div id="gfc-items"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="gfc-reset" style="flex:1;padding:8px;background:#26394a;color:#fff;border:1px solid #50677d;border-radius:5px;cursor:pointer">RESET PHASE</button>
      </div>
      <p style="color:#8fa0b2;font-size:11px;line-height:1.4;margin:12px 0 0">Training aid only. Always follow the checklist for the specific aircraft and simulator.</p>
    </div>`;

  document.body.appendChild(box);

  const $ = s => box.querySelector(s);

  phases.forEach((p, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = p.name;
    $("#gfc-phase").appendChild(option);
  });

  function render() {
    const idx = Number($("#gfc-phase").value) || 0;
    const phase = phases[idx];
    const done = checked[idx].filter(Boolean).length;

    $("#gfc-progress").textContent =
      `${done} / ${phase.items.length} COMPLETE`;

    const list = $("#gfc-items");
    list.innerHTML = "";

    phase.items.forEach((item, j) => {
      const label = document.createElement("label");

      label.style.cssText =
        "display:flex;align-items:flex-start;gap:9px;padding:10px 8px;margin:5px 0;background:#171f29;border:1px solid #303d4b;border-radius:5px;cursor:pointer;line-height:1.35";

      const input = document.createElement("input");
      input.type = "checkbox";
      input.checked = checked[idx][j];
      input.style.cssText =
        "margin-top:2px;accent-color:#67d59b;flex-shrink:0";

      input.addEventListener("change", () => {
        checked[idx][j] = input.checked;
        render();
      });

      const text = document.createElement("span");
      text.textContent = item;

      if (input.checked) {
        text.style.cssText =
          "color:#8fa0b2;text-decoration:line-through";
      }

      label.append(input, text);
      list.appendChild(label);
    });
  }

  $("#gfc-phase").addEventListener("change", render);

  $("#gfc-reset").addEventListener("click", () => {
    const idx = Number($("#gfc-phase").value) || 0;
    checked[idx].fill(false);
    render();
  });

  $("#gfc-check-close").onclick = () => box.remove();

  // Drag the checklist by its title bar.
  const bar = $("#gfc-check-drag");
  let drag = null;

  bar.addEventListener("pointerdown", e => {
    if (e.target.closest("button")) return;

    drag = {
      x: e.clientX - box.offsetLeft,
      y: e.clientY - box.offsetTop
    };

    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", e => {
    if (drag) {
      box.style.left = Math.max(0, e.clientX - drag.x) + "px";
      box.style.right = "auto";
      box.style.top = Math.max(0, e.clientY - drag.y) + "px";
    }
  });

  ["pointerup", "pointercancel"].forEach(ev =>
    bar.addEventListener(ev, () => drag = null)
  );

  render();
})();
