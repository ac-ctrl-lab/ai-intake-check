import { assess, applicability, riskTier, openQuestions, progress, computeSignals, FRAMEWORKS, FRAMEWORK_BY_ID, UNSURE } from "./engine.js";
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
  try { const s = JSON.parse(localStorage.getItem(STORE)); return s && s.answers ? { ...defaultState(), ...s, view: "home" } : null; } catch { return null; }
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
  const steps = [["setup", "1 Frameworks"], ["intake", "2 Intake"], ["result", "3 Result"]];
  stepsEl.innerHTML = state.view === "home" ? "" : steps.map(([v, l]) => `<span class="${state.view === v ? "on" : ""}">${l}</span>`).join("");
}

// ---------- Home: quick check ----------
const QC = [
  { id: "geo", label: "Where are the people affected?", multi: true, opts: [["eu", "European Union"], ["colorado", "Colorado"], ["nyc", "New York City"], ["other_us", "Elsewhere in the US"]] },
  { id: "type", label: "What kind of AI is it?", opts: [["genai_assistant", "Generative assistant"], ["predictive", "Predictive model"], ["agent", "Agent"], ["vision_biometric", "Vision or biometric"]] },
  { id: "users", label: "Who uses it or is affected?", multi: true, opts: [["employees", "Employees"], ["customers", "Customers"], ["public", "The public"], ["applicants", "Job applicants"]] },
  { id: "domain", label: "Does it shape decisions about people?", opts: [["none", "No"], ["employment", "Hiring"], ["credit_lending", "Lending"], ["insurance", "Insurance"], ["healthcare", "Health care"]] },
];
let quick = { geo: ["eu"], type: "genai_assistant", users: ["customers"], domain: "none" };

function quickAnswers() {
  const q = quick;
  const decides = q.domain && q.domain !== "none";
  const people = decides || (q.users || []).some((u) => u !== "employees");
  return {
    uc_type: q.type, uc_users: q.users, geo: q.geo,
    domain: q.domain ? [q.domain] : undefined,
    decision_role: decides ? "substantially_assists" : undefined,
    aedt: q.domain === "employment" ? "yes" : decides ? "no" : undefined,
    prohibited: ["none"],
    personal_data: people ? "yes" : undefined,
  };
}

function viewQuickResult() {
  const a = quickAnswers();
  const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
  const t = riskTier(a);
  const ap = applicability(a, enabled);
  const r = assess(a, enabled);
  const applies = FRAMEWORKS.filter((f) => ap[f.id].status === "in_scope");
  return `
    <div class="qc-tier">
      <span class="qc-label">Risk tier</span>
      <b class="tier-word tw-${t.tier}" data-anim>${t.label}</b>
      <div class="meter lv${TIER_LEVEL[t.tier]}" aria-hidden="true"><i></i><i></i><i></i><i></i></div>
      <p class="qc-why">${esc(t.why[0] || "")}</p>
    </div>
    <div class="qc-fw">
      <span class="qc-label">Frameworks</span>
      ${FRAMEWORKS.map((f) => { const s = ap[f.id].status; return `<div class="qc-fwrow ${s === "in_scope" ? "on" : s === "possible" ? "maybe" : ""}"><span class="st st-${s}"></span>${esc(f.short)}<em>${{ in_scope: "Applies", possible: "May apply", out_of_scope: "No", off: "Off", pending: "—" }[s]}</em></div>`; }).join("")}
    </div>
    <div class="qc-nums">
      <div><b>${applies.length}</b><span>Frameworks Apply</span></div>
      <div><b>${r.controls.length}</b><span>Controls</span></div>
      <div><b>${Object.values(r.obligations).flat().length}</b><span>Obligations</span></div>
    </div>`;
}

function viewQuick() {
  return QC.map((g) => `
    <div class="qc-group">
      <span class="qc-q">${g.label}</span>
      <div class="chips">${g.opts.map(([v, l]) => {
        const on = g.multi ? (quick[g.id] || []).includes(v) : quick[g.id] === v;
        return `<button class="chip ${on ? "on" : ""}" data-act="qc" data-g="${g.id}" data-v="${v}" aria-pressed="${on}">${l}</button>`;
      }).join("")}</div>
    </div>`).join("");
}

function viewHome() {
  const hasDraft = Object.keys(state.answers).length > 0;
  const nQuestions = SECTIONS.flatMap((s) => s.questions).length;
  const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
  return `
  <section class="hero">
    <div>
      <span class="tag">Free · private · no sign-up</span>
      <h1>Can We Use This AI Tool? <em>Find Out Before You Launch.</em></h1>
      <p class="lead">An AI use-case intake for small and mid-size companies. Answer questions on legal, privacy, security and oversight, and get the frameworks that apply, a risk tier, an intake decision and the controls to put in place.</p>
      <div class="row">
        <button class="btn primary" data-act="new">Start a new intake</button>
        ${hasDraft ? `<button class="btn" data-act="resume">Resume draft</button>` : ""}
        <a class="btn ghost" href="#try">Try it in 20 seconds ↓</a>
      </div>
    </div>
    <div class="hero-art" aria-hidden="true">
      <div class="flow">
        <div><b>01</b><span>Choose the frameworks you care about</span></div>
        <div><b>02</b><span>Answer about 30 questions; only the relevant ones appear</span></div>
        <div><b>03</b><span>Watch scope and risk update as you go</span></div>
        <div><b>04</b><span>Get a decision, obligations and NIST-format controls</span></div>
      </div>
      <div class="lenses">${["Legal", "Privacy", "Security", "Trust", "Governance"].map((l) => `<span class="tag">${l}</span>`).join("")}</div>
    </div>
  </section>

  <section class="stats-strip reveal">
    <div><b data-count="${FRAMEWORKS.length}">${FRAMEWORKS.length}</b><span>Laws and frameworks</span></div>
    <div><b data-count="${nQuestions}">${nQuestions}</b><span>Questions at most</span></div>
    <div><b data-count="${CONTROLS.length}">${CONTROLS.length}</b><span>NIST-format controls</span></div>
    <div><b>0</b><span>Bytes sent to a server</span></div>
  </section>

  <div class="section-head reveal" id="try"><span class="eyebrow">01</span><h2>Try It in 20 Seconds</h2><span class="tiny">Four questions. The result is computed by the same rules as the full intake.</span></div>
  <section class="quick reveal">
    <div class="qc-inputs" id="qc-inputs">${viewQuick()}</div>
    <div class="qc-result" id="qc-result" aria-live="polite">${viewQuickResult()}</div>
    <div class="qc-cta"><span class="tiny">This is a first read. The full intake adds privacy, security and oversight questions and gives you the decision.</span><button class="btn primary" data-act="qc-go">Continue with these answers →</button></div>
  </section>

  <div class="section-head reveal" id="examples"><span class="eyebrow">02</span><h2>Example Use Cases</h2><span class="tiny">Hover for the outcome. Click to open the full result.</span></div>
  <div class="filters reveal" role="group" aria-label="Filter by risk tier">
    ${["all", "low", "medium", "high", "prohibited"].map((t) => `<button class="chip ${t === "all" ? "on" : ""}" data-act="filter" data-v="${t}">${t === "all" ? "All" : cap(t)}${t === "all" ? ` <i>${EXAMPLES.length}</i>` : ` <i>${EXAMPLES.filter((e) => e.expected.tier === t).length}</i>`}</button>`).join("")}
  </div>
  <div class="examples reveal" id="example-grid">
    ${EXAMPLES.map((e, i) => {
      const r = assess(e.answers, enabled);
      const applies = FRAMEWORKS.filter((f) => r.applicability[f.id].status === "in_scope").map((f) => f.short);
      return `
      <button class="example spot" data-act="example" data-id="${e.id}" data-tier="${e.expected.tier}">
        <span class="ex-num">${String(i + 1).padStart(2, "0")}</span>
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

  <div class="section-head reveal"><span class="eyebrow">03</span><h2>Frameworks Covered</h2><span class="tiny">Click a framework for its status and when it applies.</span></div>
  <div class="fw-acc reveal">
    ${FRAMEWORKS.map((f, i) => `
      <details class="fw-row" name="fw">
        <summary>
          <span class="ex-num">${String(i + 1).padStart(2, "0")}</span>
          <span class="fw-name">${esc(f.name)}</span>
          <span class="fw-jur">${esc(f.jurisdiction)}</span>
          <span class="tag ${f.kind === "law" ? "k-law" : ""}">${f.kind === "law" ? "Law" : "Voluntary"}</span>
          <span class="fw-plus" aria-hidden="true"></span>
        </summary>
        <div class="fw-body">
          <p>${esc(f.summary)}</p>
          <div><span class="qc-label">Status</span><p>${esc(f.status)}</p></div>
          ${f.citation ? `<div><span class="qc-label">Source</span><p class="mono">${f.url ? `<a href="${esc(f.url)}" target="_blank" rel="noopener">${esc(f.citation)}</a>` : esc(f.citation)}</p></div>` : ""}
        </div>
      </details>`).join("")}
  </div>

  <section class="closer reveal">
    <h2>Know Where You Stand <em>Before Launch Day.</em></h2>
    <button class="btn primary" data-act="new">Start a new intake</button>
  </section>`;
}

// Home interactions that do not need a full re-render
function initHome() {
  // Reveal on scroll
  const els = app.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { en.target.classList.add("in"); countUp(en.target); io.unobserve(en.target); }
    }), { threshold: 0.12 });
    els.forEach((el) => io.observe(el));
  } else els.forEach((el) => el.classList.add("in"));
}
function countUp(root) {
  root.querySelectorAll("[data-count]").forEach((el) => {
    const end = +el.dataset.count; const t0 = performance.now(); const d = 900;
    const step = (t) => { const p = Math.min(1, (t - t0) / d); el.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))); if (p < 1) requestAnimationFrame(step); };
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
  return `
  <section class="setup">
    <h1>Which Frameworks Should We Check?</h1>
    <p class="muted">Laws are checked for whether they apply to your use case. Voluntary frameworks are applied as selected. You can change this later.</p>
    <div class="fw-grid">
      ${FRAMEWORKS.map((f) => {
        const on = state.enabled.includes(f.id);
        return `<button class="fw ${on ? "on" : ""}" data-act="toggle-fw" data-id="${f.id}" aria-pressed="${on}">
          <span class="switch" aria-hidden="true"></span>
          <span class="tag">${f.kind === "law" ? "Law" : "Voluntary"} · ${esc(f.jurisdiction)}</span>
          <h3>${esc(f.name)}</h3>
          <p>${esc(f.summary)}</p>
          <p class="tiny">${esc(f.status)}</p>
        </button>`;
      }).join("")}
    </div>
    <div class="row">
      <button class="btn ghost" data-act="home">← Back</button>
      <span class="spacer"></span>
      <span class="tiny">${state.enabled.length} selected</span>
      <button class="btn primary" data-act="to-intake" ${state.enabled.length ? "" : "disabled"}>Continue to intake →</button>
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
  const opts = q.options.map((o) => `
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
      <h4>Frameworks</h4>
      <div class="fwlist">
        ${FRAMEWORKS.map((f) => {
          const r = app_[f.id];
          const dim = ["off", "out_of_scope", "pending"].includes(r.status);
          const label = { in_scope: "Applies", possible: "May apply", out_of_scope: "Does not apply", off: "Off", pending: "Not yet known" }[r.status];
          return `<div class="fwrow ${dim ? "dim" : ""}"><span class="st st-${r.status}"></span><div><b>${esc(f.short)}</b> · ${label}<div class="r">${esc(r.reason)}</div></div></div>`;
        }).join("")}
      </div>
    </div>
    <div>
      <h4>Open Questions</h4>
      <p class="tiny" style="margin:0">${open.length ? `${open.length} unanswered or marked “not sure”` : "None. Ready for a decision."}</p>
    </div>`;
}

function viewResult() {
  const a = state.answers;
  const r = assess(a, state.enabled);
  const req = Object.values(r.obligations).flat().filter((o) => ["required", "blocker"].includes(o.level)).length;
  const inScope = FRAMEWORKS.filter((f) => ["in_scope", "possible"].includes(r.applicability[f.id].status));
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
      <div class="stat"><b>${inScope.length}</b><span>Frameworks apply</span></div>
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
    ${r.conditions.length ? `<div class="card list cond"><h3>Conditions Before Launch</h3>${r.conditions.map((c) => `<div class="item"><span class="lvl lvl-required">Condition</span><div>${esc(c.text)} <span class="ref mono">${c.control}</span></div></div>`).join("")}</div>` : ""}
    <div class="card list"><h3>Why This Risk Tier <span class="tag t-${r.tier.tier}">${r.tier.label}</span></h3>${r.tier.why.map((w) => `<div class="item"><span class="lvl lvl-note">Signal</span><div>${esc(w)}</div></div>`).join("")}</div>
    <div class="card list"><h3>Frameworks</h3>${FRAMEWORKS.map((f) => { const x = r.applicability[f.id]; return `<div class="item"><span class="lvl ${x.status === "in_scope" ? "lvl-recommended" : x.status === "possible" ? "lvl-check" : "lvl-note"}">${{ in_scope: "Applies", possible: "May apply", out_of_scope: "No", off: "Off", pending: "Unknown" }[x.status]}</span><div><b>${esc(f.name)}</b><div class="tiny">${esc(x.reason)}</div></div></div>`; }).join("")}</div>
    <div class="notice">This result is general information to support your own review, not legal advice. Legal status checked November 2026; Colorado's implementing rules are still pending.</div>
  </div>

  <div class="panel" ${state.tab === "obligations" ? "" : "hidden"}>
    ${Object.keys(r.obligations).length ? FRAMEWORKS.filter((f) => r.obligations[f.id]).map((f) => `
      <div class="card list">
        <h3>${esc(f.name)} <span class="tag">${f.kind === "law" ? "Law" : "Voluntary"}</span></h3>
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
  L.push(`**Decision:** ${r.decision.label}  `, `**Risk tier:** ${r.tier.label}  `, `**Generated:** ${new Date().toISOString().slice(0, 10)} with AI Intake Check`, "");
  L.push("> General information only, not legal advice. Legal status checked November 2026.", "");
  if (a.uc_description) L.push(a.uc_description, "");
  L.push("## Why This Risk Tier", ...r.tier.why.map((w) => `- ${w}`), "");
  if (r.open.length) L.push("## Open Questions", ...r.open.map((o) => `- ${o.label} (${o.kind === "unsure" ? "not sure" : "missing"})`), "");
  if (r.conditions.length) L.push("## Conditions Before Launch", ...r.conditions.map((c) => `- ${c.text} (${c.control})`), "");
  L.push("## Frameworks", ...FRAMEWORKS.map((f) => `- **${f.name}**: ${r.applicability[f.id].status.replace(/_/g, " ")}. ${r.applicability[f.id].reason}`), "");
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
      document.getElementById("qc-inputs").innerHTML = viewQuick();
      const res = document.getElementById("qc-result");
      res.innerHTML = viewQuickResult();
      res.classList.remove("flash"); void res.offsetWidth; res.classList.add("flash");
      return;
    }
    case "qc-go": {
      const qa = Object.fromEntries(Object.entries(quickAnswers()).filter(([k, v]) => v !== undefined && k !== "prohibited" && k !== "decision_role" && k !== "aedt"));
      state = { ...defaultState(), answers: qa };
      return go("setup");
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
