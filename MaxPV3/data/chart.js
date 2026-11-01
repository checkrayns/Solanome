// MaxPV! - Graphiques SVG légers pour séries temporelles (courbes, aires, barres)
// S'adaptent à la largeur de leur conteneur et affichent les valeurs au survol
// ou en faisant glisser le doigt sur le graphique.

const MaxPVChart = (() => {

  const NS = "http://www.w3.org/2000/svg";
  const PAD = { top: 10, right: 10, bottom: 24, left: 50 };

  function el(name, attrs, parent) {
    const node = document.createElementNS(NS, name);
    Object.keys(attrs || {}).forEach((k) => node.setAttribute(k, attrs[k]));
    if (parent) parent.appendChild(node);
    return node;
  }

  // Pas "rond" pour l'axe vertical : 1, 2 ou 5 x 10^n
  function niceStep(range, count) {
    const raw = range / Math.max(1, count);
    const power = Math.pow(10, Math.floor(Math.log10(raw)));
    const n = raw / power;
    return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * power;
  }

  const TIME_STEPS = [10, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 10800, 21600, 43200, 86400].map((s) => s * 1000);

  function timeLabel(t, step) {
    const d = new Date(t);
    const hm = d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    if (step < 60000) return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    if (step >= 86400000 || (d.getHours() === 0 && d.getMinutes() === 0))
      return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    return hm;
  }

  function create(container, options) {
    const opts = Object.assign({ height: 220, type: "line", digits: 0, unit: "", zero: true, seconds: false }, options);
    const box = document.createElement("div");
    box.className = "chart";
    const legend = document.createElement("div");
    legend.className = "chart-legend";
    container.append(box, legend);

    let xs = [];
    let ys = opts.series.map(() => []);
    let width = 0;
    let geometry = null;
    let hover = -1;

    const format = (v, s) => (v === null || v === undefined || Number.isNaN(v)) ? "—"
      : new Intl.NumberFormat("fr-FR", { minimumFractionDigits: s.digits ?? opts.digits, maximumFractionDigits: s.digits ?? opts.digits }).format(v) +
        " " + (s.unit ?? opts.unit);

    function renderLegend() {
      const i = hover >= 0 ? hover : xs.length - 1;
      legend.innerHTML = "";
      if (i >= 0 && hover >= 0) {
        const t = document.createElement("span");
        t.textContent = new Date(xs[i]).toLocaleString("fr-FR", opts.seconds
          ? { hour: "2-digit", minute: "2-digit", second: "2-digit" }
          : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
        t.style.color = "var(--muted)";
        legend.appendChild(t);
      }
      opts.series.forEach((s, k) => {
        const item = document.createElement("span");
        const mark = document.createElement("i");
        const value = document.createElement("b");
        mark.style.background = s.color;
        value.textContent = i >= 0 ? format(ys[k][i], s) : "—";
        item.append(mark, document.createTextNode(s.name + " "), value);
        legend.appendChild(item);
      });
    }

    function render() {
      width = box.clientWidth;
      box.innerHTML = "";
      if (!width) return;
      const H = opts.height;
      const svg = el("svg", { viewBox: "0 0 " + width + " " + H, role: "img", "aria-label": opts.label || "" }, box);

      if (xs.length < 2) {
        geometry = null;
        const empty = document.createElement("div");
        empty.className = "chart-empty";
        empty.textContent = opts.empty || "Pas encore de données";
        box.replaceChildren(empty);
        renderLegend();
        return;
      }

      // Echelles
      let min = Infinity, max = -Infinity;
      ys.forEach((serie) => serie.forEach((v) => {
        if (v === null || Number.isNaN(v)) return;
        if (v < min) min = v;
        if (v > max) max = v;
      }));
      if (min === Infinity) { min = 0; max = 1; }
      if (opts.zero) { min = Math.min(0, min); max = Math.max(0, max); }
      if (opts.min !== undefined) min = Math.min(min, opts.min);
      if (opts.max !== undefined) max = Math.max(max, opts.max);
      if (max - min < 1e-9) { max += 1; min -= opts.zero && min >= 0 ? 0 : 1; }
      const step = niceStep(max - min, 4);
      min = Math.floor(min / step) * step;
      max = Math.ceil(max / step) * step;

      const x0 = xs[0], x1 = xs[xs.length - 1];
      const plotW = width - PAD.left - PAD.right, plotH = H - PAD.top - PAD.bottom;
      const slot = plotW / xs.length;
      const X = opts.type === "bar"
        ? (i) => PAD.left + slot * (i + 0.5)
        : (i) => PAD.left + (x1 === x0 ? 0 : (xs[i] - x0) / (x1 - x0) * plotW);
      const Y = (v) => PAD.top + (max - v) / (max - min) * plotH;
      geometry = { X, Y, plotW, plotH };

      // Axe vertical et grille
      const axis = el("g", { class: "axis" }, svg);
      const decimals = step < 1 ? Math.min(3, Math.ceil(-Math.log10(step))) : 0;
      for (let v = min; v <= max + step / 2; v += step) {
        const y = Y(v);
        el("line", { x1: PAD.left, x2: width - PAD.right, y1: y, y2: y, class: Math.abs(v) < step / 1000 ? "zero-line" : "grid-line" }, svg);
        const label = el("text", { x: PAD.left - 6, y: y + 4, "text-anchor": "end" }, axis);
        label.textContent = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: decimals }).format(v);
      }

      // Axe horizontal : pas de temps adapté à la largeur disponible
      const span = Math.max(1, x1 - x0);
      const tStep = TIME_STEPS.find((s) => span / s <= Math.max(2, plotW / 80)) || TIME_STEPS[TIME_STEPS.length - 1];
      const offset = new Date(x0).getTimezoneOffset() * 60000;
      for (let t = Math.ceil((x0 - offset) / tStep) * tStep + offset; t <= x1; t += tStep) {
        const x = PAD.left + (t - x0) / span * plotW;
        const label = el("text", { x: x, y: H - 6, "text-anchor": "middle" }, axis);
        label.textContent = timeLabel(t, tStep);
      }

      // Séries
      opts.series.forEach((s, k) => {
        const values = ys[k];
        if (opts.type === "bar") {
          const w = Math.max(1, slot * 0.7);
          values.forEach((v, i) => {
            if (v === null || Number.isNaN(v)) return;
            const y = Y(Math.max(0, v)), h = Math.abs(Y(v) - Y(0));
            const rect = el("rect", { x: X(i) - w / 2, y: y, width: w, height: Math.max(0.5, h), rx: Math.min(2, w / 4) }, svg);
            rect.style.fill = s.color;
          });
          return;
        }
        let d = "", area = "", start = -1;
        const close = (end) => { if (start >= 0 && s.area) area += "L" + X(end) + " " + Y(0) + "L" + X(start) + " " + Y(0) + "Z"; };
        values.forEach((v, i) => {
          if (v === null || Number.isNaN(v)) { close(i - 1); start = -1; return; }
          const cmd = start < 0 ? "M" : "L";
          if (start < 0) start = i;
          d += cmd + X(i).toFixed(1) + " " + Y(v).toFixed(1);
          area += cmd + X(i).toFixed(1) + " " + Y(v).toFixed(1);
        });
        close(values.length - 1);
        if (s.area && area) {
          const fill = el("path", { d: area }, svg);
          fill.style.fill = s.color;
          fill.style.opacity = "0.15";
        }
        const line = el("path", { d: d, fill: "none", "stroke-width": 2, "stroke-linejoin": "round", "stroke-linecap": "round" }, svg);
        line.style.stroke = s.color;
      });

      // Curseur
      if (hover >= 0 && hover < xs.length) {
        const x = X(hover);
        el("line", { x1: x, x2: x, y1: PAD.top, y2: PAD.top + plotH, class: "cursor-line" }, svg);
        if (opts.type !== "bar") opts.series.forEach((s, k) => {
          const v = ys[k][hover];
          if (v === null || Number.isNaN(v)) return;
          const dot = el("circle", { cx: x, cy: Y(v), r: 4 }, svg);
          dot.style.fill = s.color;
        });
      }
      renderLegend();
    }

    // Point le plus proche du pointeur
    function pick(event) {
      if (!geometry || xs.length < 2) return;
      const rect = box.getBoundingClientRect();
      const px = (event.clientX - rect.left) * (width / rect.width);
      let best = -1, dist = Infinity;
      xs.forEach((_, i) => {
        const dx = Math.abs(geometry.X(i) - px);
        if (dx < dist) { dist = dx; best = i; }
      });
      if (best !== hover) { hover = best; render(); }
    }

    box.addEventListener("pointermove", pick);
    box.addEventListener("pointerdown", pick);
    box.addEventListener("pointerleave", () => { hover = -1; render(); });

    // Redessin à l'image suivante : le redessin modifie la hauteur de la boîte observée
    if (window.ResizeObserver) new ResizeObserver(() => {
      requestAnimationFrame(() => { if (box.clientWidth !== width) render(); });
    }).observe(box);
    else window.addEventListener("resize", render);

    return {
      // times : instants en millisecondes, values : un tableau de valeurs par série
      setData(times, values) {
        xs = times;
        ys = values;
        if (hover >= xs.length) hover = -1;
        render();
      },
      render
    };
  }

  return { create };
})();
