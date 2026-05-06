/**
 * Novatio lead-qualification chatbot.
 *
 * Self-contained vanilla JS widget — no React or other dependency.
 * Two modes that the visitor can move between:
 *
 *   1. Q&A      — visitor asks free-form questions or picks a topic chip;
 *                 we match against the FAQ table and answer. Categories of
 *                 questions asked are tracked as a buyer-intent signal.
 *   2. Project  — 5-question scripted qualification flow that ends with a
 *                 contact form. Resulting lead is tier'd HOT/WARM/COLD,
 *                 incorporating Q&A signals.
 *
 * Result POSTs to /api/lead.
 *
 * Inject by adding `<script src="/chatbot.js" defer></script>` near </body>.
 */
(function () {
  if (typeof window === "undefined") return;
  if (document.querySelector(".ac-launcher")) return;

  /* ============================ FAQ database ============================ */
  // Tiny-house / prefab business. Each entry = one answerable topic.
  // `triggers` are lowercase substrings we look for in the user's text.
  // `intent` is a buyer-signal weight 0-3 (3 = strongly buyer-y).
  // Answers support **bold** and [text](/url).
  // *** Replace the placeholder figures with real Novatio specs. ***
  const FAQ = [
    {
      id: "pricing",
      category: "pricing",
      intent: 3,
      label: "Pricing",
      triggers: ["price", "cost", "rate", "how much", "quote", "pricing", "fee", "$"],
      answer:
        "Models start at **$45k for a 200 sq ft studio**, **$85k for a 400 sq ft 1-bedroom**, **$140k+ for a 600 sq ft 2-bedroom**. Includes the unit fully built. Site delivery, foundation, and hookups are quoted separately based on your location.",
    },
    {
      id: "delivery_areas",
      category: "areas",
      intent: 3,
      label: "Where you deliver",
      triggers: ["deliver", "where", "location", "ship", "transport", "state", "do you serve", "area"],
      answer:
        "We deliver across the **continental US**. Free delivery within **300 mi** of our facility; beyond that, **$3.50/mi** flat freight. Cross-border (Canada / Mexico) on request.",
    },
    {
      id: "delivery_time",
      category: "timeline",
      intent: 3,
      label: "Lead time",
      triggers: ["how long", "timeline", "lead time", "when can", "weeks", "months", "delivery time", "ready"],
      answer:
        "Standard models: **8–12 weeks** from order to delivery. Custom layouts: **14–20 weeks**. We send weekly build photos so you see progress.",
    },
    {
      id: "financing",
      category: "financing",
      intent: 3,
      label: "Financing",
      triggers: ["financ", "loan", "mortgage", "monthly", "payment plan", "lease", "credit"],
      answer:
        "Three options: **(1)** RV/chattel loans through our partner lenders (10–20 yr, ~6–9% APR), **(2)** standard mortgages on permanent-foundation models, **(3)** in-house 0%-interest 12-month deferred for $20k+ deposits. We share the lender list after you submit a project request.",
    },
    {
      id: "whats_included",
      category: "scope",
      intent: 3,
      label: "What's included",
      triggers: ["included", "comes with", "what do i get", "out of the box", "turnkey", "appliances"],
      answer:
        "**Included:** full structure, insulation, windows, exterior cladding, interior finishes, kitchen with appliances, bathroom fixtures, electrical, plumbing rough-in. **Not included** (quoted separately): foundation, site prep, utility hookups, permits, landscaping.",
    },
    {
      id: "land_permits",
      category: "deployment",
      intent: 3,
      label: "Land & permits",
      triggers: ["land", "permit", "zoning", "property", "code", "legal", "where can i put"],
      answer:
        "Tiny-house zoning varies wildly by county. We provide **stamped engineering drawings** and **HUD certification** (where applicable) so you can apply locally. We don't pull permits for you, but we'll coach you through it. **You'll need to confirm with your county before ordering.**",
    },
    {
      id: "sizes",
      category: "products",
      intent: 3,
      label: "Sizes available",
      triggers: ["size", "square feet", "sq ft", "bedrooms", "model", "floor plan", "layout", "dimensions"],
      answer:
        "Five base models: **Studio 200**, **Studio 280**, **Loft 320**, **Suite 400** (1BR), **Family 560** (2BR). All can be customized — interior layout, window placement, exterior cladding, finishes. See [the gallery](/gallery/) for builds.",
    },
    {
      id: "customization",
      category: "products",
      intent: 2,
      label: "Customization",
      triggers: ["custom", "modify", "change", "personali", "tailor", "design my own"],
      answer:
        "Three customization tiers: **Standard** (pick from preset finishes — no extra cost), **Modified** (move walls, swap windows, alt fixtures — +5–15%), **Bespoke** (full custom design from scratch — +25–40%, requires 16–20 wk lead time).",
    },
    {
      id: "materials",
      category: "build",
      intent: 2,
      label: "Materials & build quality",
      triggers: ["material", "built with", "insulation", "wood", "steel", "frame", "r-value", "quality"],
      answer:
        "Steel chassis (on trailer models) or pressure-treated SIP foundation. **R-21 walls / R-30 roof** with closed-cell spray foam. Engineered hardwood flooring. Standing-seam metal or fiber-cement exterior. Designed for **Zone 5 winters** (down to −10°F) without modification.",
    },
    {
      id: "off_grid",
      category: "deployment",
      intent: 2,
      label: "Off-grid options",
      triggers: ["off grid", "off-grid", "solar", "battery", "well", "septic", "composting", "self sufficient"],
      answer:
        "Optional **solar package** (3.5kW panels + 10kWh battery, +$18k), **propane heat & water heater** (+$2.5k), **composting toilet** (+$1.5k), **freshwater tank + 12V pump system** (+$1.8k). Fully off-grid configurations are common — we'll help spec what your site needs.",
    },
    {
      id: "foundations",
      category: "deployment",
      intent: 2,
      label: "Foundation options",
      triggers: ["foundation", "trailer", "slab", "pier", "anchor", "mounting", "set up"],
      answer:
        "Three foundation types: **trailer-mounted** (RVIA-certified, road-legal, ~12k lb), **pier blocks** (semi-permanent, no permit in most counties), **slab** (permanent, requires footing prep and local permit). We deliver and place; you arrange the foundation work.",
    },
    {
      id: "utilities",
      category: "deployment",
      intent: 2,
      label: "Utility hookups",
      triggers: ["hookup", "water", "sewer", "electric", "power", "utility", "plumbing connection"],
      answer:
        "Standard hookups: **30A or 50A RV plug**, **¾\" garden hose / well line for water**, **3\" sewer dump or septic line**, optional propane line. Hardwired connections available for permanent installs. We provide the unit-side fittings; site-side is a local plumber/electrician job (typically **$2–6k**).",
    },
    {
      id: "warranty",
      category: "build",
      intent: 2,
      label: "Warranty",
      triggers: ["warranty", "guarantee", "lifespan", "how long does it last", "durable", "lifetime"],
      answer:
        "**10 years** on structure & weatherproofing, **2 years** on appliances, **lifetime** on the steel chassis. Designed and built to last **40+ years** with normal maintenance.",
    },
    {
      id: "tour",
      category: "process",
      intent: 3,
      label: "See one in person",
      triggers: ["tour", "visit", "see", "showroom", "factory", "open house", "in person"],
      answer:
        "Yes — **factory tours** at our build facility (you can walk through 3–4 finished units), and **owner tours** with placed customers in your region (we coordinate). Submit a project request below and we'll pair you up.",
    },
    {
      id: "tiny_vs_rv",
      category: "education",
      intent: 1,
      label: "Tiny vs RV vs mobile home",
      triggers: ["rv", "mobile home", "manufactured", "trailer", "vs", "difference", "compared"],
      answer:
        "**RV**: built for travel, lightweight construction, depreciates fast. **Mobile home**: HUD code, mass-produced, low end. **Tiny house** (us): designed as a permanent home in a small footprint — full insulation, residential-grade finishes, designed to appreciate. We can match RVIA *or* HUD code if you need either certification.",
    },
    {
      id: "resale",
      category: "education",
      intent: 1,
      label: "Resale value",
      triggers: ["resale", "value", "appreciation", "sell later", "investment", "depreciate"],
      answer:
        "Resale market is young but strong. Permanent-foundation tiny houses tend to **hold or appreciate** with land. Trailer-mounted units behave more like RVs — **depreciate ~5%/yr** but hold a floor. Land-banked tiny-house lots in destination areas (Joshua Tree, Catskills) have appreciated 15–25% YoY.",
    },
    {
      id: "diy",
      category: "products",
      intent: 1,
      label: "DIY kits vs turnkey",
      triggers: ["diy", "kit", "shell", "build it myself", "self build", "frame only"],
      answer:
        "We sell **shell kits** (weather-tight envelope, no interior — $28k–$55k) for owner-finishers, and **turnkey** complete units. We don't sell raw plans-only; the kits include a build manual and 4 hours of phone support.",
    },
  ];

  // Topic chips shown in Q&A mode — pick the questions a buyer should know.
  const TOPIC_CHIPS = ["pricing", "delivery_areas", "delivery_time", "sizes", "financing"];

  /* ====================== Conversation flow definition ====================== */
  // Tiny-house qualification flow. Same answers field names ("project", "timeline",
  // "property", "budget") so existing classify() and lead-payload code is unchanged.
  const PROJECT_FLOW = [
    {
      id: "project",
      bot: "What size are you thinking about?",
      type: "choice",
      options: [
        { value: "studio",     label: "Studio (≤ 280 sq ft)" },
        { value: "one_br",     label: "1 BR (~ 320–400 sq ft)" },
        { value: "two_br",     label: "2 BR (~ 500–600 sq ft)" },
        { value: "custom",     label: "Custom / not sure" },
        { value: "exploring",  label: "Just exploring" },
      ],
    },
    {
      id: "timeline",
      bot: "When would you want delivery?",
      type: "choice",
      options: [
        { value: "lt3",   label: "Within 3 months" },
        { value: "3to12", label: "3 – 12 months" },
        { value: "gt12",  label: "12+ months" },
        { value: "unsure", label: "Not sure yet" },
      ],
    },
    {
      id: "property",
      bot: "Where would the unit go?",
      type: "choice",
      options: [
        { value: "have",     label: "I have land ready" },
        { value: "looking",  label: "Looking for a site" },
        { value: "lease",    label: "Plan to lease a lot" },
        { value: "not_yet",  label: "Haven't figured that out" },
      ],
    },
    {
      id: "budget",
      bot: "What's your budget range (unit only, before site work)?",
      type: "choice",
      options: [
        { value: "lt50k",     label: "Under $50k" },
        { value: "50to100k",  label: "$50k – $100k" },
        { value: "100k_200k", label: "$100k – $200k" },
        { value: "gt200k",    label: "$200k+" },
        { value: "discuss",   label: "I'd rather discuss" },
      ],
      skipIf: (a) => a.timeline === "gt12" || a.timeline === "unsure",
    },
    {
      id: "contact",
      bot: "Great — how should we reach you?",
      type: "form",
      fields: [
        { name: "name",    label: "Your name",                      required: true,  type: "text"     },
        { name: "email",   label: "Email",                          required: true,  type: "email"    },
        { name: "phone",   label: "Phone (optional)",               required: false, type: "tel"      },
        { name: "message", label: "Anything you'd like to add? (optional)", required: false, type: "textarea" },
      ],
    },
  ];

  /* ============================ Classification =========================== */
  // Combines the explicit qualification answers AND the Q&A intent signal:
  // categories the visitor asked about contribute weight (e.g. asking
  // pricing + areas = strong buyer).
  function classify(answers, questionsAsked) {
    const { timeline, property } = answers;
    const intent = questionsAsked.reduce((s, q) => s + (q.intent ?? 0), 0);

    let tier;
    if (timeline === "lt3" && property === "have") tier = "HOT";
    else if ((timeline === "lt3" || timeline === "3to12") && (property === "have" || property === "looking")) tier = "WARM";
    else tier = "COLD";

    // High Q&A intent can promote one tier (asking buyer-y questions matters).
    if (intent >= 5) {
      if (tier === "WARM") tier = "HOT";
      else if (tier === "COLD") tier = "WARM";
    }
    return tier;
  }

  function closingMessage(tier) {
    if (tier === "HOT")
      return "Perfect — this looks like a great fit. Our team will email you within 24 hours to set up a call.";
    if (tier === "WARM")
      return "Thanks! We'll follow up by email in the coming weeks once you're closer to starting.";
    return "Thanks for reaching out. We'll send over a portfolio + design tips you can browse at your own pace.";
  }

  /* =============================== Styles =============================== */
  const CSS = `
    .ac-chatbot, .ac-chatbot * { box-sizing: border-box; }
    .ac-chatbot {
      font-family: "Albert Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      color: #1C1C1D;
    }
    .ac-launcher {
      position: fixed; right: 34px; bottom: 90px;
      width: 60px; height: 60px; border-radius: 50%;
      background: #CAA05C; color: #fff; border: none;
      box-shadow: 0 8px 24px rgba(28, 28, 29, 0.25);
      cursor: pointer; z-index: 99998;
      display: flex; align-items: center; justify-content: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .ac-launcher:hover { transform: translateY(-2px); box-shadow: 0 12px 28px rgba(28,28,29,0.32); }
    .ac-launcher svg { width: 26px; height: 26px; }
    .ac-panel {
      position: fixed; right: 34px; bottom: 166px;
      width: min(380px, calc(100vw - 32px));
      height: min(620px, calc(100vh - 200px));
      background: #fff; border-radius: 16px;
      box-shadow: 0 24px 60px rgba(28, 28, 29, 0.22);
      display: flex; flex-direction: column;
      z-index: 99999; overflow: hidden;
      transform-origin: bottom right;
      animation: ac-pop-in 0.2s ease-out;
    }
    @keyframes ac-pop-in {
      from { transform: scale(0.92) translateY(8px); opacity: 0; }
      to   { transform: scale(1) translateY(0); opacity: 1; }
    }
    .ac-header { background: #1C1C1D; color: #fff; padding: 14px 18px; display: flex; align-items: center; gap: 12px; }
    .ac-avatar { width: 36px; height: 36px; border-radius: 50%; background: #CAA05C; display: flex; align-items: center; justify-content: center; font-weight: 700; }
    .ac-title { font-weight: 600; font-size: 15px; line-height: 1.2; }
    .ac-subtitle { font-size: 12px; opacity: 0.7; }
    .ac-close { margin-left: auto; background: transparent; border: none; color: #fff; cursor: pointer; padding: 4px; opacity: 0.7; }
    .ac-close:hover { opacity: 1; }
    .ac-close svg { width: 18px; height: 18px; }
    .ac-messages { flex: 1; padding: 16px; overflow-y: auto; background: #F6F6F6; display: flex; flex-direction: column; gap: 10px; }
    .ac-bubble { max-width: 80%; padding: 10px 14px; border-radius: 14px; font-size: 14px; line-height: 1.45; word-wrap: break-word; }
    .ac-bubble.bot  { background: #fff; align-self: flex-start; border-bottom-left-radius: 4px; }
    .ac-bubble.user { background: #1C1C1D; color: #fff; align-self: flex-end; border-bottom-right-radius: 4px; }
    .ac-bubble a { color: #CAA05C; }
    .ac-bubble strong { font-weight: 700; }
    .ac-interactive { background: #F6F6F6; border-top: 1px solid #EBEBEB; }
    .ac-choices { display: flex; flex-wrap: wrap; gap: 6px; padding: 10px 14px 12px; }
    .ac-choice {
      background: #fff; border: 1px solid #EBEBEB; color: #1C1C1D;
      padding: 7px 13px; border-radius: 999px; cursor: pointer; font-size: 13px;
      transition: background 0.15s ease, border-color 0.15s ease;
      font-family: inherit;
    }
    .ac-choice:hover { background: #CAA05C; border-color: #CAA05C; color: #fff; }
    .ac-textbar { display: flex; gap: 6px; padding: 8px 12px 12px; }
    .ac-textbar input {
      flex: 1; padding: 9px 12px; border: 1px solid #EBEBEB; border-radius: 999px;
      font-size: 14px; font-family: inherit; background: #fff;
    }
    .ac-textbar input:focus { outline: none; border-color: #CAA05C; }
    .ac-textbar button {
      width: 36px; height: 36px; border-radius: 50%; border: none;
      background: #CAA05C; color: #fff; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
    }
    .ac-textbar button:hover { background: #1C1C1D; }
    .ac-textbar button svg { width: 14px; height: 14px; }
    .ac-form { padding: 12px 16px 16px; }
    .ac-form input,
    .ac-form textarea {
      width: 100%; padding: 10px 12px; margin-bottom: 8px;
      border: 1px solid #EBEBEB; border-radius: 8px; font-size: 14px;
      font-family: inherit; background: #fff; color: inherit;
    }
    .ac-form textarea { resize: vertical; min-height: 70px; }
    .ac-form input:focus,
    .ac-form textarea:focus { outline: none; border-color: #CAA05C; }
    .ac-submit {
      width: 100%; padding: 11px 14px; margin-top: 4px;
      background: #CAA05C; color: #fff; border: none; border-radius: 999px;
      font-weight: 600; cursor: pointer; font-size: 14px;
      font-family: inherit;
    }
    .ac-submit:hover { background: #1C1C1D; }
    .ac-error { color: #d23; font-size: 12px; margin: 4px 0 8px; }
    .ac-tier-tag {
      display: inline-block; font-size: 11px; font-weight: 700;
      padding: 2px 8px; border-radius: 4px; letter-spacing: 0.04em;
      text-transform: uppercase; margin-bottom: 6px;
    }
    .ac-tier-HOT  { background: #ffe4d6; color: #b3450a; }
    .ac-tier-WARM { background: #fff3c0; color: #8a6500; }
    .ac-tier-COLD { background: #e0e7ee; color: #475467; }
    .ac-messages::-webkit-scrollbar { width: 6px; }
    .ac-messages::-webkit-scrollbar-thumb { background: #d9d9d9; border-radius: 3px; }

    /* Inline-mounted variant — used on /contact-us/ where the panel sits
       in normal page flow instead of as a floating widget. */
    .ac-panel.ac-inline {
      position: static; right: auto; bottom: auto;
      width: 100%; max-width: 640px; height: 600px;
      margin: 0 auto;
      animation: none;
    }
    .ac-panel.ac-inline .ac-close { display: none; }
  `;

  /* ============================ DOM helpers ============================ */
  function el(tag, props = {}, children = []) {
    const e = document.createElement(tag);
    Object.entries(props).forEach(([k, v]) => {
      if (k === "class") e.className = v;
      else if (k === "html") e.innerHTML = v;
      else if (k.startsWith("on") && typeof v === "function") {
        e.addEventListener(k.slice(2).toLowerCase(), v);
      } else if (v != null) e.setAttribute(k, v);
    });
    (Array.isArray(children) ? children : [children]).forEach((c) => {
      if (c == null) return;
      e.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
    return e;
  }

  function injectStyles() {
    if (document.getElementById("ac-chatbot-styles")) return;
    const s = document.createElement("style");
    s.id = "ac-chatbot-styles";
    s.textContent = CSS;
    document.head.appendChild(s);
  }

  // Tiny markdown-ish: **bold**, [text](url). Output is HTML-escaped first.
  function escapeHtml(s) {
    return s.replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    })[c]);
  }
  function richify(s) {
    let h = escapeHtml(s);
    h = h.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
    h = h.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
    return h;
  }

  /* ============================ State ============================ */
  let panel = null;
  let launcher = null;
  let mode = "menu"; // 'menu' | 'qa' | 'project' | 'done'
  let stepIndex = 0;
  let answers = {};
  let questionsAsked = []; // { id, category, intent, text, ts }

  /* ============================ Open / close ============================ */
  function openPanel() {
    if (panel) return;
    panel = renderPanel();
    document.body.appendChild(panel);
    if (mode === "menu") greetMenu();
  }
  function closePanel() {
    if (!panel) return;
    panel.remove();
    panel = null;
  }

  function renderPanel() {
    const messages = el("div", { class: "ac-messages", id: "ac-msgs" });
    const interactive = el("div", { class: "ac-interactive", id: "ac-interactive" });
    const header = el("header", { class: "ac-header" }, [
      el("div", { class: "ac-avatar" }, "N"),
      el("div", {}, [
        el("div", { class: "ac-title" }, "Novatio"),
        el("div", { class: "ac-subtitle" }, "Project assistant"),
      ]),
      el("button", {
        class: "ac-close", "aria-label": "Close chat", onClick: closePanel,
      }, el("span", { html: '<svg viewBox="0 0 20 20" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M5.7 4.3a1 1 0 1 0-1.4 1.4L8.6 10l-4.3 4.3a1 1 0 1 0 1.4 1.4L10 11.4l4.3 4.3a1 1 0 0 0 1.4-1.4L11.4 10l4.3-4.3a1 1 0 0 0-1.4-1.4L10 8.6 5.7 4.3z"/></svg>' })),
    ]);
    return el("div", { class: "ac-chatbot ac-panel", role: "dialog", "aria-label": "Project chat" }, [
      header, messages, interactive,
    ]);
  }

  function renderLauncher() {
    if (launcher) return;
    launcher = el("button", {
      class: "ac-chatbot ac-launcher",
      "aria-label": "Open project chat",
      onClick: () => (panel ? closePanel() : openPanel()),
    }, el("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' }));
    document.body.appendChild(launcher);
  }

  function bubble(text, who) {
    const msgs = panel.querySelector("#ac-msgs");
    const b = el("div", { class: `ac-bubble ${who}`, html: richify(text) });
    msgs.appendChild(b);
    msgs.scrollTop = msgs.scrollHeight;
  }

  function setInteractive(node) {
    const slot = panel.querySelector("#ac-interactive");
    while (slot.firstChild) slot.removeChild(slot.firstChild);
    if (node) slot.appendChild(node);
  }

  function choices(opts, onPick) {
    const wrap = el("div", { class: "ac-choices" });
    opts.forEach((o) => {
      wrap.appendChild(el("button", {
        class: "ac-choice", onClick: () => onPick(o),
      }, o.label));
    });
    return wrap;
  }

  function textbar(placeholder, onSubmit) {
    const input = el("input", { type: "text", placeholder, "aria-label": placeholder });
    const form = el("form", {
      class: "ac-textbar",
      onSubmit: (e) => {
        e.preventDefault();
        const v = input.value.trim();
        if (!v) return;
        input.value = "";
        onSubmit(v);
      },
    }, [
      input,
      el("button", { type: "submit", "aria-label": "Send" },
        el("span", { html: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>' })),
    ]);
    return form;
  }

  /* ============================== Menu ============================== */
  function greetMenu() {
    bubble("Hi! 👋  How can I help?", "bot");
    setInteractive(choices([
      { value: "qa",      label: "Ask a question" },
      { value: "project", label: "Start a project" },
    ], (o) => {
      bubble(o.label, "user");
      if (o.value === "qa") startQa();
      else startProject();
    }));
  }

  /* =========================== Q&A mode =========================== */
  function startQa() {
    mode = "qa";
    bubble("Pick a topic below or type your question.", "bot");
    showQaInput();
  }

  function showQaInput() {
    const chips = el("div", { class: "ac-choices" });
    TOPIC_CHIPS.forEach((catId) => {
      const f = FAQ.find((x) => x.id === catId);
      if (!f) return;
      chips.appendChild(el("button", {
        class: "ac-choice", onClick: () => answerQuestion(f, f.label),
      }, f.label));
    });
    chips.appendChild(el("button", {
      class: "ac-choice", onClick: () => switchToProject(),
    }, "Start a project →"));

    const tb = textbar("Ask anything…", (text) => {
      const match = matchFaq(text);
      if (match) answerQuestion(match, text);
      else handleUnmatched(text);
    });

    const wrap = document.createDocumentFragment();
    wrap.appendChild(chips);
    wrap.appendChild(tb);
    setInteractive(wrap);
  }

  function matchFaq(query) {
    const q = query.toLowerCase();
    let best = null, bestScore = 0;
    for (const e of FAQ) {
      const s = e.triggers.reduce((acc, t) => (q.includes(t) ? acc + 1 : acc), 0);
      if (s > bestScore) { best = e; bestScore = s; }
    }
    return bestScore > 0 ? best : null;
  }

  function answerQuestion(faq, userText) {
    bubble(userText, "user");
    questionsAsked.push({
      id: faq.id, category: faq.category, intent: faq.intent,
      text: userText, ts: new Date().toISOString(),
    });
    bubble(faq.answer, "bot");

    // Lightweight "anything else?" prompt — but only sometimes, after 1-2 answers.
    if (questionsAsked.length === 2) {
      bubble("Want me to keep going, or are you ready to talk specifics?", "bot");
    }
    showQaInput();
  }

  function handleUnmatched(text) {
    bubble(text, "user");
    questionsAsked.push({
      id: "unmatched", category: "other", intent: 1,
      text, ts: new Date().toISOString(),
    });
    bubble(
      "I'm not 100% sure I caught that — but it's a good question. The fastest way to a real answer is a 30-min call with our team. Want to set that up?",
      "bot",
    );
    setInteractive(choices([
      { value: "yes",  label: "Yes, set up a call" },
      { value: "more", label: "Ask another question" },
    ], (o) => {
      bubble(o.label, "user");
      if (o.value === "yes") switchToProject();
      else showQaInput();
    }));
  }

  function switchToProject() {
    mode = "project";
    stepIndex = 0;
    askProjectStep();
  }

  /* ====================== Project / qualification ====================== */
  function startProject() {
    mode = "project";
    stepIndex = 0;
    askProjectStep();
  }

  function askProjectStep() {
    while (stepIndex < PROJECT_FLOW.length) {
      const step = PROJECT_FLOW[stepIndex];
      if (step.skipIf && step.skipIf(answers)) { stepIndex++; continue; }
      bubble(step.bot, "bot");
      if (step.type === "choice") {
        setInteractive(choices(step.options, (o) => {
          answers[step.id] = o.value;
          bubble(o.label, "user");
          stepIndex++;
          askProjectStep();
        }));
      } else if (step.type === "form") {
        renderContactForm(step);
      }
      return;
    }
    finish();
  }

  function renderContactForm(step) {
    const errorEl = el("div", { class: "ac-error" });
    const inputs = step.fields.map((f) => {
      if (f.type === "textarea") {
        return el("textarea", {
          name: f.name, placeholder: f.label, "aria-label": f.label, rows: 3,
        });
      }
      return el("input", { type: f.type, name: f.name, placeholder: f.label, "aria-label": f.label });
    });
    const form = el("form", {
      class: "ac-form",
      onSubmit: (e) => {
        e.preventDefault();
        errorEl.textContent = "";
        const data = {};
        step.fields.forEach((f, i) => { data[f.name] = inputs[i].value.trim(); });
        for (const f of step.fields) {
          if (f.required && !data[f.name]) {
            errorEl.textContent = `Please fill in your ${f.label.toLowerCase()}.`;
            return;
          }
        }
        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
          errorEl.textContent = "That email looks off — please double-check.";
          return;
        }
        answers[step.id] = data;
        bubble(`${data.name} • ${data.email}`, "user");
        stepIndex++;
        askProjectStep();
      },
    }, [
      ...inputs,
      errorEl,
      el("button", { class: "ac-submit", type: "submit" }, "Send"),
    ]);
    setInteractive(form);
  }

  /* ============================= Finish ============================= */
  async function finish() {
    mode = "done";
    const tier = classify(answers, questionsAsked);
    const payload = {
      tier,
      answers,
      questionsAsked,
      page: location.pathname,
      referrer: document.referrer || null,
      ts: new Date().toISOString(),
    };

    setInteractive(null);
    const tag = el("div", { class: `ac-tier-tag ac-tier-${tier}` }, tier);
    bubble(closingMessage(tier), "bot");
    const last = panel.querySelector("#ac-msgs").lastElementChild;
    last.insertBefore(tag, last.firstChild);

    try {
      await fetch("/api/lead", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (err) {
      console.warn("[chatbot] lead POST failed:", err);
    }
  }

  /* =========================== Inline mount =========================== */
  // If the page contains <div data-novatio-contact-form></div> (typically the
  // /contact-us/ page), render the qualification flow inline there instead of
  // as a floating launcher. Skips the menu — drops the visitor straight into
  // the 5-question filter flow.
  function mountInline(target) {
    target.innerHTML = "";
    panel = renderPanel();
    panel.classList.add("ac-inline");
    target.appendChild(panel);
    mode = "project";
    stepIndex = 0;
    answers = {};
    questionsAsked = [];
    bubble("Tell us a bit about your project — five quick questions.", "bot");
    askProjectStep();
  }

  /* ============================== Boot ============================== */
  function boot() {
    injectStyles();
    const inlineTarget = document.querySelector("[data-novatio-contact-form]");
    if (inlineTarget) {
      // Inline form on this page — no floating launcher.
      mountInline(inlineTarget);
      return;
    }
    if (document.querySelector(".ac-launcher")) return;
    renderLauncher();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
