// Control catalogue in the NIST SP 800-53 Rev. 5 structure:
// Control ID and title, control statement with [Assignment: ...] parameters, discussion, related controls.
// `base` is the SP 800-53 Rev. 5 control the AI control adapts. Where 800-53 has no equivalent
// (human oversight, AI transparency, bias audits), the control is an AI-specific extension (base: null).
// Mappings are indicative and only shown for frameworks the user selected.
// `when(s)` receives the set of intake signals and returns true when the control is needed.

export const CONTROLS = [
  {
    id: "AI-PM-5",
    base: "PM-5",
    family: "Program Management",
    title: "AI System Inventory",
    statement:
      "a. Develop and maintain an inventory of AI systems and use cases, including owner, purpose, vendor, model and version, data categories processed, risk tier and approval status; and\nb. Review and update the inventory [Assignment: organization-defined frequency] and when a use case changes.",
    discussion:
      "You cannot govern AI you do not know about. The inventory is the register that every other control refers to, and it is the first thing a regulator, auditor or enterprise customer will ask for.",
    related: ["CM-8", "RA-3", "SA-9"],
    map: {
      nist_ai_rmf: ["GOVERN 1.6"],
      iso_42001: ["A.4 Resources for AI systems", "Clause 4.3 Scope"],
      eu_ai_act: ["Art. 26 (deployer obligations)"],
      colorado: ["Record retention (3 years)"],
    },
    when: () => true,
  },
  {
    id: "AI-RA-3",
    base: "RA-3",
    family: "Risk Assessment",
    title: "AI Risk Assessment",
    statement:
      "a. Conduct a risk assessment of the AI use case before deployment, covering intended purpose, foreseeable misuse, affected persons, data, security and legal requirements;\nb. Document results and the risk tier in [Assignment: organization-defined document];\nc. Review the assessment [Assignment: organization-defined frequency] and when the model, vendor, data or purpose changes.",
    discussion:
      "This intake is the start of the assessment, not the end. Record the decision and conditions, and repeat it when something material changes, for example a new model version or a new user group.",
    related: ["RA-8", "PM-9", "CM-4"],
    map: {
      nist_ai_rmf: ["MAP 1.1", "MAP 5.1"],
      iso_42001: ["Clause 6.1.2 AI risk assessment", "Clause 8.2"],
      eu_ai_act: ["Art. 9 (providers of high-risk AI)", "Art. 26"],
    },
    when: () => true,
  },
  {
    id: "AI-RA-8",
    base: "RA-8",
    family: "Risk Assessment",
    title: "AI and Privacy Impact Assessment",
    statement:
      "Conduct an impact assessment of the AI system on individuals and groups before processing personal data or influencing decisions about people, covering [Assignment: organization-defined impact areas, e.g. privacy, discrimination, access to services], and update it when the processing changes.",
    discussion:
      "Where the use case processes personal data at scale, uses sensitive data or influences consequential decisions, a documented impact assessment is either legally required (GDPR DPIA) or the main evidence of reasonable care.",
    related: ["RA-3", "PT-2", "PT-3"],
    map: {
      nist_ai_rmf: ["MAP 5.1", "MEASURE 2.10"],
      iso_42001: ["Clause 6.1.4 AI system impact assessment", "A.5 Assessing impacts of AI systems"],
      gdpr: ["Art. 35 (DPIA)"],
      eu_ai_act: ["Art. 27 (fundamental rights impact assessment, certain deployers)"],
      colorado: ["Evidence of reasonable care"],
    },
    when: (s) => s.has("personal_data_high") || s.has("consequential") || s.has("sensitive_data"),
  },
  {
    id: "AI-PL-4",
    base: "PL-4",
    family: "Planning",
    title: "AI Acceptable Use Rules",
    statement:
      "a. Establish rules for the acceptable use of AI tools, including approved tools, prohibited data types, required human review and disclosure;\nb. Obtain acknowledgment from users before granting access; and\nc. Review the rules [Assignment: organization-defined frequency].",
    discussion:
      "A one-page AI use policy prevents most everyday incidents, such as pasting customer data into an unapproved chatbot.",
    related: ["AT-2", "AC-6", "PT-2"],
    map: {
      nist_ai_rmf: ["GOVERN 1.2"],
      iso_42001: ["Clause 5.2 AI policy", "A.2 Policies related to AI", "A.9 Use of AI systems"],
    },
    when: () => true,
  },
  {
    id: "AI-AT-2",
    base: "AT-2",
    family: "Awareness and Training",
    title: "AI Literacy Training",
    statement:
      "Provide training to users and operators of the AI system on its capabilities, limitations, known failure modes and the rules for its use, before granting access and [Assignment: organization-defined frequency] thereafter.",
    discussion:
      "Users who know that the system can produce confident but wrong answers check its output. The EU AI Act requires deployers to support AI literacy among staff who use AI systems.",
    related: ["PL-4", "AT-3"],
    map: {
      nist_ai_rmf: ["GOVERN 2.2"],
      iso_42001: ["Clause 7.2 Competence", "Clause 7.3 Awareness"],
      eu_ai_act: ["Art. 4 (AI literacy)"],
    },
    when: () => true,
  },
  {
    id: "AI-AC-6",
    base: "AC-6",
    family: "Access Control",
    title: "Least Privilege for AI Systems",
    statement:
      "a. Grant access to the AI system through [Assignment: organization-defined identity provider] with role-based permissions;\nb. Limit the data sources, tools and permissions available to the AI system to those required for the use case; and\nc. Ensure the AI system cannot return information the requesting user is not authorized to see.",
    discussion:
      "AI systems connected to internal data often ignore document permissions and surface files to the wrong people. Enforce the user's own permissions at retrieval time, not only at login.",
    related: ["AC-2", "AC-3", "IA-2"],
    map: {
      nist_ai_rmf: ["MEASURE 2.7"],
      iso_42001: ["A.6 AI system life cycle"],
      eu_ai_act: ["Art. 15 (cybersecurity, providers of high-risk AI)"],
    },
    when: (s) => s.has("internal_data") || s.has("agent_actions") || s.has("no_sso") || s.has("confidential_data"),
  },
  {
    id: "AI-AG-1",
    base: null,
    family: "AI-specific extension (relates to AC-6, SI-4)",
    title: "Bounded Autonomy for AI Agents",
    statement:
      "a. Define the actions the AI agent may take without approval and require human approval for [Assignment: organization-defined high-impact actions, e.g. payments, external emails, record deletion];\nb. Apply rate and spend limits to agent actions; and\nc. Provide a mechanism to stop the agent immediately.",
    discussion:
      "Agents turn a wrong answer into a wrong action. Approval gates on irreversible actions and a working off-switch are the minimum.",
    related: ["AC-6", "SI-4", "IR-4"],
    map: {
      nist_ai_rmf: ["MANAGE 2.4", "MAP 3.5"],
      iso_42001: ["A.6 AI system life cycle", "A.9 Use of AI systems"],
      eu_ai_act: ["Art. 14 (human oversight)"],
    },
    when: (s) => s.has("agent_actions"),
  },
  {
    id: "AI-AU-12",
    base: "AU-12",
    family: "Audit and Accountability",
    title: "AI Event Logging",
    statement:
      "a. Generate logs of AI system inputs, outputs, actions and user identity for [Assignment: organization-defined events];\nb. Retain logs for [Assignment: organization-defined retention period, at least the legally required minimum]; and\nc. Protect logs from unauthorized access and modification.",
    discussion:
      "Logs are how you reconstruct what happened after a complaint or incident. Deployers of high-risk AI under the EU AI Act must keep automatically generated logs for at least six months; Colorado requires decision records for three years.",
    related: ["AU-2", "AU-9", "AU-11"],
    map: {
      nist_ai_rmf: ["MEASURE 2.8"],
      iso_42001: ["A.6 AI system life cycle (event logs)"],
      eu_ai_act: ["Art. 12 (providers)", "Art. 26(6) (deployers, high-risk)"],
      colorado: ["Records kept at least 3 years"],
    },
    when: () => true,
  },
  {
    id: "AI-SI-10",
    base: "SI-10",
    family: "System and Information Integrity",
    title: "Prompt Injection and Input Handling",
    statement:
      "a. Treat content from outside the organization as untrusted input to the AI system;\nb. Separate system instructions from untrusted content and prevent untrusted content from triggering [Assignment: organization-defined sensitive actions or data access]; and\nc. Test the system against prompt injection before deployment and after significant changes.",
    discussion:
      "A web page or inbound email can carry hidden instructions that the model follows. The risk grows sharply when the same system can also read internal data or take actions.",
    related: ["SI-3", "SI-4", "AC-6"],
    map: {
      nist_ai_rmf: ["MEASURE 2.7", "GenAI Profile: Information Security"],
      iso_42001: ["A.6 AI system life cycle"],
      eu_ai_act: ["Art. 15(5) (resilience against manipulation, providers)"],
    },
    when: (s) => s.has("untrusted_content") || (s.has("genai") && (s.has("internal_data") || s.has("agent_actions"))),
  },
  {
    id: "AI-SI-15",
    base: "SI-15",
    family: "System and Information Integrity",
    title: "AI Output Filtering",
    statement:
      "Validate and filter AI system outputs for [Assignment: organization-defined content, e.g. personal data, confidential information, harmful or off-topic content, unsupported claims] before they are shown to users outside the organization or acted on.",
    discussion:
      "Customer-facing generative AI can leak data, invent policies or produce harmful content. Output filters and narrow scoping reduce how often that reaches a customer.",
    related: ["SI-10", "SI-4"],
    map: {
      nist_ai_rmf: ["MEASURE 2.6", "GenAI Profile: Confabulation, Information Integrity"],
      iso_42001: ["A.6 AI system life cycle"],
    },
    when: (s) => s.has("genai") && (s.has("external_users") || s.has("synthetic_out")),
  },
  {
    id: "AI-SA-11",
    base: "SA-11",
    family: "System and Services Acquisition",
    title: "AI Testing and Evaluation",
    statement:
      "a. Before deployment, evaluate the AI system on a representative test set drawn from [Assignment: organization-defined data] against documented acceptance criteria for accuracy and error rates;\nb. Record results and known limitations; and\nc. Repeat the evaluation after model, prompt or vendor changes.",
    discussion:
      "Vendor benchmarks do not tell you how the system performs on your documents, customers or edge cases. A small labelled test set of 30–100 real examples is usually enough to find the failure modes that matter.",
    related: ["CA-2", "CM-4", "RA-3"],
    map: {
      nist_ai_rmf: ["MEASURE 2.5", "MEASURE 2.3"],
      iso_42001: ["A.6 AI system life cycle (verification and validation)"],
      eu_ai_act: ["Art. 15 (accuracy, providers of high-risk AI)"],
    },
    when: () => true,
  },
  {
    id: "AI-FA-1",
    base: null,
    family: "AI-specific extension (relates to SA-11, RA-8)",
    title: "Bias Testing and Independent Audit",
    statement:
      "a. Test the AI system for differences in outcomes across [Assignment: organization-defined groups, at minimum sex and race/ethnicity where legally required] before deployment and [Assignment: organization-defined frequency] thereafter;\nb. Where required by law, obtain an independent bias audit and publish a summary of results; and\nc. Document and act on disparities that exceed [Assignment: organization-defined threshold].",
    discussion:
      "Decisions about hiring, credit, housing or insurance carry anti-discrimination liability regardless of whether a vendor built the model. NYC Local Law 144 requires an independent bias audit within one year before use and public posting of the summary.",
    related: ["SA-11", "RA-8", "CA-7"],
    map: {
      nist_ai_rmf: ["MEASURE 2.11"],
      iso_42001: ["A.5 Assessing impacts of AI systems", "A.7 Data for AI systems"],
      eu_ai_act: ["Art. 10 (data governance, providers of high-risk AI)"],
      nyc_ll144: ["§ 20-871 (annual independent bias audit, public summary)"],
      colorado: ["Shared anti-discrimination liability"],
    },
    when: (s) => s.has("consequential") || s.has("aedt"),
  },
  {
    id: "AI-HO-1",
    base: null,
    family: "AI-specific extension (no SP 800-53 equivalent)",
    title: "Human Oversight",
    statement:
      "a. Assign [Assignment: organization-defined role] with the competence and authority to review, override or stop the AI system's outputs;\nb. Define which outputs require human review before they take effect; and\nc. Monitor for over-reliance, for example approval rates close to 100%.",
    discussion:
      "A human who approves every recommendation without looking is not oversight. Give reviewers the information and time to disagree, and track how often they do.",
    related: ["AC-6", "CA-7", "PL-4"],
    map: {
      nist_ai_rmf: ["MAP 3.5", "GOVERN 3.2"],
      iso_42001: ["A.9 Use of AI systems"],
      eu_ai_act: ["Art. 14 (providers)", "Art. 26(2) (deployers, high-risk)"],
      gdpr: ["Art. 22 (solely automated decisions)"],
      colorado: ["Meaningful human review on request"],
    },
    when: (s) => s.has("consequential") || s.has("agent_actions") || s.has("low_review"),
  },
  {
    id: "AI-TR-1",
    base: null,
    family: "AI-specific extension (relates to PT-5)",
    title: "AI Interaction Disclosure",
    statement:
      "Inform individuals that they are interacting with an AI system at the start of the interaction, in [Assignment: organization-defined format and languages], unless this is obvious from the context.",
    discussion:
      "Chatbots and voice agents that talk to customers must say they are AI under the EU AI Act from 2 August 2026, and several US states have similar rules. It is also the simplest way to keep customer trust.",
    related: ["PT-5"],
    map: {
      nist_ai_rmf: ["MEASURE 2.8"],
      iso_42001: ["A.8 Information for interested parties"],
      eu_ai_act: ["Art. 50(1)"],
    },
    when: (s) => s.has("external_users") && s.has("genai"),
  },
  {
    id: "AI-TR-2",
    base: null,
    family: "AI-specific extension (relates to SI-15)",
    title: "Synthetic Content Labelling",
    statement:
      "a. Label AI-generated or manipulated images, audio and video, and AI-generated text published to inform the public, as artificially generated;\nb. Do not depict real, identifiable people without their documented consent; and\nc. Where you provide the generating system, apply machine-readable marking to outputs.",
    discussion:
      "Deepfake disclosure applies to deployers under the EU AI Act; machine-readable marking applies to providers of generative systems. Depicting real people also raises likeness, defamation and IP risk.",
    related: ["SI-15", "PT-5"],
    map: {
      nist_ai_rmf: ["GenAI Profile: Information Integrity, Intellectual Property"],
      iso_42001: ["A.8 Information for interested parties"],
      eu_ai_act: ["Art. 50(2) (providers, marking)", "Art. 50(4) (deployers, deepfakes and public-interest text)"],
    },
    when: (s) => s.has("synthetic_media") || s.has("deepfake") || s.has("synthetic_text"),
  },
  {
    id: "AI-AD-1",
    base: null,
    family: "AI-specific extension (relates to PT-5, PT-6)",
    title: "Notice, Explanation and Appeal for AI-Assisted Decisions",
    statement:
      "a. Notify individuals before AI materially influences a consequential decision about them;\nb. After an adverse decision, provide within [Assignment: organization-defined period, no more than 30 days where Colorado law applies] a plain-language explanation of the decision and the AI's role;\nc. Provide a way to correct inaccurate personal data and to request human review.",
    discussion:
      "Explanation and appeal rights are the common core of Colorado SB 26-189, GDPR Article 22, NYC Local Law 144 notices and the EU AI Act's right to explanation for high-risk decisions.",
    related: ["PT-5", "PT-6", "AI-HO-1"],
    map: {
      nist_ai_rmf: ["MEASURE 2.9", "MANAGE 4.1"],
      iso_42001: ["A.8 Information for interested parties"],
      eu_ai_act: ["Art. 26(11) (inform affected persons)", "Art. 86 (right to explanation)"],
      gdpr: ["Art. 22(3)", "Arts. 13–15"],
      colorado: ["Pre-use notice", "Adverse decision explanation within 30 days", "Correction and human review"],
      nyc_ll144: ["§ 20-871(b) (notice to candidates at least 10 business days before use)"],
    },
    when: (s) => s.has("consequential"),
  },
  {
    id: "AI-PT-5",
    base: "PT-5",
    family: "PII Processing and Transparency",
    title: "Privacy Notice and Lawful Basis for AI Processing",
    statement:
      "a. Identify and document the lawful basis or authority for processing personal data in the AI system;\nb. Update privacy notices to describe the AI processing, its purpose and the categories of data; and\nc. Limit processing to the documented purpose.",
    discussion:
      "Using existing customer or employee data in a new AI tool is a new purpose. Check that your notices and lawful basis cover it before launch.",
    related: ["PT-2", "PT-3", "PT-4"],
    map: {
      nist_ai_rmf: ["MEASURE 2.10"],
      iso_42001: ["A.7 Data for AI systems", "A.8 Information for interested parties"],
      gdpr: ["Art. 5(1)(b) (purpose limitation)", "Art. 6 (lawful basis)", "Arts. 13–14 (notices)"],
    },
    when: (s) => s.has("personal_data"),
  },
  {
    id: "AI-PT-7",
    base: "PT-7",
    family: "PII Processing and Transparency",
    title: "Sensitive Data in AI Systems",
    statement:
      "Apply [Assignment: organization-defined additional safeguards, e.g. explicit consent, minimisation, restricted access, no use for model training] before processing sensitive categories of personal data in the AI system.",
    discussion:
      "Health, biometric, children's and special-category data carry stricter legal conditions and higher harm if leaked or misused.",
    related: ["PT-2", "PT-3", "RA-8"],
    map: {
      nist_ai_rmf: ["MEASURE 2.10"],
      iso_42001: ["A.7 Data for AI systems"],
      gdpr: ["Art. 9 (special categories)", "Art. 8 (children)"],
    },
    when: (s) => s.has("sensitive_data"),
  },
  {
    id: "AI-SI-12",
    base: "SI-12",
    family: "System and Information Integrity",
    title: "Retention of Prompts and Outputs",
    statement:
      "Retain AI inputs, outputs and derived data only for [Assignment: organization-defined retention period], configure vendor retention settings to match, and dispose of data at the end of the period.",
    discussion:
      "Many AI tools keep conversation history indefinitely by default. That history becomes a store of confidential and personal data nobody planned for.",
    related: ["SI-12(1)", "AU-11", "MP-6"],
    map: {
      nist_ai_rmf: ["MEASURE 2.10"],
      iso_42001: ["A.7 Data for AI systems"],
      gdpr: ["Art. 5(1)(e) (storage limitation)"],
    },
    when: (s) => s.has("personal_data") || s.has("no_retention") || s.has("confidential_data"),
  },
  {
    id: "AI-SA-9",
    base: "SA-9",
    family: "System and Services Acquisition",
    title: "AI Vendor Management",
    statement:
      "a. Assess the AI vendor's security and privacy practices before use, including [Assignment: organization-defined evidence, e.g. SOC 2 Type II, ISO/IEC 27001];\nb. Require by contract that the organization's data is not used to train vendor models without approval, and define retention, sub-processors and breach notification; and\nc. Monitor the vendor for material changes to models and terms.",
    discussion:
      "Most small companies deploy AI through vendors, so the contract is the main control. Default consumer terms often allow training on your inputs.",
    related: ["SR-6", "SA-4", "SR-3"],
    map: {
      nist_ai_rmf: ["GOVERN 6.1", "MANAGE 3.1"],
      iso_42001: ["A.10 Third-party and customer relationships"],
      gdpr: ["Art. 28 (processors)"],
      eu_ai_act: ["Art. 26(1) (use according to provider instructions)"],
    },
    when: (s) => s.has("vendor"),
  },
  {
    id: "AI-CM-4",
    base: "CM-4",
    family: "Configuration Management",
    title: "Change Impact Analysis for AI",
    statement:
      "Analyze changes to the AI system, including model or version updates, prompt changes, new data sources and vendor term changes, to determine their impact before implementation, and re-run [Assignment: organization-defined tests] for material changes.",
    discussion:
      "Vendors update models silently. A change that improves average quality can break your specific use case.",
    related: ["CM-3", "SA-11", "RA-3"],
    map: {
      nist_ai_rmf: ["MANAGE 2.2"],
      iso_42001: ["A.6 AI system life cycle"],
      colorado: ["Developers notify deployers of material modifications"],
    },
    when: (s) => s.has("vendor") || s.has("provider") || s.has("high_risk"),
  },
  {
    id: "AI-CA-7",
    base: "CA-7",
    family: "Assessment, Authorization, and Monitoring",
    title: "Post-Deployment Monitoring",
    statement:
      "a. Assign an owner to monitor the AI system's performance, errors, complaints and incidents;\nb. Review [Assignment: organization-defined metrics] [Assignment: organization-defined frequency]; and\nc. Suspend use when [Assignment: organization-defined thresholds] are exceeded.",
    discussion:
      "Most AI failures show up after launch, as drift, new user behaviour or vendor changes. Monitoring without a named owner does not happen.",
    related: ["CA-2", "SI-4", "IR-4"],
    map: {
      nist_ai_rmf: ["MANAGE 4.1", "GOVERN 1.5"],
      iso_42001: ["Clause 9.1 Monitoring, measurement, analysis and evaluation"],
      eu_ai_act: ["Art. 26(5) (deployers monitor and inform provider)", "Art. 72 (provider post-market monitoring)"],
    },
    when: () => true,
  },
  {
    id: "AI-IR-4",
    base: "IR-4",
    family: "Incident Response",
    title: "AI Incident Handling",
    statement:
      "a. Include AI-specific incidents (harmful output, data leakage through the AI, prompt injection, discriminatory outcomes, unsafe agent actions) in the incident response plan;\nb. Provide users a way to report AI incidents; and\nc. Notify [Assignment: organization-defined parties, including regulators and vendors where required] within [Assignment: organization-defined time period].",
    discussion:
      "Treat a chatbot that leaks another customer's data like any other data breach. Under the EU AI Act, deployers of high-risk AI must inform the provider and authorities of serious incidents.",
    related: ["IR-6", "IR-8", "CA-7"],
    map: {
      nist_ai_rmf: ["MANAGE 4.3", "GOVERN 4.3"],
      iso_42001: ["A.8 Information for interested parties (incidents)", "Clause 10.2 Nonconformity"],
      eu_ai_act: ["Art. 26(5)", "Art. 73 (serious incidents)"],
    },
    when: () => true,
  },
];

// Mappings for regulations and standards added in November 2026. Merged into each control's `map`.
const EXTRA_MAP = {
  "AI-PM-5": { iso_27001: ["A.5.9 Inventory of assets"], korea_ai_basic: ["Documentation of trust and safety measures"] },
  "AI-RA-3": { iso_23894: ["Clause 6.4 Risk assessment"], iso_27001: ["Clause 6.1.2 Risk assessment"], ca_admt: ["Risk assessment"], korea_ai_basic: ["High-impact AI risk management"] },
  "AI-RA-8": { iso_42005: ["AI system impact assessment"], uk_gdpr: ["Art. 35 DPIA"], ca_admt: ["Risk assessment"], iso_27701: ["Privacy impact assessment"] },
  "AI-AC-6": { iso_27001: ["A.5.15 Access control", "A.8.2 Privileged access"] },
  "AI-AU-12": { iso_27001: ["A.8.15 Logging"] },
  "AI-FA-1": { illinois_hra: ["No discriminatory effect; no zip-code proxies"], texas_traiga: ["No intent to discriminate; internal testing defence"] },
  "AI-HO-1": { korea_ai_basic: ["Human oversight for high-impact AI"], uk_gdpr: ["Human intervention (Art. 22C)"] },
  "AI-TR-1": { utah_ai: ["Disclosure of generative AI"], korea_ai_basic: ["Advance notice of AI use"], texas_traiga: ["Health care disclosure"] },
  "AI-TR-2": { ca_ai_transparency: ["Latent and manifest disclosures"], china_genai: ["Explicit and implicit labels"], korea_ai_basic: ["Labelling of generative output"] },
  "AI-AD-1": { ca_admt: ["Pre-use notice, opt-out and access"], illinois_hra: ["Notice of AI use"], uk_gdpr: ["Arts. 22A–22D safeguards"], korea_ai_basic: ["Explanation of outcomes"] },
  "AI-PT-5": { uk_gdpr: ["Arts. 13–14"], iso_27701: ["Notices to individuals"], ca_admt: ["Pre-use notice"] },
  "AI-PT-7": { uk_gdpr: ["Art. 9 special category data"] },
  "AI-SI-12": { uk_gdpr: ["Art. 5(1)(e) storage limitation"], iso_27701: ["Retention and disposal"] },
  "AI-SA-9": { iso_27001: ["A.5.19–5.23 Supplier relationships"], uk_gdpr: ["Art. 28 processors"], iso_27701: ["Processor management"] },
  "AI-CA-7": { iso_23894: ["Monitoring and review"] },
  "AI-IR-4": { iso_27001: ["A.5.24–5.28 Incident management"] },
};
for (const c of CONTROLS) Object.assign(c.map, EXTRA_MAP[c.id] || {});

export const CONTROL_BY_ID = Object.fromEntries(CONTROLS.map((c) => [c.id, c]));
