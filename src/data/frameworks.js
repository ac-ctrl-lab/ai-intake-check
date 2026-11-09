// Framework catalogue. Applicability logic lives in engine.js.
// Status notes reflect public sources checked in November 2026. Verify before relying on them.

export const FRAMEWORKS = [
  {
    id: "eu_ai_act",
    name: "EU AI Act",
    short: "EU AI Act",
    kind: "law",
    jurisdiction: "European Union",
    citation: "Regulation (EU) 2024/1689, as amended by Regulation (EU) 2026/1744 (Digital Omnibus)",
    status:
      "Prohibitions and AI literacy apply since Feb 2025. Transparency duties (Art. 50) apply from 2 Aug 2026. Annex III high-risk obligations apply from 2 Dec 2027 after the Digital Omnibus delay.",
    summary:
      "Risk-based rules for AI systems placed on the EU market or whose output is used in the EU: banned practices, high-risk requirements and transparency duties.",
    url: "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
    defaultOn: true,
  },
  {
    id: "gdpr",
    name: "General Data Protection Regulation",
    short: "GDPR",
    kind: "law",
    jurisdiction: "European Union",
    citation: "Regulation (EU) 2016/679",
    status: "In force.",
    summary:
      "Applies whenever personal data of people in the EU is processed: lawful basis, transparency, data protection impact assessments and limits on solely automated decisions.",
    url: "https://eur-lex.europa.eu/eli/reg/2016/679/oj",
    defaultOn: true,
  },
  {
    id: "colorado",
    name: "Colorado ADMT Law (SB 26-189)",
    short: "Colorado",
    kind: "law",
    jurisdiction: "Colorado, US",
    citation: "Colorado SB 26-189 (repeals and replaces SB 24-205, the Colorado AI Act)",
    status:
      "Signed 14 May 2026. Takes effect 1 Jan 2027. The Attorney General is still writing implementing rules, so details may change.",
    summary:
      "Notice, adverse-decision explanation and human-review rights when automated decision-making technology materially influences consequential decisions about Colorado consumers, employees or applicants.",
    url: "https://leg.colorado.gov/",
    defaultOn: true,
  },
  {
    id: "nyc_ll144",
    name: "NYC Local Law 144 (AEDT)",
    short: "NYC LL144",
    kind: "law",
    jurisdiction: "New York City, US",
    citation: "NYC Admin. Code §§ 20-870 to 20-874; 6 RCNY § 5-300",
    status: "Enforced since 5 July 2023.",
    summary:
      "Automated employment decision tools used for hiring or promotion of NYC candidates or employees need an annual independent bias audit, a public summary and advance notice.",
    url: "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page",
    defaultOn: true,
  },
  {
    id: "nist_ai_rmf",
    name: "NIST AI Risk Management Framework",
    short: "NIST AI RMF",
    kind: "voluntary",
    jurisdiction: "United States (NIST)",
    citation: "NIST AI 100-1 (AI RMF 1.0) and NIST AI 600-1 (Generative AI Profile)",
    status: "Voluntary framework.",
    summary:
      "Govern, Map, Measure, Manage: a voluntary structure for identifying and managing AI risk, with a profile for generative AI risks.",
    url: "https://www.nist.gov/itl/ai-risk-management-framework",
    defaultOn: true,
  },
  {
    id: "iso_42001",
    name: "ISO/IEC 42001:2023",
    short: "ISO 42001",
    kind: "voluntary",
    jurisdiction: "International, certifiable",
    citation: "ISO/IEC 42001:2023 AI management system",
    status: "Voluntary, certifiable. References only; the standard text is copyrighted.",
    summary:
      "Requirements for an AI management system: policy, roles, risk and impact assessment, life-cycle controls and supplier management.",
    url: "https://www.iso.org/standard/81230.html",
    defaultOn: false,
  },
];

export const FRAMEWORK_BY_ID = Object.fromEntries(FRAMEWORKS.map((f) => [f.id, f]));
