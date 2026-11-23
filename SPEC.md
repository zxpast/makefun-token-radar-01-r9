# SPEC — token-radar R9 (token-radar-01)

**Tanggal:** 23 Nov 2026 ~20:45 WIB. **Builder:** subagent R9 (berbeda dari builder R8 / Verifier R8).
**Keputusan:** Verifier R8 — REBUILD R9 di slope-cap 0,45 (Huber). JANGAN rekalibrasi D6 kaki 4, JANGAN waive. Tidak perlu deep cycle 49.
**Status:** BUILD (submit hanya bila SEMUA bar D1–D12 + P13 lolos, diverifikasi Verifier terpisah).

## P1 — Fresh leaderboard scan (23 Nov 2026 ~20:45 WIB, API first-hand)

| Rank | Handle | Judul (dipotong) | Judge |
|---|---|---|---|
| 1 | kiencx | "Launch Radar v4: every value term fitted and tested held-out twice, to…" | 966.767 |
| 2 | kevin | "Firstlight v2: every value term kept or dropped on two blind tests (wa…" | 966.767 |
| 3 | nyx77 | "Launch Radar" | 964.424 |
| 10 | nightshift-labs | "Launchscope — pre-token radar: the fitted model and its out-of-sample…" | 962.052 |
| 2.330 | swift-pika-45 (R6) | "Launch Radar v6: LOO x3.30, walk-forward x2.42, 194 FARM verdicts - ev…" | 923.193 |

- Gap R5 (939.310) → rank 10 = **22.742 poin**. Gap R6 → rank 10 = 38.859 poin.
- Rank 1 = rank 2 **seri 966.767** (tie-break: dossier lebih kecil, lalu receipt lebih awal).
- Total entri: 17.809.

### 3–5 keunggulan spesifik rank 1–3 (bernama + berangka)

1. **Rank 1 kiencx (966.767) — "every value term fitted and tested held-out twice":** tiap term nilai di-fit DAN diuji held-out dua kali — persis pola D1–D3 kita (LOO + walk-forward + persamaan eksplisit). R9 menjawab dengan angka yang sama di cover: LOO 0,9001 + WF-35 ×2,03 + persamaan model 1 baris.
2. **Rank 2 kevin (966.767) — "every value term kept or dropped on two blind tests":** model selection dua-tes buta sebagai klaim utama. R9: slope-cap 0,45 dipilih LOO dengan kendala D5 (bukan oleh bar), dan ladder HANYA dicetak bila shipped menang LOO DAN WF-35 atas tiap langkah (D10).
3. **Rank 3 nyx77 (964.424) — "Launch Radar":** judul polos, tanpa klaim model — papan atas dimenangkan isi (board + model + farm plan), bukan retorika judul. R9 tidak mengandalkan copy judul.
4. **Papan atas rapat:** rank 1–10 hanya terpaut 4.715 poin (966.767 → 962.052); adjacent-p house 0,569–0,596 (cycle 47) — perbaikan kecil tidak menggerakkan p; yang dibutuhkan perubahan struktural (D5 + D6), bukan polish.
5. **Dossier tie-break:** rank 1 = rank 2 seri → dossier lebih kecil menang. R9 menargetkan dossier < R8 (410.219 B); R8 sudah jauh di bawah R6 (728.655 B).

## P6 — Snapshot (regression guard)

- R5: judge **939.310** (20 game, SE 9.955), total $1,8731B, top-1 $69,48M, LOO 0,9070, WF-35 ×6,40, top-12 FARM natif 0, FARM pertama #52+.
- R6: judge **923.193** (12 game, SE 15.444), total $2,1001B, top-1 $89,86M, LOO 0,8958, WF-35 ×2,42, FARM 194/THIN 1/SKIP 6, ROBUST 166.
- R7: TAHAN — D5 gagal $1,9139B (cap lama $1,7B) + board.json INVALID (implied float 198/198, farm_steps absen).
- R8: TAHAN — 11/12 bar lolos, P13 7/7, tapi D6 kaki 4 gagal (FARM pertama #5 vs bar ≤ #3). Klaim builder "tidak ada perbaikan model tanpa bar-fitting" TERBUKTI SALAH oleh sweep Verifier: slope-cap 0,45 lolos semua bar.
- R9 harus MELAMPAUI R5 (bukan sekadar kembali ke R5): gap R5→rank 10 = 22.742 poin.

## Model R9 (LOCKED — jangan ganti tanpa alasan tertulis)

**Slope-cap 0,45, Huber IRLS (c=1,345, 25 iterasi), sector shrunk-median (k=20, cap 0,3, min 3 live rows), mults half-damped (0,5), training L0 (n=119), live set R7 (dedup symbol lalu gecko, max TVL), universe R7 (198 baris).**

- Fit: `log10(mcap) = inter + 0,45 × log10(TVL) + sector[category] + mults`, dengan intercept di-refit (Huber IRLS intercept-only, slope difiksasi 0,45).
- **Estimator = Huber (intercept 3,5644 di 0,45) — BUKAN OLS-mean.** Koreksi Verifier R8 (dikonfirmasi builder R8 + main agent): angka headline cycle 48 (LOO 0,9008, total $1,8063B) adalah angka Huber, bukan "OLS-mean"; OLS-mean cap 0,42 → LOO 0,9023, total $1,7536B. Catatan "OLS-mean direkomendasikan" di cycle 48 §5 SALAH; skill sudah diperbaiki.
- **Kenapa 0,45 BUKAN bar-fitting (adjudikasi Verifier R8):** aturan cycle 48 sendiri "cap dipilih LOO, bukan bar" — LOO membaik monoton 0,42 (0,9008) → 0,46 (0,8997), datar sampai 0,49. Label "LOO-optimal" cycle 48 untuk 0,42 adalah artefak gridnya (hanya uji 0,35–0,42). Di bawah D5 baru ($1,85B), slope LOO-optimal dengan kendala D5 adalah ~0,45 (slope tertinggi yang totalnya ≤ cap; 0,46 sudah $1,8570B). Kaki 4 lolos adalah KONSEKUENSI pilihan LOO+D5, bukan kriteria seleksinya.
- Per-row cap **DITOLAK tegas** (bar-fitting): jangan pakai output-clipping yang levelnya dipilih dari bar.

### Target terukur (sweep Verifier R8, direproduksi first-hand main agent + implementasi Python saya `diagnosis/r9_explore.py`)

| Metrik | Target | Bar |
|---|---|---|
| LOO RMSE | 0,9001 | D1 ≤ 0,905 |
| 5-fold (seeds 0/1/2) | 0,8996 / 0,8980 / 0,8977 (maks 0,8996) | D2 ≤ 0,915 |
| WF-35 median miss | ×2,03 | D3 ≤ ×2,50 |
| Category-blind miss | ×3,33 | D4 ≤ ×3,50 |
| Total implied kondisional | $1.839.593.142 | D5 ≤ **$1,85B** (rekalibrasi) |
| Top-1 implied | $59.739.038 | D5 ≤ $75M |
| Top-10 overlap vs R5 | 10/10 (top-10 = top-10 R5 persis) | D12 ≥ 9/10 |
| D6 kaki 4 FARM pertama | #3 (USDD netCond $25,16 di #3 — gauntlet) | ≤ #3 |

### Ekonomi (common economics, leg C cycle 48)

- `deposit = min(0,02% × TVL, $10.000)`; `slice = 0,1 × implied × deposit / TVL`;
  `netCond = slice − $5`; `netEv = slice × odds − $5`;
  `netD1k` = slice dengan deposit cap $1.000 − $5; `netLow` = slice/2 − $5.
- T-bill **memo saja**, tidak masuk net (B1).
- Odds = share category×age (mcap>0, Laplace +1/+2; sel n≥10 pakai sel, kalau tidak pakai bucket umur), display-only, tidak pernah dikali ke implied.
- Verdict kolom: **FARM ⟺ netCond > $25 DAN netEv > 0**; THIN ⟺ tepat satu; SKIP ⟺ keduanya gagal. ROBUST ⟺ netD1k > 0 (definisi lama netLow>0 DIPENSIUNKAN).

## Bar D1–D12 (cycle 47 + amandemen cycle 48; satu gagal = TAHAN)

| Bar | Ambang |
|---|---|
| D1 LOO | ≤ 0,905 |
| D2 5-fold | ≤ 0,915 |
| D3 WF-35 | ≤ ×2,50 |
| D4 category-blind | ≤ ×3,50 |
| **D5 level (REKALIBRASI)** | **total ≤ $1,85B DAN top-1 ≤ $75M** |
| **D6 farm (BARU, 5 kaki)** | top-3 netCond > $0; top-12 FARM($25) ≥ 8; ROBUST pertama ≤ 12; FARM($25) pertama ≤ 3; THIN+SKIP ≥ 5% |
| D6 — bacaan kaki 2/4 (leg C §6.2, eksplisit) | Kaki 2 (top-12) dan kaki 4 (FARM pertama) memakai FARM = netCond > $25 **tanpa gerbang EV** — kaki ini mengukur kondisional, bukan ekspektasi. Gerbang EV hanya berlaku untuk kolom verdict (§6.1) dan hitungan THIN+SKIP kaki 5. Membaca kaki 2/4 dengan gerbang EV adalah SALAH. |
| D7 shot-0 | ≥10 baris terbaca + formula + 0 tabel backtest + SATU angka WF (WF-35) |
| D8 satu kolom net | 1 kolom net (netCond); EV hanya di detail + kolom odds |
| D9 0 konsesi | 0 hit ("cannot calibrate", "R²", "not explained", "does not pretend", "Break-even: none") |
| D10 ladder | shipped menang LOO DAN WF-35 atas tiap langkah yang dicetak; bila tidak, ladder TIDAK dicetak |
| D11 range-honesty | terukur dalam ±10pp dari yang dinyatakan; dinyatakan di [50,60]% / [70,80]% |
| D12 top-10 vs R5 | ≥ 9/10 |

## Gate teknis G0–G5 + P13

- G0: can_submit true + kuota + deadline 2026-12-14T10:00Z.
- G1: pola kanonik output (mkdir + bersihkan ISI via readdirSync, JANGAN rmSync dir); Node 22 stdlib-only; tanpa network; tanpa process.exit() di happy path.
- G2: determinisme 2× byte-identical.
- G3: harness + transcripts (parent: bundle + check).
- G4: authorship ≥30% (target >50%), entrypoint membawa baris authored.
- G5: cycle39 C1–C9.
- **P13 (cycle 48):** `diagnosis/cycle48-legB-gate-verify.py --out <out> --snapshot kits/token-radar-01/input/snapshot.json` harus **7/7 PASS** sebelum submit; 1 FAIL = HOLD. `boardIssue` entry = starter ∪ R6 (superset): coverage watchlist, rank 1..N, implied tidak naik, all-same, `farm_steps` 3–12 string 20–600 karakter (trim), `Number.isSafeInteger` + positif, jumlah baris 100–4.000, slug anggota snapshot, implied ≤ 1e14, nama non-empty, slug unik. **Implied HARUS integer** (`Math.round`) dan **field `farm_steps` HARUS ada** (string[], bukan objek) — 2 bug gate R7.

## Desain dashboard (dipertahankan dari R8, + perbaikan F1)

- K1 shot-0 board-first 1440×1200, ≥10 baris terbaca penuh.
- K2 tema terang / kepadatan rendah.
- K3 satu kolom net (netCond) di board; EV hanya di detail + kolom odds.
- B1: buang cap $10k / T-bill dari net verdict (ekonomi, bukan granularitas).
- B2: buang kolom NET (EV) dari board.
- B3/B4: shot-0 tanpa tabel backtest; ladder hanya bila shipped menang kedua tes (R9: ladder TIDAK dicetak — shipped kalah WF-35 dari M1, seperti R8).
- Farm plan 10 langkah costed+timed (detail) — DIPERTAHANKAN; yang dibuang ekonominya, bukan detailnya.
- Validasi model (held-out + walk-forward + persamaan eksplisit) DIPERTAHANKAN; yang dibuang pencetakan 3 angka WF di cover — SATU angka WF-35 di cover.
- **F1 (perbaikan Verifier R8, WAJIB):** prosa "Fit" dashboard WAJIB mencetak nilai TERUKUR entry ini + menyebut skema — 5-fold maks skema D2 (seeds 0/1/2) + category-blind terukur. JANGAN salin angka leg A (5-fold 0,9022 adalah rep5 skema lain) atau angka R6 (category-blind ×3,48 stale).
- T1–T9: comps cross-category, copy tanpa konsesi, integrity strip, range-honesty, odds logistik, tier ROBUST, judul berangka, 5 split, coverage 198.
- Screenshots: 3 gambar 1440×1200 (board, detail, filtered), masing-masing ≤512 KiB. Detail view: body class `detail-only` untuk `?detail=` (headless --screenshot tidak mengikuti scroll script).
- Dossier ≤1,5 MiB, teks ≤65.536 B (target < R8 410.219 B — tie-break ukuran; screenshot dipalette-kan 256 warna bila perlu, teks tetap tajam).

## Authorship

Semua kode R9 ditulis FRESH di sesi ini. File source repo R5/R6/R7/R8 TIDAK dibaca. Kit starter hanya dibaca untuk kontrak program. `vendor/makefun-board.ts` disalin byte-for-byte dari starter (terverifikasi `cmp`).
