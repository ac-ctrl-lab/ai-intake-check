// Deterministic intake engine. Pure functions only: same answers in, same result out.
import { FRAMEWORKS, FRAMEWORK_BY_ID, REGULATIONS, STANDARDS, JURISDICTIONS, JURISDICTION_LABEL } from "./data/frameworks.js";
import { ALL_QUESTIONS, QUESTION_BY_ID, isVisible } from "./data/questions.js";
import { CONTROLS } from "./data/controls.js";
import { CONDITION_BASIS, cite } from "./data/legal.js";

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (a, k, v) => arr(a[k]).includes(v);
const anyOf = (a, k, vals) => arr(a[k]).some((x) => vals.includes(x));
// uc_type became multi-select; accept the old single values too.
const LEGACY_TYPE = { genai_assistant: ["genai"], agent: ["genai", "agent"], predictive: ["predictive"], vision_biometric: ["biometric"] };
export const normType = (v) => (Array.isArray(v) ? v : typeof v === "string" ? LEGACY_TYPE[v] || [v] : []);
const isType = (a, t) => normType(a.uc_type).includes(t);

export const UNSURE = "__unsure";

const REQUIRED = [
  "uc_name", "uc_type", "uc_build", "uc_users", "role", "geo", "domain", "prohibited",
  "personal_data", "data_class", "access_scope", "human_review",
];

const DOMAIN_LABEL = {
  employment: "employment", education: "education", credit_lending: "credit and lending",
  insurance: "insurance", housing: "housing", healthcare: "health care",
  essential_services: "public benefits and essential services", legal_services: "legal services",
  critical_infrastructure: "critical infrastructure",
};

const ANNEX_III = {
  employment: "Annex III, point 4 (employment, workers management)",
  education: "Annex III, point 3 (education and vocational training)",
  credit_lending: "Annex III, point 5(b) (creditworthiness of natural persons)",
  insurance: "Annex III, point 5(c) (life and health insurance risk and pricing)",
  essential_services: "Annex III, point 5(a) (public assistance benefits and services)",
  critical_infrastructure: "Annex III, point 2 (critical infrastructure)",
};

const COLORADO_DOMAINS = ["employment", "education", "credit_lending", "insurance", "housing", "healthcare", "essential_services"];

const PROHIBITED = {
  emotion_workplace: ["emotion recognition in the workplace or education", "Article 5(1)(f)"],
  social_scoring: ["social scoring", "Article 5(1)(c)"],
  manipulation: ["manipulative or deceptive techniques", "Article 5(1)(a)"],
  exploit_vulnerable: ["exploiting vulnerabilities", "Article 5(1)(b)"],
  biometric_sensitive: ["biometric categorisation by sensitive traits", "Article 5(1)(g)"],
  face_scraping: ["untargeted scraping of facial images", "Article 5(1)(e)"],
  crime_prediction: ["individual crime prediction from profiling", "Article 5(1)(d)"],
  intimate_imagery: ["non-consensual intimate imagery (added by Reg. (EU) 2026/1744, applies from 2 Dec 2026)", "Article 5"],
};
const PROHIBITED_LABEL = Object.fromEntries(Object.entries(PROHIBITED).map(([k, [l, r]]) => [k, `${l} (EU AI Act, ${r})`]));
const ANNEX_POINT = { employment: "Annex III, point 4", education: "Annex III, point 3", credit_lending: "Annex III, point 5(b)", insurance: "Annex III, point 5(c)", essential_services: "Annex III, point 5(a)", critical_infrastructure: "Annex III, point 2" };


// ---------- Signals ----------
export function computeSignals(a) {
  const s = new Set();
  const domains = arr(a.domain).filter((d) => d !== "none");
  const dr = a.decision_role;

  if (domains.length && ["makes_decision", "substantially_assists", "informs", UNSURE].includes(dr)) s.add("consequential");
  if (domains.length && ["makes_decision", "substantially_assists"].includes(dr)) s.add("consequential_strong");
  if (domains.length && dr === "informs") s.add("consequential_weak");
  if (dr === "makes_decision") s.add("automated_decision");
  if (a.aedt === "yes") s.add("aedt");
  if (arr(a.prohibited).some((p) => p !== "none")) s.add("prohibited");

  if (a.personal_data === "yes") s.add("personal_data");
  const sens = arr(a.sensitive_data).filter((x) => x !== "none");
  if (sens.length) s.add("sensitive_data");
  if (s.has("personal_data") && (s.has("sensitive_data") || s.has("consequential") || isType(a, "biometric"))) s.add("personal_data_high");

  if (["vendor_saas", "vendor_api"].includes(a.uc_build)) s.add("vendor");
  if (a.vendor_training === "may_train") s.add("vendor_may_train");
  if (s.has("vendor") && a.vendor_review && a.vendor_review !== "done") s.add("vendor_review_missing");
  if (a.role === "provider") s.add("provider");

  if (anyOf(a, "uc_users", ["customers", "business_customers", "public", "applicants"])) s.add("external_users");
  if (isType(a, "genai") || isType(a, "agent")) s.add("genai");
  if (isType(a, "agent") || a.access_scope === "actions") s.add("agent_actions");
  if (a.access_scope === "internal_data") s.add("internal_data");
  if (a.untrusted_content === "yes") s.add("untrusted_content");
  if (["confidential", "restricted"].includes(a.data_class)) s.add("confidential_data");
  if (isType(a, "biometric")) s.add("biometric");
  if (isType(a, "predictive")) s.add("predictive");
  if (a.industry) s.add(`industry_${a.industry}`);

  const syn = Array.isArray(a.synthetic) ? a.synthetic : a.synthetic ? [a.synthetic] : [];
  if (syn.includes("text")) s.add("synthetic_text");
  if (syn.includes("media")) s.add("synthetic_media");
  if (syn.includes("deepfake")) s.add("deepfake");
  if (syn.some((x) => ["text", "media", "deepfake"].includes(x))) s.add("synthetic_out");

  if (a.sso === "no") s.add("no_sso");
  if (a.logging === "no") s.add("no_logging");
  if (a.retention === "not_defined") s.add("no_retention");
  if (["exceptions", "none"].includes(a.human_review)) s.add("low_review");
  if (a.ai_disclosed === "no") s.add("no_disclosure");
  if (a.appeal === "no") s.add("no_appeal");
  if (a.accuracy_testing === "not_yet") s.add("no_accuracy_testing");
  if (a.bias_testing && a.bias_testing !== "done") s.add("no_bias_testing");
  if (a.monitoring_owner === "no") s.add("no_monitoring_owner");
  if (a.ai_policy === "no") s.add("no_policy");
  if (a.training === "no") s.add("no_training");
  if (a.incident_process === "no") s.add("no_incident_process");
  if (a.privacy_notice === "no") s.add("no_privacy_notice");
  return s;
}

// ---------- Framework applicability ----------
// Returns { id: { status: "in_scope" | "possible" | "out_of_scope" | "off" | "pending", reason } }
// Regulations are always checked: they apply whether or not someone selects them.
// Voluntary standards apply only when selected in `enabled`.
const KOREA_HIGH_IMPACT = ["employment", "credit_lending", "healthcare", "education", "critical_infrastructure", "essential_services"];
const CA_SIGNIFICANT = ["employment", "credit_lending", "housing", "education", "healthcare", "insurance", "essential_services"];

const RULES = {
  eu_ai_act: (a) => ({ status: "in_scope", reason: "People in the EU are affected or the system is offered there" }),
  gdpr: (a) => personalDataRule(a, "Personal data of people in the EU"),
  uk_gdpr: (a) => personalDataRule(a, "Personal data of people in the UK"),
  colorado: (a, s, domains) => {
    const coDomains = domains.filter((d) => COLORADO_DOMAINS.includes(d));
    if (!arr(a.domain).length) return { status: "pending", reason: "Waiting for decision areas" };
    if (!coDomains.length) return { status: "out_of_scope", reason: "No consequential-decision domain under SB 26-189" };
    if (s.has("consequential_strong")) return { status: "in_scope", reason: `Materially influences ${coDomains.map((d) => DOMAIN_LABEL[d]).join(", ")} decisions` };
    return { status: "possible", reason: "Depends on whether the AI materially influences the decision" };
  },
  ca_admt: (a, s, domains) => {
    const d = domains.filter((x) => CA_SIGNIFICANT.includes(x));
    if (a.personal_data === "no") return { status: "out_of_scope", reason: "No personal data" };
    if (!arr(a.domain).length) return { status: "pending", reason: "Waiting for decision areas" };
    if (!d.length) return { status: "out_of_scope", reason: "No significant decision about California consumers" };
    if (s.has("consequential_strong")) return { status: "possible", reason: "Significant decision with little human involvement; applies if your business meets CCPA thresholds" };
    return { status: "possible", reason: "Applies if the AI substantially replaces human decision-making and you meet CCPA thresholds" };
  },
  ca_ai_transparency: (a, s) => {
    if (!s.has("genai")) return { status: "out_of_scope", reason: "No generative AI" };
    if (a.role === "provider" && s.has("external_users") && s.has("synthetic_out")) return { status: "possible", reason: "Applies if your public generative AI system has over 1 million monthly users in California" };
    return { status: "out_of_scope", reason: "Applies to providers of large public generative AI systems, not to businesses using them" };
  },
  illinois_hra: (a, s) => {
    if (has(a, "domain", "employment") || a.industry === "hr") {
      return s.has("consequential") || a.aedt === "yes"
        ? { status: "in_scope", reason: "AI influences employment decisions about people in Illinois" }
        : { status: "possible", reason: "Applies if the AI influences recruitment, hiring, promotion or other employment decisions" };
    }
    if (!arr(a.domain).length) return { status: "pending", reason: "Waiting for decision areas" };
    return { status: "out_of_scope", reason: "Not used for employment decisions" };
  },
  nyc_ll144: (a, s) => {
    if (!has(a, "domain", "employment")) return arr(a.domain).length ? { status: "out_of_scope", reason: "Not used for employment decisions" } : { status: "pending", reason: "Waiting for decision areas" };
    if (a.aedt !== "yes") return { status: a.aedt === "no" ? "out_of_scope" : "pending", reason: "Not used to screen or rank for hiring or promotion" };
    if (s.has("consequential_strong")) return { status: "in_scope", reason: "Substantially assists hiring or promotion decisions in NYC" };
    return { status: "possible", reason: "Depends on whether it substantially assists the decision (6 RCNY § 5-300)" };
  },
  texas_traiga: () => ({ status: "in_scope", reason: "AI deployed for people in Texas; baseline prohibitions apply to every business" }),
  utah_ai: (a, s) => {
    if (!s.has("genai")) return { status: "out_of_scope", reason: "No generative AI interacting with consumers" };
    if (!s.has("external_users")) return { status: "out_of_scope", reason: "No consumers interact with it" };
    return { status: "in_scope", reason: "Generative AI interacts with consumers in Utah" };
  },
  korea_ai_basic: (a, s, domains) => {
    if (s.has("genai") || domains.some((d) => KOREA_HIGH_IMPACT.includes(d)) || s.has("biometric")) return { status: "in_scope", reason: "Generative or high-impact AI affecting users in South Korea" };
    return { status: "possible", reason: "Applies mainly to generative and high-impact AI; check the final decrees" };
  },
  japan_ai_promotion: () => ({ status: "in_scope", reason: "AI used in Japan; cooperation duty only, no penalties" }),
  china_genai: (a, s) => {
    if (s.has("genai") && (s.has("synthetic_out") || s.has("external_users"))) return { status: "in_scope", reason: "Generative AI content produced or published for people in China" };
    if (s.has("genai")) return { status: "possible", reason: "Applies if AI-generated content is provided to or published for the public in China" };
    return { status: "out_of_scope", reason: "No generative AI content" };
  },
};

function personalDataRule(a, reasonYes) {
  if (a.personal_data === "yes") return { status: "in_scope", reason: reasonYes };
  if (a.personal_data === UNSURE) return { status: "possible", reason: "Unclear whether personal data is processed" };
  if (a.personal_data === "no") return { status: "out_of_scope", reason: "No personal data" };
  return { status: "pending", reason: "Waiting for data answers" };
}

export function applicability(a, enabled) {
  const s = computeSignals(a);
  const geo = arr(a.geo);
  const domains = arr(a.domain).filter((d) => d !== "none");
  const out = {};
  for (const f of FRAMEWORKS) {
    if (f.kind === "voluntary") {
      out[f.id] = enabled.includes(f.id) ? { status: "in_scope", reason: "Selected as a voluntary framework" } : { status: "off", reason: "Not selected" };
      continue;
    }
    if (!geo.length) { out[f.id] = { status: "pending", reason: "Waiting for location" }; continue; }
    if (!f.geo.some((g) => geo.includes(g))) { out[f.id] = { status: "out_of_scope", reason: `No one affected in ${f.jurisdiction.replace(", US", "")}` }; continue; }
    out[f.id] = (RULES[f.id] || (() => ({ status: "possible", reason: "Check applicability" })))(a, s, domains);
  }
  return out;
}

// Jurisdictions selected and the regulations that apply in each
export function jurisdictionMap(a, enabled) {
  const app = applicability(a, enabled);
  return arr(a.geo).map((g) => ({
    id: g,
    label: JURISDICTION_LABEL[g] || g,
    regs: REGULATIONS.filter((f) => f.geo.includes(g) && ["in_scope", "possible"].includes(app[f.id].status)).map((f) => ({ id: f.id, short: f.short, status: app[f.id].status })),
  }));
}

// ---------- Risk tier ----------
export function riskTier(a) {
  const s = computeSignals(a);
  const why = [];
  const basis = [];
  const add = (text, refs = []) => { why.push(text); basis.push(refs.map(([fw, ref]) => cite(fw, ref))); };
  const domains = arr(a.domain).filter((x) => x !== "none");
  if (s.has("prohibited")) {
    arr(a.prohibited).filter((p) => p !== "none").forEach((p) => add(`Prohibited practice: ${PROHIBITED[p][0]}`, [["eu_ai_act", PROHIBITED[p][1]]]));
    return { tier: "prohibited", label: "Prohibited", why, basis };
  }
  if (s.has("consequential_strong") || (s.has("consequential") && a.decision_role === UNSURE)) {
    const d = domains.map((x) => DOMAIN_LABEL[x]);
    const refs = domains.filter((x) => ANNEX_POINT[x]).map((x) => ["eu_ai_act", ANNEX_POINT[x]]);
    if (domains.some((x) => COLORADO_DOMAINS.includes(x))) refs.push(["colorado", "consequential decisions"]);
    refs.push(["ca_admt", "§ 7221 (significant decisions)"], ["gdpr", "Article 22"], ["uk_gdpr", "Articles 22A–22D"], ["korea_ai_basic", "high-impact AI"]);
    if (domains.includes("employment")) refs.push(["illinois_hra", "775 ILCS 5/2-102(L)"]);
    add(`AI ${a.decision_role === "makes_decision" ? "decides" : a.decision_role === UNSURE ? "may drive" : "is a main factor in"} ${d.join(", ")} decisions`, refs);
    if (s.has("aedt")) add("Screens or ranks people for hiring or promotion", [["nyc_ll144", "Admin. Code § 20-871"], ["illinois_hra", "775 ILCS 5/2-102(L)"]]);
    return { tier: "high", label: "High", why, basis };
  }
  if (s.has("biometric") && s.has("sensitive_data") && has(a, "sensitive_data", "biometric")) {
    add("Processes biometric data of identifiable people", [["eu_ai_act", "Annex III, point 1"], ["gdpr", "Article 9"], ["uk_gdpr", "Article 9"]]);
    return { tier: "high", label: "High", why, basis };
  }
  if (s.has("consequential_weak")) add("Feeds into decisions about people, alongside other information", [["eu_ai_act", "Article 6(3)"]]);
  if (s.has("external_users") && s.has("genai")) add("Generative AI facing customers or the public", [["eu_ai_act", "Article 50(1)"], ["utah_ai", "chapter 13-77"], ["korea_ai_basic", "transparency duties"]]);
  if (s.has("agent_actions")) add("Can take actions in other systems");
  if (s.has("sensitive_data")) add("Processes sensitive personal data", [["gdpr", "Article 9"], ["uk_gdpr", "Article 9"]]);
  if (s.has("deepfake")) add("Depicts real people in generated media", [["eu_ai_act", "Article 50(4)"], ["china_genai", "explicit and implicit labels"]]);
  else if (s.has("synthetic_media")) add("Publishes AI-generated media", [["eu_ai_act", "Article 50(2)"], ["china_genai", "explicit and implicit labels"]]);
  if (s.has("confidential_data") && s.has("vendor_may_train")) add("Confidential data may be used to train a vendor's models", [["gdpr", "Article 28"], ["uk_gdpr", "Article 28"]]);
  if (s.has("untrusted_content") && (s.has("internal_data") || s.has("agent_actions"))) add("Untrusted content combined with internal data or actions (prompt injection exposure)");
  if (why.length) return { tier: "medium", label: "Medium", why, basis };
  add("Internal or low-impact use with no consequential decisions");
  return { tier: "low", label: "Low", why, basis };
}

// ---------- Open questions ----------
export function openQuestions(a) {
  const open = [];
  for (const q of ALL_QUESTIONS) {
    if (!isVisible(q, a)) continue;
    const v = a[q.id];
    if (v === UNSURE) open.push({ id: q.id, label: q.label, kind: "unsure" });
    else if (REQUIRED.includes(q.id) && (v === undefined || v === "" || (Array.isArray(v) && !v.length)))
      open.push({ id: q.id, label: q.label, kind: "missing" });
  }
  return open;
}

// ---------- Conditions (gaps that must close before launch) ----------
export function conditions(a) {
  const s = computeSignals(a);
  const c = [];
  const add = (text, control, key) => c.push({ text, control, key });
  if (s.has("consequential") && s.has("no_appeal")) add("Set up a way for affected people to get an explanation, correct their data and request human review.", "AI-AD-1", "appeal");
  if (s.has("consequential") && s.has("no_bias_testing")) add("Test for different outcomes across groups before launch.", "AI-FA-1", "bias");
  if (s.has("aedt") && arr(a.geo).includes("nyc")) add("Obtain an independent bias audit and post the summary before using the tool on NYC candidates or employees.", "AI-FA-1", "nyc_audit");
  if (s.has("consequential_strong") && s.has("low_review")) add("Put a human review step in front of decisions about people.", "AI-HO-1", "human_review");
  if (s.has("vendor_may_train") && (s.has("personal_data") || s.has("confidential_data"))) add("Switch off vendor training on your data, or change plans or contract, before sending personal or confidential data.", "AI-SA-9", "vendor_training");
  if (s.has("vendor") && a.vendor_review === "none" && (s.has("personal_data") || s.has("confidential_data"))) add("Complete a vendor security review.", "AI-SA-9", "vendor_review");
  if (s.has("no_disclosure")) add("Tell people they are interacting with AI.", "AI-TR-1", "disclosure");
  if (s.has("deepfake")) add("Get documented consent from any real person depicted and label the content as AI-generated.", "AI-TR-2", "deepfake");
  if (s.has("no_sso") && s.has("confidential_data")) add("Put access behind single sign-on with role-based permissions.", "AI-AC-6", "sso");
  if (s.has("no_logging") && (s.has("consequential") || s.has("agent_actions"))) add("Turn on logging of inputs, outputs and actions.", "AI-AU-12", "logging");
  if (s.has("agent_actions") && a.human_review === "none") add("Require approval for high-impact agent actions and add a stop mechanism.", "AI-AG-1", "agent");
  if (s.has("no_monitoring_owner")) add("Name an owner for monitoring and incidents after launch.", "AI-CA-7", "monitoring");
  if (s.has("no_privacy_notice")) add("Update privacy notices to cover this use of personal data.", "AI-PT-5", "privacy_notice");
  if (s.has("no_accuracy_testing") && (s.has("consequential") || s.has("external_users"))) add("Test accuracy on a sample of your own data before launch.", "AI-SA-11", "accuracy");
  return c;
}

// Legal basis for each condition, limited to regulations that apply to this use case
export function conditionBasis(a, enabled, cond) {
  const app = applicability(a, enabled);
  const high = riskTier(a).tier === "high";
  return (CONDITION_BASIS[cond.key] || [])
    .filter((b) => ["in_scope", "possible"].includes(app[b.fw]?.status) && (!b.hi || high) && (!b.provider || a.role === "provider"))
    .map((b) => cite(b.fw, b.ref));
}

// ---------- Decision ----------
export function decision(a) {
  const tier = riskTier(a);
  const open = openQuestions(a);
  const cond = conditions(a);
  if (tier.tier === "prohibited") return { code: "reject", label: "Do not proceed", tone: "danger", summary: "The use case involves a practice that is banned in the EU and carries serious legal and ethical risk elsewhere." };
  if (open.length) return { code: "return", label: "Return for more information", tone: "info", summary: `${open.length} question${open.length > 1 ? "s" : ""} must be answered before a decision can be made.` };
  if (tier.tier === "high" || tier.tier === "medium" || cond.length)
    return { code: "conditional", label: "Approve with conditions", tone: "warn", summary: cond.length ? `${cond.length} condition${cond.length > 1 ? "s" : ""} must be met before launch, plus the controls below.` : "Proceed once the controls below are in place." };
  return { code: "approve", label: "Approve with standard controls", tone: "ok", summary: "Low risk. Apply the baseline controls below." };
}

// ---------- Obligations per framework ----------
export function obligations(a, enabled) {
  const s = computeSignals(a);
  const app = applicability(a, enabled);
  const tier = riskTier(a).tier;
  const domains = arr(a.domain).filter((d) => d !== "none");
  const res = {};
  const push = (id, item) => (res[id] ||= []).push(item);

  // EU AI Act
  if (["in_scope"].includes(app.eu_ai_act.status)) {
    const F = "eu_ai_act";
    if (s.has("prohibited")) arr(a.prohibited).filter((p) => p !== "none").forEach((p) =>
      push(F, { level: "blocker", ref: "Art. 5", text: `Banned practice: ${PROHIBITED_LABEL[p]}.` }));
    push(F, { level: "required", ref: "Art. 4", text: "Take measures to support AI literacy among staff who use or operate the system.", when: "Applies now" });
    const annex = domains.filter((d) => ANNEX_III[d]);
    if (annex.length && (s.has("consequential_strong") || a.decision_role === UNSURE)) {
      push(F, { level: "required", ref: "Art. 6(2), " + annex.map((d) => ANNEX_III[d]).join("; "), text: "Likely a high-risk AI system.", when: "Obligations apply from 2 Dec 2027" });
      if (a.role === "provider") push(F, { level: "required", ref: "Arts. 9–17, 43, 49", text: "As provider: risk management, data governance, technical documentation, logging, transparency to deployers, human oversight design, accuracy and cybersecurity, quality management, conformity assessment and EU database registration.", when: "From 2 Dec 2027" });
      push(F, { level: "required", ref: "Art. 26", text: "As deployer: use per the provider's instructions, assign competent human oversight, ensure input data is relevant, monitor operation, keep logs for at least six months, and inform the provider of serious incidents." + (domains.includes("employment") ? " Inform workers' representatives and affected workers before use at the workplace (Art. 26(7))." : ""), when: "From 2 Dec 2027" });
      push(F, { level: "required", ref: "Art. 26(11), Art. 86", text: "Inform people that a high-risk AI system is used in decisions about them, and give an explanation of its role on request after a decision.", when: "From 2 Dec 2027" });
      if (domains.some((d) => ["credit_lending", "insurance", "essential_services"].includes(d)))
        push(F, { level: "required", ref: "Art. 27", text: "Carry out a fundamental rights impact assessment before first use (applies to credit scoring, life and health insurance pricing, and public services).", when: "From 2 Dec 2027" });
    } else if (annex.length && s.has("consequential_weak")) {
      push(F, { level: "check", ref: "Art. 6(3)", text: "Listed in Annex III, but may be exempt if the output does not materially influence the decision. Document that assessment; if exempt, providers must still register the system.", when: "From 2 Dec 2027" });
    } else if (domains.length) {
      push(F, { level: "check", ref: "Annex III", text: `${domains.map((d) => DOMAIN_LABEL[d]).join(", ")} is not an Annex III category on its own. Check the specific use against Annex III.` });
    }
    if (s.has("external_users") && s.has("genai")) push(F, { level: "required", ref: "Art. 50(1)", text: "Design the system so people are informed they are interacting with AI.", when: "From 2 Aug 2026" });
    if (s.has("genai") && a.role === "provider") push(F, { level: "required", ref: "Art. 50(2)", text: "Mark synthetic audio, image, video and text outputs in a machine-readable format.", when: "From 2 Aug 2026 (systems already on the market: 2 Dec 2026)" });
    if (s.has("deepfake") || s.has("synthetic_media")) push(F, { level: "required", ref: "Art. 50(4)", text: "Disclose that deepfake image, audio or video content was artificially generated or manipulated.", when: "From 2 Aug 2026" });
    if (s.has("synthetic_text")) push(F, { level: "check", ref: "Art. 50(4)", text: "Disclose AI-generated text published to inform the public on matters of public interest, unless it was human-reviewed and someone holds editorial responsibility." });
    if (a.role === "provider" && ["lt50", "50_249", "250_749"].includes(a.company_size)) push(F, { level: "note", ref: "Reg. (EU) 2026/1744", text: "SME and small mid-cap relief: simplified documentation and proportionate quality management for providers with fewer than 750 employees." });
    if (tier === "low" || (tier === "medium" && !annex.length)) push(F, { level: "note", ref: "Art. 95", text: "Minimal or limited risk: no further mandatory requirements beyond those above. Voluntary codes of conduct apply." });
  }

  // GDPR
  if (["in_scope", "possible"].includes(app.gdpr.status)) {
    const F = "gdpr";
    if (app.gdpr.status === "possible") push(F, { level: "check", ref: "Art. 4(1)", text: "Confirm whether inputs or outputs include personal data. If they do, the items below apply." });
    push(F, { level: "required", ref: "Art. 6, Arts. 13–14", text: "Document a lawful basis for the AI processing and cover it in privacy notices." });
    if (s.has("personal_data_high")) push(F, { level: "required", ref: "Art. 35", text: "A data protection impact assessment is likely required (sensitive data, decisions about people, or biometric analysis)." });
    if (s.has("sensitive_data") && anyOf(a, "sensitive_data", ["health", "biometric", "special"])) push(F, { level: "required", ref: "Art. 9", text: "Special-category data needs an Article 9 condition, usually explicit consent." });
    if (has(a, "sensitive_data", "children")) push(F, { level: "required", ref: "Art. 8, Recital 38", text: "Children's data requires specific protection and age-appropriate notices." });
    if (s.has("automated_decision") && s.has("consequential")) push(F, { level: "required", ref: "Art. 22", text: "Solely automated decisions with legal or similarly significant effects are allowed only with contract, law or explicit consent, and require the right to human intervention and to contest the decision." });
    if (s.has("vendor")) push(F, { level: "required", ref: "Art. 28; Arts. 44–49", text: "Sign a data processing agreement with the vendor and check the transfer mechanism if data leaves the EU." });
    push(F, { level: "required", ref: "Art. 5(1)(c), (e)", text: "Minimise the personal data sent to the AI and set a retention period." });
  }

  // Colorado
  if (["in_scope", "possible"].includes(app.colorado.status)) {
    const F = "colorado";
    if (app.colorado.status === "possible") push(F, { level: "check", ref: "SB 26-189", text: "Covered only if the technology materially influences the decision. Tools that only organise information for human review are excluded." });
    push(F, { level: "required", ref: "SB 26-189 (deployer)", text: "Notify consumers, employees or applicants before the technology is used in a consequential decision, with a way to get more information.", when: "From 1 Jan 2027" });
    push(F, { level: "required", ref: "SB 26-189 (deployer)", text: "Within 30 days of an adverse decision, give a plain-language explanation of the decision and the technology's role, and explain the rights to correct data and request human review.", when: "From 1 Jan 2027" });
    push(F, { level: "required", ref: "SB 26-189", text: "Keep records for at least three years. Make notices accessible to people with disabilities and limited English proficiency.", when: "From 1 Jan 2027" });
    if (a.role === "provider") push(F, { level: "required", ref: "SB 26-189 (developer)", text: "Give deployers documentation on intended uses, known risks and limitations and training data categories, and notify them of material modifications.", when: "From 1 Jan 2027" });
    push(F, { level: "note", ref: "AG rulemaking", text: "The Attorney General's implementing rules are pending and may add detail. Enforcement is by the AG only, with a 60-day cure period until 2030." });
  }

  // NYC LL144
  if (["in_scope", "possible"].includes(app.nyc_ll144.status)) {
    const F = "nyc_ll144";
    if (app.nyc_ll144.status === "possible") push(F, { level: "check", ref: "6 RCNY § 5-300", text: "Covered if the tool's output is the sole factor, the most heavily weighted factor, or is used to overrule human judgment." });
    push(F, { level: "required", ref: "§ 20-871(a)", text: "Obtain an independent bias audit no more than one year before use, and publish a summary of results and the distribution date on your website." });
    push(F, { level: "required", ref: "§ 20-871(b)", text: "Notify NYC candidates and employees at least 10 business days before use, including the job qualifications and characteristics assessed and how to request an alternative process or accommodation." });
    push(F, { level: "note", ref: "§ 20-872", text: "Civil penalties of $500 to $1,500 per violation, per day of use." });
  }

  // NIST AI RMF
  if (app.nist_ai_rmf.status === "in_scope") {
    const F = "nist_ai_rmf";
    push(F, { level: "recommended", ref: "GOVERN", text: "Record the use case in the AI inventory, name an accountable owner and apply the AI use policy." });
    push(F, { level: "recommended", ref: "MAP", text: "Document the context: intended purpose, users, affected people, and known limits." });
    push(F, { level: "recommended", ref: "MEASURE", text: "Test performance on your own data" + (s.has("consequential") ? ", including fairness across groups" : "") + ", and record the results." });
    push(F, { level: "recommended", ref: "MANAGE", text: "Monitor after launch, handle incidents and decide when to suspend use." });
    const gai = [];
    if (s.has("genai")) gai.push("Confabulation");
    if (s.has("personal_data")) gai.push("Data Privacy");
    if (s.has("untrusted_content") || s.has("agent_actions") || s.has("internal_data")) gai.push("Information Security");
    if (s.has("consequential")) gai.push("Harmful Bias and Homogenization");
    if (s.has("synthetic_out")) gai.push("Information Integrity", "Intellectual Property");
    if (s.has("low_review") || s.has("agent_actions")) gai.push("Human-AI Configuration");
    if (s.has("vendor")) gai.push("Value Chain and Component Integration");
    if (s.has("genai") && gai.length) push(F, { level: "recommended", ref: "NIST AI 600-1", text: `Generative AI Profile risks to address: ${[...new Set(gai)].join(", ")}.` });
  }

  // ISO 42001
  if (app.iso_42001.status === "in_scope") {
    const F = "iso_42001";
    push(F, { level: "recommended", ref: "Clause 4.3, 6.1.2", text: "Bring the use case into the AI management system scope and include it in the AI risk assessment." });
    if (s.has("consequential") || s.has("personal_data_high")) push(F, { level: "recommended", ref: "Clause 6.1.4, A.5", text: "Perform and document an AI system impact assessment." });
    push(F, { level: "recommended", ref: "Clause 6.1.3", text: "Record the selected controls in the Statement of Applicability." });
    if (s.has("vendor")) push(F, { level: "recommended", ref: "A.10", text: "Define responsibilities with the vendor and assess its AI practices." });
  }

  const on = (id) => ["in_scope", "possible"].includes(app[id]?.status);

  // UK GDPR
  if (on("uk_gdpr")) {
    const F = "uk_gdpr";
    if (app.uk_gdpr.status === "possible") push(F, { level: "check", ref: "UK GDPR Art. 4(1)", text: "Confirm whether inputs or outputs include personal data. If they do, the items below apply." });
    push(F, { level: "required", ref: "UK GDPR Art. 6, Arts. 13–14", text: "Document a lawful basis for the AI processing and cover it in privacy notices." });
    if (s.has("personal_data_high")) push(F, { level: "required", ref: "UK GDPR Art. 35", text: "A data protection impact assessment is likely required (sensitive data, decisions about people, or biometric analysis)." });
    if (s.has("automated_decision") && s.has("consequential")) push(F, { level: "required", ref: "UK GDPR Arts. 22A–22D (DUAA 2025)", text: "For significant decisions based solely on automated processing: tell people about the decision, let them make representations, obtain human intervention and contest it. Stricter limits apply to special-category data." });
    if (s.has("vendor")) push(F, { level: "required", ref: "UK GDPR Art. 28; Ch. V", text: "Sign a data processing agreement with the vendor and check the transfer mechanism if data leaves the UK." });
  }

  // California ADMT regulations
  if (on("ca_admt")) {
    const F = "ca_admt";
    push(F, { level: "check", ref: "CCPA § 1798.140(d)", text: "Applies only if your business meets a CCPA threshold: annual revenue above the inflation-adjusted limit (about $26.6 million), buying, selling or sharing personal information of 100,000+ California consumers, or earning half of revenue from selling or sharing it." });
    push(F, { level: "required", ref: "§ 7220", text: "Give a pre-use notice explaining the purpose of the automated decision-making technology, the right to opt out and the right to access information about it.", when: "From 1 Jan 2027" });
    push(F, { level: "required", ref: "§§ 7221–7222", text: "Offer an opt-out of the technology for significant decisions, unless a human appeal exception applies, and answer access requests about the logic and outcome.", when: "From 1 Jan 2027" });
    push(F, { level: "required", ref: "§§ 7150 ff.", text: "Complete a risk assessment before using automated decision-making technology for significant decisions.", when: "Compliance documented by 31 Dec 2027" });
  }

  // California AI Transparency Act
  if (on("ca_ai_transparency")) {
    const F = "ca_ai_transparency";
    push(F, { level: "check", ref: "§ 22757.1", text: "Applies only to covered providers: generative AI systems publicly accessible in California with over 1 million monthly visitors or users." });
    push(F, { level: "required", ref: "§§ 22757.2–22757.3", text: "Offer a free AI-detection tool, include a latent (metadata) disclosure in AI-generated image, video and audio, and give users the option of a visible disclosure.", when: "From 2 Aug 2026" });
  }

  // Illinois
  if (on("illinois_hra")) {
    const F = "illinois_hra";
    if (app.illinois_hra.status === "possible") push(F, { level: "check", ref: "775 ILCS 5/2-102(L)", text: "Covered if AI is used to influence recruitment, hiring, promotion, training selection, discipline, discharge or terms of employment." });
    push(F, { level: "required", ref: "775 ILCS 5/2-102(L)(1)", text: "Do not use AI in a way that has a discriminatory effect on protected classes, and do not use zip codes as a proxy for protected classes. Test outcomes across groups.", when: "In force" });
    push(F, { level: "required", ref: "775 ILCS 5/2-102(L)(2); draft IDHR rules", text: "Notify employees and applicants that AI is used, which decisions it affects and how to request an accommodation; notify employees annually and within 30 days of adopting a new system.", when: "In force; rule details pending" });
    if (s.has("biometric")) push(F, { level: "required", ref: "820 ILCS 42 (AI Video Interview Act)", text: "If AI analyses video interviews: notify applicants, explain how it works and obtain consent beforehand." });
  }

  // Texas TRAIGA
  if (on("texas_traiga")) {
    const F = "texas_traiga";
    push(F, { level: "required", ref: "HB 149 (prohibited uses)", text: "Do not develop or deploy AI with intent to unlawfully discriminate against a protected class, to manipulate people into self-harm, harm or crime, or to produce unlawful sexual content or deepfakes of minors.", when: "In force" });
    if (a.industry === "healthcare") push(F, { level: "required", ref: "HB 149, health care disclosure", text: "Disclose to patients that AI is used in their health care service or treatment, before or at the time of the interaction.", when: "In force" });
    push(F, { level: "note", ref: "HB 149 (enforcement and defences)", text: "Enforced by the Attorney General only, with a 60-day cure period. Following the NIST AI RMF or a similar framework, or finding problems through your own testing, is a defence." });
  }

  // Utah
  if (on("utah_ai")) {
    const F = "utah_ai";
    push(F, { level: "required", ref: "Utah Code ch. 13-77", text: "If a consumer asks whether they are talking to a person, clearly disclose that they are interacting with generative AI.", when: "In force" });
    if (["healthcare", "financial", "insurance"].includes(a.industry) || s.has("sensitive_data")) push(F, { level: "check", ref: "Utah Code ch. 13-77 (regulated occupations)", text: "In a licensed profession, disclose AI use proactively at the start of high-risk interactions (health, financial or biometric data, or personal advice people rely on)." });
  }

  // South Korea
  if (on("korea_ai_basic")) {
    const F = "korea_ai_basic";
    push(F, { level: "required", ref: "AI Basic Act (transparency duties)", text: "Notify users in advance that a product or service uses generative or high-impact AI.", when: "In force; fines after grace period" });
    if (s.has("genai")) push(F, { level: "required", ref: "AI Basic Act (transparency duties)", text: "Label generative AI output, and clearly disclose AI-generated sound, images or video that are hard to tell apart from real content." });
    if (domains.some((d) => KOREA_HIGH_IMPACT.includes(d)) || s.has("biometric")) push(F, { level: "required", ref: "AI Basic Act (high-impact AI)", text: "Likely high-impact AI: assess it before deployment, put in place risk management, explanation of outcomes, user protection, human oversight and documentation." });
    push(F, { level: "check", ref: "AI Basic Act (domestic representative)", text: "Foreign businesses above revenue or user thresholds (e.g. over 1 million daily users in Korea) must appoint a domestic representative." });
  }

  // Japan
  if (on("japan_ai_promotion")) push("japan_ai_promotion", { level: "note", ref: "AI Promotion Act (duties of businesses)", text: "Cooperate with government AI measures and requests for information. No penalties; the AI Business Guidelines describe recommended practices." });

  // China
  if (on("china_genai")) {
    const F = "china_genai";
    push(F, { level: "required", ref: "Labelling Measures; GB 45438-2025", text: "Add visible labels to AI-generated text, images, audio and video, and embed implicit labels in file metadata.", when: "In force" });
    if (s.has("external_users")) push(F, { level: "check", ref: "Interim Measures for Generative AI Services (2023)", text: "Public-facing generative AI services in China require security assessment and algorithm filing." });
  }

  // ISO 42005, 23894, 27001, 27701
  if (on("iso_42005") && (s.has("consequential") || s.has("personal_data_high") || s.has("biometric") || s.has("external_users")))
    push("iso_42005", { level: "recommended", ref: "ISO/IEC 42005, Clauses 5–6", text: "Run a documented AI system impact assessment covering affected people and groups, and review it when the system changes." });
  if (on("iso_42005")) push("iso_42005", { level: "recommended", ref: "ISO/IEC 42005", text: "Record intended uses, foreseeable misuse and the impact assessment owner." });
  if (on("iso_23894")) {
    push("iso_23894", { level: "recommended", ref: "ISO/IEC 23894, Clause 6.4", text: "Identify, analyse and evaluate AI-specific risk sources, such as data quality, opacity and automation level, and record them in the risk register." });
    push("iso_23894", { level: "recommended", ref: "ISO/IEC 23894, Clauses 6.5–6.6", text: "Select risk treatments and monitor them over the life cycle." });
  }
  if (on("iso_27001")) {
    push("iso_27001", { level: "recommended", ref: "Annex A 5.9, 5.12", text: "Add the AI system and its data flows to the asset inventory and classify the information it processes." });
    if (s.has("vendor")) push("iso_27001", { level: "recommended", ref: "Annex A 5.19–5.23", text: "Treat the AI vendor as a supplier: security requirements in the contract, review and monitoring, including cloud service use." });
    push("iso_27001", { level: "recommended", ref: "Annex A 8.2–8.5, 8.15–8.16", text: "Apply access control, privileged access and logging to the AI system and its integrations." });
  }
  if (on("iso_27701") && s.has("personal_data")) {
    push("iso_27701", { level: "recommended", ref: "ISO/IEC 27701", text: "Record the AI processing in the records of processing, confirm purpose and legal basis, and update privacy notices." });
    push("iso_27701", { level: "recommended", ref: "ISO/IEC 27701", text: "Make sure data subject requests (access, correction, deletion) can be met for data held in prompts, outputs and logs." });
  }
  return res;
}

// ---------- Controls ----------
export function selectControls(a, enabled) {
  const s = computeSignals(a);
  const app = applicability(a, enabled);
  const relevant = (fid) => ["in_scope", "possible"].includes(app[fid]?.status);
  return CONTROLS.filter((c) => c.when(s)).map((c) => ({
    ...c,
    map: Object.fromEntries(Object.entries(c.map).filter(([fid]) => relevant(fid))),
    condition: conditions(a).some((x) => x.control === c.id),
  }));
}

// ---------- Full assessment ----------
export function assess(a, enabled) {
  return {
    applicability: applicability(a, enabled),
    tier: riskTier(a),
    decision: decision(a),
    open: openQuestions(a),
    conditions: conditions(a),
    obligations: obligations(a, enabled),
    controls: selectControls(a, enabled),
  };
}

export function progress(a) {
  const visible = ALL_QUESTIONS.filter((q) => isVisible(q, a));
  const answered = visible.filter((q) => {
    const v = a[q.id];
    return v !== undefined && v !== "" && !(Array.isArray(v) && !v.length);
  });
  return { answered: answered.length, total: visible.length };
}

export { FRAMEWORKS, FRAMEWORK_BY_ID, QUESTION_BY_ID };
