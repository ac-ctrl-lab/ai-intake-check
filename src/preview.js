// MayAI landing page: scroll-driven scenes and a live quick check, all fed by the real rules engine.
import { assess, conditionBasis, FRAMEWORKS } from "./engine.js";
import { REGULATIONS, STANDARDS, JURISDICTION_LABEL } from "./data/frameworks.js";
import { EXAMPLES } from "./data/examples.js";

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ENABLED = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
const LEVEL = { low: 1, medium: 2, high: 3, prohibited: 4 };
const VERDICT = { approve: ["You may.", "ok", "Standard controls apply."], conditional: ["You may.", "warn", "With conditions."], reject: ["You may not.", "no", "Prohibited practice."], return: ["Not yet.", "info", "More information needed."] };
const STATUS = { in_scope: "Applies", possible: "May apply" };
const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const inScope = (r) => REGULATIONS.filter((f) => ["in_scope", "possible"].includes(r.applicability[f.id].status));

// ---------- Hero product shot: a real review ----------
function heroReview() {
  const e = EXAMPLES.find((x) => x.id === "support_chatbot");
  const r = assess(e.answers, ENABLED);
  const [v, cls, sub] = VERDICT[r.decision.code];
  const cond = r.conditions[0];
  const basis = cond ? conditionBasis(e.answers, ENABLED, cond) : [];
  $("#shot").innerHTML = `
    <div class="win-bar"><i></i><i></i><i></i><span>mayaicheck.com · Review</span></div>
    <div class="review">
      <div class="rv-main">
        <div class="rv-kicker">Use case</div>
        <div class="rv-title">${esc(e.title)}</div>
        <div class="rv-geo">${(e.answers.geo || []).filter((g) => g !== "other_us").map((g) => esc(JURISDICTION_LABEL[g])).join(" · ")}</div>
        <div class="rv-verdict ${cls}">${v}</div>
        <div class="rv-cond">${sub} ${r.controls.length} controls recommended.</div>
        <div class="rv-tier">Risk tier <b>${r.tier.label}</b><span class="bar l${LEVEL[r.tier.tier]}"><i></i><i></i><i></i><i></i></span></div>
      </div>
      <div class="rv-side">
        <h4>Regulations that apply</h4>
        ${inScope(r).map((f) => `<div class="rv-reg"><span>${esc(f.name)}</span><em class="${r.applicability[f.id].status === "possible" ? "maybe" : ""}">${STATUS[r.applicability[f.id].status]}</em></div>`).join("")}
        ${cond ? `<div class="rv-basis"><b>Condition:</b> ${esc(cond.text)}${basis.length ? `<br>Based on ${basis.map((b) => `${esc(b.name)}, ${esc(b.ref)}`).join("; ")}.` : ""}</div>` : ""}
      </div>
    </div>`;
}

// ---------- Pinned story screen ----------
const STORY = EXAMPLES.find((x) => x.id === "resume_screening");
const storyResult = assess(STORY.answers, ENABLED);
const storyChips = ["New York City", "Colorado", "Illinois", "Predicts or scores", "Job applicants", "Hiring decisions"];
const storyRegs = REGULATIONS.filter((f) => ["colorado", "illinois_hra", "nyc_ll144", "eu_ai_act", "texas_traiga"].includes(f.id));
function renderScreen() {
  const [v, , sub] = VERDICT[storyResult.decision.code];
  $("#screen").innerHTML = `
    <div class="sc-label">Use case</div>
    <div class="sc-title"><span id="scType"></span><span class="caret"></span></div>
    <div class="sc-chips">${storyChips.map((c) => `<span>${esc(c)}</span>`).join("")}</div>
    <div class="sc-regs">${storyRegs.map((f) => { const s = storyResult.applicability[f.id].status; return `<div class="sc-reg"><span>${esc(f.name)}</span><em class="${s === "in_scope" ? "" : s === "possible" ? "maybe" : "no"}">${STATUS[s] || "Does not apply"}</em></div>`; }).join("")}</div>
    <div class="sc-verdict"><b>${v}</b><span>${sub} ${storyResult.conditions.length} conditions before launch, each with its legal basis.</span></div>`;
}
function updateStory(p) {
  const steps = [...document.querySelectorAll("#steps li")];
  const step = Math.min(2, Math.floor(p * 3));
  steps.forEach((li, i) => li.classList.toggle("on", i === step));
  const local = Math.max(0, Math.min(1, p * 3 - step));
  const title = STORY.title;
  const typed = step === 0 ? Math.round(title.length * Math.min(1, local * 2)) : title.length;
  $("#scType").textContent = title.slice(0, typed);
  const chips = [...document.querySelectorAll(".sc-chips span")];
  const nChips = step === 0 ? Math.max(0, Math.round((local - .45) / .55 * chips.length)) : chips.length;
  chips.forEach((c, i) => c.classList.toggle("on", i < nChips));
  const regs = [...document.querySelectorAll(".sc-reg")];
  const nRegs = step === 0 ? 0 : step === 1 ? Math.round(local * 1.3 * regs.length) : regs.length;
  regs.forEach((c, i) => c.classList.toggle("on", i < nRegs));
  $(".sc-verdict").classList.toggle("on", step === 2 && local > .15);
}

// ---------- Word reveal ----------
function splitReveal() {
  const el = $("#reveal");
  el.innerHTML = el.textContent.split(" ").map((w) => `<span>${esc(w)}</span>`).join(" ");
}

// ---------- Coverage cards ----------
function renderCoverage() {
  $("#covRow").innerHTML = [...REGULATIONS, ...STANDARDS].map((f) => `
    <article class="cov-card ${f.kind === "voluntary" ? "std" : ""}">
      <span class="jur">${esc(f.jurisdiction)}</span>
      <h3>${esc(f.short)}</h3>
      <span class="type">${esc(f.type)}</span>
      <span class="eff">${esc(f.kind === "voluntary" ? (f.certifiable ? "Voluntary · Certifiable" : f.effective === "Voluntary" ? "Voluntary" : "Voluntary · " + f.effective) : f.effective)}</span>
      <a href="${esc(f.url)}" target="_blank" rel="noopener">${f.kind === "voluntary" ? "Get the standard" : "Read the law"} ›</a>
    </article>`).join("");
}

// ---------- Quick check ----------
const Q = [
  { id: "regions", label: "Where are the people affected?", multi: true, opts: [["eu", "EU"], ["uk", "UK"], ["us", "United States"], ["china", "China"], ["japan", "Japan"], ["south_korea", "South Korea"], ["other", "Elsewhere"]] },
  { id: "states", label: "Which US states or cities?", multi: true, opts: [["california", "California"], ["colorado", "Colorado"], ["illinois", "Illinois"], ["nyc", "New York City"], ["texas", "Texas"], ["utah", "Utah"], ["other_us", "Other states"]], show: (q) => q.regions.includes("us") },
  { id: "does", label: "What does the AI do?", multi: true, opts: [["genai", "Generates content"], ["predictive", "Predicts or scores"], ["agent", "Takes actions"], ["biometric", "Analyses faces or voices"]] },
  { id: "who", label: "Who is affected?", opts: [["internal", "Employees"], ["external", "Customers or the public"]] },
  { id: "industry", label: "Industry", opts: [["financial", "Financial services"], ["insurance", "Insurance"], ["healthcare", "Health care"], ["hr", "HR and recruiting"], ["education", "Education"], ["retail", "Retail"], ["technology", "Technology"], ["other", "Other"]] },
  { id: "decides", label: "Does it influence decisions about people?", opts: [["yes", "Yes"], ["no", "No"]] },
];
const DOMAIN = { financial: "credit_lending", insurance: "insurance", healthcare: "healthcare", hr: "employment", education: "education" };
const quick = { regions: ["eu", "us"], states: ["california"], does: ["genai"], who: "external", industry: "technology", decides: "no" };
function quickAnswers() {
  const q = quick;
  const geo = q.regions.filter((x) => x !== "us");
  if (q.regions.includes("us")) geo.push(...(q.states.length ? q.states : ["other_us"]));
  const dec = q.decides === "yes" && DOMAIN[q.industry];
  return { uc_type: q.does, uc_users: q.who === "internal" ? ["employees"] : q.industry === "hr" ? ["applicants", "public"] : ["customers", "public"], geo, industry: q.industry,
    domain: dec ? [DOMAIN[q.industry]] : ["none"], decision_role: dec ? "substantially_assists" : undefined, aedt: dec && DOMAIN[q.industry] === "employment" ? "yes" : undefined,
    prohibited: ["none"], personal_data: q.who === "external" || q.decides === "yes" ? "yes" : undefined };
}
function renderQuick(flash) {
  $("#qcForm").innerHTML = Q.filter((g) => !g.show || g.show(quick)).map((g) => `
    <div class="qg"><label>${g.label}</label><div class="seg">${g.opts.map(([v, l]) => {
      const on = g.multi ? quick[g.id].includes(v) : quick[g.id] === v;
      return `<button data-g="${g.id}" data-v="${v}" class="${on ? "on" : ""}" aria-pressed="${on}">${l}</button>`;
    }).join("")}</div></div>`).join("");
  const a = quickAnswers();
  const r = assess(a, ENABLED);
  const regs = inScope(r);
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k, v]) => v !== undefined && !["prohibited", "decision_role", "aedt"].includes(k)))))));
  $("#qcOut").innerHTML = `
    <div class="k">Preliminary risk tier</div>
    <div class="tier ${r.tier.tier}">${r.tier.label}</div>
    <span class="bar l${LEVEL[r.tier.tier]}"><i></i><i></i><i></i><i></i></span>
    <p class="why">${esc(r.tier.why[0] || "")}</p>
    <div class="k">Regulations · ${regs.length} of ${REGULATIONS.length}</div>
    ${regs.length ? regs.map((f) => `<div class="rv-reg"><span>${esc(f.name)}</span><em class="${r.applicability[f.id].status === "possible" ? "maybe" : ""}">${STATUS[r.applicability[f.id].status]}</em></div>`).join("") : `<p class="why">None of the covered regulations apply to these answers.</p>`}
    <a class="pill big go" href="app.html?quick=${encodeURIComponent(payload)}">Continue with these answers</a>`;
  if (flash) { const o = $("#qcOut"); o.classList.remove("flash"); void o.offsetWidth; o.classList.add("flash"); }
}
$("#qcForm").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-g]");
  if (!b) return;
  const g = Q.find((x) => x.id === b.dataset.g); const v = b.dataset.v;
  if (g.multi) { quick[g.id] = quick[g.id].includes(v) ? quick[g.id].filter((x) => x !== v) : [...quick[g.id], v]; if (!quick[g.id].length && g.id !== "states") quick[g.id] = [v]; }
  else quick[g.id] = v;
  renderQuick(true);
});

// ---------- Examples ----------
function renderExamples() {
  $("#exGrid").innerHTML = EXAMPLES.map((e) => {
    const r = assess(e.answers, ENABLED);
    const [v, cls, sub] = VERDICT[r.decision.code];
    return `<a class="ex in-view" href="app.html?example=${e.id}"><span class="v ${cls}">${v} ${sub.replace(".", "")}</span><h3>${esc(e.title)}</h3><p>${esc(e.blurb)}</p><span class="open">Read the review ›</span></a>`;
  }).join("");
}

// ---------- Scroll engine ----------
const clamp = (x) => Math.max(0, Math.min(1, x));
function progressThrough(el) {
  const r = el.getBoundingClientRect();
  const total = r.height - window.innerHeight;
  return total > 0 ? clamp(-r.top / total) : 0;
}
let ticking = false;
function onScroll() {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => {
    ticking = false;
    const vh = window.innerHeight;
    // Hero shot straightens as it rises into view
    const shot = $("#shot"); const sr = shot.getBoundingClientRect();
    shot.style.setProperty("--p", reduce ? 1 : clamp((vh - sr.top) / (vh * .75)).toFixed(3));
    // Pinned story
    if (window.innerWidth > 900) updateStory(progressThrough($(".story-track")));
    // Word reveal
    const rv = $("#reveal"); const rr = rv.getBoundingClientRect();
    const words = rv.querySelectorAll("span");
    const lit = Math.round(clamp((vh * .85 - rr.top) / (rr.height + vh * .35)) * words.length);
    words.forEach((w, i) => w.classList.toggle("lit", reduce || i < lit));
    // Horizontal coverage
    if (window.innerWidth > 900) {
      const row = $("#covRow");
      const max = row.scrollWidth - window.innerWidth + 48;
      row.style.transform = `translateX(${-progressThrough($("#covTrack")) * Math.max(0, max)}px)`;
    }
  });
}
function observeInView() {
  const io = new IntersectionObserver((es) => es.forEach((en) => { if (en.isIntersecting) { en.target.classList.add("seen"); io.unobserve(en.target); } }), { threshold: .15 });
  document.querySelectorAll(".in-view").forEach((el, i) => { el.style.transitionDelay = `${(i % 4) * 70}ms`; io.observe(el); });
}

heroReview();
renderScreen();
splitReveal();
renderCoverage();
renderQuick(false);
renderExamples();
observeInView();
if (window.innerWidth <= 900) updateStory(1);
window.addEventListener("scroll", onScroll, { passive: true });
window.addEventListener("resize", onScroll);
onScroll();
