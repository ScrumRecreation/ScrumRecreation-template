# Repository Copilot Instructions

## BrickBreaker spec implementation
- When a request is to implement or modify BrickBreaker based on a spec, invoke the custom agent `brickbreaker`.
- Do not implement BrickBreaker spec tasks with the default agent flow unless the user explicitly asks not to use subagents.

## Ambiguous spec handling
- If the spec has any ambiguity and AI補完 is used, create an assumption note under `Specs/Assumptions/` in the same turn.
- Include these fields in the final report:
  - AIによる補完
  - 理由
  - Assumptions記録先

## Verification
- After edits, run a practical verification (errors check and runtime check when possible) and report results.
