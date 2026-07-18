/* ============================================================
   HOPE 2 — The Evidence · shared interactions
   Content-agnostic: reads translated data from <script id="hope-data">.
   Unofficial non-profit fan project.
   ============================================================ */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var fmt = function (n) { return Math.round(n).toLocaleString("en-US"); };

  var DATA = {};
  try { var el = document.getElementById("hope-data"); if (el) DATA = JSON.parse(el.textContent); }
  catch (e) { console.warn("hope-data parse failed", e); }
  var UI = DATA.ui || {};

  /* ---------- language memory ---------- */
  try {
    var lang = document.documentElement.lang;
    if (lang) localStorage.setItem("hope2_lang", lang);
  } catch (e) {}

  /* ---------- count-up ---------- */
  function countUp(node, to, dur) {
    if (!node) return;
    if (reduce) { node.textContent = fmt(to); return; }
    var start = performance.now(), from = 0;
    function step(t) {
      var p = Math.min(1, (t - start) / dur);
      var e = 1 - Math.pow(1 - p, 3);
      node.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- counters (box office + petition summary) ---------- */
  function initCounters() {
    var c = DATA.counter || {};
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (en) {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        var t = en.target;
        if (t.classList.contains("office")) {
          countUp($(".counter-num", t), c.boxOffice || 0, 1600);
          var pct = Math.min(100, ((c.boxOffice || 0) / (c.boxOfficeGoal || 7000000)) * 100);
          var bar = $(".progress > i", t); if (bar) setTimeout(function () { bar.style.width = pct.toFixed(1) + "%"; }, 200);
        }
      });
    }, { threshold: 0.4 });
    $$(".counter-card.office").forEach(function (n) { io.observe(n); });
  }

  /* ---------- petition (shared counter via CounterAPI, localStorage fallback) ----------
     Precedence: window.HOPE_SIGN (Firebase override, see README) > CounterAPI shared count > localStorage.
     CounterAPI is a free no-key service; if it is ever unreachable the counter degrades to
     per-browser localStorage so the button never breaks. */
  var COUNTER_URL = (typeof window !== "undefined" && window.HOPE_COUNTER_URL) || "https://api.counterapi.dev/v1/wewanthope2/signatures";
  function localSigned() { try { return parseInt(localStorage.getItem("hope2_signed_n") || "0", 10) || 0; } catch (e) { return 0; } }
  function localTotal() { return ((DATA.counter || {}).petitionBase || 0) + localSigned(); }
  function initPetition() {
    var box = $(".petition-box"); if (!box) return;
    var big = $(".big", box), form = $("form", box), thanks = $(".thanks", box);
    var goal = (DATA.counter || {}).petitionGoal || 100000;
    var signed = false;
    try { signed = localStorage.getItem("hope2_signed") === "1"; } catch (e) {}
    function paint(n) {
      countUp(big, n, 1400);
      var of = $(".of", box); if (of && UI.petitionOf) of.textContent = UI.petitionOf.replace("{goal}", fmt(goal));
    }
    // initial count when scrolled into view: prefer the shared remote total, fall back to local.
    // NB: CounterAPI's read needs the trailing slash — the slash-less URL 301-redirects and the
    // redirect drops CORS in the browser, so read via COUNTER_URL + "/".
    var io = new IntersectionObserver(function (e) {
      if (!e[0].isIntersecting) return; io.disconnect();
      fetch(COUNTER_URL + "/").then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { paint(typeof d.count === "number" ? d.count : localTotal()); })
        .catch(function () { paint(localTotal()); });
    }, { threshold: 0.3 });
    io.observe(box);
    if (signed && thanks) thanks.textContent = UI.petitionAlready || UI.petitionThanks || "";
    if (form) form.addEventListener("submit", function (ev) {
      ev.preventDefault();
      if (signed) { if (thanks) thanks.textContent = UI.petitionAlready || ""; return; }
      signed = true;
      try { localStorage.setItem("hope2_signed", "1"); } catch (e) {}
      if (typeof window.HOPE_SIGN === "function") { try { window.HOPE_SIGN(); } catch (e) {} } // Firebase override hook
      if (thanks) thanks.textContent = UI.petitionThanks || "Thank you.";
      // increment the shared counter; fall back to a per-browser tally if the service is down
      fetch(COUNTER_URL + "/up").then(function (r) { if (!r.ok) throw 0; return r.json(); })
        .then(function (d) { paint(typeof d.count === "number" ? d.count : localTotal()); })
        .catch(function () {
          try { localStorage.setItem("hope2_signed_n", String(localSigned() + 1)); } catch (e) {}
          paint(localTotal());
        });
      form.reset();
    });
  }

  /* ---------- spoiler toggle ---------- */
  function initSpoiler() {
    var tg = $(".spoiler-toggle"); if (!tg) return;
    document.body.setAttribute("data-spoiler", "hidden");
    $$("button", tg).forEach(function (b) {
      b.addEventListener("click", function () {
        var mode = b.getAttribute("data-mode");
        document.body.setAttribute("data-spoiler", mode === "show" ? "shown" : "hidden");
        $$("button", tg).forEach(function (x) { x.setAttribute("aria-pressed", x === b ? "true" : "false"); });
      });
    });
  }

  /* ---------- timeline render ---------- */
  function initTimeline() {
    var host = $("#timeline"); if (!host || !DATA.timeline) return;
    DATA.timeline.forEach(function (t) {
      var d = document.createElement("div");
      d.className = "tl-item" + (t.film === 2 ? " film2" : "");
      if (t.spoiler) d.className += " spoiler";
      d.innerHTML =
        '<span class="dot"></span>' +
        '<div class="when">' + esc(t.when) + (t.tag ? '<span class="tl-tag">' + esc(t.tag) + '</span>' : '') + '</div>' +
        '<h4>' + esc(t.title) + '</h4>' +
        '<p>' + esc(t.body) + '</p>';
      host.appendChild(d);
    });
  }

  /* ---------- character map ---------- */
  function initCharmap() {
    var svg = $("#charmap"); if (!svg || !DATA.characters) return;
    var chars = DATA.characters;
    var W = 520, H = Math.max(320, chars.length * 42);
    svg.setAttribute("viewBox", "0 0 " + W + " " + H);
    var humans = chars.filter(function (c) { return c.faction === "human"; });
    var aliens = chars.filter(function (c) { return c.faction === "alien"; });
    var pos = {};
    function place(list, x) {
      list.forEach(function (c, i) { pos[c.id] = { x: x, y: (H / (list.length + 1)) * (i + 1) }; });
    }
    place(humans, 130); place(aliens, W - 130);
    var NS = "http://www.w3.org/2000/svg";
    // edges
    var edgeEls = {};
    chars.forEach(function (c) {
      (c.links || []).forEach(function (to) {
        if (!pos[to] || edgeEls[c.id + to] || edgeEls[to + c.id]) return;
        var ln = document.createElementNS(NS, "line");
        ln.setAttribute("x1", pos[c.id].x); ln.setAttribute("y1", pos[c.id].y);
        ln.setAttribute("x2", pos[to].x); ln.setAttribute("y2", pos[to].y);
        ln.setAttribute("class", "edge"); ln.setAttribute("data-a", c.id); ln.setAttribute("data-b", to);
        svg.appendChild(ln); edgeEls[c.id + to] = ln;
      });
    });
    // nodes
    var detail = $("#char-detail");
    function show(c) {
      $$(".node", svg).forEach(function (n) {
        var id = n.getAttribute("data-id");
        var rel = id === c.id || (c.links || []).indexOf(id) > -1 || (charById(id).links || []).indexOf(c.id) > -1;
        n.classList.toggle("dim", !rel);
        n.classList.toggle("sel", id === c.id);
      });
      $$(".edge", svg).forEach(function (e) {
        var hot = e.getAttribute("data-a") === c.id || e.getAttribute("data-b") === c.id;
        e.classList.toggle("hot", hot);
      });
      if (detail) detail.innerHTML =
        '<div class="faction ' + c.faction + '">' + (c.faction === "human" ? (UI.factionHuman || "Humans") : (UI.factionAlien || "Gh’ertu")) + '</div>' +
        '<h4>' + esc(c.name) + '</h4>' +
        '<p class="actor">' + esc(c.actor || "") + '</p>' +
        '<p>' + esc(c.desc || "") + '</p>';
    }
    function charById(id) { for (var i = 0; i < chars.length; i++) if (chars[i].id === id) return chars[i]; return {}; }
    chars.forEach(function (c) {
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "node " + c.faction); g.setAttribute("data-id", c.id);
      g.setAttribute("tabindex", "0"); g.setAttribute("role", "button");
      g.setAttribute("aria-label", c.name);
      var cx = pos[c.id].x, cy = pos[c.id].y;
      var circ = document.createElementNS(NS, "circle");
      circ.setAttribute("cx", cx); circ.setAttribute("cy", cy); circ.setAttribute("r", 22);
      var tx = document.createElementNS(NS, "text");
      tx.setAttribute("x", cx); tx.setAttribute("y", cy + 40); tx.setAttribute("text-anchor", "middle");
      tx.textContent = c.name;
      var rl = document.createElementNS(NS, "text");
      rl.setAttribute("x", cx); rl.setAttribute("y", cy + 54); rl.setAttribute("text-anchor", "middle"); rl.setAttribute("class", "role");
      rl.textContent = c.actor || "";
      g.appendChild(circ); g.appendChild(tx); g.appendChild(rl);
      g.addEventListener("click", function () { show(c); });
      g.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); show(c); } });
      g.addEventListener("mouseenter", function () { show(c); });
      svg.appendChild(g);
    });
    if (chars.length && detail) { /* prime with first */ show(chars[0]); }
  }

  /* ---------- theory board ---------- */
  function initTheories() {
    var host = $("#theories"); if (!host || !DATA.theories) return;
    DATA.theories.forEach(function (t) {
      var voted = false, extra = 0;
      try { voted = localStorage.getItem("hope2_vote_" + t.id) === "1"; extra = voted ? 1 : 0; } catch (e) {}
      var card = document.createElement("div");
      card.className = "theory";
      var stLabel = UI["status_" + t.status] || t.status;
      card.innerHTML =
        '<span class="status ' + t.status + '">' + esc(stLabel) + '</span>' +
        '<h4>' + esc(t.title) + '</h4>' +
        '<p>' + esc(t.body) + '</p>' +
        '<div class="vote"><button aria-pressed="' + (voted ? "true" : "false") + '" aria-label="vote">↑</button><span class="n">' + ((t.votes || 0) + extra) + '</span></div>';
      var btn = $("button", card), n = $(".n", card);
      btn.addEventListener("click", function () {
        var isVoted = btn.getAttribute("aria-pressed") === "true";
        var base = t.votes || 0;
        if (isVoted) { btn.setAttribute("aria-pressed", "false"); n.textContent = base; try { localStorage.removeItem("hope2_vote_" + t.id); } catch (e) {} }
        else { btn.setAttribute("aria-pressed", "true"); n.textContent = base + 1; try { localStorage.setItem("hope2_vote_" + t.id, "1"); } catch (e) {} }
      });
      host.appendChild(card);
    });
  }

  /* ---------- video facade (lazy embed, nocookie) ---------- */
  function initVideos() {
    $$(".video .frame").forEach(function (fr) {
      fr.addEventListener("click", function () {
        if (fr.querySelector("iframe")) return;
        var id = fr.getAttribute("data-yt"); if (!id) return;
        var f = document.createElement("iframe");
        f.setAttribute("src", "https://www.youtube-nocookie.com/embed/" + id + "?autoplay=1&rel=0");
        f.setAttribute("title", fr.getAttribute("data-title") || "trailer");
        f.setAttribute("allow", "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture");
        f.setAttribute("allowfullscreen", "");
        fr.innerHTML = ""; fr.appendChild(f);
      });
    });
  }

  /* ---------- reveal on scroll ---------- */
  function initReveal() {
    if (reduce) { $$(".reveal").forEach(function (n) { n.classList.add("in"); }); return; }
    var io = new IntersectionObserver(function (ents) {
      ents.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal").forEach(function (n) { io.observe(n); });
  }

  /* ---------- hero / gate ocean canvas ---------- */
  function initOcean(sel) {
    var cv = $(sel); if (!cv) return;
    var ctx = cv.getContext("2d"), w, h, dpr = Math.min(2, window.devicePixelRatio || 1);
    var motes = [];
    function resize() {
      w = cv.clientWidth; h = cv.clientHeight;
      cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var count = Math.max(28, Math.floor(w * h / 26000));
      motes = [];
      for (var i = 0; i < count; i++) motes.push(mote());
    }
    function mote() {
      var heart = Math.random() < 0.22;
      return { x: Math.random() * w, y: Math.random() * h, r: Math.random() * 1.9 + 0.5,
        s: Math.random() * 0.22 + 0.05, drift: (Math.random() - 0.5) * 0.18,
        a: Math.random() * 0.5 + 0.2, tw: Math.random() * Math.PI * 2, heart: heart };
    }
    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      // soft depth gradient
      var g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, "#081319"); g.addColorStop(1, "#04090c");
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
      // god ray
      var rg = ctx.createRadialGradient(w * 0.5, h * 1.05, 0, w * 0.5, h * 1.05, h * 0.9);
      rg.addColorStop(0, "rgba(71,214,201,0.10)"); rg.addColorStop(1, "rgba(71,214,201,0)");
      ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
      for (var i = 0; i < motes.length; i++) {
        var m = motes[i];
        m.y -= m.s; m.x += m.drift + Math.sin((t / 2600) + m.tw) * 0.12;
        if (m.y < -6) { m.y = h + 6; m.x = Math.random() * w; }
        var tw = 0.55 + 0.45 * Math.sin(t / 700 + m.tw);
        ctx.beginPath(); ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = m.heart ? "rgba(236,90,107," + (m.a * tw).toFixed(3) + ")" : "rgba(120,230,220," + (m.a * tw).toFixed(3) + ")";
        ctx.shadowBlur = 8; ctx.shadowColor = m.heart ? "rgba(236,90,107,0.6)" : "rgba(71,214,201,0.6)";
        ctx.fill(); ctx.shadowBlur = 0;
      }
      if (!reduce) raf = requestAnimationFrame(draw);
    }
    var raf;
    resize();
    window.addEventListener("resize", function () { cancelAnimationFrame(raf); resize(); if (reduce) draw(0); else raf = requestAnimationFrame(draw); });
    if (reduce) draw(0); else raf = requestAnimationFrame(draw);
  }

  /* ---------- depth gauge (signature): scroll = descent to the sunken ship ---------- */
  var DG_I18N = {
    ko: { label: "수심", ping: "심장 박동 감지" },
    en: { label: "depth", ping: "heartbeat detected" },
    es: { label: "profundidad", ping: "latido detectado" },
    fr: { label: "profondeur", ping: "battement détecté" },
    ja: { label: "深度", ping: "心拍を検知" }
  };
  function initDepthGauge() {
    if (!$("#petition") || !$(".hero")) return; // language pages only, not the gate
    var lang = (document.documentElement.lang || "en").slice(0, 2);
    var t = DG_I18N[lang] || DG_I18N.en;
    var g = document.createElement("div");
    g.className = "depth-gauge"; g.setAttribute("aria-hidden", "true");
    g.innerHTML = '<div class="dg-label">' + t.label + '</div>' +
      '<div class="dg-track"><i class="dg-marker"></i><span class="dg-heart"></span></div>' +
      '<div class="dg-read"><b>0</b> m</div>' +
      '<div class="dg-ping">' + t.ping + '</div>';
    document.body.appendChild(g);
    var marker = $(".dg-marker", g), read = $(".dg-read b", g);
    var MAX_DEPTH = 2741; // the Hopo Trench, where the ship rests (fan canon)
    var ticking = false;
    function upd() {
      ticking = false;
      var doc = document.documentElement;
      var span = Math.max(1, doc.scrollHeight - window.innerHeight);
      var p = Math.min(1, Math.max(0, (window.scrollY || doc.scrollTop || 0) / span));
      marker.style.top = (p * 100).toFixed(2) + "%";
      read.textContent = Math.round(p * MAX_DEPTH).toLocaleString("en-US");
      g.classList.toggle("deep", p > 0.94);
    }
    window.addEventListener("scroll", function () {
      if (!ticking) { ticking = true; requestAnimationFrame(upd); }
    }, { passive: true });
    window.addEventListener("resize", upd);
    upd();
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  document.addEventListener("DOMContentLoaded", function () {
    initOcean(".hero-canvas");
    initOcean(".gate-canvas");
    initCounters();
    initPetition();
    initSpoiler();
    initTimeline();
    initCharmap();
    initTheories();
    initVideos();
    initReveal();
    initDepthGauge();
  });
})();
