# MayAI

**Live site:** https://ac-ctrl-lab.github.io/ai-intake-check/

A free AI use-case intake for small and mid-size companies. Describe an AI use case, answer questions on legal, privacy, security and oversight, and get:

- which laws and frameworks apply, and why
- a risk tier (Low, Medium, High, Prohibited)
- an intake decision: *Approve with standard controls*, *Approve with conditions*, *Return for more information* or *Do not proceed*
- obligations per framework, with article references and dates
- controls written in the **NIST SP 800-53 Rev. 5** structure, mapped to the frameworks that apply
- an export as Markdown, JSON or PDF


> This is not legal advice. 

## The problem

Companies review new AI use cases through an automated GenAI intake process orchestrated on third party platforms: legal, privacy, security and risk teams decide whether a use case is approved, approved with conditions, or sent back for more evidence. Small and mid-size companies adopt AI tools just as fast but have no budget for governance software or a review board, so most use cases go live without anyone checking which rules apply or which controls are missing. This tool reproduces the structure of that intake process for them to get an initial understanding 

## Coverage

**Regulations** are checked automatically against the answers, because they apply whether or not anyone selects them. **Standards and frameworks** are voluntary and apply only when selected.

| Regulation | Jurisdiction | When it applies in the tool |
|---|---|---|
| EU AI Act (Reg. 2024/1689, as amended by Reg. 2026/1744) | EU | People in the EU affected. Prohibited practices, Annex III high-risk (from 2 Dec 2027), transparency (from 2 Aug 2026), AI literacy |
| GDPR | EU | Personal data of people in the EU |
| UK GDPR and DPA 2018 (as amended by the Data (Use and Access) Act 2025) | UK | Personal data of people in the UK |
| Colorado SB 26-189 | Colorado | AI materially influences consequential decisions (from 1 Jan 2027) |
| CCPA automated decision-making regulations | California | Significant decisions about consumers; businesses above CCPA thresholds (from 1 Jan 2027) |
| California AI Transparency Act (SB 942, AB 853) | California | Providers of public generative AI with over 1 million monthly users (from 2 Aug 2026) |
| Illinois Human Rights Act, AI in employment (HB 3773) | Illinois | AI influences employment decisions (since 1 Jan 2026) |
| NYC Local Law 144 | New York City | Automated employment decision tools for hiring or promotion |
| Texas Responsible AI Governance Act (HB 149) | Texas | Any AI deployed for people in Texas (since 1 Jan 2026) |
| Utah AI disclosure law (Utah Code ch. 13-77) | Utah | Generative AI interacting with consumers |
| South Korea AI Basic Act | South Korea | Generative or high-impact AI (since 22 Jan 2026) |
| Japan AI Promotion Act | Japan | Any AI use; cooperation duty, no penalties |
| China AI-generated content labelling measures | China | Generative AI content provided or published in China (since 1 Sep 2025) |

| Standard or framework | Type |
|---|---|
| NIST AI RMF 1.0 + Generative AI Profile (AI 600-1) | AI risk management framework |
| ISO/IEC 42001:2023 | AI management system, certifiable |
| ISO/IEC 42005:2025 | AI impact assessment guidance |
| ISO/IEC 23894:2023 | AI risk management guidance |
| ISO/IEC 27001:2022 | Information security management system, certifiable |
| ISO/IEC 27701:2025 | Privacy information management system, certifiable |

ISO references cite clause and Annex numbers only, since the standard texts are copyrighted. Legal status was checked in November 2026.

### Adding a regulation

1. Add an entry to `src/data/frameworks.js` (`kind: "law"`, jurisdiction codes in `geo`).
2. Add an applicability rule to `RULES` in `src/engine.js` and its obligations in `obligations()`.
3. Map relevant controls in `EXTRA_MAP` in `src/data/controls.js`.
4. Run `node tests/evals.mjs`.

## Design decisions

- **Rules, not model judgment.** Applicability, risk tier (EU AI Act risk tiering language) and decision come from explicit rules in [`src/engine.js`](src/engine.js). The same answers always give the same result, every finding cites its source, and the logic can be tested. An LLM is planned only for the next step: mapping a company's own policies to the generated controls.
- **"Not sure yet" is a valid answer.** It sends the intake back with a list of open questions, as a real intake forum would, instead of guessing.
- **Only relevant questions appear.** Around 30 questions in total; follow-ups (bias testing, appeal process, NYC hiring tools, vendor training terms) appear only when earlier answers make them relevant.
- **Controls in the NIST SP 800-53 format.** Each control has an ID, a control statement with `[Assignment: organization-defined …]` parameters, a discussion and related controls, and is based on a named 800-53 control. Where 800-53 has no equivalent (human oversight, AI transparency, bias audits) the control is marked as an AI-specific extension. NIST's AI overlays for 800-53 are still in draft.
- **Static site.** Hosted on GitHub Pages, with no server-side application code.

## Test set

The eight example use cases double as a labelled test set: each has an expected risk tier, decision and set of frameworks in scope.

```
node tests/evals.mjs
```

Current result: **8/8** match. The labels were written alongside the rules, so this checks that the rules do what was intended. It does not show they are correct in general; independent cases from reviewers are the next step.

| Example | Tier | Decision |
|---|---|---|
| Customer support chatbot | Medium | Approve with conditions |
| Resume screening (NYC, Colorado, Illinois) | High | Approve with conditions |
| Meeting summaries | Low | Approve with standard controls |
| Marketing image generation | Medium | Approve with conditions |
| Small-business loan scoring | High | Approve with conditions |
| Call-centre emotion monitoring (EU) | Prohibited | Do not proceed |
| Coding assistant | Low | Return for more information |
| Invoice processing agent | Medium | Approve with conditions |

## Run locally

Any static file server works, for example:

```
python3 -m http.server 8000
```

then open http://localhost:8000.

## Project structure

```
index.html              page shell
assets/styles.css       styles
src/app.js              UI: setup, intake, live panel, result, export
src/engine.js           rules: signals, applicability, risk tier, decision, obligations, controls
src/data/frameworks.js  framework catalogue and legal status notes
src/data/questions.js   question bank with conditional logic
src/data/controls.js    control catalogue (NIST SP 800-53 Rev. 5 format)
src/data/examples.js    example use cases with expected outcomes
tests/evals.mjs         test-set evaluation
SPEC.md                 v1 spec
```

## Next

- Upload company policies and map them against the generated controls
- More frameworks: UK GDPR and ICO guidance, California CCPA ADMT regulations, Texas TRAIGA, Utah AI Policy Act
- A saved register of use cases (AI inventory)
- Visual redesign

## Design versions

The current design is in `assets/styles.css`. The previous design is kept in `assets/styles-v1.css`. To switch back, change `styles.css` to `styles-v1.css` in the stylesheet line of `index.html`.

## License

   PolyForm Noncommercial 1.0.0. Free for noncommercial use; commercial use requires a separate license. See [LICENSE](LICENSE).
