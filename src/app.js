import { assess, applicability, riskTier, openQuestions, progress, computeSignals, jurisdictionMap, conditionBasis, normType, FRAMEWORKS, FRAMEWORK_BY_ID, UNSURE } from "./engine.js";
import { REGULATIONS, STANDARDS, JURISDICTIONS, JURISDICTION_LABEL } from "./data/frameworks.js";
import { SECTIONS, isVisible } from "./data/questions.js";
import { EXAMPLES } from "./data/examples.js";
import { CONTROLS } from "./data/controls.js";

const STORE = "ai-intake-check:v1";
const app = document.getElementById("app");
const stepsEl = document.getElementById("steps");

const defaultState = () => ({
  view: "home",
  enabled: FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id),
  answers: {},
  section: 0,
  tab: "overview",
});

let state = load() || defaultState();
let animate = true;

function load() {
  try { const s = JSON.parse(localStorage.getItem(STORE)); if (!s || !s.answers) return null; if (s.answers.uc_type) s.answers.uc_type = normType(s.answers.uc_type); if (typeof s.answers.synthetic === "string") s.answers.synthetic = [s.answers.synthetic]; return { ...defaultState(), ...s, view: "home" }; } catch { return null; }
}
function save() {
  try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const TIER_LEVEL = { low: 1, medium: 2, high: 3, prohibited: 4 };
const DTONE = { ok: "d-ok", warn: "d-warn", danger: "d-danger", info: "d-info" };

function go(view, extra = {}) {
  state = { ...state, view, ...extra };
  save();
  render();
  window.scrollTo({ top: 0, behavior: "instant" in window ? "instant" : "auto" });
  app.focus({ preventScroll: true });
}

// ---------- Views ----------
function renderSteps() {
  const steps = [["setup", "Frameworks"], ["intake", "Intake"], ["result", "Result"]];
  stepsEl.innerHTML = state.view === "home" ? "" : steps.map(([v, l]) => `<span class="${state.view === v ? "on" : ""}">${l}</span>`).join("");
}

// ---------- Home: quick check ----------
const REGIONS = [["eu", "European Union"], ["uk", "United Kingdom"], ["us", "United States"], ["china", "China"], ["japan", "Japan"], ["south_korea", "South Korea"], ["other", "Elsewhere"]];
const US_STATES = [["california", "California"], ["colorado", "Colorado"], ["illinois", "Illinois"], ["nyc", "New York City"], ["texas", "Texas"], ["utah", "Utah"], ["other_us", "Other states"]];
const QC = [
  { id: "regions", label: "Where are the people affected?", multi: true, opts: REGIONS },
  { id: "states", label: "Which US states or cities?", multi: true, opts: US_STATES, showIf: (q) => q.regions.includes("us") },
  { id: "does", label: "What does the AI do?", hint: "Select all that apply", multi: true, opts: [["genai", "Generates content"], ["predictive", "Predicts or scores"], ["agent", "Takes actions"], ["biometric", "Analyses faces or voices"]] },
  { id: "who", label: "Who is affected?", opts: [["internal", "Internal: employees"], ["external", "External: customers or the public"]] },
  { id: "industry", label: "Which industry?", opts: [["financial", "Financial services"], ["insurance", "Insurance"], ["healthcare", "Health care"], ["hr", "HR and recruiting"], ["education", "Education"], ["public_sector", "Public sector"], ["retail", "Retail"], ["technology", "Technology"], ["other", "Other"]] },
  { id: "decides", label: "Does it influence decisions about people?", hint: "For example hiring, lending, insurance or access to services", opts: [["yes", "Yes"], ["no", "No"]] },
];
const INDUSTRY_DOMAIN = { financial: "credit_lending", insurance: "insurance", healthcare: "healthcare", hr: "employment", education: "education", public_sector: "essential_services" };
let quick = { regions: ["eu", "us"], states: ["california"], does: ["genai"], who: "external", industry: "technology", decides: "no" };

function quickAnswers() {
  const q = quick;
  const geo = q.regions.filter((r) => r !== "us");
  if (q.regions.includes("us")) geo.push(...(q.states.length ? q.states : ["other_us"]));
  const decides = q.decides === "yes";
  const domain = decides && INDUSTRY_DOMAIN[q.industry] ? [INDUSTRY_DOMAIN[q.industry]] : ["none"];
  const users = q.who === "internal" ? ["employees"] : q.industry === "hr" ? ["applicants", "public"] : ["customers", "public"];
  return {
    uc_type: q.does, uc_users: users, geo, industry: q.industry, domain,
    decision_role: domain[0] !== "none" ? "substantially_assists" : undefined,
    aedt: domain[0] === "employment" ? "yes" : undefined,
    prohibited: ["none"],
    personal_data: q.who === "external" || decides ? "yes" : undefined,
  };
}

const STATUS_LABEL = { in_scope: "Applies", possible: "May apply", out_of_scope: "Does not apply", off: "Off", pending: "Not yet known" };

function viewQuickResult() {
  const a = quickAnswers();
  const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
  const r = assess(a, enabled);
  const t = r.tier;
  const regs = REGULATIONS.filter((f) => ["in_scope", "possible"].includes(r.applicability[f.id].status));
  const pend = REGULATIONS.filter((f) => r.applicability[f.id].status === "pending");
  const generalDecision = quick.decides === "yes" && !INDUSTRY_DOMAIN[quick.industry];
  return `<div class="qc-sticky">
    <div class="qc-tier">
      <span class="qc-label">Preliminary risk tier</span>
      <b class="tier-word tw-${t.tier}">${t.label}</b>
      <div class="meter lv${TIER_LEVEL[t.tier]}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <p class="qc-why">${esc(generalDecision ? "Decisions about people: the full intake checks whether they count as high-risk" : t.why[0] || "")}</p>
    </div>
    <div class="qc-fw">
      <span class="qc-label">Regulations · ${regs.length} of ${REGULATIONS.length}</span>
      ${regs.length ? regs.map((f) => { const s = r.applicability[f.id].status; return `<div class="qc-fwrow ${s === "in_scope" ? "on" : "maybe"}"><span class="st st-${s}"></span><span>${esc(f.short)}<small>${esc(f.jurisdiction.replace(", US", ""))}</small></span><em>${STATUS_LABEL[s]}</em></div>`; }).join("") : `<p class="qc-why">None of the covered regulations apply to these answers.</p>`}
      ${pend.length ? `<p class="qc-why">${pend.length} more depend on details the full intake asks for.</p>` : ""}
    </div>
    <div class="qc-nums">
      <div><b>${regs.length}</b><span>Regulations</span></div>
      <div><b>${r.controls.length}</b><span>Controls</span></div>
      <div><b>${Object.values(r.obligations).flat().length}</b><span>Obligations</span></div>
    </div></div>`;
}

function viewQuick() {
  return QC.filter((g) => !g.showIf || g.showIf(quick)).map((g) => `
    <div class="qc-group ${g.id === "states" ? "sub" : ""}">
      <span class="qc-q">${g.label}${g.hint ? ` <small>${g.hint}</small>` : ""}</span>
      <div class="chips">${g.opts.map(([v, l]) => {
        const on = g.multi ? (quick[g.id] || []).includes(v) : quick[g.id] === v;
        return `<button class="chip ${on ? "on" : ""}" data-act="qc" data-g="${g.id}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
      }).join("")}</div>
    </div>`).join("");
}

// Animated hero demo: an intake plays out, then MayAI stamps the verdict. Loops through examples.
const DEMO_IDS = ["support_chatbot", "resume_screening", "emotion_monitoring", "meeting_notes"];
const VERDICT = { approve: ["You may", "Standard controls"], conditional: ["You may", "With conditions"], reject: ["You may not", "Prohibited practice"], return: ["Not yet", "More information needed"] };
const TYPE_LABEL = { genai: "Generates content", predictive: "Predicts or scores", agent: "Takes actions", biometric: "Analyses faces or voices" };

function demoCard(i) {
  const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
  const e = EXAMPLES.find((x) => x.id === DEMO_IDS[i % DEMO_IDS.length]);
  const a = e.answers;
  const r = assess(a, enabled);
  const regs = REGULATIONS.filter((f) => ["in_scope", "possible"].includes(r.applicability[f.id].status)).slice(0, 4);
  const chips = [
    ...(a.geo || []).filter((g) => g !== "other_us").map((g) => JURISDICTION_LABEL[g]),
    ...normType(a.uc_type).map((t) => TYPE_LABEL[t]),
    (a.uc_users || []).some((u) => u !== "employees") ? "External users" : "Employees only",
  ];
  const [v1, v2] = VERDICT[r.decision.code];
  return `
    <div class="dm-bar"><i></i><i></i><i></i><span>mayaicheck.com/intake</span></div>
    <div class="dm-body">
      <span class="hc-label">Use case</span>
      <div class="dm-title"><span class="dm-type" data-text="${esc(e.title)}"></span><span class="dm-caret"></span></div>
      <div class="dm-chips">${chips.map((c, k) => `<span style="--d:${k}">${esc(c)}</span>`).join("")}</div>
      <div class="dm-tier">
        <div><span class="hc-label">Risk tier</span><b class="tw-${r.tier.tier}">${r.tier.label}</b></div>
        <div class="meter lv${TIER_LEVEL[r.tier.tier]}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      <span class="hc-label">Regulations in scope</span>
      <div class="dm-regs">${regs.length ? regs.map((f, k) => `<span style="--d:${k}">${esc(f.short)}</span>`).join("") : `<span style="--d:0" class="none">None, standards only</span>`}</div>
    </div>
    <div class="dm-stamp dm-${r.decision.code}"><b>${v1}</b><small>${v2}</small></div>
    <div class="hc-dots">${DEMO_IDS.map((_, j) => `<i class="${j === i % DEMO_IDS.length ? "on" : ""}"></i>`).join("")}</div>`;
}

function playDemo(card, i, reduce) {
  card.innerHTML = demoCard(i);
  card.className = "hero-card demo";
  const type = card.querySelector(".dm-type");
  const text = type.dataset.text;
  if (reduce) { type.textContent = text; card.classList.add("s1", "s2", "s3", "s4", "s5"); return; }
  const t = heroTimers;
  let n = 0;
  const typeNext = () => { if (!card.isConnected) return; type.textContent = text.slice(0, ++n); if (n < text.length) t.push(setTimeout(typeNext, 45)); };
  t.push(setTimeout(typeNext, 300));
  const at = (ms, cls) => t.push(setTimeout(() => card.isConnected && card.classList.add(cls), ms));
  const typed = 300 + text.length * 45;
  at(typed + 200, "s1");   // chips
  at(typed + 1100, "s2");  // tier
  at(typed + 1900, "s3");  // regulations
  at(typed + 2900, "s4");  // stamp
  at(typed + 6200, "s5");  // fade out
  t.push(setTimeout(() => card.isConnected && playDemo(card, i + 1, false), typed + 6800));
}

function viewHome() {
  const hasDraft = Object.keys(state.answers).length > 0;
  const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
  const regions = [...new Set(REGULATIONS.map((f) => JURISDICTIONS.find((j) => j.id === f.geo[0])?.group))];
  const nJur = new Set(REGULATIONS.flatMap((f) => f.geo)).size;
  return `
  <section class="hero">
    <div class="hero-copy">
      <span class="tag">Free · No sign-up</span>
      <h1>May I Use This AI Tool? <em>Ask Before You Launch.</em></h1>
      <p class="lead">MayAI checks an AI use case against the regulations that apply where you operate. Answer a few targeted questions and get a risk tier, a clear decision and the controls to put in place.</p>
      <div class="row">
        <button class="btn primary" data-act="new">Start an intake</button>
        ${hasDraft ? `<button class="btn" data-act="resume">Resume draft</button>` : ""}
        <a class="btn ghost" href="#try">Try it in 20 seconds ↓</a>
      </div>
      <ol class="hero-steps"><li>Describe the use case</li><li>Answer targeted questions</li><li>Get the decision and controls</li></ol>
    </div>
    <div class="hero-card demo" id="hero-card" aria-label="Animated example of an intake result"></div>
    <div class="hero-stats">
      <div><b data-count="${REGULATIONS.length}">${REGULATIONS.length}</b><span>AI and data regulations</span></div>
      <div><b data-count="${STANDARDS.length}">${STANDARDS.length}</b><span>Standards and frameworks</span></div>
      <div><b data-count="${nJur}">${nJur}</b><span>Jurisdictions covered</span></div>
      <div><b data-count="${CONTROLS.length}">${CONTROLS.length}</b><span>Controls in NIST format</span></div>
    </div>
  </section>

  <div class="section-head reveal" id="try"><h2>Try It in 20 Seconds</h2><span class="tiny">A few questions. The result uses the same rules as the full intake.</span></div>
  <section class="quick reveal">
    <div class="qc-inputs" id="qc-inputs">${viewQuick()}</div>
    <div class="qc-result" id="qc-result" aria-live="polite">${viewQuickResult()}</div>
    <div class="qc-cta"><span class="tiny">A first read only. The full intake adds privacy, security and oversight questions and gives you the decision.</span><button class="btn primary" data-act="qc-go">Continue with these answers →</button></div>
  </section>

  <div class="section-head reveal" id="examples"><h2>Example Use Cases</h2><span class="tiny">Hover for the outcome. Click to open the full result.</span></div>
  <div class="filters reveal" role="group" aria-label="Filter by risk tier">
    ${["all", "low", "medium", "high", "prohibited"].map((t) => `<button class="chip ${t === "all" ? "on" : ""}" data-act="filter" data-v="${t}">${t === "all" ? "All" : cap(t)} <i>${t === "all" ? EXAMPLES.length : EXAMPLES.filter((e) => e.expected.tier === t).length}</i></button>`).join("")}
  </div>
  <div class="examples reveal" id="example-grid">
    ${EXAMPLES.map((e) => {
      const r = assess(e.answers, enabled);
      const applies = FRAMEWORKS.filter((f) => r.applicability[f.id].status === "in_scope").map((f) => f.short);
      return `
      <button class="example spot" data-act="example" data-id="${e.id}" data-tier="${e.expected.tier}">
        <h3>${esc(e.title)}</h3>
        <p>${esc(e.blurb)}</p>
        <span class="tag t-${e.expected.tier}">${cap(e.expected.tier)} risk</span>
        <span class="ex-peek">
          <span class="ex-dec ${DTONE[r.decision.tone]}">${esc(r.decision.label)}</span>
          <span class="ex-apps">${applies.map((s) => `<span>${esc(s)}</span>`).join("")}</span>
          <span class="ex-meta">${r.controls.length} controls · Open result →</span>
        </span>
      </button>`;
    }).join("")}
  </div>

  <div class="section-head reveal" id="coverage"><h2>Coverage</h2><span class="tiny">Regulations are checked automatically. Standards apply when you choose them.</span></div>
  <div class="cov reveal">
    <div class="cov-head">
      <h3>Regulations <i>${REGULATIONS.length}</i></h3>
      <div class="chips" role="group" aria-label="Filter by region">
        ${["All", ...regions].map((g, i) => `<button class="chip ${i === 0 ? "on" : ""}" data-act="region" data-v="${g}">${g}</button>`).join("")}
      </div>
    </div>
    ${covTable(REGULATIONS)}
    <div class="cov-head"><h3>Standards and Frameworks <i>${STANDARDS.length}</i></h3><span class="tiny">Voluntary. Certifiable standards are marked.</span></div>
    ${covTable(STANDARDS)}
  </div>

  <section class="closer reveal">
    <h2>Before You Launch, <em>Ask MayAI.</em></h2>
    <button class="btn primary" data-act="new">Start an intake</button>
  </section>`;
}

function covTable(list) {
  return `<div class="fw-acc">
    <div class="fw-cols" aria-hidden="true"><span>Name</span><span>What it is</span><span>Jurisdiction</span><span>Status</span><span></span></div>
    ${list.map((f) => {
      const group = f.kind === "law" ? JURISDICTIONS.find((j) => j.id === f.geo[0])?.group : "International";
      return `
      <details class="fw-row" name="fw" data-region="${esc(group)}">
        <summary>
          <span class="fw-name">${esc(f.short)}</span>
          <span class="fw-type">${esc(f.type)}</span>
          <span class="fw-jur">${esc(f.jurisdiction)}</span>
          <span class="fw-eff">${f.certifiable ? `<span class="tag k-cert">Certifiable</span>` : esc(f.effective)}</span>
          <span class="fw-plus" aria-hidden="true"></span>
        </summary>
        <div class="fw-body">
          <div><span class="qc-label">${esc(f.name)}</span><p>${esc(f.summary)}</p></div>
          <div><span class="qc-label">Status</span><p>${esc(f.status)}</p></div>
          <div><span class="qc-label">Source</span><p class="mono">${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.citation)}</a>` : esc(f.citation)}</p></div>
        </div>
      </details>`;
    }).join("")}
  </div>`;
}

// Home interactions that do not need a full re-render
const heroTimers = [];
function initHome() {
  const els = app.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add("in"));
  countUp(app.querySelector(".hero-stats"));
  heroTimers.forEach(clearTimeout); heroTimers.length = 0;
  const card = document.getElementById("hero-card");
  const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (card) playDemo(card, 0, reduce);
}
function countUp(root) {
  if (!root) return;
  root.querySelectorAll("[data-count]").forEach((el, k) => {
    const end = +el.dataset.count; const d = 1100; let t0 = null;
    const step = (t) => { if (t0 === null) t0 = t + k * 120; const p = Math.max(0, Math.min(1, (t - t0) / d)); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}
app.addEventListener("pointermove", (e) => {
  const c = e.target.closest(".spot");
  if (!c) return;
  const r = c.getBoundingClientRect();
  c.style.setProperty("--mx", `${e.clientX - r.left}px`);
  c.style.setProperty("--my", `${e.clientY - r.top}px`);
});

function viewSetup() {
  const nStd = STANDARDS.filter((f) => state.enabled.includes(f.id)).length;
  return `
  <section class="setup">
    <h1>Which Standards Should We Apply?</h1>
    <p class="muted">Regulations are checked automatically against your answers, because they apply whether you choose them or not. Voluntary standards and frameworks apply only if you select them.</p>
    <div class="setup-regs">
      <span class="qc-label">Checked automatically · ${REGULATIONS.length} regulations</span>
      <div class="reg-pills">${REGULATIONS.map((f) => `<span title="${esc(f.name)}">${esc(f.short)}<small>${esc(f.jurisdiction.replace(", US", ""))}</small></span>`).join("")}</div>
    </div>
    <div class="fw-grid">
      ${STANDARDS.map((f) => {
        const on = state.enabled.includes(f.id);
        return `<button class="fw ${on ? "on" : ""}" data-act="toggle-fw" data-id="${f.id}" aria-pressed="${on}">
          <span class="switch" aria-hidden="true"></span>
          <span class="tag ${f.certifiable ? "k-cert" : ""}">${esc(f.effective)}</span>
          <h3>${esc(f.name)}</h3>
          <p>${esc(f.summary)}</p>
          <p class="tiny">${esc(f.status)}</p>
        </button>`;
      }).join("")}
    </div>
    <div class="row">
      <button class="btn ghost" data-act="home">← Back</button>
      <span class="spacer"></span>
      <span class="tiny">${REGULATIONS.length} regulations · ${nStd} standard${nStd === 1 ? "" : "s"} selected</span>
      <button class="btn primary" data-act="to-intake">Continue to intake →</button>
    </div>
  </section>`;
}

function sectionDone(sec, a) {
  const vis = sec.questions.filter((q) => isVisible(q, a));
  return vis.length > 0 && vis.every((q) => { const v = a[q.id]; return q.type === "text" || q.type === "textarea" ? true : v !== undefined && !(Array.isArray(v) && !v.length); });
}

function viewIntake() {
  const a = state.answers;
  const sec = SECTIONS[state.section];
  const p = progress(a);
  const last = state.section === SECTIONS.length - 1;
  return `
  <div class="intake">
    <nav class="sidenav" aria-label="Sections">
      ${SECTIONS.map((s, i) => `
        <button class="${i === state.section ? "on" : ""} ${sectionDone(s, a) ? "done" : ""}" data-act="section" data-i="${i}">
          <span class="dot">${sectionDone(s, a) ? "✓" : i + 1}</span>${esc(s.title)}<span class="lens">${s.lens}</span>
        </button>`).join("")}
      <div class="progress" title="${p.answered} of ${p.total} answered"><div style="width:${Math.round((p.answered / Math.max(p.total, 1)) * 100)}%"></div></div>
      <span class="tiny" style="padding: 0 6px">${p.answered} of ${p.total} answered</span>
    </nav>
    <section class="card qsection ${animate ? "anim" : ""}" aria-labelledby="sec-title">
      <header>
        <span class="tag">${sec.lens}</span>
        <h2 id="sec-title">${esc(sec.title)}</h2>
        <p class="muted" style="margin:0">${esc(sec.intro)}</p>
      </header>
      ${sec.questions.filter((q) => isVisible(q, a)).map((q) => viewQuestion(q, a[q.id])).join("")}
      <div class="qnav">
        ${state.section > 0 ? `<button class="btn" data-act="prev">← Previous</button>` : `<button class="btn ghost" data-act="to-setup">← Frameworks</button>`}
        <span class="spacer"></span>
        ${last ? `<button class="btn primary" data-act="to-result">See result →</button>` : `<button class="btn primary" data-act="next">Next: ${esc(SECTIONS[state.section + 1].title)} →</button>`}
      </div>
    </section>
    <aside class="card live" id="live" aria-live="polite">${viewLive()}</aside>
  </div>`;
}

function viewQuestion(q, v) {
  const help = q.help ? `<p class="help">${esc(q.help)}</p>` : "";
  if (q.type === "text") return `<div class="q"><label class="ql" for="q-${q.id}">${esc(q.label)}</label>${help}<input type="text" id="q-${q.id}" data-q="${q.id}" value="${esc(v)}" placeholder="${esc(q.placeholder || "")}" /></div>`;
  if (q.type === "textarea") return `<div class="q"><label class="ql" for="q-${q.id}">${esc(q.label)}</label>${help}<textarea id="q-${q.id}" data-q="${q.id}" placeholder="${esc(q.placeholder || "")}">${esc(v)}</textarea></div>`;
  const multi = q.type === "multi";
  const sel = (val) => (multi ? Array.isArray(v) && v.includes(val) : v === val);
  // "No" / "None" answers always come last
  const ordered = [...q.options.filter((o) => !["no", "none"].includes(o.value)), ...q.options.filter((o) => ["no", "none"].includes(o.value))];
  const opts = ordered.map((o) => `
    <button class="opt ${sel(o.value) ? "sel" : ""}" data-act="answer" data-q="${q.id}" data-v="${o.value}" aria-pressed="${sel(o.value)}">
      <span>${esc(o.label)}</span>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}
    </button>`).join("");
  const unsure = q.unsureable ? `<button class="opt unsure ${v === UNSURE ? "sel" : ""}" data-act="answer" data-q="${q.id}" data-v="${UNSURE}" aria-pressed="${v === UNSURE}"><span>Not sure yet</span></button>` : "";
  return `<div class="q" role="group" aria-label="${esc(q.label)}"><span class="ql" style="font-weight:600;display:block">${esc(q.label)}</span>${help}${multi ? `<p class="help" style="margin:0">Select all that apply.</p>` : ""}<div class="opts">${opts}${unsure}</div></div>`;
}

function viewLive() {
  const a = state.answers;
  const t = riskTier(a);
  const app_ = applicability(a, state.enabled);
  const open = openQuestions(a);
  const started = Object.keys(a).length > 0;
  return `
    <div>
      <h4>Risk Tier (Live)</h4>
      <div class="tier">
        <span class="tier-badge t-${t.tier}">${started ? t.label : "—"}</span>
        <div class="meter lv${started ? TIER_LEVEL[t.tier] : 0}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      </div>
      ${started ? `<ul class="why">${t.why.map((w) => `<li>${esc(w)}</li>`).join("")}</ul>` : `<p class="tiny">Starts updating as you answer.</p>`}
    </div>
    <div>
      <h4>Regulations</h4>
      <div class="fwlist">
        ${(() => {
          const rel = REGULATIONS.filter((f) => ["in_scope", "possible", "pending"].includes(app_[f.id].status));
          const no = REGULATIONS.length - rel.length;
          return (rel.length ? rel.map((f) => liveRow(f, app_[f.id])).join("") : `<p class="tiny" style="margin:0">None apply so far.</p>`) + (no ? `<p class="tiny" style="margin:4px 0 0">${no} others do not apply to the locations selected.</p>` : "");
        })()}
      </div>
    </div>
    <div>
      <h4>Standards</h4>
      <div class="fwlist">${STANDARDS.filter((f) => app_[f.id].status === "in_scope").map((f) => liveRow(f, app_[f.id])).join("") || `<p class="tiny" style="margin:0">None selected.</p>`}</div>
    </div>
    <div>
      <h4>Open Questions</h4>
      <p class="tiny" style="margin:0">${open.length ? `${open.length} unanswered or marked “not sure”` : "None. Ready for a decision."}</p>
    </div>`;
}

function liveRow(f, r) {
  const dim = ["off", "out_of_scope", "pending"].includes(r.status);
  return `<div class="fwrow ${dim ? "dim" : ""}"><span class="st st-${r.status}"></span><div><b>${esc(f.short)}</b> · ${STATUS_LABEL[r.status]}<div class="r">${esc(r.reason)}</div></div></div>`;
}

function viewResult() {
  const a = state.answers;
  const r = assess(a, state.enabled);
  const req = Object.values(r.obligations).flat().filter((o) => ["required", "blocker"].includes(o.level)).length;
  const inScope = REGULATIONS.filter((f) => ["in_scope", "possible"].includes(r.applicability[f.id].status));
  const jmap = jurisdictionMap(a, state.enabled);
  const tabs = [["overview", "Overview"], ["obligations", `Obligations (${Object.values(r.obligations).flat().length})`], ["controls", `Controls (${r.controls.length})`], ["answers", "Your Answers"]];
  return `
  <section class="card result-head">
    <div>
      <span class="decision ${DTONE[r.decision.tone]}">${esc(r.decision.label)}</span>
      <h1>${esc(a.uc_name || "Untitled Use Case")}</h1>
      <p class="muted" style="margin:0">${esc(r.decision.summary)}</p>
    </div>
    <div class="stats">
      <div class="stat"><b class="t-${r.tier.tier}" style="background:none">${r.tier.label}</b><span>Risk tier</span></div>
      <div class="stat"><b>${inScope.length}</b><span>Regulations apply</span></div>
      <div class="stat"><b>${req}</b><span>Legal requirements</span></div>
    </div>
  </section>
  <div class="row" style="margin-top:14px">
    <button class="btn small" data-act="edit">← Edit answers</button>
    <span class="spacer"></span>
    <div class="export">
      <button class="btn small" data-act="export-md">Download report (.md)</button>
      <button class="btn small" data-act="export-json">Download JSON</button>
      <button class="btn small" data-act="print">Print / PDF</button>
    </div>
  </div>
  <nav class="tabs" role="tablist">${tabs.map(([id, l]) => `<button role="tab" class="${state.tab === id ? "on" : ""}" data-act="tab" data-id="${id}" aria-selected="${state.tab === id}">${l}</button>`).join("")}</nav>

  <div class="panel" ${state.tab === "overview" ? "" : "hidden"}>
    ${r.open.length ? `<div class="card list"><h3>Open Questions</h3>${r.open.map((o) => `<div class="item"><span class="lvl lvl-check">${o.kind === "unsure" ? "Not sure" : "Missing"}</span><div>${esc(o.label)}</div></div>`).join("")}</div>` : ""}
    ${r.conditions.length ? `<div class="card list cond"><h3>Conditions Before Launch</h3>${r.conditions.map((c) => `<div class="item"><span class="lvl lvl-required">Condition</span><div>${esc(c.text)}${basisLine(conditionBasis(a, state.enabled, c), "Based on")}<div class="ref mono">Control ${c.control}</div></div></div>`).join("")}</div>` : ""}
    <div class="card list"><h3>Why This Risk Tier <span class="tag t-${r.tier.tier}">${r.tier.label}</span></h3>${r.tier.why.map((w, k) => `<div class="item"><span class="lvl lvl-note">Signal</span><div>${esc(w)}${basisLine(inScopeRefs(r, r.tier.basis[k]), "Legal basis")}</div></div>`).join("")}</div>
    ${jmap.length ? `<div class="card list"><h3>Jurisdictions</h3><div class="jur-grid">${jmap.map((j) => `<div class="jur"><b>${esc(j.label)}</b>${j.regs.length ? j.regs.map((x) => `<span class="${x.status}">${esc(x.short)}${x.status === "possible" ? " (may apply)" : ""}</span>`).join("") : `<span class="none">No covered regulation applies</span>`}</div>`).join("")}</div></div>` : ""}
    <div class="card list"><h3>Regulations</h3>${[...REGULATIONS].sort((x, y) => ORDER[r.applicability[x.id].status] - ORDER[r.applicability[y.id].status]).map((f) => fwItem(f, r.applicability[f.id])).join("")}</div>
    <div class="card list"><h3>Standards and Frameworks</h3>${STANDARDS.map((f) => fwItem(f, r.applicability[f.id])).join("")}</div>
    <div class="notice">This result is general information to support your own review, not legal advice. Legal status checked November 2026. Some implementing rules (Colorado, Illinois, South Korea) are still being finalised.</div>
  </div>

  <div class="panel" ${state.tab === "obligations" ? "" : "hidden"}>
    ${Object.keys(r.obligations).length ? FRAMEWORKS.filter((f) => r.obligations[f.id]).map((f) => `
      <div class="card list">
        <h3>${esc(f.name)} <span class="tag ${f.kind === "law" ? "k-law" : ""}">${f.kind === "law" ? "Regulation" : "Voluntary"}</span></h3>
        <p class="tiny" style="margin-top:-6px">${esc(f.citation)}</p>
        ${r.obligations[f.id].map((o) => `<div class="item"><span class="lvl lvl-${o.level}">${o.level}</span><div>${esc(o.text)}<div><span class="ref">${esc(o.ref)}</span>${o.when ? ` · <span class="when">${esc(o.when)}</span>` : ""}</div></div></div>`).join("")}
      </div>`).join("") : `<div class="card list"><p class="muted">No framework obligations triggered yet. Answer the location and decision questions, or switch on more frameworks.</p></div>`}
  </div>

  <div class="panel" ${state.tab === "controls" ? "" : "hidden"}>
    <p class="tiny" style="margin:0">Controls follow the NIST SP 800-53 Rev. 5 structure. IDs prefixed AI- adapt the named base control; extensions cover areas 800-53 does not (human oversight, AI transparency, bias audits). Mappings show only the frameworks that apply to this use case.</p>
    ${r.controls.map((c) => `
      <details class="card control ${c.condition ? "cond" : ""}">
        <summary><span class="cid">${c.id}</span><h3>${esc(c.title)}</h3>${c.condition ? `<span class="lvl lvl-required">Condition</span>` : ""}<span class="tag">${esc(c.base ? "Based on " + c.base : "Extension")}</span><span class="chev">›</span></summary>
        <div class="body">
          <div><div class="lbl">Control</div><div class="stmt">${esc(c.statement)}</div></div>
          <div><div class="lbl">Discussion</div><div>${esc(c.discussion)}</div></div>
          <div class="row"><div><div class="lbl">Family</div><div class="tiny">${esc(c.family)}</div></div><div><div class="lbl">Related controls</div><div class="mono">${c.related.map(esc).join(", ")}</div></div></div>
          ${Object.keys(c.map).length ? `<div><div class="lbl">Mappings</div><div class="maps">${Object.entries(c.map).flatMap(([fid, refs]) => refs.map((ref) => `<span class="tag">${esc(FRAMEWORK_BY_ID[fid].short)}: ${esc(ref)}</span>`)).join("")}</div></div>` : ""}
        </div>
      </details>`).join("")}
  </div>

  <div class="panel" ${state.tab === "answers" ? "" : "hidden"}>
    ${SECTIONS.map((s) => `<div class="card list"><h3>${esc(s.title)}</h3>${s.questions.filter((q) => isVisible(q, a)).map((q) => `<div class="item"><span class="lvl lvl-note">${s.lens}</span><div><b>${esc(q.label)}</b><div class="muted">${esc(answerText(q, a[q.id]))}</div></div></div>`).join("")}</div>`).join("")}
  </div>`;
}

// Legal references rendered as "EU AI Act, Article 50(1)" with a link to the official text
function inScopeRefs(r, refs) {
  return (refs || []).filter((x) => ["in_scope", "possible"].includes(r.applicability[x.fw]?.status));
}
function basisLine(refs, label) {
  if (!refs.length) return `<div class="basis none">${label}: no specific legal requirement among the regulations that apply here; recommended good practice.</div>`;
  return `<div class="basis"><span>${label}:</span> ${refs.map((x) => `<a href="${esc(x.url)}" target="_blank" rel="noopener">${esc(x.name)}, ${esc(x.ref)}</a>`).join(" · ")}</div>`;
}
const refText = (refs) => refs.map((x) => `${x.name}, ${x.ref} (${x.url})`).join("; ");

const ORDER = { in_scope: 0, possible: 1, pending: 2, out_of_scope: 3, off: 4 };
function fwItem(f, x) {
  return `<div class="item ${["out_of_scope", "off"].includes(x.status) ? "dim" : ""}"><span class="lvl ${x.status === "in_scope" ? "lvl-recommended" : x.status === "possible" ? "lvl-check" : "lvl-note"}">${{ in_scope: "Applies", possible: "May apply", out_of_scope: "No", off: "Off", pending: "Unknown" }[x.status]}</span><div><b>${esc(f.name)}</b> <span class="tiny">· ${esc(f.type)} · ${esc(f.jurisdiction)}</span><div class="tiny">${esc(x.reason)}</div></div></div>`;
}

const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function answerText(q, v) {
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) return "Not answered";
  if (v === UNSURE) return "Not sure yet";
  if (!q.options) return String(v);
  const lab = (x) => q.options.find((o) => o.value === x)?.label || x;
  return Array.isArray(v) ? v.map(lab).join(", ") : lab(v);
}

// ---------- Export ----------
function markdown() {
  const a = state.answers;
  const r = assess(a, state.enabled);
  const L = [];
  L.push(`# AI Intake Result: ${a.uc_name || "Untitled Use Case"}`, "");
  L.push(`**Decision:** ${r.decision.label}  `, `**Risk tier:** ${r.tier.label}  `, `**Generated:** ${new Date().toISOString().slice(0, 10)} with MayAI`, "");
  L.push("> General information only, not legal advice. Legal status checked November 2026.", "");
  if (a.uc_description) L.push(a.uc_description, "");
  L.push("## Why This Risk Tier", ...r.tier.why.map((w, k) => { const refs = inScopeRefs(r, r.tier.basis[k]); return `- ${w}${refs.length ? ` — Legal basis: ${refText(refs)}` : ""}`; }), "");
  if (r.open.length) L.push("## Open Questions", ...r.open.map((o) => `- ${o.label} (${o.kind === "unsure" ? "not sure" : "missing"})`), "");
  if (r.conditions.length) L.push("## Conditions Before Launch", ...r.conditions.map((c) => { const refs = conditionBasis(a, state.enabled, c); return `- ${c.text} (control ${c.control})${refs.length ? ` — Based on: ${refText(refs)}` : ""}`; }), "");
  L.push("## Regulations and Frameworks", ...FRAMEWORKS.filter((f) => r.applicability[f.id].status !== "off").map((f) => `- **${f.name}**: ${r.applicability[f.id].status.replace(/_/g, " ")}. ${r.applicability[f.id].reason}`), "");
  L.push("## Obligations");
  for (const f of FRAMEWORKS) if (r.obligations[f.id]) {
    L.push(`### ${f.name}`, ...r.obligations[f.id].map((o) => `- **${o.level}** (${o.ref}${o.when ? `; ${o.when}` : ""}): ${o.text}`), "");
  }
  L.push("## Controls (NIST SP 800-53 Rev. 5 format)", "");
  for (const c of r.controls) {
    L.push(`### ${c.id} ${c.title}${c.condition ? " (condition)" : ""}`, `*${c.base ? "Based on " + c.base : "AI-specific extension"} · ${c.family}*`, "", "**Control:**", "", c.statement, "", `**Discussion:** ${c.discussion}`, "", `**Related controls:** ${c.related.join(", ")}`);
    const m = Object.entries(c.map).map(([fid, refs]) => `${FRAMEWORK_BY_ID[fid].short}: ${refs.join("; ")}`);
    if (m.length) L.push("", `**Mappings:** ${m.join(" | ")}`);
    L.push("");
  }
  L.push("## Answers");
  for (const s of SECTIONS) for (const q of s.questions.filter((q) => isVisible(q, a))) L.push(`- ${q.label} **${answerText(q, a[q.id])}**`);
  return L.join("\n");
}

function download(name, text, type) {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const link = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const slug = () => (state.answers.uc_name || "ai-intake").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// ---------- Events ----------
function setAnswer(qid, val) {
  const q = SECTIONS.flatMap((s) => s.questions).find((x) => x.id === qid);
  const a = { ...state.answers };
  if (q.type === "multi") {
    if (val === UNSURE) a[qid] = UNSURE;
    else {
      const opt = q.options.find((o) => o.value === val);
      let cur = Array.isArray(a[qid]) ? [...a[qid]] : [];
      if (cur.includes(val)) cur = cur.filter((x) => x !== val);
      else if (opt?.exclusive) cur = [val];
      else cur = [...cur.filter((x) => !q.options.find((o) => o.value === x)?.exclusive), val];
      a[qid] = cur;
    }
  } else a[qid] = a[qid] === val ? undefined : val;
  state.answers = a;
  save();
}

app.addEventListener("click", (e) => {
  const el = e.target.closest("[data-act]");
  if (!el) return;
  const act = el.dataset.act;
  switch (act) {
    case "home": return go("home");
    case "new": state = { ...defaultState() }; return go("setup");
    case "resume": return go("intake");
    case "example": {
      const ex = EXAMPLES.find((x) => x.id === el.dataset.id);
      return go("result", { answers: structuredClone(ex.answers), tab: "overview", section: 0 });
    }
    case "toggle-fw": {
      const id = el.dataset.id;
      state.enabled = state.enabled.includes(id) ? state.enabled.filter((x) => x !== id) : [...state.enabled, id];
      save(); return render();
    }
    case "to-intake": return go("intake");
    case "to-setup": return go("setup");
    case "section": return go("intake", { section: +el.dataset.i });
    case "prev": return go("intake", { section: Math.max(0, state.section - 1) });
    case "next": return go("intake", { section: Math.min(SECTIONS.length - 1, state.section + 1) });
    case "to-result": return go("result", { tab: "overview" });
    case "edit": return go("intake", { section: 0 });
    case "tab": state.tab = el.dataset.id; save(); return render();
    case "answer": {
      setAnswer(el.dataset.q, el.dataset.v);
      return render({ keepScroll: true });
    }
    case "export-md": return download(`${slug()}-intake.md`, markdown(), "text/markdown");
    case "export-json": return download(`${slug()}-intake.json`, JSON.stringify({ answers: state.answers, frameworks: state.enabled, result: assess(state.answers, state.enabled) }, (k, v) => (typeof v === "function" ? undefined : v), 2), "application/json");
    case "print": return window.print();
    case "qc": {
      const g = QC.find((x) => x.id === el.dataset.g); const v = el.dataset.v;
      if (g.multi) { const cur = quick[g.id] || []; quick[g.id] = cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]; }
      else quick[g.id] = v;
      if (g.id === "does" && !quick.does.length) quick.does = [v];
      if (g.id === "regions" && !quick.regions.length) quick.regions = [v];
      document.getElementById("qc-inputs").innerHTML = viewQuick();
      const res = document.getElementById("qc-result");
      res.innerHTML = viewQuickResult();
      res.classList.remove("flash"); void res.offsetWidth; res.classList.add("flash");
      return;
    }
    case "qc-go": {
      const qa = Object.fromEntries(Object.entries(quickAnswers()).filter(([k, v]) => v !== undefined && !["prohibited", "decision_role", "aedt"].includes(k) && !(k === "domain" && quick.decides === "yes" && v[0] === "none")));
      state = { ...defaultState(), answers: qa };
      return go("setup");
    }
    case "region": {
      const v = el.dataset.v;
      el.parentElement.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c === el));
      app.querySelectorAll('.fw-row[data-region]').forEach((row) => { if (row.closest(".cov") && REGULATIONS.some((f) => row.querySelector(".fw-name").textContent === f.short)) row.classList.toggle("hide", v !== "All" && row.dataset.region !== v); });
      return;
    }
    case "filter": {
      const v = el.dataset.v;
      app.querySelectorAll(".filters .chip").forEach((c) => c.classList.toggle("on", c === el));
      app.querySelectorAll("#example-grid .example").forEach((c) => c.classList.toggle("hide", v !== "all" && c.dataset.tier !== v));
      return;
    }
  }
});

document.querySelector(".brand").addEventListener("click", (e) => { e.preventDefault(); go("home"); });

app.addEventListener("input", (e) => {
  const el = e.target.closest("[data-q]");
  if (!el || !("value" in el)) return;
  state.answers = { ...state.answers, [el.dataset.q]: el.value };
  save();
  const live = document.getElementById("live");
  if (live) live.innerHTML = viewLive();
});

function render(opts = {}) {
  const y = window.scrollY;
  animate = !opts.keepScroll;
  renderSteps();
  app.innerHTML = { home: viewHome, setup: viewSetup, intake: viewIntake, result: viewResult }[state.view]();
  if (opts.keepScroll) window.scrollTo(0, y);
  if (state.view === "home") initHome();
}

render();
