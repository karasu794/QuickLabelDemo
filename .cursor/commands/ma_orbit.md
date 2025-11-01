# ma_orbit — Multi-Agent Orbit Loop

## Goal
Orchestrate one AI-driven development orbit:
Router → Agents → Artifact collection → Evaluation → Apply winner → Next prompt.

## Preconditions
- API keys configured in Cursor settings
- model_prefs.json, lane_styles.md, delta_schema.md present
- artifacts/index.json exists
- approval.mode set: human | auto

## Variables
MAX_LANES=4
PROTECT=guardrails/paths_protect.json
LOCKS=guardrails/locks.json
BUDGET=budget/config.json
MODEL_PREFS=config/model_prefs.json
EVAL_SPEC=specs/eval_criteria.md

## Inputs
- Natural language task description
- Context paths if necessary

## Steps

### 1) Router: plan lanes
Ask Router agent with JSON:

{
"task": "<task>",
"context": {
"paths": <paths>,
"model_prefs": "config/model_prefs.json",
"constraints": ["no destructive ops"],
"locks": "guardrails/locks.json",
"budget": "budget/config.json"
},
"notes": "lanes=1..4, avoid overlap, allow 5-15% explore"
}


Expect output: { lanes, lane_prompts, targets, explore }

### 2) Spawn lanes
For each lane in lane_prompts:
- New Agent
- Provide:
  - style (A/B/C/D)
  - model
  - targets
  - guardrails (PROTECT, LOCKS)
  - spec template + GEN_RULES

Instruct:  
**“Produce JSON plan & diffs only via SpecWriter or diagnostics via LogDoctor/RateRecon”**

### 3) Collect artifacts
For each lane store:
- diff → artifacts/diff_laneN.patch
- delta.csv (if exists) → artifacts/delta_laneN.csv
- logs → artifacts/log_laneN.log

Update artifacts/index.json with paths.

### 4) Evaluator
Call Evaluator with:



{
"artifacts_index": "artifacts/index.json",
"eval_spec": "specs/eval_criteria.md"
}


Expect:  
{ candidates, winner_lane, winner_diff, next_prompt, destructive_actions }

### 5) Approval
If destructive_actions.length > 0 AND approval.mode=human:
- Show diff & required snippet from approvals/snippets.md
- Wait for ✅ or ❌

If approval.mode=auto:
- Apply to branch `auto/destructive/<timestamp>` only
- Do not apply to main automatically

### 6) Apply winner
`git apply artifacts/diff_laneX.patch`  
Commit: `feat: orbit apply laneX (ma_orbit)`  

Save run metadata:
`runs/<timestamp>/run.json`
- prompt_hash
- lane styles / models
- thresholds
- fixtures
- next_prompt

### 7) Next iteration
If next_prompt present:
- Optionally re-run ma_orbit with next_prompt

### 8) Budget guard
If cost/time exceeds BUDGET → abort → append to runbooks/failures.md

## Exit Criteria
- Winner diff applied (or stored in branch for review)
- eval.json updated
- artifacts/index.json updated
- run record saved
- If next_prompt exists → ready to orbit again

## Artifacts
- artifacts/index.json
- artifacts/eval.json
- artifacts/diff_lane*.patch
- artifacts/delta_lane*.csv
- artifacts/log_lane*.log
- runs/<timestamp>/run.json

## Notes
- Prioritize minimal risk, observability, convergence
- Prefer additive and reversible changes
- Never remove files without @deprecated step
- Logs + trace lineages required for correctness

## Exit
- If human approval pending → stop
- Else return “orbit complete”
