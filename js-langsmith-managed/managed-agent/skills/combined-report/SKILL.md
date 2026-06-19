---
name: combined-report
description: Use this skill whenever you combine results from more than one subagent (for example the researcher and math-whiz subagents) into a single final answer. It defines the labeled report format the coordinator must follow.
---

# Combined report

## Overview

This skill standardizes how the coordinator presents a final answer that pulls
together work from multiple subagents. Use it after the subagents respond, when
you are ready to write the reply the user sees.

## When to use

- A request triggered two or more subagents (such as `researcher` and
  `math-whiz`).
- You need to merge their separate outputs into one clear, scannable answer.

If only a single subagent ran, a short direct answer is fine and you do not need
this skill.

## Instructions

1. Read the template in `templates/report.md`. It is the canonical structure for
   the final answer.
2. Fill in each section using the subagent outputs:
   - **Summary**: one sentence that answers the user's overall request.
   - **Research**: the researcher subagent's findings, condensed to 2-3
     sentences. Omit this section if the researcher did not run.
   - **Calculation**: the math-whiz subagent's result, stated as
     `expression = result`. Omit this section if math-whiz did not run.
3. Keep section headers exactly as written in the template so the output stays
   consistent across runs.
4. Do not invent results. Only report what the subagents actually returned.

## Supporting files

- `templates/report.md` — the markdown skeleton to copy and fill in.
