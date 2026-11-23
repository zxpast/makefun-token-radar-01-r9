# BUILD-LOG — token-radar R9 (token-radar-01)

**Tanggal:** 23 Nov 2026 ~20:37–21:15 WIB. **Builder:** subagent R9 (berbeda dari builder R8 / Verifier R8).
**Keputusan:** Verifier R8 — REBUILD R9 di slope-cap 0,45 (Huber). JANGAN rekalibrasi D6 kaki 4, JANGAN waive. Tidak perlu deep cycle 49.
**Status:** BUILD SELESAI — **SEMUA bar D1–D12 LOLOS + P13 7/7 PASS**. Menunggu Verifier terpisah + parent (bundle + submit). **JANGAN submit dari sini.**

## Yang diubah dari R8 (HANYA ini)

1. **Slope-cap 0,42 → 0,45** (Huber, dikunci di SPEC.md). Estimator tetap Huber — BUKAN OLS-mean (koreksi Verifier R8: angka headline cycle 48 adalah angka Huber).
2. **Perbaikan F1 (Verifier R8):** prosa "Fit" dashboard mencetak nilai TERUKUR entry ini + menyebut skema — 5-fold maks skema D2 (seeds 0/1/2) + category-blind terukur. Angka leg A (0,9022) dan angka R6 (×3,48) TIDAK dipakai.
3. **Perbaikan tampilan (ditemukan sendiri saat verifikasi screenshot):**
   - Kolom 7d menampilkan `change_7d × 100` — SALAH. `change_7d` sudah dalam persen (komentar kit starter: "clamp(change_7d, -60, 120) per cent"; snapshot -72,7 s/d +4448,5). Sekarang ditampilkan apa adanya (+2,4%, -8,3%). Model tidak terpengaruh (mults sudah memakai persen).
   - Shot-0 hanya 7 baris terbaca penuh → baris board dibuat satu baris (nama + umur inline) + kompresi vertikal masthead/Fit/kontrol → **14 baris terbaca penuh**.
   - Detail view terpotong di comps → kompresi padding detail → comps penuh dalam 1200px.
4. **Lainnya dipertahankan dari R8:** implied integer + farm_steps string 10 langkah + boardIssue mirror starter ∪ R6 + farm plan 10 langkah + validasi + 1 angka WF di cover + 1 kolom net + board 198 baris + watchlist 40/40.

## Model (LOCKED)

`log10(mcap) = 3.5644 + 0.45 × log10(TVL) + sector[category] + mults`, Huber IRLS (c=1.345, 25 iterasi), sector shrunk-median (k=20, cap 0,3, min 3 live rows), mults half-damped (0,5), training L0 (n=119), universe R7 (198 baris). Kenapa 0,45 bukan bar-fitting: LOO membaik monoton 0,42 (0,9008) → 0,46 (0,8997); 0,45 adalah slope tertinggi yang totalnya ≤ $1,85B (0,46 sudah $1,8570B). Kaki 4 lolos adalah konsekuensi pilihan LOO+D5, bukan kriteria seleksinya.

## D1–D12 (semua diukur ulang independen di Python, `diagnosis/r9_verify.py`, definisi kanonik `r8_verify.py`)

| Bar | Hasil | Ambang | Status |
|---|---|---|---|
| D1 LOO RMSE | 0,9001 | ≤ 0,905 | PASS |
| D2 5-fold maks | 0,8996 (seeds 0,8996 / 0,8980 / 0,8977) | ≤ 0,915 | PASS |
| D3 WF-35 | ×2,03 | ≤ ×2,50 | PASS |
| D4 category-blind | ×3,33 | ≤ ×3,50 | PASS |
| D5 total | $1.839.593.142 | ≤ $1,85B | PASS |
| D5 top-1 | $59.739.038 (Steakhouse Financial) | ≤ $75M | PASS |
| D6 kaki 1 top-3 netCond | +$16,69 / +$16,12 / +$25,16 (semua > $0) | > $0 | PASS |
| D6 kaki 2 top-12 FARM($25) | 9 | ≥ 8 | PASS |
| D6 kaki 3 ROBUST pertama | #6 | ≤ 12 | PASS |
| D6 kaki 4 FARM($25) pertama | #3 (Gauntlet, netCond $25,16) | ≤ 3 | PASS |
| D6 kaki 5 THIN+SKIP | 22 (11,1%) | ≥ 5% | PASS |
| D7 shot-0 | 14 baris + formula + 0 tabel backtest + 1 angka WF (×2,03) | ≥10 baris | PASS |
| D8 satu kolom net | 1 kolom net (netCond); netEv hanya di detail | 1 | PASS |
| D9 0 konsesi | 0 hit di dossier + dashboard | 0 | PASS |
| D10 ladder | TIDAK dicetak — shipped menang WF-35 (×2,03 vs ×2,21) tapi KALAH LOO (0,9001 vs 0,8960 M2 / 0,8983 M1); tidak menang keduanya → ladder tidak dicetak (benar) | — | PASS |
| D11 range-honesty | P25–P75 50% (dinyatakan [50,60]%), P10–P90 81% (dinyatakan [70,80]%) | ±10pp | PASS |
| D12 top-10 vs R5 | 10/10 | ≥ 9/10 | PASS |

**D6 dibaca dengan benar (leg C §6.2):** kaki 2 dan 4 memakai FARM = netCond > $25 TANPA gerbang EV. Gerbang EV hanya untuk kolom verdict + kaki 5. (Pembacaan dengan gerbang EV akan memberi kaki 2 = 7 — salah.)

## Metrik dev

- LOO median miss (upper) ×3,32; WF-dat ×4,64 (n=18); WF-null24 ×6,23 (n=32).
- Verdict: FARM 176 / THIN 19 / SKIP 3; ROBUST 192; median netCond +$105,47.
- Board 198 baris; watchlist 40/40; top-10 = top-10 R5 persis (steakhouse, sentora, gauntlet, veda, usdd, upshift, polymarket-international, nonce-capital, onre, bittensor-dtao).
- TS vs Python implied: **0 mismatch / 198 baris** (intercept TS = Python = 3,5644).
- Dossier 1.083.043 B (< 1,5 MiB), teks 24.366 B (< 65.536 B, tanpa cut — seluruh source dashboard muat). Tie-break: lebih kecil dari R8 (410.219 B) dan R6 (728.655 B).

## P13 — gate-verify independen 7/7 (output mentah)

Skrip: `diagnosis/cycle48-legB-gate-verify.py --out out --snapshot kits/token-radar-01/input/snapshot.json`. Dijalankan 2× (sebelum dan sesudah finalisasi screenshot), keduanya 7/7 PASS, exit 0.

```
GATE VERIFY  out=out
row                status detail
dashboard_files    PASS   3 files, 24099 B; index.html + .css + .js present; no http(s):// in forbidden places
board_file         PASS   198 rows, 509857 B; all slugs in snapshot, names/ranks/implied whole+positive
sorted_by_value    PASS   ranks 1..198 unique; implied non-rising by rank
coverage           PASS   watchlist 40/40
farm_steps         PASS   all 198 rows: 3-12 steps, each 20-600 chars trimmed
screenshots        PASS   3 images, each <=512 KiB, PNG/JPEG whole, long<=1440 short>=800
dossier_matches    PASS   dossier.json byte-identical to buildDossier rebuild, 1082906 B <= 1.5 MiB, text <= 65,536 B
TOTAL 7/7 PASS — VALID (all 7 gate rows pass)
```

## Teknis (G0–G5 + determinisme)

- G0: can_submit dicek parent saat submit (kuota harian reset 07:00 WIB; deadline 2026-12-14T10:00Z).
- G1: Node 22 stdlib-only; tanpa network; output dir dikosongkan isinya (mkdir + readdirSync + rmSync per entri — JANGAN rmSync dir, mount grader); tanpa process.exit() di happy path (exit 2 snapshot hilang, exit 1 board invalid).
- G2: determinisme 2× byte-identical (`diff -r out out2`, kosong).
- G3: harness + transcripts — parent (bundle + check).
- G4: authorship — semua kode ditulis FRESH di sesi ini; file source R5/R6/R7/R8 TIDAK dibaca. Kit starter hanya dibaca untuk kontrak program. `vendor/makefun-board.ts` disalin byte-for-byte dari starter (terverifikasi `cmp`).
- G5: cycle39 C1–C9 — dijalankan setelah push (butuh git repo); hasil di bawah (diisi setelah push).
- Screenshots: 3× 1440×1200 PNG (1-board 302.594 B, 2-detail 193.421 B, 3-filtered 297.002 B), semua ≤512 KiB, diambil headless Chrome dari `out/dashboard/` yang sudah di-render.

## P1 — fresh scan (23 Nov ~20:45 WIB, API)

Rank 1 kiencx 966.767; rank 2 kevin 966.767; rank 3 nyx77 964.424; rank 10 nightshift-labs 962.052; R6 rank 2.330/17.809 judge 923.193. Gap R5 (939.310) → rank 10 = 22.742 poin.

## Bug yang ditemukan selama build (dicatat agar tidak terulang)

1. **Bug parseSnapshot (mcap_usd hilang):** `parseSnapshot` di `lib/model.ts` lupa memetakan field `mcap_usd` → board kosong (0 baris, crash di `board[0]`). Ditemukan lewat debug node langsung (preToken 0/758). Perbaikan: tambah baris `mcap_usd` di mapping. Pelajaran: setelah menulis parser, langsung uji hitung live/universe sebelum lanjut.
2. **Bug tampil 7d (×100):** `change_7d` sudah persen; dashboard mengalikan 100 → -829% yang mustahil. Ditemukan dari screenshot (mata) — bukan dari angka model. Perbaikan: tampilkan apa adanya, 1 desimal.
3. **Definisi verifikasi (bukan bug entry):** `r9_verify.py` v1 salah definisi D2 (split pakai indeks asli, shuffle tidak berpengaruh → 0,8994×3), D3 (train = semua kecuali 35 → ×2,16), D4 (refit tanpa sector + in-sample → ×3,29), D11 (band ±zσ → 55%/84%). Definisi kanonik ada di `r8_verify.py` (D2: posisi mod 5; D3: train 35 tertua, test 35 terbaru; D4: LOO tanpa sector di prediksi, upper median; D11: kuantil residual LOO). Setelah diperbaiki, semua angka cocok dengan target sweep Verifier (D2 0,8996, D3 ×2,03, D4 ×3,33, D11 50%/81%). Pelajaran: definisi bar HARUS diambil dari skrip verifier sebelumnya, bukan ditulis ulang dari ingatan.

## File

- `SPEC.md` (ditulis SEBELUM build, P1) — model, bar, desain, P13.
- `main.ts` + `lib/model.ts` + `vendor/makefun-board.ts` (byte-for-byte dari starter).
- `dashboard/index.html` + `dashboard/app.css` + `dashboard/app.js` (24.099 B total).
- `screenshots/1-board.png`, `2-detail.png`, `3-filtered.png`.
- `out/` (hasil run final) + `out2/` (run determinisme ke-2, byte-identik).
- Verifikasi: `diagnosis/r9_verify.py` + `diagnosis/r9_explore.py` (model math, pre-build).
