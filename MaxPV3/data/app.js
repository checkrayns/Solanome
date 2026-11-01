// MaxPV! - Script commun de l'interface responsive
// - menu unique pour toutes les pages (latéral sur ordinateur, en bas d'écran sur téléphone)
// - lecture de l'état par /api/status toutes les 2 secondes, suspendue quand l'onglet est masqué
// - commandes boost, SSR et relais
// - mode démo avec des valeurs simulées si la page est ouverte depuis un fichier local ou avec ?demo

const MaxPV = (() => {

  const demo = (location.protocol === "file:") || new URLSearchParams(location.search).has("demo");
  const STATUS_PERIOD = 2000;

  // ---------- Menu ----------

  // main : présent dans la barre du bas sur téléphone, les autres sont dans « Plus »
  const NAV = [
    { href: "dashboard.html",     label: "Accueil",          icon: "home",    main: true },
    { href: "graph.html",         label: "Graphiques",       icon: "chart",   main: true },
    { href: "events.html",        label: "Journal",          icon: "list",    main: true },
    { href: "admin.html",         label: "Administration",   icon: "gear",    main: true, short: "Réglages" },
    { sep: true },
    { href: "configuration.html", label: "Paramétrage avancé", icon: "sliders" },
    { href: "wizard.html",        label: "Assistant de configuration", icon: "wand" },
    { href: "index.html",         label: "Moniteur détaillé", icon: "table" },
    { href: "maj.html",           label: "Mise à jour",       icon: "upload" },
    { href: "credits.html",       label: "Crédits",           icon: "info" }
  ];

  const ICONS = {
    home:    "M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
    chart:   "M4 20V10M10 20V4M16 20v-7M22 20H2",
    list:    "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    gear:    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
    sliders: "M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6",
    wand:    "M15 4V2M15 16v-2M8 9h2M20 9h2M17.8 11.8l1.4 1.4M17.8 6.2l1.4-1.4M12.2 6.2l-1.4-1.4M15 9l-12 12",
    table:   "M3 3h18v18H3zM3 9h18M3 15h18M9 3v18",
    upload:  "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12",
    info:    "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01",
    more:    "M5 12h.01M12 12h.01M19 12h.01"
  };

  function icon(name) {
    return '<svg class="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
           'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + ICONS[name] + '"/></svg>';
  }

  function currentPage() {
    const page = location.pathname.split("/").pop();
    return (page === "" || page === "main.html") ? "dashboard.html" : page;
  }

  function renderNav() {
    const page = currentPage();
    const current = (item) => item.href === page ? ' aria-current="page"' : "";
    let side = '<a class="brand" href="dashboard.html">Max<span>PV!</span></a>';
    let bottom = "";
    let sheet = "";

    NAV.forEach((item) => {
      if (item.sep) { side += '<div class="sep"></div>'; return; }
      side += '<a class="item" href="' + item.href + '"' + current(item) + ">" + icon(item.icon) + item.label + "</a>";
      if (item.main) bottom += '<a href="' + item.href + '"' + current(item) + ">" + icon(item.icon) + (item.short || item.label) + "</a>";
      else sheet += '<li><a href="' + item.href + '"' + current(item) + ">" + icon(item.icon) + item.label + "</a></li>";
    });
    bottom += '<button type="button" id="nav-more" aria-expanded="false" aria-controls="nav-sheet">' + icon("more") + "Plus</button>";

    const nav = document.createElement("div");
    nav.innerHTML =
      '<nav class="nav-side" aria-label="Menu principal">' + side + "</nav>" +
      '<nav class="nav-bottom" aria-label="Menu principal">' + bottom + "</nav>" +
      '<div class="nav-sheet" id="nav-sheet"><ul>' + sheet + "</ul></div>";
    document.body.prepend(nav);

    const more = document.getElementById("nav-more");
    const sheetEl = document.getElementById("nav-sheet");
    const toggle = (open) => {
      sheetEl.classList.toggle("open", open);
      more.setAttribute("aria-expanded", String(open));
    };
    more.addEventListener("click", () => toggle(!sheetEl.classList.contains("open")));
    sheetEl.addEventListener("click", (e) => { if (e.target === sheetEl) toggle(false); });
    document.addEventListener("keydown", (e) => { if (e.key === "Escape") toggle(false); });
  }

  // ---------- Accès à l'API ----------

  async function getJSON(path) {
    if (demo) return Demo.get(path);
    const response = await fetch(path, { cache: "no-store" });
    if (!response.ok) throw new Error("HTTP " + response.status);
    return response.json();
  }

  // Commande : boost, SSR ou relais. L'état est relu aussitôt, puis une seconde fois
  // car EcoPV ne confirme le changement qu'à sa transmission suivante
  async function command(path) {
    if (demo) Demo.command(path);
    else {
      const response = await fetch(path, { cache: "no-store" });
      const text = await response.text();
      if (!response.ok || !text.startsWith("Request successfully")) throw new Error(text);
    }
    refreshSoon();
  }

  const commands = {
    boost:  (on)   => command(on ? "api/action?booston" : "api/action?boostoff"),
    ssr:    (mode) => command("api/set?ssrmode&value=" + mode),
    relay:  (mode) => command("api/set?relaymode&value=" + mode)
  };

  // ---------- Etat en direct ----------

  const listeners = [];
  let last = null;
  let failures = 0;
  let timer = null;

  function emit() {
    const link = demo ? "demo" : (failures >= 2 ? "lost" : "ok");
    listeners.forEach((cb) => cb(last, link));
  }

  async function poll() {
    clearTimeout(timer);
    timer = null;
    try {
      last = await getJSON("api/status");
      failures = 0;
    }
    catch (e) {
      failures++;
    }
    emit();
    // Une lecture lancée par une commande peut se terminer après une autre : un seul minuteur à la fois
    clearTimeout(timer);
    timer = document.hidden ? null : setTimeout(poll, STATUS_PERIOD);
  }

  function refreshSoon() {
    poll();
    setTimeout(poll, 1500);
  }

  function onStatus(cb) {
    listeners.push(cb);
    if (last) cb(last, demo ? "demo" : "ok");
    if (listeners.length === 1) poll();
  }

  // Pas de requêtes vers l'ESP quand l'onglet est masqué
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { clearTimeout(timer); timer = null; }
    else if (listeners.length && !timer) poll();
  });

  // ---------- Mise en forme ----------

  const nf0 = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 });
  const nf1 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const nf2 = new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const fmt = {
    known: (v) => (v !== null) && (v !== undefined) && !Number.isNaN(Number(v)),
    power(w) {
      if (!fmt.known(w)) return "—";
      return (Math.abs(w) >= 10000) ? nf1.format(w / 1000) + " kW" : nf0.format(w) + " W";
    },
    energy: (kwh) => fmt.known(kwh) ? nf2.format(kwh) + " kWh" : "—",
    number: (v, digits, unit) => fmt.known(v)
      ? new Intl.NumberFormat("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v) + (unit ? " " + unit : "")
      : "—",
    duration(seconds) {
      seconds = Math.max(0, Math.round(seconds));
      const d = Math.floor(seconds / 86400);
      const h = Math.floor((seconds % 86400) / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      if (d > 0) return d + " j " + h + " h";
      if (h > 0) return h + " h " + String(m).padStart(2, "0") + " min";
      if (m > 0) return m + " min";
      return seconds + " s";
    },
    // Heure d'un événement : l'heure seule pour aujourd'hui, la date sinon
    eventTime(event) {
      if (!event.time) return "+" + fmt.duration(event.uptime);
      const date = new Date(event.time * 1000);
      const today = new Date().toDateString() === date.toDateString();
      return today
        ? date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })
        : date.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" }) + " " +
          date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
    }
  };

  // Comparaison de numéros de version "3.65" : vrai si a est plus récent que b
  function newerVersion(a, b) {
    const pa = String(a).split(".").map(Number);
    const pb = String(b).split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const x = pa[i] || 0, y = pb[i] || 0;
      if (x !== y) return x > y;
    }
    return false;
  }

  // ---------- Mode démo ----------

  const Demo = (() => {
    const start = Date.now();
    const state = { ssr: "AUTO", relay: "AUTO", boostEnd: 0, events: [] };
    let id = 0;

    function addEvent(type, detail, msg) {
      id++;
      state.events.unshift({ id: id, time: Math.floor(Date.now() / 1000), uptime: 0, type: type, detail: detail, value: 0, msg: msg });
    }

    addEvent("boot", "power_on", "Démarrage de MaxPV! : mise sous tension");
    addEvent("mqtt_ok", "", "Connexion MQTT établie");
    addEvent("ssr_mode", "web", "Mode SSR : AUTO (web / API)");

    function status() {
      const t = (Date.now() - start) / 1000;
      const now = Math.floor(Date.now() / 1000);
      const prod = Math.max(0, 2400 + 600 * Math.sin(t / 40) + 150 * Math.sin(t / 7));
      const house = 650 + 250 * Math.sin(t / 23);
      const boostOn = state.boostEnd > now;
      let routed = 0;
      if (boostOn || state.ssr === "FORCE") routed = 2000;
      else if (state.ssr === "AUTO") routed = Math.max(0, Math.min(2000, prod - house - 50));
      const grid = house + routed - prod;
      return {
        time: now, uptime: Math.floor(t) + 93784, ecopv: true, rssi: -61, mqtt: "connected", lastevent: id,
        vrms: 231.4, irms: (house + routed) / 231.4, cosphi: 0.97, papp: house + routed + 40, pact: grid,
        prouted: routed, pimport: Math.max(0, grid), pexport: Math.max(0, -grid), pprod: prod, temp: 52, presistance: 2000,
        day: { routed: 3.42, import: 1.87, export: 0.95, prod: 9.31, relay: 45 },
        ssr: { mode: boostOn ? "FORCE" : state.ssr, state: boostOn ? "FORCE" : (state.ssr === "AUTO" ? (routed >= 1990 ? "MAX" : (routed > 0 ? "ON" : "OFF")) : state.ssr) },
        relay: { mode: state.relay, state: state.relay === "AUTO" ? "OFF" : state.relay, relayplus: false },
        boost: { on: boostOn, remaining: boostOn ? state.boostEnd - now : 0, duration: 120 },
        templimit: 60,
        version: { maxpv: "3.65", web: "3.65", ecopv: "3.60" }
      };
    }

    return {
      get(path) {
        if (path.startsWith("api/status")) return Promise.resolve(status());
        if (path.startsWith("api/events")) return Promise.resolve({ total: id, size: 64, uptime: 0, time: 0, events: state.events });
        return Promise.reject(new Error("démo"));
      },
      command(path) {
        const value = (path.split("value=")[1] || "").toUpperCase();
        if (path.includes("booston")) { state.boostEnd = Math.floor(Date.now() / 1000) + 7200; addEvent("boost_on", "web", "Boost démarré (web / API) pour 120 min"); }
        else if (path.includes("boostoff")) { state.boostEnd = 0; addEvent("boost_off", "web", "Boost arrêté : arrêt manuel web / API"); }
        else if (path.includes("ssrmode")) { state.ssr = value; state.boostEnd = 0; addEvent("ssr_mode", "web", "Mode SSR : " + value + " (web / API)"); }
        else if (path.includes("relaymode")) state.relay = value;
      }
    };
  })();

  document.addEventListener("DOMContentLoaded", renderNav);

  return { demo, getJSON, commands, onStatus, refreshSoon, fmt, newerVersion };
})();
