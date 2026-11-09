// Runs the engine against the labelled example use cases and reports agreement.
// Usage: node tests/evals.mjs
import { assess, FRAMEWORKS } from "../src/engine.js";
import { EXAMPLES } from "../src/data/examples.js";

// Regulations are always checked; of the voluntary standards, only the defaults are switched on.
const enabled = FRAMEWORKS.filter((f) => f.defaultOn).map((f) => f.id);
let pass = 0;
const rows = [];
for (const ex of EXAMPLES) {
  const r = assess(ex.answers, enabled);
  const inScope = Object.entries(r.applicability).filter(([, v]) => v.status === "in_scope").map(([k]) => k).sort();
  const exp = [...ex.expected.inScope].sort();
  const checks = {
    tier: r.tier.tier === ex.expected.tier,
    decision: r.decision.code === ex.expected.decision,
    scope: JSON.stringify(inScope) === JSON.stringify(exp),
  };
  const ok = Object.values(checks).every(Boolean);
  if (ok) pass++;
  rows.push({ id: ex.id, ok, ...checks, got: `${r.tier.tier} / ${r.decision.code} / ${inScope.join(",")}`, controls: r.controls.length, conditions: r.conditions.length });
}
console.table(rows);
console.log(`\n${pass}/${EXAMPLES.length} example use cases match the expected tier, decision and frameworks in scope.`);
process.exit(pass === EXAMPLES.length ? 0 : 1);
