# Gen-AI Intake Check

**Live site:** https://ac-ctrl-lab.github.io/ai-intake-check/

A free AI use-case intake for small and mid-size companies. Describe an AI use case, answer questions on legal, privacy, security and oversight, and get:

- which laws and frameworks apply, and why
- a risk tier (Low, Medium, High, Prohibited)
- an intake decision: *Approve with standard controls*, *Approve with conditions*, *Return for more information* or *Do not proceed*
- obligations per framework, with article references and dates
- controls written in the **NIST SP 800-53 Rev. 5** structure, mapped to the frameworks that apply
- an export as Markdown, JSON or PDF

It runs entirely in the browser. Nothing entered leaves the user's device.

> General information only, not legal advice. Legal status checked November 2026.

## The problem

Larger companies review new AI use cases through a GenAI intake process: legal, privacy, security and risk teams decide whether a use case is approved, approved with conditions, or sent back for more evidence. Small and mid-size companies adopt AI tools just as fast but have no budget for governance software or a review board, so most use cases go live without anyone checking which rules apply or which controls are missing. This tool reproduces the structure of that intake process for them.

## Frameworks (switch each on or off)

| Framework | How applicability is decided |
|---|---|
| EU AI Act (Reg. 2024/1689, as amended by the Digital Omnibus, Reg. 2026/1744) | People in the EU affected. Prohibited practices (Art. 5), high-risk under Annex III (now from 2 Dec 2027), transparency (Art. 50, from 2 Aug 2026), AI literacy (Art. 4) |
| GDPR | EU nexus and personal data. Lawful basis, DPIA, Art. 9, Art. 22, processors and transfers |
| Colorado SB 26-189 | Replaces the Colorado AI Act. From 1 Jan 2027: notice, adverse-decision explanation within 30 days, human review, 3-year records. AG rules pending |
| NYC Local Law 144 | Hiring or promotion tools used on NYC candidates or employees: annual independent bias audit, public summary, 10-business-day notice |
| NIST AI RMF 1.0 + Generative AI Profile (AI 600-1) | Voluntary. Govern, Map, Measure, Manage, plus the relevant GenAI risk categories |
| ISO/IEC 42001:2023 | Voluntary. Clause and Annex A references only, since the standard text is copyrighted |

## Design decisions

- **Rules, not model judgment.** Applicability, risk tier and decision come from explicit rules in [`src/engine.js`](src/engine.js). The same answers always give the same result, every finding cites its source, and the logic can be tested. An LLM is planned only for the next step: mapping a company's own policies to the generated controls.
- **"Not sure yet" is a valid answer.** It sends the intake back with a list of open questions, as a real intake forum would, instead of guessing.
- **Only relevant questions appear.** Around 30 questions in total; follow-ups (bias testing, appeal process, NYC hiring tools, vendor training terms) appear only when earlier answers make them relevant.
- **Controls in the NIST SP 800-53 format.** Each control has an ID, a control statement with `[Assignment: organization-defined …]` parameters, a discussion and related controls, and is based on a named 800-53 control. Where 800-53 has no equivalent (human oversight, AI transparency, bias audits) the control is marked as an AI-specific extension. NIST's AI overlays for 800-53 are still in draft.
- **No backend.** Static site on GitHub Pages; state is kept in the browser's local storage.

## Test set

The eight example use cases double as a labelled test set: each has an expected risk tier, decision and set of frameworks in scope.

```
node tests/evals.mjs
```

Current result: **8/8** match. The labels were written alongside the rules, so this checks that the rules do what was intended. It does not show they are correct in general; independent cases from reviewers are the next step.

| Example | Tier | Decision |
|---|---|---|
| Customer support chatbot | Medium | Approve with conditions |
| Resume screening (NYC, Colorado) | High | Approve with conditions |
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

## License

MIT
