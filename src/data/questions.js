import { JURISDICTIONS } from "./frameworks.js";

// Intake question bank. `showIf` decides whether a question is relevant given earlier answers.
// `unsureable` adds an "Not sure yet" option; choosing it sends the intake back for more information.

const has = (a, key, val) => Array.isArray(a[key]) && a[key].includes(val);
const any = (a, key, vals) => Array.isArray(a[key]) && a[key].some((v) => vals.includes(v));
const isVendor = (a) => ["vendor_saas", "vendor_api"].includes(a.uc_build);
const consequential = (a) => Array.isArray(a.domain) && a.domain.some((d) => d !== "none");
const isGenAI = (a) => any(a, "uc_type", ["genai", "agent"]);
const externalUsers = (a) => any(a, "uc_users", ["customers", "business_customers", "public"]);

export const SECTIONS = [
  {
    id: "usecase",
    title: "Use Case",
    lens: "Business",
    intro: "What the AI does and how you get it.",
    questions: [
      { id: "uc_name", type: "text", label: "Name of the use case", placeholder: "e.g. Customer support chatbot", required: true },
      {
        id: "uc_description",
        type: "textarea",
        label: "Describe what the AI will do and for whom",
        placeholder: "One or two sentences. Who uses it, on what input, and what happens with the output?",
      },
      {
        id: "uc_type",
        type: "multi",
        label: "What does the AI do?",
        help: "Most systems combine several, for example an agent built on a generative model.",
        options: [
          { value: "genai", label: "Generates content", hint: "Text, images, audio, video or code" },
          { value: "predictive", label: "Predicts, scores or classifies", hint: "Rankings, risk scores, recommendations" },
          { value: "agent", label: "Takes actions in other systems", hint: "Sends, books, updates or pays without a person doing it" },
          { value: "biometric", label: "Analyses faces, voices or bodies", hint: "Recognition, emotion or biometric analysis" },
        ],
      },
      {
        id: "industry",
        type: "single",
        label: "Which industry is this used in?",
        help: "Used to flag sector rules, such as health care disclosure duties.",
        options: [
          { value: "financial", label: "Financial services" },
          { value: "insurance", label: "Insurance" },
          { value: "healthcare", label: "Health care" },
          { value: "hr", label: "HR and recruiting" },
          { value: "education", label: "Education" },
          { value: "public_sector", label: "Public sector" },
          { value: "retail", label: "Retail and e-commerce" },
          { value: "technology", label: "Software and technology" },
          { value: "other", label: "Other" },
        ],
      },
      {
        id: "uc_build",
        type: "single",
        label: "How will you get it?",
        options: [
          { value: "vendor_saas", label: "Off-the-shelf tool", hint: "A SaaS product with AI features" },
          { value: "vendor_api", label: "Built on a model API", hint: "Your own app on top of e.g. an LLM API" },
          { value: "internal_model", label: "Our own model", hint: "Trained or fine-tuned by us" },
        ],
      },
      {
        id: "uc_users",
        type: "multi",
        label: "Who will interact with it or be affected by its output?",
        options: [
          { value: "employees", label: "Our employees" },
          { value: "customers", label: "Consumers / individual customers" },
          { value: "business_customers", label: "Business customers" },
          { value: "public", label: "The general public" },
          { value: "applicants", label: "Job applicants" },
        ],
      },
      {
        id: "role",
        type: "single",
        label: "Are you only using this AI, or also selling or providing it to others?",
        options: [
          { value: "deployer", label: "Only using it", hint: "Deployer" },
          { value: "provider", label: "We provide it to others", hint: "Provider / developer" },
        ],
      },
    ],
  },
  {
    id: "scope",
    title: "Where and Who",
    lens: "Legal",
    intro: "Jurisdiction decides which laws apply.",
    questions: [
      {
        id: "geo",
        type: "multi",
        label: "Where are the people affected by this AI located?",
        help: "Include every place where users, customers, employees or applicants are. This decides which laws apply.",
        options: JURISDICTIONS.map((j) => ({ value: j.id, label: j.group === "United States" && j.id !== "other_us" ? `US: ${j.label}` : j.label })),
      },
      {
        id: "company_size",
        type: "single",
        label: "How many people work at your company?",
        options: [
          { value: "lt50", label: "Fewer than 50" },
          { value: "50_249", label: "50–249" },
          { value: "250_749", label: "250–749" },
          { value: "750plus", label: "750 or more" },
        ],
      },
    ],
  },
  {
    id: "impact",
    title: "Decisions and Impact",
    lens: "Legal",
    intro: "The single biggest driver of risk is whether the AI influences decisions about people.",
    questions: [
      {
        id: "domain",
        type: "multi",
        label: "Does the AI touch decisions in any of these areas?",
        help: "Select every area where its output feeds a decision about a person.",
        options: [
          { value: "employment", label: "Hiring, promotion, firing or work allocation" },
          { value: "education", label: "Admissions, grading or exam proctoring" },
          { value: "credit_lending", label: "Credit, lending or creditworthiness" },
          { value: "insurance", label: "Insurance eligibility or pricing" },
          { value: "housing", label: "Housing or tenant screening" },
          { value: "healthcare", label: "Health care access or treatment" },
          { value: "essential_services", label: "Public benefits or essential services" },
          { value: "legal_services", label: "Legal services" },
          { value: "critical_infrastructure", label: "Safety of critical infrastructure" },
          { value: "none", label: "None of these", exclusive: true },
        ],
      },
      {
        id: "decision_role",
        type: "single",
        label: "How much weight does the AI's output carry in those decisions?",
        showIf: consequential,
        unsureable: true,
        options: [
          { value: "makes_decision", label: "It decides", hint: "No human reviews the outcome" },
          { value: "substantially_assists", label: "It is a main factor", hint: "A human signs off, but mostly follows it" },
          { value: "informs", label: "One input among many", hint: "A human weighs it against other information" },
        ],
      },
      {
        id: "aedt",
        type: "single",
        label: "Will it score, rank, screen or recommend candidates or employees for hiring or promotion?",
        showIf: (a) => has(a, "domain", "employment"),
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "prohibited",
        type: "multi",
        label: "Does the AI do any of the following?",
        help: "These practices are banned under Article 5 of the EU AI Act.",
        options: [
          { value: "emotion_workplace", label: "Infers emotions of employees or students" },
          { value: "social_scoring", label: "Scores people on social behaviour or personality for unrelated treatment" },
          { value: "manipulation", label: "Uses manipulative or deceptive techniques that can cause significant harm" },
          { value: "exploit_vulnerable", label: "Exploits vulnerabilities due to age, disability or economic situation" },
          { value: "biometric_sensitive", label: "Infers race, religion, politics or sexual orientation from biometric data" },
          { value: "face_scraping", label: "Builds facial recognition databases by untargeted scraping" },
          { value: "crime_prediction", label: "Predicts an individual's risk of committing a crime from profiling" },
          { value: "intimate_imagery", label: "Generates non-consensual intimate imagery" },
          { value: "none", label: "None of these", exclusive: true },
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Data and Privacy",
    lens: "Privacy",
    intro: "What goes into the system, where it goes, and how long it stays.",
    questions: [
      {
        id: "personal_data",
        type: "single",
        label: "Will the AI process personal data?",
        unsureable: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "sensitive_data",
        type: "multi",
        label: "Does that include any sensitive categories?",
        showIf: (a) => a.personal_data === "yes",
        options: [
          { value: "health", label: "Health" },
          { value: "biometric", label: "Biometric" },
          { value: "financial", label: "Financial account data" },
          { value: "children", label: "Children's data" },
          { value: "special", label: "Race, religion, politics, sexual orientation or union membership" },
          { value: "none", label: "None of these", exclusive: true },
        ],
      },
      {
        id: "vendor_training",
        type: "single",
        label: "Can the vendor use your inputs to train its models?",
        showIf: isVendor,
        unsureable: true,
        options: [
          { value: "no_contract", label: "No, our contract excludes it" },
          { value: "may_train", label: "Yes, or the terms allow it" },
        ],
      },
      {
        id: "retention",
        type: "single",
        label: "Is there a defined retention period for prompts, inputs and outputs?",
        unsureable: true,
        options: [
          { value: "defined", label: "Yes, defined and configured" },
          { value: "not_defined", label: "No" },
        ],
      },
      {
        id: "privacy_notice",
        type: "single",
        label: "Do your privacy notices cover this use of personal data?",
        showIf: (a) => a.personal_data === "yes",
        unsureable: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "security",
    title: "Information Security",
    lens: "Security",
    intro: "Access, data exposure and new attack surfaces such as prompt injection.",
    questions: [
      {
        id: "data_class",
        type: "single",
        label: "What is the most sensitive data the AI will see?",
        options: [
          { value: "public", label: "Public" },
          { value: "internal", label: "Internal" },
          { value: "confidential", label: "Confidential", hint: "Customer data, contracts, financials" },
          { value: "restricted", label: "Restricted", hint: "Credentials, payment data, regulated data" },
        ],
      },
      {
        id: "access_scope",
        type: "single",
        label: "What can the AI reach or do?",
        options: [
          { value: "input_only", label: "Only what users type or upload" },
          { value: "internal_data", label: "Connected to internal data", hint: "Searches documents, CRM, drives" },
          { value: "actions", label: "Takes actions", hint: "Sends messages, updates records, runs code" },
        ],
      },
      {
        id: "untrusted_content",
        type: "single",
        label: "Will it process content from outside the company?",
        help: "Web pages, inbound emails, customer uploads. This is the main route for prompt injection.",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "sso",
        type: "single",
        label: "Is access controlled through your single sign-on and role-based permissions?",
        unsureable: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "logging",
        type: "single",
        label: "Are prompts, outputs and actions logged and retrievable?",
        unsureable: true,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "vendor_review",
        type: "single",
        label: "Has the vendor passed a security review?",
        help: "For example a SOC 2 Type II or ISO/IEC 27001 report you have read.",
        showIf: isVendor,
        options: [
          { value: "done", label: "Yes, completed" },
          { value: "pending", label: "In progress" },
          { value: "none", label: "Not started" },
        ],
      },
    ],
  },
  {
    id: "oversight",
    title: "Transparency and Oversight",
    lens: "Trust",
    intro: "Telling people, keeping a human in the loop, and checking the output is right.",
    questions: [
      {
        id: "ai_disclosed",
        type: "single",
        label: "Will people be told they are interacting with AI?",
        showIf: (a) => externalUsers(a) && isGenAI(a),
        options: [
          { value: "yes", label: "Yes, clearly" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "synthetic",
        type: "single",
        label: "Does it produce content that is published or sent outside the company?",
        options: [
          { value: "none", label: "No" },
          { value: "text", label: "Text", hint: "Emails, posts, articles" },
          { value: "media", label: "Images, audio or video" },
          { value: "deepfake", label: "Realistic depictions of real people" },
        ],
      },
      {
        id: "human_review",
        type: "single",
        label: "How much of the output does a person check before it takes effect?",
        options: [
          { value: "all", label: "Every output" },
          { value: "sampled", label: "A sample" },
          { value: "exceptions", label: "Only flagged exceptions" },
          { value: "none", label: "None" },
        ],
      },
      {
        id: "appeal",
        type: "single",
        label: "Can an affected person get an explanation, correct their data and ask for human review?",
        showIf: consequential,
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "accuracy_testing",
        type: "single",
        label: "Has it been tested for accuracy on your own data?",
        options: [
          { value: "metrics", label: "Yes, with measured results" },
          { value: "informal", label: "Informally" },
          { value: "not_yet", label: "Not yet" },
        ],
      },
      {
        id: "bias_testing",
        type: "single",
        label: "Has it been tested for different outcomes across groups (bias)?",
        showIf: consequential,
        options: [
          { value: "done", label: "Yes" },
          { value: "planned", label: "Planned" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
  {
    id: "accountability",
    title: "Accountability",
    lens: "Governance",
    intro: "Someone has to own it after launch.",
    questions: [
      { id: "owner", type: "text", label: "Who is the business owner?", placeholder: "Name and role" },
      {
        id: "monitoring_owner",
        type: "single",
        label: "Is someone named to monitor performance and incidents after launch?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "ai_policy",
        type: "single",
        label: "Does the company have an AI use policy?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "training",
        type: "single",
        label: "Will users be trained on how to use this tool and its limits?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
      {
        id: "incident_process",
        type: "single",
        label: "Is there a process to report and handle AI incidents?",
        options: [
          { value: "yes", label: "Yes" },
          { value: "no", label: "No" },
        ],
      },
    ],
  },
];

export const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions.map((q) => ({ ...q, section: s.id })));
export const QUESTION_BY_ID = Object.fromEntries(ALL_QUESTIONS.map((q) => [q.id, q]));

export const isVisible = (q, answers) => (typeof q.showIf === "function" ? q.showIf(answers) : true);
