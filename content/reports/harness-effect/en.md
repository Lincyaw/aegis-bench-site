---
title: "How the harness moves coding scores"
date: "2026-09-12"
summary: "The same model under different harnesses differs by more than ten points of pass rate on Bench A."
models: ["jia", "yi"]
benchmarks: ["bench-a"]
---

> This is a sample report in a design demo; its models and figures are placeholders.

## Question

A harness decides which tools a model has, what context it sees and how many turns it gets. If the harness moves the score, a leaderboard compares more than models.

## Method

We held the task set, the turn budget and the execution environment fixed, changed only the harness, and compared each model's pass rate on Bench A.

| Model | Harness X | Harness Y | Difference |
| --- | --- | --- | --- |
| Model Alpha | 72.4% | 60.2% | 12.2 |
| Model Beta | 68.1% | 51.3% | 16.8 |

## Findings

- The harness moves scores about as much as the choice of model does.
- That is why the leaderboard ranks model × harness combinations, not models alone.
- Every run's trajectory is public, so a reader can set one task's runs under the two harnesses side by side and see at which step they part.
