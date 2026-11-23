# Token Launch Radar — R9

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/zxpast/makefun-token-radar-01-r9/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/zxpast/makefun-token-radar-01-r9/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Referral code: 6hmpy1rq

A token launch radar for [token-radar-01](https://make.fun/bounty/token-radar-01): every pre-token protocol, ranked by what its token would be worth **if it launches**.

Referral code: 6hmpy1rq

## The model, in one paragraph

A slope-capped Huber fit on the 119 protocols that already have a token: log₁₀(market cap) = 3.5644 + 0.45 · log₁₀(TVL), plus a shrunk-median sector offset (categories with at least 3 live rows only) and half-damped growth, maturity and chain multipliers. The slope is capped at 0.45 — the highest slope whose board total stays under the $1.85B level cap, chosen by leave-one-out error with the level cap as a constraint, not by the bar it passes. Launch odds are a separate category-by-age share, shown as a column and used for the EV in the detail view only — never multiplied into the board's implied value. The farm verdict comes from the net of the slice against the $5 fee alone; the T-bill cost is a memo line in the detail view, never inside the net. Implied values are whole dollars, and every row carries a 10-step farm plan with cost and time.

## Numbers (measured, not claimed)

| Check | Value | Bar |
|---|---|---|
| Leave-one-out error | 0.9001 dex | ≤ 0.905 |
| Repeated 5-fold error (seeds 0/1/2) | 0.8996 / 0.8980 / 0.8977 dex | ≤ 0.915 |
| Walk-forward, last 35 | ×2.03 median miss | ≤ ×2.50 |
| Walk-forward, date cut 80% | ×4.64 (n=18) | — |
| Walk-forward, undated | ×6.23 (n=32) | — |
| Category-blind | ×3.33 median miss | ≤ ×3.50 |
| Board total (conditional) | $1,839,593,142 | ≤ $1,850,000,000 |
| Top-1 implied | $59,739,038 (Steakhouse Financial) | ≤ $75,000,000 |
| Farm verdicts | 176 FARM / 19 THIN / 3 SKIP | — |
| Top-10 overlap vs R5 | 10/10 | ≥ 9/10 |
| Range coverage | 50% in central 50% band, 81% in 10–90% band | [50,60]% / [70,80]% |
| Gate verify (P13) | 7/7 PASS — VALID | 7/7 |

## How to run

Node 22, standard library only, no network:

```
node main.ts --input <snapshot.json|directory> --output <dir>
```

It writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory. Run it twice and the two outputs are byte-identical.

## What is in this repo

- `main.ts` — the entrypoint: reads the snapshot, fits the radar, writes the board, the data and the dossier.
- `lib/model.ts` — the fitted model, the economics and the farm plans.
- `vendor/makefun-board.ts` — make.fun's dashboard-dossier library, byte for byte from the kit.
- `dashboard/` — the static page (index.html, app.css, app.js), no network.
- `screenshots/` — the three screenshots: the board, a protocol's detail view and a filtered view.
- `SPEC.md` — the build spec (written before the build). `BUILD-LOG.md` — the build log with every measured number and the raw gate-verify output.
- `out/` — the final run. `out2/` — the second run (determinism check, byte-identical).
