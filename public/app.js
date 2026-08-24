(function () {
  "use strict";

  var cfg = window.SKILLCLARITY_CONFIG || {};
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------------- dial ---------------- */
  function buildTicks() {
    var ticks = document.getElementById("ticks");
    if (!ticks) return;
    var svgNS = "http://www.w3.org/2000/svg";
    for (var i = 0; i < 60; i++) {
      var major = i % 5 === 0;
      var angle = (i / 60) * Math.PI * 2 - Math.PI / 2;
      var r1 = major ? 122 : 128;
      var line = document.createElementNS(svgNS, "line");
      line.setAttribute("x1", (160 + Math.cos(angle) * r1).toFixed(2));
      line.setAttribute("y1", (160 + Math.sin(angle) * r1).toFixed(2));
      line.setAttribute("x2", (160 + Math.cos(angle) * 134).toFixed(2));
      line.setAttribute("y2", (160 + Math.sin(angle) * 134).toFixed(2));
      if (major) line.setAttribute("class", "major");
      ticks.appendChild(line);
    }
  }

  function runDial() {
    var dial = document.getElementById("dial");
    if (!dial) return;
    var labels = dial.querySelectorAll(".orbit li");
    var chosen = labels[labels.length - 1];
    if (chosen) chosen.classList.add("is-chosen");

    if (reduceMotion) {
      dial.classList.add("is-settled");
      return;
    }
    labels.forEach(function (li, i) {
      li.style.setProperty("--d", (i * 0.06).toFixed(2) + "s");
    });
    dial.classList.add("is-animating");
    window.setTimeout(function () {
      dial.classList.remove("is-animating");
      dial.classList.add("is-settled");
    }, 3100);
  }

  /* ---------------- analytics ---------------- */
  function loadPlausible() {
    if (!cfg.plausibleDomain) return;
    var s = document.createElement("script");
    s.defer = true;
    s.setAttribute("data-domain", cfg.plausibleDomain);
    s.src = "https://plausible.io/js/script.js";
    document.head.appendChild(s);
  }

  function visitorId() {
    var key = "sc_visitor";
    var id;
    try {
      id = window.localStorage.getItem(key);
      if (!id) {
        id = (window.crypto && window.crypto.randomUUID)
          ? window.crypto.randomUUID()
          : String(Date.now()) + Math.random().toString(16).slice(2);
        window.localStorage.setItem(key, id);
      }
    } catch (e) {
      id = "no-storage";
    }
    return id;
  }

  function track(name) {
    if (window.plausible) window.plausible(name);
    if (!cfg.countEndpoint) return;
    var body = JSON.stringify({ event: name, visitor: visitorId(), path: location.pathname, ref: document.referrer });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(cfg.countEndpoint, new Blob([body], { type: "application/json" }));
    } else {
      fetch(cfg.countEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: body, keepalive: true }).catch(function () {});
    }
  }

  /* ---------------- registration ---------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function submitEmail(email, source) {
    var payload = { email: email, source: source, visitor: visitorId(), referrer: document.referrer, ts: new Date().toISOString() };
    if (cfg.submitMode === "formspree") {
      return fetch("https://formspree.io/f/" + cfg.formspreeId, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
    }
    return fetch(cfg.localEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  }

  function wireForm(form) {
    var input = form.querySelector("input[type=email]");
    var button = form.querySelector("button");
    var msg = form.querySelector(".capture-msg");

    function say(text, state) {
      msg.textContent = text;
      msg.className = "capture-msg is-shown" + (state ? " " + state : "");
    }

    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var email = input.value.trim();
      if (!EMAIL_RE.test(email)) {
        say("That email address is not complete. Check it and try again.", "is-error");
        input.focus();
        return;
      }
      button.disabled = true;
      button.textContent = "Setting you up\u2026";
      say("Creating your place\u2026");

      submitEmail(email, form.id).then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        form.classList.add("is-done");
        say(
          "You're in. We're onboarding a small first group by hand \u2014 expect a message within " +
            (cfg.onboardingDays || "3 days") +
            " with your first question.",
          "is-done"
        );
        track("signup");
      }).catch(function () {
        button.disabled = false;
        button.textContent = "Start my skill report";
        say("That did not save. Check your connection and try once more, or email hello@skillclarity.africa.", "is-error");
      });
    });
  }

  buildTicks();
  loadPlausible();
  track("pageview");
  document.querySelectorAll("form.capture").forEach(wireForm);

  if (document.readyState === "complete") runDial();
  else window.addEventListener("load", runDial);
})();
