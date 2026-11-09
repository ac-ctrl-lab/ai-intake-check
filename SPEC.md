# AI Intake Check — v1 spec (proof of concept)

## Problem
Small and mid-size companies adopt AI tools faster than they can review them. Large companies run a GenAI intake process: a cross-functional review (legal, privacy, security, risk) that approves, conditions or rejects each AI use case. Smaller companies have no budget for governance software or a review board, so most AI use cases go live without anyone checking which laws apply or which controls are missing.

## Who it is for
Operations, IT, legal or founder-level staff at companies of roughly 10–750 people who need to answer: "Can we use this AI tool for this purpose, and what do we have to put in place first?"

## What it does
1. **Setup.** The user picks which frameworks to check against. Each one can be switched on or off.
2. **Intake.** A guided questionnaire covering the use case, scope, decisions and impact, data and privacy, information security, transparency and human oversight, and accountability. Questions appear only when earlier answers make them relevant.
3. **Live scope panel.** While answering, a side panel shows which frameworks apply, the current risk tier and the signals behind it.
4. **Result.** An intake decision (Approve with standard controls / Approve with conditions / Return for more information / Do not proceed), the risk tier, obligations per framework with citations, and a list of controls written in the NIST SP 800-53 Rev. 5 format.
5. **Export.** Markdown report, JSON, or print to PDF.

## Frameworks in v1
| Framework | Type | How applicability is decided |
|---|---|---|
| EU AI Act (Reg. (EU) 2024/1689, as amended by Reg. (EU) 2026/1744) | Law | People in the EU affected, or system offered in the EU |
| GDPR | Law | EU nexus and personal data processed |
| Colorado SB 26-189 (ADMT law, replaces SB 24-205) | Law, from 1 Jan 2027 | Colorado consumers, consequential decision domain, ADMT materially influences the decision |
| NYC Local Law 144 (AEDT) | Law | NYC candidates or employees, hiring or promotion, tool substantially assists the decision |
| NIST AI RMF 1.0 + Generative AI Profile (NIST AI 600-1) | Voluntary | Applied when selected |
| ISO/IEC 42001:2023 | Voluntary, certifiable | Applied when selected (clause and Annex A references only; the standard text is copyrighted) |

## Design principles
- **Deterministic rules, not model judgment.** Same answers, same result. Every finding cites its source. This makes the tool testable and explainable.
- **Runs entirely in the browser.** No backend; nothing entered leaves the user's device. Hosted on GitHub Pages.
- **"Unsure" is a valid answer.** It produces "Return for more information" with the list of open questions, which mirrors how a real intake forum works.
- **Not legal advice.** Shown on every screen and in every export.

## Control format
Each control follows the SP 800-53 Rev. 5 structure: **Control ID and title** (based on the 800-53 base control), **Control statement** with organization-defined parameters in `[Assignment: …]` form, **Discussion**, **Related controls**, plus **mappings** to the AI RMF subcategory, ISO/IEC 42001 clause or Annex A objective, and legal articles. Only mappings for selected frameworks are shown. NIST's AI-specific 800-53 overlays are still in draft, so v1 adapts the base controls.

## Test set
The example use cases double as a labelled test set (expected tier, decision and frameworks in scope). `node tests/evals.mjs` reports how many the engine gets right.

## Out of scope for v1, planned next
- Upload company policies and map them against the generated controls (LLM-assisted, client-side or via the user's own API key)
- More frameworks: UK GDPR / ICO guidance, Texas TRAIGA, California CCPA ADMT regulations, Utah AI Policy Act, sector rules
- Saved intake register (inventory) across multiple use cases
- Visual redesign
