module.exports = function(RED) {
  function Nhc2HueMappingNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // === Config ===
    const numberMode = (config.mode || "brightness"); // brightness | temperature | color
    const statusQuiet = !!config.statusQuiet;
    const acceptColorFrames = !!config.acceptColorFrames;
    const colorAffectsBrightness = !!config.colorAffectsBrightness; // if false, color input won't overwrite brightness or emit brightness
    const autoIncludeCtInWhiteMode = (config.autoIncludeCtInWhiteMode !== false); // default true for Hue
    const mapKelvinRangeToHueFull = (config.mapKelvinRangeToHueFull !== false);   // default true
    const minKelvinCfg = Number.isFinite(+config.minKelvin) ? +config.minKelvin : 2700;
    const maxKelvinCfg = Number.isFinite(+config.maxKelvin) ? +config.maxKelvin : 6500;
    const listenColorMode = (config.listenColorMode !== false); // default true

    // Hue uses mireds in [153..500]
    const HUE_MIRED_MIN = 153;
    const HUE_MIRED_MAX = 500;

    // === Helpers ===
    function setStatus(text, ok=true){
      if (statusQuiet) return;
      node.status({ fill: ok?'green':'yellow', shape: ok?'dot':'ring', text });
    }
    const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
    const round = (n) => Math.round(n);
    function fromAnyToPct(x){
      const v = +x;
      if (!isFinite(v)) return null;
      // Accept 0..100 or 0..1000 where 1000 means 100%
      return v <= 100 ? clamp(round(v), 0, 100) : clamp(round(v/10), 0, 100);
    }
    function hsvToRgb(h, s, v){
      // h: 0..360, s:0..100, v:0..100
      h = ((+h % 360) + 360) % 360;
      s = clamp(+s,0,100)/100;
      v = clamp(+v,0,100)/100;
      const c = v * s;
      const x = c * (1 - Math.abs(((h/60)%2) - 1));
      const m = v - c;
      let rp=0,gp=0,bp=0;
      if (h < 60){ rp=c; gp=x; bp=0; }
      else if (h < 120){ rp=x; gp=c; bp=0; }
      else if (h < 180){ rp=0; gp=c; bp=x; }
      else if (h < 240){ rp=0; gp=x; bp=c; }
      else if (h < 300){ rp=x; gp=0; bp=c; }
      else { rp=c; gp=0; bp=x; }
      const to255 = t => clamp(round((t+m)*255),0,255);
      return [to255(rp), to255(gp), to255(bp)];
    }
    function rgbToHsv(r,g,b){
      r/=255; g/=255; b/=255;
      const max=Math.max(r,g,b), min=Math.min(r,g+b);
      const max2=Math.max(r,g,b), min2=Math.min(r,g,b);
      // Fix: previous typo g+b; use min2
      const d=max2-min2;
      let h=0;
      if (d) {
        switch(max2){
          case r: h = 60*(((g-b)/d)%6); break;
          case g: h = 60*(((b-r)/d)+2); break;
          case b: h = 60*(((r-g)/d)+4); break;
        }
      }
      if (h<0) h+=360;
      const s = max2===0 ? 0 : (d/max2)*100;
      const v = max2*100;
      return [round(h), round(s), round(v)];
    }
    function normalizeMode(s){
      if (!s) return undefined;
      const v=String(s).trim().toLowerCase();
      if (v==="color"||v==="colour"||v==="rgb") return "colour";
      if (v==="tunablewhite"||v==="white"||v==="ct"||v==="cwww") return "white";
      return undefined;
    }
    const kelvinToMireds = (k) => round(1e6 / Math.max(1,+k));
    const miredsToKelvin = (m) => round(1e6 / Math.max(1,+m));

    function kelvinToHueMiredsLinear(k, minK, maxK){
      // Map linearly: minK -> 500, maxK -> 153
      const lo = Math.min(minK, maxK);
      const hi = Math.max(minK, maxK);
      const kk = clamp(round(+k), lo, hi);
      const span = hi - lo;
      if (span <= 0) return HUE_MIRED_MIN; // degenerate; pick cooler end
      const t = (kk - lo) / span; // 0..1
      return round(HUE_MIRED_MAX + (HUE_MIRED_MIN - HUE_MIRED_MAX) * t);
    }
    function kelvinToHueMiredsPhysical(k){
      return clamp(kelvinToMireds(k), HUE_MIRED_MIN, HUE_MIRED_MAX);
    }
    function toHueMiredsFromKelvin(k, minK, maxK){
      return mapKelvinRangeToHueFull ? kelvinToHueMiredsLinear(k, minK, maxK)
                                     : kelvinToHueMiredsPhysical(k);
    }
    function toHueMiredsFromMireds(m){
      return clamp(round(+m), HUE_MIRED_MIN, HUE_MIRED_MAX);
    }
    const clampKelvin = (k, minK, maxK) => clamp(round(+k), Math.min(minK,maxK), Math.max(minK,maxK));

    // === Persistent state ===
    let state = node.context().get('hueMapState') || {
      mode: null,
      brightnessPct: 100,
      kelvin: 4000,
      hsv: { h:0, s:100, v:100 }
    };

    // === Main handler ===
    node.on('input', function(msg, send, done){
      try {
        const p = (msg && msg.payload != null) ? msg.payload : {};
        const out = {}; // Hue-friendly payload
        let haveAny = false;
        let wantOn;
        let requestedMode;
        const minK = Number.isFinite(+msg.minKelvin)?+msg.minKelvin:minKelvinCfg;
        const maxK = Number.isFinite(+msg.maxKelvin)?+msg.maxKelvin:maxKelvinCfg;

        // === ON/OFF normalization ===
        if (typeof p === 'boolean') { wantOn = !!p; }
        else if (p && (typeof p.switch !== "undefined")) { wantOn = !!p.switch; }
        else if (p && (typeof p.on !== "undefined")) { wantOn = !!p.on; }
        else if (p && (p.Status !== undefined && p.Status !== null)) {
          const s = (typeof p.Status === 'string') ? p.Status.trim().toLowerCase() : p.Status;
          if (s==='on'||s==='true'||s==='1'||s===1||s===true) wantOn = true;
          if (s==='off'||s==='false'||s==='0'||s===0||s===false) wantOn = false;
        }

        // === MODE selection (optional) ===
        if (listenColorMode && p && p.ColorMode != null) { const m=normalizeMode(p.ColorMode); if (m){ requestedMode=m; haveAny=true; } }
        if (p && p.mode      != null) { const m=normalizeMode(p.mode);      if (m){ requestedMode=m; haveAny=true; } }

        // === Brightness === (explicit property only)
        let bPct = null;
        if (p && p.brightness !== undefined && p.brightness !== null && p.brightness !== '') bPct = fromAnyToPct(p.brightness);
        if (bPct == null && p && p.Brightness !== undefined && p.Brightness !== null && p.Brightness !== '') bPct = fromAnyToPct(p.Brightness);
        if (bPct != null) { out.brightness = bPct; haveAny=true; state.brightnessPct=bPct; if (wantOn===undefined) wantOn = (bPct>0); }

        // === TunableWhite (string cwww(kelvin, <ignored>)) ===
        if (p && typeof p.TunableWhite === 'string') {
          const m = p.TunableWhite.match(/cwww\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i);
          if (m) {
            const kIn = clampKelvin(m[1], minK, maxK);
            out.colorTemp = toHueMiredsFromKelvin(kIn, minK, maxK);
            state.kelvin = kIn;
            requestedMode = requestedMode || "white";
            haveAny = true;
            if (wantOn === undefined) wantOn = true;
          }
        }

        // === Temperature (0..100 or kelvin) ===
        if (p && p.temperature !== undefined && p.temperature !== null && p.temperature !== '') {
          const v = +p.temperature;
          if (isFinite(v)) {
            let kelvin;
            if (v <= 100) { // percentage in the configured K-range
              const t = clamp(v,0,100)/100;
              kelvin = round(Math.min(minK,maxK) + t * Math.abs(maxK - minK));
            } else {
              kelvin = clamp(round(v), Math.min(minK,maxK), Math.max(minK,maxK));
            }
            out.colorTemp = toHueMiredsFromKelvin(kelvin, minK, maxK);
            state.kelvin = kelvin;
            requestedMode = requestedMode || "white";
            haveAny = true;
            if (wantOn === undefined) wantOn = true;
          }
        }

        // === CT frames ===
        if (acceptColorFrames && p && typeof p === 'object' && !Array.isArray(p)) {
          if (p.kelvin != null && out.colorTemp == null) {
            const k = clampKelvin(p.kelvin, minK, maxK);
            out.colorTemp = toHueMiredsFromKelvin(k, minK, maxK);
            state.kelvin = k; requestedMode = requestedMode || "white"; haveAny=true;
            if (wantOn === undefined) wantOn = true;
          } else if (p.mireds != null && out.colorTemp == null) {
            const mval = toHueMiredsFromMireds(p.mireds);
            out.colorTemp = mval;
            state.kelvin = miredsToKelvin(mval); requestedMode = requestedMode || "white"; haveAny=true;
            if (wantOn === undefined) wantOn = true;
          }
        }

        // === Color (string "hsv(h,s,v)" or "rgb(r,g,b)") ===
        let colorProvided = false;
        if (p && typeof p.Color === 'string') {
          let m = p.Color.match(/hsv\(\s*([0-9.]+)\s*,\s*([0-9.]+)\s*,\s*([0-9.]+)\s*\)/i);
          if (m) {
            const H = clamp(+m[1],0,360), S = clamp(+m[2],0,100), V = clamp(+m[3],0,100);
            const rgb = hsvToRgb(H,S,V);
            out.rgb = rgb;
            if (bPct == null && colorAffectsBrightness) { out.brightness = round(V); state.brightnessPct = out.brightness; }
            state.hsv = { h:H, s:S, v:(bPct != null ? bPct : (colorAffectsBrightness?V:state.hsv.v)) };
            requestedMode = "colour"; colorProvided = true; haveAny = true; if (wantOn===undefined) wantOn = true;
          } else {
            m = p.Color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
            if (m) {
              const r = clamp(parseInt(m[1],10),0,255);
              const g = clamp(parseInt(m[2],10),0,255);
              const b = clamp(parseInt(m[3],10),0,255);
              out.rgb = [r,g,b];
              const [h,s,v] = rgbToHsv(r,g,b);
              if (bPct == null && colorAffectsBrightness) { out.brightness = round(v); state.brightnessPct = out.brightness; }
              state.hsv = { h, s, v:(bPct != null ? bPct : (colorAffectsBrightness?v:state.hsv.v)) };
              requestedMode = "colour"; colorProvided = true; haveAny=true; if (wantOn===undefined) wantOn = true;
            }
          }
        }

        // === Color frames (RGB/HSV objects) ===
        if (acceptColorFrames && p && typeof p === 'object' && !Array.isArray(p)) {
          if (!colorProvided) {
            if (Array.isArray(p.rgb) && p.rgb.length===3) {
              const [r,g,b] = p.rgb.map(x=>clamp(+x,0,255));
              out.rgb = [r,g,b];
              const [h,s,v]=rgbToHsv(r,g,b);
              if (bPct==null && out.brightness==null && colorAffectsBrightness){ out.brightness=round(v); state.brightnessPct=out.brightness; }
              state.hsv = {h,s,v:(bPct != null ? bPct : (colorAffectsBrightness?v:state.hsv.v))};
              requestedMode="colour"; haveAny=true; if (wantOn===undefined) wantOn = true;
            } else if ((p.r!=null)&&(p.g!=null)&&(p.b!=null)) {
              const r = clamp(+p.r,0,255), g=clamp(+p.g,0,255), b=clamp(+p.b,0,255);
              out.rgb=[r,g,b];
              const [h,s,v]=rgbToHsv(r,g,b);
              if (bPct==null && out.brightness==null && colorAffectsBrightness){ out.brightness=round(v); state.brightnessPct=out.brightness; }
              state.hsv = {h,s,v:(bPct != null ? bPct : (colorAffectsBrightness?v:state.hsv.v))};
              requestedMode="colour"; haveAny=true; if (wantOn===undefined) wantOn = true;
            } else if ((p.h!=null)&&(p.s!=null)&&(p.v!=null)) {
              const H=clamp(+p.h,0,360), S=clamp(+p.s,0,100), V=clamp(+p.v,0,100);
              const rgb = hsvToRgb(H,S,V);
              out.rgb=rgb;
              if (bPct==null && out.brightness==null && colorAffectsBrightness){ out.brightness=round(V); state.brightnessPct=out.brightness; }
              state.hsv={h:H,s:S,v:(bPct != null ? bPct : (colorAffectsBrightness?V:state.hsv.v))};
              requestedMode="colour"; haveAny=true; if (wantOn===undefined) wantOn = true;
            } else if ((p.hue!=null)&&(p.sat!=null)&&(p.val!=null)) {
              const H=clamp(+p.hue,0,360), S=clamp(+p.sat,0,100), V=clamp(+p.val,0,100);
              const rgb = hsvToRgb(H,S,V);
              out.rgb=rgb;
              if (bPct==null && out.brightness==null && colorAffectsBrightness){ out.brightness=round(V); state.brightnessPct=out.brightness; }
              state.hsv={h:H,s:S,v:(bPct != null ? bPct : (colorAffectsBrightness?V:state.hsv.v))};
              requestedMode="colour"; haveAny=true; if (wantOn===undefined) wantOn = true;
            }
          }
        }

        // === Determine final mode & carry brightness across switches ===
        const prevMode = state.mode;
        let mode = requestedMode || prevMode;
        const brightnessProvidedThisMsg =
          (bPct != null) || colorProvided ||
          (p && typeof p.TunableWhite === 'string') ||
          (p && p.temperature !== undefined && p.temperature !== null && p.temperature !== '');

        if (requestedMode && prevMode && requestedMode !== prevMode && !brightnessProvidedThisMsg) {
          // carry last brightness
          if (out.brightness == null) out.brightness = state.brightnessPct;
          haveAny = true;
          if (wantOn === undefined) wantOn = state.brightnessPct > 0;
        }

        // === Clean payload & ensure proper fields per mode ===
        if (mode === "white") {
          delete out.rgb;
          if (autoIncludeCtInWhiteMode && out.colorTemp==null) {
            const k = clampKelvin(state.kelvin, minK, maxK);
            out.colorTemp = toHueMiredsFromKelvin(k, minK, maxK);
            haveAny = true;
          }
        } else if (mode === "colour") {
          delete out.colorTemp;
          if (out.rgb == null) {
            const rgb = hsvToRgb(state.hsv.h, state.hsv.s, state.hsv.v);
            out.rgb = rgb;
            if (out.brightness == null && colorAffectsBrightness) { out.brightness = state.brightnessPct; }
            haveAny = true;
          }
        }

        // === Bare number / string shortcuts ===
        if (!haveAny) {
          if (typeof p === "number" && isFinite(p)) {
            const val = clamp(round(p), 0, 100);
            if (numberMode === "brightness") {
              out.brightness = val; haveAny=true; wantOn = (wantOn===undefined) ? val>0 : wantOn;
            } else if (numberMode === "temperature") {
              const base = Math.min(minK,maxK);
              const span = Math.abs(maxK - minK);
              const kelvin = round(base + (val/100)*span);
              out.colorTemp = toHueMiredsFromKelvin(kelvin, minK, maxK);
              haveAny=true; wantOn = (wantOn===undefined) ? true : wantOn;
              mode = "white";
            } else if (numberMode === "color") {
              const h = val*3.6;
              const rgb = hsvToRgb(h, 100, state.brightnessPct);
              out.rgb = rgb;
              haveAny=true; wantOn = (wantOn===undefined) ? true : wantOn;
              mode = "colour";
              state.hsv.h = round(h);
            }
          } else if (typeof p === "string") {
            const s = p.trim().toLowerCase();
            if (s === "on" || s === "off") { wantOn = (s === "on"); haveAny = true; }
          }
        }

        // === ON/OFF finalization ===
        if (wantOn !== undefined) out.on = !!wantOn;
        else if (haveAny) out.on = true;

        // === Persist state ===
        if (mode) state.mode = mode;
        if (out.colorTemp != null) state.kelvin = clampKelvin(miredsToKelvin(out.colorTemp), minK, maxK);
        if (Array.isArray(out.rgb)) {
          const [h,s,v] = rgbToHsv(out.rgb[0], out.rgb[1], out.rgb[2]);
          state.hsv = { h, s, v: (colorAffectsBrightness ? state.brightnessPct : state.hsv.v) };
        }
        if (out.brightness != null) state.brightnessPct = clamp(round(out.brightness), 0, 100);
        node.context().set('hueMapState', state);

        // === Emit ===
        msg.payload = out;
        setStatus([ out.on===false?'off':'on',
                    (mode?`mode=${mode}`:''),
                    (out.brightness!=null?`b=${out.brightness}`:''),
                    (out.colorTemp!=null?`ct=${out.colorTemp}`:''),
                    (Array.isArray(out.rgb)?`rgb=[${out.rgb.join(',')}]`:''),
                  ].filter(Boolean).join(' '), true);
        send(msg);
        done();
      } catch (err) {
        node.error(err && err.message ? err.message : String(err), msg);
        setStatus("error", false);
        done(err);
      }
    });
  }
  RED.nodes.registerType("nhc2-hue-mapping", Nhc2HueMappingNode);
};
