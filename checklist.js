
(() => {
  const ID = "gfc-checklist";

  if (document.getElementById(ID)) {
    document.getElementById(ID).remove();
    return;
  }

  const phases = {
    "PRE-FLIGHT": [
      "Flight plan reviewed",
      "Weather checked",
      "Aircraft and runway identified",
      "Fuel and payload checked",
      "Briefing completed"
    ],
    "BEFORE START": [
      "Parking brake set",
      "Doors and cabin checked",
      "Beacon light on",
      "Engine start procedure completed"
    ],
    "BEFORE TAKEOFF": [
      "Flight controls checked",
      "Flaps set for takeoff",
      "Trim checked",
      "Takeoff briefing reviewed"
    ],
    "CLIMB & CRUISE": [
      "Positive climb and gear up",
      "After-takeoff checks completed",
      "Cruise altitude checked"
    ],
    "DESCENT & APPROACH": [
      "Descent briefing completed",
      "Approach and runway confirmed",
      "Landing configuration checked"
    ],
    "AFTER LANDING": [
      "Runway vacated",
      "After-landing checks completed",
      "Aircraft secured at stand"
    ]
  };

  const panel = document.createElement("section");
  panel.id = ID;
  panel.style.cssText = `
    position:fixed;top:80px;right:20px;z-index:1000000;
    width:320px;max-width:90vw;max-height:80vh;overflow:auto;
    background:#101820;color:#eaf4fa;border:1px solid #526b7b;
    border-radius:10px;padding:12px;font:14px Arial;
    box-shadow:0 8px 28px #0009;
  `;

  panel.innerHTML = `
    <header style="display:flex;justify-content:space-between;
      align-items:center;background:#203644;padding:10px;
      margin:-12px -12px 12px;font-weight:bold">
      FLIGHT CHECKLIST
      <button id="gfc-cl-close">✕</button>
    </header>
    <label for="gfc-cl-phase">Flight phase</label>
    <select id="gfc-cl-phase" style="width:100%;padding:8px;margin:8px 0;
      background:#1d2b35;color:white"></select>
    <div id="gfc-cl-progress" style="margin:8px 0;color:#8fd7ff"></div>
    <div id="gfc-cl-items"></div>
    <button id="gfc-cl-reset" style="margin-top:12px;padding:8px;width:100%">
      Reset this phase
    </button>
    <p style="font-size:11px;color:#a9bac5">
      Simulation aid only. Confirm procedures against the aircraft's
      appropriate checklist.
    </p>
  `;

  document.body.appendChild(panel);

  const select = panel.querySelector("#gfc-cl-phase");
  const items = panel.querySelector("#gfc-cl-items");
  const progress = panel.querySelector("#gfc-cl-progress");
  const state = {};

  for (const phase of Object.keys(phases)) {
    state[phase] = phases[phase].map(() => false);
    const option = document.createElement("option");
    option.value = phase;
    option.textContent = phase;
    select.appendChild(option);
  }

  function render() {
    const phase = select.value;
    items.replaceChildren();

    phases[phase].forEach((label, index) => {
      const row = document.createElement("label");
      row.style.cssText =
        "display:flex;gap:9px;align-items:flex-start;padding:9px 3px;" +
        "border-bottom:1px solid #293944;cursor:pointer";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = state[phase][index];
      checkbox.style.marginTop = "2px";
      checkbox.addEventListener("change", () => {
        state[phase][index] = checkbox.checked;
        render();
      });

      const text = document.createElement("span");
      text.textContent = label;
      if (checkbox.checked) {
        text.style.color = "#80e6a2";
        text.style.textDecoration = "line-through";
      }

      row.append(checkbox, text);
      items.appendChild(row);
    });

    const done = state[phase].filter(Boolean).length;
    progress.textContent = `${done} / ${phases[phase].length} completed`;
  }

  select.addEventListener("change", render);
  panel.querySelector("#gfc-cl-reset").onclick = () => {
    state[select.value].fill(false);
    render();
  };
  panel.querySelector("#gfc-cl-close").onclick = () => panel.remove();

  render();
})();
