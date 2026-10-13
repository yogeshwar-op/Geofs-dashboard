(() => {
  "use strict";

  // Running the script again toggles the checklist on/off (state is kept).
  const KEY = "__gfcChecklist";
  if (window[KEY]) {
    window[KEY].toggle();
    return;
  }

  const ID = "gfc-checklist";
  const leftover = document.getElementById(ID);
  if (leftover) leftover.remove();

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

  let visible = false;
  let embedded = false;
  let active = null; // { p: phaseIndex, i: itemIndex } while a checklist is running
  let voiceOn = false;

  const FLOAT_CSS =
    "position:fixed;top:60px;right:25px;z-index:999998;width:330px;max-width:90vw;max-height:82vh;overflow:auto;background:#10151c;color:#e8eef5;border:1px solid #3b4857;border-radius:9px;box-shadow:0 10px 32px #000b;font:13px Arial,sans-serif";
  const EMBED_CSS =
    "height:100%;box-sizing:border-box;overflow:auto;background:#10151c;color:#e8eef5;border:1px solid #3b4857;border-radius:8px;font:13px Arial,sans-serif";
  const BTN =
    "flex:1;padding:8px 4px;background:#26394a;color:#fff;border:1px solid #50677d;border-radius:5px;cursor:pointer;font-size:12px";

  const root = document.createElement("aside");
  root.id = ID;

  root.innerHTML = `
    <header id="gfc-check-drag" style="position:sticky;top:0;z-index:2;background:#171f29;padding:12px;border-bottom:1px solid #34404d;cursor:move;font-weight:bold;user-select:none">
      FLIGHT CHECKLIST
      <button id="gfc-check-close" style="float:right;background:#293441;color:#fff;border:1px solid #435264;border-radius:4px;cursor:pointer">✕</button>
    </header>
    <div style="padding:12px">
      <label for="gfc-phase" style="display:block;color:#9eafc0;margin-bottom:5px">CHECKLIST PHASE</label>
      <select id="gfc-phase" style="width:100%;padding:8px;background:#1b242e;color:#edf4fb;border:1px solid #435264;border-radius:5px"></select>
      <div id="gfc-progress" style="margin:10px 0 6px;color:#8edbb0;font:12px monospace"></div>
      <div style="display:flex;gap:6px;margin:8px 0">
        <button id="gfc-start" style="${BTN}">▶ START</button>
        <button id="gfc-check-now" style="${BTN}">✓ CHECK</button>
        <button id="gfc-mic" style="${BTN}">🎤 VOICE OFF</button>
      </div>
      <div id="gfc-voice-status" style="min-height:16px;margin-bottom:6px;color:#a3b2c2;font:11px monospace"></div>
      <div id="gfc-items"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button id="gfc-reset" style="${BTN}">RESET PHASE</button>
        <button id="gfc-stop" style="${BTN}">■ STOP</button>
      </div>
      <p style="color:#8fa0b2;font-size:11px;line-height:1.4;margin:12px 0 0">
        Voice: turn on 🎤, then say <b>"start checklist"</b>. Say <b>"check"</b> for each item, <b>"repeat"</b> to hear it again, <b>"stop checklist"</b> to stop.<br><br>
        Training aid only. Always follow the checklist for the specific aircraft and simulator.
      </p>
    </div>`;

  const $ = s => root.querySelector(s);

  phases.forEach((p, i) => {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = p.name;
    $("#gfc-phase").appendChild(option);
  });

  const selectedPhase = () => Number($("#gfc-phase").value) || 0;

  /* ---------- Rendering ---------- */

  function render() {
    const idx = selectedPhase();
    const phase = phases[idx];
    const done = checked[idx].filter(Boolean).length;

    $("#gfc-progress").textContent =
      `${done} / ${phase.items.length} COMPLETE` +
      (active && active.p === idx ? "  •  RUNNING" : "");

    const list = $("#gfc-items");
    list.innerHTML = "";

    let activeEl = null;

    phase.items.forEach((item, j) => {
      const isActive = active && active.p === idx && active.i === j;

      const label = document.createElement("label");

      label.style.cssText =
        "display:flex;align-items:flex-start;gap:9px;padding:10px 8px;margin:5px 0;border-radius:5px;cursor:pointer;line-height:1.35;" +
        (isActive
          ? "background:#1d3328;border:1px solid #67d59b"
          : "background:#171f29;border:1px solid #303d4b");

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

      if (isActive) activeEl = label;
    });

    if (activeEl) activeEl.scrollIntoView({ block: "nearest" });
  }

  function setVoiceStatus(text) {
    $("#gfc-voice-status").textContent = text;
  }

  function updateMicButton() {
    $("#gfc-mic").textContent = voiceOn ? "🎤 VOICE ON" : "🎤 VOICE OFF";
    $("#gfc-mic").style.background = voiceOn ? "#1f6b46" : "#26394a";
  }

  /* ---------- Speech output ---------- */

  const synth = window.speechSynthesis;
  let speaking = false;
  let speakId = 0;

  function say(text) {
    if (!synth) return;

    const id = ++speakId;
    synth.cancel();

    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1;

    speaking = true;
    pauseRecognition(); // so the mic doesn't hear the checklist read-out

    const finish = () => {
      if (id !== speakId) return; // a newer announcement replaced this one
      speaking = false;
      resumeRecognition();
    };

    u.onend = finish;
    u.onerror = finish;
    synth.speak(u);
  }

  /* ---------- Speech recognition ---------- */

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null;
  let recRunning = false;

  function startRecognition() {
    if (!SR || !voiceOn || speaking || recRunning) return;

    if (!root.isConnected) {
      voiceOn = false;
      updateMicButton();
      return;
    }

    rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";

    rec.onresult = e => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) handleSpeech(e.results[i][0].transcript);
      }
    };

    rec.onerror = e => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        voiceOn = false;
        updateMicButton();
        setVoiceStatus("Microphone blocked. Allow mic access for this site.");
      }
    };

    rec.onend = () => {
      recRunning = false;
      if (voiceOn && !speaking) setTimeout(startRecognition, 250);
    };

    try {
      rec.start();
      recRunning = true;
    } catch (err) {
      recRunning = false;
    }
  }

  function pauseRecognition() {
    if (rec && recRunning) {
      try { rec.abort(); } catch (err) { /* ignore */ }
    }
  }

  function resumeRecognition() {
    if (voiceOn) setTimeout(startRecognition, 400);
  }

  function setVoice(on) {
    if (on && !SR) {
      setVoiceStatus("Voice commands need Chrome or Edge. Use the buttons instead.");
      return;
    }

    voiceOn = on;
    updateMicButton();

    if (on) {
      setVoiceStatus("Listening… say \"start checklist\"");
      startRecognition();
    } else {
      setVoiceStatus("");
      pauseRecognition();
    }
  }

  /* ---------- Checklist flow ---------- */

  function nextUnchecked(p, from) {
    const n = phases[p].items.length;

    for (let k = 1; k <= n; k++) {
      const j = (from + k) % n;
      if (!checked[p][j]) return j;
    }

    return -1;
  }

  function startChecklist() {
    const p = selectedPhase();

    if (checked[p].every(Boolean)) checked[p].fill(false);

    const first = checked[p].findIndex(v => !v);
    active = { p, i: first };
    render();

    say(`${phases[p].name} checklist. ${phases[p].items[first]}`);
  }

  function checkCurrent() {
    if (!active) {
      setVoiceStatus("No checklist running. Say \"start checklist\".");
      return;
    }

    const { p, i } = active;
    checked[p][i] = true;

    const next = nextUnchecked(p, i);

    if (next === -1) {
      active = null;

      // Line up the next phase so "start checklist" begins it.
      if (p < phases.length - 1) $("#gfc-phase").value = p + 1;

      render();
      say(`${phases[p].name} checklist complete.`);
    } else {
      active.i = next;
      render();
      say(phases[p].items[next]);
    }
  }

  function repeatItem() {
    if (!active) return;
    say(phases[active.p].items[active.i]);
  }

  function stopChecklist() {
    if (!active) return;
    active = null;
    render();
    say("Checklist stopped.");
  }

  function handleSpeech(raw) {
    const t = raw.toLowerCase().replace(/[^a-z ]/g, " ").replace(/\s+/g, " ").trim();
    if (!t) return;

    setVoiceStatus(`Heard: "${t}"`);

    if (/\b(start|begin|run)\b.*\bcheck ?list\b/.test(t)) return startChecklist();
    if (/\b(stop|cancel|end|abort)\b.*\bcheck ?list\b/.test(t)) return stopChecklist();
    if (/\b(repeat|say again)\b/.test(t)) return repeatItem();

    // Short utterances only, so long sentences never trigger a check by accident.
    const words = t.split(" ");
    if (
      words.length <= 3 &&
      words.some(w => ["check", "checked", "checks", "czech"].includes(w))
    ) {
      return checkCurrent();
    }
  }

  /* ---------- Buttons ---------- */

  $("#gfc-phase").addEventListener("change", () => {
    active = null;
    if (synth) { speakId++; synth.cancel(); speaking = false; }
    render();
  });

  $("#gfc-reset").addEventListener("click", () => {
    const idx = selectedPhase();
    checked[idx].fill(false);
    if (active && active.p === idx) active = null;
    render();
  });

  $("#gfc-start").addEventListener("click", () => {
    if (SR && !voiceOn) setVoice(true);
    startChecklist();
  });

  $("#gfc-check-now").addEventListener("click", checkCurrent);
  $("#gfc-stop").addEventListener("click", stopChecklist);
  $("#gfc-mic").addEventListener("click", () => setVoice(!voiceOn));

  $("#gfc-check-close").onclick = () => api.hide();

  // Drag the checklist by its title bar (floating mode only).
  const bar = $("#gfc-check-drag");
  let drag = null;

  bar.addEventListener("pointerdown", e => {
    if (embedded || e.target.closest("button")) return;

    drag = {
      x: e.clientX - root.offsetLeft,
      y: e.clientY - root.offsetTop
    };

    bar.setPointerCapture(e.pointerId);
  });

  bar.addEventListener("pointermove", e => {
    if (drag) {
      root.style.left = Math.max(0, e.clientX - drag.x) + "px";
      root.style.right = "auto";
      root.style.top = Math.max(0, e.clientY - drag.y) + "px";
    }
  });

  ["pointerup", "pointercancel"].forEach(ev =>
    bar.addEventListener(ev, () => drag = null)
  );

  /* ---------- Mounting (docks into the GeoFS Companion PFD page) ---------- */

  function mount() {
    const slot = document.getElementById("gfc-checklist-slot");

    if (slot) {
      embedded = true;
      slot.textContent = "";
      slot.appendChild(root);
      root.style.cssText = EMBED_CSS;
      bar.style.cursor = "default";
      $("#gfc-check-close").style.display = "none";
    } else {
      embedded = false;
      document.body.appendChild(root);
      root.style.cssText = FLOAT_CSS;
      bar.style.cursor = "move";
      $("#gfc-check-close").style.display = "";
    }

    updateMicButton();
  }

  // The companion announces itself when it opens; dock into it.
  document.addEventListener("gfc:companion-ready", () => {
    if (visible) mount();
  });

  const api = {
    show() {
      visible = true;
      mount();
      render();
    },

    hide() {
      visible = false;
      active = null;
      setVoice(false);
      if (synth) { speakId++; synth.cancel(); speaking = false; }

      root.remove();

      const slot = document.getElementById("gfc-checklist-slot");
      if (slot) {
        slot.innerHTML =
          '<div style="padding:12px;color:#8fa0b2;font-size:12px;border:1px dashed #394654;border-radius:8px">Checklist closed.<br>Run <b>checklists.js</b> again to bring it back.</div>';
      }
    },

    toggle() {
      if (visible && root.isConnected) api.hide();
      else api.show();
    }
  };

  window[KEY] = api;
  api.show();
})();
