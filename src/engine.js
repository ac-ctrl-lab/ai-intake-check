// Deterministic intake engine. Pure functions only: same answers in, same result out.
import { FRAMEWORKS, FRAMEWORK_BY_ID } from "./data/frameworks.js";
import { ALL_QUESTIONS, QUESTION_BY_ID, isVisible } from "./data/questions.js";
import { CONTROLS } from "./data/controls.js";

const arr = (v) => (Array.isArray(v) ? v : []);
const has = (a, k, v) => arr(a[k]).includes(v);
const anyOf = (a, k, vals) => arr(a[k]).some((x) => vals.includes(x));

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

const PROHIBITED_LABEL = {
  emotion_workplace: "emotion recognition in the workplace or education (Art. 5(1)(f))",
  social_scoring: "social scoring (Art. 5(1)(c))",
  manipulation: "manipulative or deceptive techniques (Art. 5(1)(a))",
  exploit_vulnerable: "exploiting vulnerabilities (Art. 5(1)(b))",
  biometric_sensitive: "biometric categorisation by sensitive traits (Art. 5(1)(g))",
  face_scraping: "untargeted scraping of facial images (Art. 5(1)(e))",
  crime_prediction: "individual crime prediction from profiling (Art. 5(1)(d))",
  intimate_imagery: "non-consensual intimate imagery (added by Reg. (EU) 2026/1744, applies from 2 Dec 2026)",
};

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
  if (s.has("personal_data") && (s.has("sensitive_data") || s.has("consequential") || a.uc_type === "vision_biometric")) s.add("personal_data_high");

  if (["vendor_saas", "vendor_api"].includes(a.uc_build)) s.add("vendor");
  if (a.vendor_training === "may_train") s.add("vendor_may_train");
  if (s.has("vendor") && a.vendor_review && a.vendor_review !== "done") s.add("vendor_review_missing");
  if (a.role === "provider") s.add("provider");

  if (anyOf(a, "uc_users", ["customers", "business_customers", "public", "applicants"])) s.add("external_users");
  if (["genai_assistant", "agent"].includes(a.uc_type)) s.add("genai");
  if (a.uc_type === "agent" || a.access_scope === "actions") s.add("agent_actions");
  if (a.access_scope === "internal_data") s.add("internal_data");
  if (a.untrusted_content === "yes") s.add("untrusted_content");
  if (["confidential", "restricted"].includes(a.data_class)) s.add("confidential_data");
  if (a.uc_type === "vision_biometric") s.add("biometric");

  if (a.synthetic === "text") s.add("synthetic_text");
  if (a.synthetic === "media") s.add("synthetic_media");
  if (a.synthetic === "deepfake") s.add("deepfake");
  if (["text", "media", "deepfake"].includes(a.synthetic)) s.add("synthetic_out");

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
// Returns { id: { status: "in_scope" | "possible" | "out_of_scope" | "off", reason } }
export function applicability(a, enabled) {
  const s = computeSignals(a);
  const geo = arr(a.geo);
  const domains = arr(a.domain).filter((d) => d !== "none");
  const out = {};
  for (const f of FRAMEWORKS) {
    if (!enabled.includes(f.id)) { out[f.id] = { status: "off", reason: "Switched off" }; continue; }
    let r;
    switch (f.id) {
      case "eu_ai_act":
        r = geo.includes("eu")
          ? { status: "in_scope", reason: "People in the EU are affected or the system is offered there" }
          : geo.length ? { status: "out_of_scope", reason: "No EU nexus selected" } : { status: "pending", reason: "Waiting for location" };
        break;
      case "gdpr":
        if (!geo.length) r = { status: "pending", reason: "Waiting for location" };
        else if (!geo.includes("eu")) r = { status: "out_of_scope", reason: "No EU nexus selected" };
        else if (a.personal_data === "yes") r = { status: "in_scope", reason: "Personal data of people in the EU" };
        else if (a.personal_data === UNSURE) r = { status: "possible", reason: "Unclear whether personal data is processed" };
        else if (a.personal_data === "no") r = { status: "out_of_scope", reason: "No personal data" };
        else r = { status: "pending", reason: "Waiting for data answers" };
        break;
      case "colorado": {
        const coDomains = domains.filter((d) => COLORADO_DOMAINS.includes(d));
        if (!geo.length) r = { status: "pending", reason: "Waiting for location" };
        else if (!geo.includes("colorado")) r = { status: "out_of_scope", reason: "No Colorado consumers, employees or applicants" };
        else if (!arr(a.domain).length) r = { status: "pending", reason: "Waiting for decision areas" };
        else if (!coDomains.length) r = { status: "out_of_scope", reason: "No consequential-decision domain under SB 26-189" };
        else if (s.has("consequential_strong")) r = { status: "in_scope", reason: `Materially influences ${coDomains.map((d) => DOMAIN_LABEL[d]).join(", ")} decisions` };
        else r = { status: "possible", reason: "Depends on whether the AI materially influences the decision" };
        break;
      }
      case "nyc_ll144":
        if (!geo.length) r = { status: "pending", reason: "Waiting for location" };
        else if (!geo.includes("nyc")) r = { status: "out_of_scope", reason: "No NYC candidates or employees" };
        else if (!has(a, "domain", "employment")) r = { status: "out_of_scope", reason: "Not used for employment decisions" };
        else if (a.aedt !== "yes") r = { status: a.aedt === "no" ? "out_of_scope" : "pending", reason: "Not used to screen or rank for hiring or promotion" };
        else if (s.has("consequential_strong")) r = { status: "in_scope", reason: "Substantially assists hiring or promotion decisions in NYC" };
        else r = { status: "possible", reason: "Depends on whether it substantially assists the decision (6 RCNY § 5-300)" };
        break;
      default:
        r = { status: "in_scope", reason: "Selected as a voluntary framework" };
    }
    out[f.id] = r;
  }
  return out;
}

// ---------- Risk tier ----------
export function riskTier(a) {
  const s = computeSignals(a);
  const why = [];
  if (s.has("prohibited")) {
    arr(a.prohibited).filter((p) => p !== "none").forEach((p) => why.push(`Prohibited practice: ${PROHIBITED_LABEL[p]}`));
    return { tier: "prohibited", label: "Prohibited", why };
  }
  if (s.has("consequential_strong") || (s.has("consequential") && a.decision_role === UNSURE)) {
    const d = arr(a.domain).filter((x) => x !== "none").map((x) => DOMAIN_LABEL[x]);
    why.push(`AI ${a.decision_role === "makes_decision" ? "decides" : a.decision_role === UNSURE ? "may drive" : "is a main factor in"} ${d.join(", ")} decisions`);
    if (s.has("aedt")) why.push("Screens or ranks people for hiring or promotion");
    return { tier: "high", label: "High", why };
  }
  if (s.has("biometric") && s.has("sensitive_data") && has(a, "sensitive_data", "biometric")) {
    why.push("Processes biometric data of identifiable people");
    return { tier: "high", label: "High", why };
  }
  if (s.has("consequential_weak")) why.push("Feeds into decisions about people, alongside other information");
  if (s.has("external_users") && s.has("genai")) why.push("Generative AI facing customers or the public");
  if (s.has("agent_actions")) why.push("Can take actions in other systems");
  if (s.has("sensitive_data")) why.push("Processes sensitive personal data");
  if (s.has("deepfake")) why.push("Depicts real people in generated media");
  else if (s.has("synthetic_media")) why.push("Publishes AI-generated media");
  if (s.has("confidential_data") && s.has("vendor_may_train")) why.push("Confidential data may be used to train a vendor's models");
  if (s.has("untrusted_content") && (s.has("internal_data") || s.has("agent_actions"))) why.push("Untrusted content combined with internal data or actions (prompt injection exposure)");
  if (why.length) return { tier: "medium", label: "Medium", why };
  why.push("Internal or low-impact use with no consequential decisions");
  return { tier: "low", label: "Low", why };
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
  const add = (text, control) => c.push({ text, control });
  if (s.has("consequential") && s.has("no_appeal")) add("Set up a way for affected people to get an explanation, correct their data and request human review.", "AI-AD-1");
  if (s.has("consequential") && s.has("no_bias_testing")) add("Test for different outcomes across groups before launch.", "AI-FA-1");
  if (s.has("aedt") && arr(a.geo).includes("nyc")) add("Obtain an independent bias audit and post the summary before using the tool on NYC candidates or employees.", "AI-FA-1");
  if (s.has("consequential_strong") && s.has("low_review")) add("Put a human review step in front of decisions about people.", "AI-HO-1");
  if (s.has("vendor_may_train") && (s.has("personal_data") || s.has("confidential_data"))) add("Switch off vendor training on your data, or change plans or contract, before sending personal or confidential data.", "AI-SA-9");
  if (s.has("vendor") && a.vendor_review === "none" && (s.has("personal_data") || s.has("confidential_data"))) add("Complete a vendor security review.", "AI-SA-9");
  if (s.has("no_disclosure")) add("Tell people they are interacting with AI.", "AI-TR-1");
  if (s.has("deepfake")) add("Get documented consent from any real person depicted and label the content as AI-generated.", "AI-TR-2");
  if (s.has("no_sso") && s.has("confidential_data")) add("Put access behind single sign-on with role-based permissions.", "AI-AC-6");
  if (s.has("no_logging") && (s.has("consequential") || s.has("agent_actions"))) add("Turn on logging of inputs, outputs and actions.", "AI-AU-12");
  if (s.has("agent_actions") && a.human_review === "none") add("Require approval for high-impact agent actions and add a stop mechanism.", "AI-AG-1");
  if (s.has("no_monitoring_owner")) add("Name an owner for monitoring and incidents after launch.", "AI-CA-7");
  if (s.has("no_privacy_notice")) add("Update privacy notices to cover this use of personal data.", "AI-PT-5");
  if (s.has("no_accuracy_testing") && (s.has("consequential") || s.has("external_users"))) add("Test accuracy on a sample of your own data before launch.", "AI-SA-11");
  return c;
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
