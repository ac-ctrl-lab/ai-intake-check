// Legal basis references with links to the official original text.
// Each regulation has a base link to its official source. Where the official site supports
// deep links to a section, `section(ref)` builds one; otherwise the base link is used and the
// section is named in the label.

const EU_AI_ACT = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32024R1689";
const GDPR = "https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32016R0679";

// Article number from a reference such as "Article 26(11)" -> "26"
const artNo = (ref) => (ref.match(/(\d+[A-Z]?)/) || [])[1];

export const SOURCES = {
  eu_ai_act: { name: "EU AI Act", url: (ref) => (/^Annex III/.test(ref) ? `${EU_AI_ACT}#anx_III` : artNo(ref) ? `${EU_AI_ACT}#art_${artNo(ref)}` : EU_AI_ACT) },
  gdpr: { name: "GDPR", url: () => GDPR },
  uk_gdpr: { name: "UK GDPR", url: (ref) => (artNo(ref) ? `https://www.legislation.gov.uk/eur/2016/679/article/${artNo(ref)}` : "https://www.legislation.gov.uk/eur/2016/679/contents") },
  colorado: { name: "Colorado SB 26-189", url: () => "https://leg.colorado.gov/bills/sb26-189" },
  ca_admt: { name: "California CCPA regulations", url: () => "https://cppa.ca.gov/regulations/" },
  ca_ai_transparency: { name: "California AI Transparency Act", url: () => "https://leginfo.legislature.ca.gov/faces/codes_displayText.xhtml?lawCode=BPC&division=8.&title=&part=&chapter=25.&article=" },
  illinois_hra: { name: "Illinois Human Rights Act", url: () => "https://www.ilga.gov/legislation/publicacts/fulltext.asp?Name=103-0804" },
  nyc_ll144: { name: "NYC Local Law 144", url: () => "https://www.nyc.gov/site/dca/about/automated-employment-decision-tools.page" },
  texas_traiga: { name: "Texas TRAIGA (HB 149)", url: () => "https://capitol.texas.gov/BillLookup/History.aspx?LegSess=89R&Bill=HB149" },
  utah_ai: { name: "Utah Code", url: () => "https://le.utah.gov/xcode/Title13/Chapter77/13-77.html" },
  korea_ai_basic: { name: "South Korea AI Basic Act", url: () => "https://www.law.go.kr/" },
  china_genai: { name: "China AI content labelling measures", url: () => "https://www.cac.gov.cn/" },
  japan_ai_promotion: { name: "Japan AI Promotion Act", url: () => "https://www8.cao.go.jp/cstp/ai/index.html" },
};

// Legal basis for each launch condition, keyed by control ID.
// `hi: true` = only relevant when the use case is high-risk (EU AI Act Annex III obligations).
// `provider: true` = only relevant when the organisation provides the system to others.
export const CONDITION_BASIS = {
  appeal: [
    { fw: "eu_ai_act", ref: "Article 86", hi: true },
    { fw: "gdpr", ref: "Article 22(3)" },
    { fw: "uk_gdpr", ref: "Articles 22A–22D" },
    { fw: "colorado", ref: "adverse decision explanation and human review" },
    { fw: "ca_admt", ref: "§ 7221(b)(1)" },
  ],
  bias: [
    { fw: "illinois_hra", ref: "775 ILCS 5/2-102(L)" },
    { fw: "nyc_ll144", ref: "Admin. Code § 20-871(a)" },
    { fw: "eu_ai_act", ref: "Article 10(2)(f)", hi: true, provider: true },
  ],
  nyc_audit: [{ fw: "nyc_ll144", ref: "Admin. Code § 20-871(a)" }],
  human_review: [
    { fw: "eu_ai_act", ref: "Article 26(2)", hi: true },
    { fw: "eu_ai_act", ref: "Article 14", hi: true, provider: true },
    { fw: "gdpr", ref: "Article 22" },
    { fw: "uk_gdpr", ref: "Articles 22A–22D" },
  ],
  vendor_training: [
    { fw: "gdpr", ref: "Article 28" },
    { fw: "uk_gdpr", ref: "Article 28" },
  ],
  vendor_review: [
    { fw: "gdpr", ref: "Article 28(1)" },
    { fw: "gdpr", ref: "Article 32" },
    { fw: "uk_gdpr", ref: "Article 28" },
  ],
  disclosure: [
    { fw: "eu_ai_act", ref: "Article 50(1)" },
    { fw: "utah_ai", ref: "chapter 13-77" },
    { fw: "korea_ai_basic", ref: "transparency duties" },
  ],
  deepfake: [
    { fw: "eu_ai_act", ref: "Article 50(4)" },
    { fw: "china_genai", ref: "explicit and implicit labels" },
    { fw: "korea_ai_basic", ref: "labelling of generative AI output" },
  ],
  sso: [
    { fw: "gdpr", ref: "Article 32" },
    { fw: "uk_gdpr", ref: "Article 32" },
  ],
  logging: [
    { fw: "eu_ai_act", ref: "Article 26(6)", hi: true },
    { fw: "eu_ai_act", ref: "Article 12", hi: true, provider: true },
  ],
  agent: [{ fw: "eu_ai_act", ref: "Article 14", hi: true, provider: true }],
  monitoring: [{ fw: "eu_ai_act", ref: "Article 26(5)", hi: true }],
  privacy_notice: [
    { fw: "gdpr", ref: "Articles 13–14" },
    { fw: "uk_gdpr", ref: "Article 13" },
    { fw: "ca_admt", ref: "§ 7220(a)" },
  ],
  accuracy: [{ fw: "eu_ai_act", ref: "Article 15", hi: true, provider: true }],
};

export const cite = (fw, ref) => ({ fw, ref, name: SOURCES[fw]?.name || fw, url: SOURCES[fw]?.url(ref) });
