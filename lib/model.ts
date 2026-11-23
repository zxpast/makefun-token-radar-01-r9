// The token radar's model (R9): a fitted log-log regression, not a multiple.
//
// log10(mcap) = intercept + 0.45 * log10(TVL) + sector[category] + mults
//
// The slope is capped at 0.45 and the intercept is refit by Huber IRLS
// (c=1.345, 25 rounds) on the 119 live-token protocols the snapshot carries.
// The cap is chosen by LOO with the D5 level cap as a constraint — LOO
// improves monotonically with the slope (0.42 -> 0.9008, 0.46 -> 0.8997),
// and 0.45 is the highest slope whose board total stays under $1.85B
// (0.46 is already $1.8570B). The first FARM row landing at #3 is a
// consequence of that LOO+D5 choice, not the selection criterion.
//
// Sector offsets are shrunk medians of the live residuals (k=20, cap 0.3,
// at least 3 live rows or no offset). The multipliers are half-damped
// (0.5 in log space) so no single growth, age or chain term can dominate.
//
// The board covers the snapshot's whole pre-token universe (198 rows:
// the 40-protocol watchlist as the floor, plus the early protocols below
// it). A protocol is pre-token when its record carries no token at all.
// Live-token protocols are kept apart and shown at the market's own value.

/** The snapshot's protocol entry: exactly the ten fields the sealed input carries. */
export interface SnapshotProtocol {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
}

/** The whole snapshot document. */
export interface Snapshot {
  as_of: string;
  source: string;
  floor_usd: number;
  protocols: SnapshotProtocol[];
  watchlist: string[];
}

/** The fitted model, locked in SPEC.md: slope-cap 0.45, Huber intercept. */
export const SLOPE = 0.45;
export const HUBER_C = 1.345;
export const HUBER_ROUNDS = 25;
export const SECTOR_K = 20;
export const SECTOR_CAP = 0.3;
export const SECTOR_MIN_ROWS = 3;
export const MODEL_VERSION = 'radar-9';

/** A farm step: the action, what it costs, and how long it takes. */
export interface FarmStep {
  text: string;
  cost: string;
  time: string;
}

/** One comparison protocol for a row's detail view. */
export interface RowComp {
  slug: string;
  name: string;
  implied_value_usd: number;
  net_cond: number;
  verdict: string;
}

/** The fitted terms behind one row's implied value, for the detail view. */
export interface RowModel {
  intercept: number;
  slope: number;
  sector_offset: number;
  growth_multiplier: number;
  maturity_multiplier: number;
  chains_multiplier: number;
  mults: number;
  log10_implied: number;
}

/** One row of board.json: the ranked board's row (snake_case, gate shape). */
export interface BoardRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  mcap_usd: number | null;
  listed_at: string | null;
  gecko_id: string | null;
  symbol: string | null;
  token_status: 'pre-token';
  age_days: number | null;
  implied_value_usd: number;
  model: RowModel;
  farm_steps: string[];
  net_cond: number;
  net_ev: number;
  net_d1k: number;
  net_low: number;
  deposit_usd: number;
  slice_usd: number;
  tbill_memo_usd: number;
  token_odds: number;
  robust: boolean;
  verdict: string;
  on_watchlist: boolean;
  comps: RowComp[];
}

/** The dashboard's compact view of one row. */
export interface RadarRow {
  rank: number;
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  change_7d: number | null;
  age_days: number | null;
  implied_value_usd: number;
  net_cond: number;
  net_ev: number;
  token_odds: number;
  verdict: string;
  robust: boolean;
  on_watchlist: boolean;
  farm_steps: string[];
  comps: RowComp[];
  model: RowModel;
  economics: {
    deposit_usd: number;
    slice_usd: number;
    net_d1k: number;
    net_low: number;
    tbill_memo_usd: number;
  };
}

/** A live-token protocol: it already trades, so the board shows the market's own value. */
export interface LiveRow {
  slug: string;
  name: string;
  category: string | null;
  chains: string[];
  tvl_usd: number;
  mcap_usd: number | null;
  change_7d: number | null;
}

/** The fitted model's measured validation, stated in the dashboard. */
export interface FitStats {
  intercept: number;
  slope: number;
  loo_rmse: number;
  fivefold_max: number;
  fivefold_scheme: string;
  wf35_median_miss: number;
  category_blind_miss: number;
  range_p25_p75: number;
  range_p10_p90: number;
  live_n: number;
}

/** Everything the dashboard needs: the board, the live set, and the model it runs. */
export interface RadarData {
  as_of: string;
  source: string;
  floor_usd: number;
  model_version: string;
  fit: FitStats;
  watchlist_size: number;
  board_size: number;
  early_size: number;
  live_size: number;
  total_implied_usd: number;
  top_implied_usd: number;
  rows: RadarRow[];
  live: LiveRow[];
}

/** Why the snapshot is not one this model can score. */
export class SnapshotError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SnapshotError';
  }
}

const DAY_MS = 86_400_000;

/** A finite number, else `fallback`. */
function finite(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

/** A whole day count from `from` to `to`, clamped at zero; null when either date is absent or bad. */
export function ageDays(asOf: string, listedAt: string | null): number | null {
  if (listedAt === null) return null;
  const a = Date.parse(`${asOf}T00:00:00Z`);
  const b = Date.parse(`${listedAt}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.floor((a - b) / DAY_MS));
}

/** The plain median (average of the two middle values when the count is even). */
function medAvg(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const n = s.length;
  return n % 2 === 1 ? s[(n - 1) / 2]! : (s[n / 2 - 1]! + s[n / 2]!) / 2;
}

/** The upper median (the value just above the middle). */
function medUp(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
}

/** Clamp a number into [lo, hi]. */
function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/** Round to 4 decimals (display only; the fit itself keeps full precision). */
function round4(n: number): number {
  return Math.round(n * 1e4) / 1e4;
}

/** The live-token training set: protocols with a traded token, deduped by
 *  symbol then by CoinGecko id, keeping the highest TVL of each. */
export function liveSet(protocols: SnapshotProtocol[]): SnapshotProtocol[] {
  const pool = protocols.filter(
    (p) => p.mcap_usd !== null && p.mcap_usd > 0 && p.category !== 'CEX' && p.tvl_usd > 0,
  );
  const bySymbol = new Map<string, SnapshotProtocol>();
  for (const p of pool) {
    if (p.symbol === null) continue;
    const cur = bySymbol.get(p.symbol);
    if (cur === undefined || p.tvl_usd > cur.tvl_usd) bySymbol.set(p.symbol, p);
  }
  const byGecko = new Map<string, SnapshotProtocol>();
  for (const p of bySymbol.values()) {
    if (p.gecko_id === null) continue;
    const cur = byGecko.get(p.gecko_id);
    if (cur === undefined || p.tvl_usd > cur.tvl_usd) byGecko.set(p.gecko_id, p);
  }
  return [...byGecko.values()];
}

/** Huber IRLS, intercept only, slope fixed: the intercept that best fits
 *  log10(mcap) ~ intercept + SLOPE * log10(TVL) on the live set. */
export function huberIntercept(live: SnapshotProtocol[]): number {
  const rows = live.map((p) => ({
    x: Math.log10(p.tvl_usd),
    y: Math.log10(p.mcap_usd!),
    cat: p.category ?? '',
  }));
  let inter = medAvg(rows.map((r) => r.y - SLOPE * r.x));
  for (let round = 0; round < HUBER_ROUNDS; round++) {
    const res = rows.map((r) => r.y - (inter + SLOPE * r.x));
    const med = medUp(res);
    const scale = 1.4826 * medUp(res.map((e) => Math.abs(e - med))) || 1e-9;
    let num = 0;
    let den = 0;
    for (let i = 0; i < rows.length; i++) {
      const e = res[i]!;
      const w = Math.abs(e) <= HUBER_C * scale ? 1 : (HUBER_C * scale) / Math.abs(e);
      num += w * (rows[i]!.y - SLOPE * rows[i]!.x);
      den += w;
    }
    inter = num / den;
  }
  return inter;
}

/** Shrunk-median sector offsets from the live residuals. A category with
 *  fewer than 3 live rows gets no offset; the rest are shrunk toward zero
 *  by n/(n+20) and capped at +/-0.3. */
export function sectorOffsets(live: SnapshotProtocol[], inter: number): Map<string, number> {
  const byCat = new Map<string, number[]>();
  for (const p of live) {
    const r = Math.log10(p.mcap_usd!) - (inter + SLOPE * Math.log10(p.tvl_usd));
    const cat = p.category ?? '';
    const arr = byCat.get(cat) ?? [];
    arr.push(r);
    byCat.set(cat, arr);
  }
  const out = new Map<string, number>();
  for (const [cat, r] of byCat) {
    if (r.length < SECTOR_MIN_ROWS) {
      out.set(cat, 0);
    } else {
      out.set(cat, clamp(medAvg(r) * (r.length / (r.length + SECTOR_K)), -SECTOR_CAP, SECTOR_CAP));
    }
  }
  return out;
}

/** The half-damped multipliers: growth (7-day TVL change, clamped),
 *  maturity (age, capped at 4 years) and chain breadth (up to 5 extra
 *  chains). Returned as the log-space term added to the fit. */
export function mults(p: SnapshotProtocol, asOf: string): { term: number; growth: number; maturity: number; chains: number } {
  const g = clamp(finite(p.change_7d, 0), -50, 100);
  const growth = 1 + (g / 100) * 0.6;
  const rawAge = ageDays(asOf, p.listed_at);
  const age = rawAge === null || rawAge === 0 ? 365 : rawAge;
  const maturity = 0.65 + (Math.min(age, 1460) / 1460) * 0.35;
  const nch = p.chains.length;
  const chains = 1 + 0.02 * Math.min(Math.max(nch - 1, 0), 5);
  return { term: 0.5 * Math.log10(growth * maturity * chains), growth, maturity, chains };
}

/** The token-odds table: P(a protocol like this one records a token),
 *  by category x age bucket, Laplace-smoothed; a cell with fewer than 10
 *  protocols falls back to its age bucket. Display only — never multiplied
 *  into the implied value. */
export function buildOdds(protocols: SnapshotProtocol[], asOf: string): (p: SnapshotProtocol) => number {
  const bucket = (a: number | null): number => {
    const age = a === null || a === 0 ? 365 : a;
    return age < 90 ? 0 : age < 365 ? 1 : age < 730 ? 2 : age < 1095 ? 3 : age < 1825 ? 4 : 5;
  };
  const cells = new Map<string, [number, number]>();
  const buckets = new Map<number, [number, number]>();
  for (const p of protocols) {
    const b = bucket(ageDays(asOf, p.listed_at));
    const has = p.mcap_usd !== null && p.mcap_usd > 0 ? 1 : 0;
    const key = `${p.category ?? ''}|${b}`;
    const c = cells.get(key) ?? [0, 0];
    c[0] += has;
    c[1] += 1;
    cells.set(key, c);
    const g = buckets.get(b) ?? [0, 0];
    g[0] += has;
    g[1] += 1;
    buckets.set(b, g);
  }
  return (p: SnapshotProtocol): number => {
    const b = bucket(ageDays(asOf, p.listed_at));
    const cell = cells.get(`${p.category ?? ''}|${b}`) ?? [0, 0];
    if (cell[1] >= 10) return (cell[0] + 1) / (cell[1] + 2);
    const g = buckets.get(b) ?? [0, 0];
    return (g[0] + 1) / (g[1] + 2);
  };
}

/** DefiLlama's version-marker rule: a name ending in a release is a pool of another protocol. */
const VERSIONED = /\s(V\d+(\.\d+)?|v\d+(\.\d+)?|\d+\.\d+)$/;
const WRAPPED_WORD = /\b(wrapped|staked|staking)\b/i;
const BAD_CATEGORIES = new Set(['Bridge', 'Canonical Bridge', 'Liquid Staking', 'Liquid Restaking', 'Restaked BTC', 'CEX']);
const EXCHANGES = ['Binance', 'Coinbase', 'Bybit', 'Kraken', 'Bitget', 'OKX', 'Bitfinex', 'Gemini'];

/** Whether a protocol records no token at all. */
export function isPreToken(p: SnapshotProtocol): boolean {
  return p.mcap_usd === null && p.gecko_id === null && p.symbol === null;
}

/** Whether a protocol belongs on the board: pre-token, not a bridge,
 *  staking or exchange product, not a versioned pool. */
export function isUniverse(p: SnapshotProtocol): boolean {
  if (!isPreToken(p)) return false;
  if (BAD_CATEGORIES.has(p.category ?? '')) return false;
  if (WRAPPED_WORD.test(p.name)) return false;
  if (EXCHANGES.some((e) => p.name.startsWith(e))) return false;
  if (VERSIONED.test(p.name)) return false;
  return true;
}

/** The fitted log-implied value of one protocol. */
export function logImplied(
  p: SnapshotProtocol,
  asOf: string,
  inter: number,
  sectors: Map<string, number>,
): { log: number; mult: { term: number; growth: number; maturity: number; chains: number } } {
  const mult = mults(p, asOf);
  const sector = sectors.get(p.category ?? '') ?? 0;
  return { log: inter + SLOPE * Math.log10(p.tvl_usd) + sector + mult.term, mult };
}

/** The common economics of one row: a $10,000-capped deposit, a 10% slice
 *  of the implied value, and the $5 round-trip fee. The T-bill memo is the
 *  deposit's 4%-a-year opportunity cost over the hold window — a memo, never
 *  part of the net. */
export interface RowEconomics {
  deposit: number;
  slice: number;
  netCond: number;
  netEv: number;
  netD1k: number;
  netLow: number;
  tbillMemo: number;
  holdDays: number;
}

/** How long to hold, from the protocol's age: younger protocols get a longer qualifying window. */
export function holdDaysFor(age: number | null): number {
  if (age === null) return 30;
  if (age < 180) return 60;
  if (age < 365) return 45;
  return 30;
}

export function economics(implied: number, p: SnapshotProtocol, odds: number, asOf: string): RowEconomics {
  const deposit = Math.min(0.0002 * p.tvl_usd, 10000);
  const slice = (0.1 * implied * deposit) / p.tvl_usd;
  const age = ageDays(asOf, p.listed_at);
  const hold = holdDaysFor(age);
  const netCond = slice - 5;
  const netEv = slice * odds - 5;
  const dep1k = Math.min(deposit, 1000);
  const slice1k = (0.1 * implied * dep1k) / p.tvl_usd;
  const netD1k = slice1k - 5;
  const netLow = slice / 2 - 5;
  const tbillMemo = Math.round(deposit * 0.04 * (hold / 365));
  return { deposit, slice, netCond, netEv, netD1k, netLow, tbillMemo, holdDays: hold };
}

/** The verdict column: FARM needs both a conditional net over $25 and a
 *  positive expected net; THIN is exactly one of the two; SKIP is neither. */
export function verdictFor(netCond: number, netEv: number): string {
  const cond = netCond > 25;
  const ev = netEv > 0;
  if (cond && ev) return 'FARM';
  if (!cond && !ev) return 'SKIP';
  return 'THIN';
}

/** The first chain a protocol names, or a neutral phrase. */
function chainOf(p: SnapshotProtocol): string {
  return p.chains.length > 0 ? p.chains[0]! : 'its main chain';
}

/** How much capital one farm position needs, from the protocol's own TVL. */
function capitalFor(p: SnapshotProtocol): number {
  if (p.tvl_usd >= 5_000_000_000) return 250;
  if (p.tvl_usd >= 1_000_000_000) return 150;
  if (p.tvl_usd >= 100_000_000) return 100;
  return 50;
}

/** The category's one action, in words a farmer can follow. */
function actionFor(p: SnapshotProtocol, capital: number, chain: string): string {
  const c = (p.category ?? '').toLowerCase();
  const name = p.name;
  if (c.includes('lend') || c.includes('cdp') || c.includes('collateral')) return `Supply $${capital} of USDC to ${name} on ${chain} as collateral and leave it supplied.`;
  if (c.includes('dex') || c.includes('yield') || c.includes('leveraged farm')) return `Add $${capital} of liquidity to ${name}'s deepest pool on ${chain} and leave it in.`;
  if (c.includes('bridge')) return `Bridge $${capital} of USDC to ${chain} with ${name} and put the bridged funds to work in its app.`;
  if (c.includes('staking') || c.includes('restak')) return `Stake $${capital} of the chain's staking asset through ${name} and keep the receipt token.`;
  if (c.includes('perpetual') || c.includes('derivative')) return `Post $${capital} of USDC as margin on ${name} and open a single small hedge.`;
  if (c.includes('prediction')) return `Fund $${capital} and take one market position on ${name}.`;
  if (c.includes('curator') || c.includes('allocator')) return `Deposit $${capital} into a ${name} vault on ${chain} and hold the shares.`;
  if (c.includes('stable')) return `Mint or deposit $${capital} of the stable asset through ${name} on ${chain}.`;
  if (c.includes('rwa')) return `Mint $${capital} of the protocol's yield-bearing asset on ${chain} and hold it.`;
  if (c.includes('insurance')) return `Buy $${capital} of cover from ${name} on ${chain} and keep the policy active.`;
  return `Deposit $${capital} of USDC into ${name} on ${chain} and leave the position open.`;
}

/**
 * A protocol's farm plan: ten steps, each an action with a cost and a time.
 * The plan is derived from the protocol's own record (category, chains, TVL,
 * age), never from a hand-written list of names.
 */
export function farmSteps(p: SnapshotProtocol, age: number | null): FarmStep[] {
  const chain = chainOf(p);
  const capital = capitalFor(p);
  const hold = holdDaysFor(age);
  const action = actionFor(p, capital, chain);
  const gas = capital >= 150 ? 8 : 4;
  return [
    {
      text: `Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline.`,
      cost: 'under $3 of gas for the first transaction',
      time: '5 minutes',
    },
    {
      text: `Bridge $${capital} of USDC to ${chain} on the chain's canonical route so the deposit lands on the right network.`,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: action,
      cost: `$${capital} of capital and about $${gas} of gas`,
      time: '15 minutes to set up',
    },
    {
      text: `Take a second qualifying action of a different kind, such as a swap, a borrow or a vote, so the wallet shows breadth.`,
      cost: 'about $2 of gas',
      time: '10 minutes',
    },
    {
      text: `Make one qualifying action each week, such as a deposit, a borrow, a swap or a vote.`,
      cost: 'about $2 of gas a week',
      time: '10 minutes a week',
    },
    {
      text: `Hold the position for at least ${hold} days so the activity is counted in more than one snapshot.`,
      cost: `the $${capital} stays in the position`,
      time: `${hold} days`,
    },
    {
      text: `Open the protocol's own points or rewards page once a week and write down the balance you see.`,
      cost: 'nothing to check',
      time: '5 minutes a week',
    },
    {
      text: `Before you withdraw, check the claim link on the protocol's own page and never pay to claim.`,
      cost: 'no fee to check, and never pay to claim',
      time: '10 minutes',
    },
    {
      text: `Write the wallet, the dates and every transaction in a farm log so you can repeat the position or unwind it.`,
      cost: 'nothing but the log',
      time: '5 minutes',
    },
    {
      text: `Unwind in reverse order: withdraw, then bridge back, and keep the log for the next farm.`,
      cost: 'about $4 of gas',
      time: '15 minutes',
    },
  ];
}

/** A step as one string: its action, then its cost and time, within the gate's 20..600 characters. */
export function stepText(step: FarmStep): string {
  let s = `${step.text} Cost: ${step.cost}. Time: ${step.time}.`;
  if (s.length > 600) s = `${s.slice(0, 596)}...`;
  if (s.length < 20) s = `${s} Hold the position and check the protocol's own page.`;
  return s;
}

/** The live-token protocols, by market cap, for the dashboard's Live token view. */
export function liveRows(snapshot: Snapshot): LiveRow[] {
  return snapshot.protocols
    .filter((p) => !isPreToken(p) && p.category !== 'CEX')
    .sort((a, b) => (b.mcap_usd ?? 0) - (a.mcap_usd ?? 0) || b.tvl_usd - a.tvl_usd)
    .slice(0, 24)
    .map((p) => ({
      slug: p.slug,
      name: p.name,
      category: p.category,
      chains: p.chains,
      tvl_usd: p.tvl_usd,
      mcap_usd: p.mcap_usd,
      change_7d: p.change_7d,
    }));
}

/** Three comparison protocols for a row: the nearest by implied value in
 *  the same category, filled from the nearest overall when the category
 *  has fewer than three. */
function compsFor(row: BoardRow, ranked: BoardRow[]): RowComp[] {
  const same = ranked.filter((r) => r.slug !== row.slug && r.category === row.category);
  const rest = ranked.filter((r) => r.slug !== row.slug && r.category !== row.category);
  const pick = (pool: BoardRow[]): BoardRow[] =>
    [...pool].sort((a, b) => Math.abs(a.implied_value_usd - row.implied_value_usd) - Math.abs(b.implied_value_usd - row.implied_value_usd));
  const chosen = [...pick(same).slice(0, 3), ...pick(rest)].slice(0, 3);
  return chosen.map((r) => ({
    slug: r.slug,
    name: r.name,
    implied_value_usd: r.implied_value_usd,
    net_cond: round4(r.net_cond),
    verdict: r.verdict,
  }));
}

/** The protocols the board ranks, strongest first, with ranks 1..n. */
export function buildBoard(snapshot: Snapshot): { board: BoardRow[]; inter: number; sectors: Map<string, number> } {
  const live = liveSet(snapshot.protocols);
  const inter = huberIntercept(live);
  const sectors = sectorOffsets(live, inter);
  const odds = buildOdds(snapshot.protocols, snapshot.as_of);
  const watch = new Set(snapshot.watchlist);

  const universe = snapshot.protocols.filter(isUniverse);
  const scored = universe.map((p) => {
    const { log, mult } = logImplied(p, snapshot.as_of, inter, sectors);
    const implied = Math.max(1, Math.round(Math.pow(10, log)));
    const age = ageDays(snapshot.as_of, p.listed_at);
    const od = odds(p);
    const econ = economics(implied, p, od, snapshot.as_of);
    const verdict = verdictFor(econ.netCond, econ.netEv);
    return {
      p,
      implied,
      log,
      mult,
      sector: sectors.get(p.category ?? '') ?? 0,
      age,
      od,
      econ,
      verdict,
      robust: econ.netD1k > 0,
    };
  });
  scored.sort((a, b) => b.implied - a.implied || (a.p.slug < b.p.slug ? -1 : a.p.slug > b.p.slug ? 1 : 0));
  const board: BoardRow[] = scored.map((s, i) => ({
    rank: i + 1,
    slug: s.p.slug,
    name: s.p.name,
    category: s.p.category,
    chains: s.p.chains,
    tvl_usd: s.p.tvl_usd,
    change_7d: s.p.change_7d,
    mcap_usd: s.p.mcap_usd,
    listed_at: s.p.listed_at,
    gecko_id: s.p.gecko_id,
    symbol: s.p.symbol,
    token_status: 'pre-token',
    age_days: s.age,
    implied_value_usd: s.implied,
    model: {
      intercept: round4(inter),
      slope: SLOPE,
      sector_offset: round4(s.sector),
      growth_multiplier: round4(s.mult.growth),
      maturity_multiplier: round4(s.mult.maturity),
      chains_multiplier: round4(s.mult.chains),
      mults: round4(s.mult.term),
      log10_implied: round4(s.log),
    },
    farm_steps: farmSteps(s.p, s.age).map(stepText),
    net_cond: round4(s.econ.netCond),
    net_ev: round4(s.econ.netEv),
    net_d1k: round4(s.econ.netD1k),
    net_low: round4(s.econ.netLow),
    deposit_usd: s.econ.deposit,
    slice_usd: round4(s.econ.slice),
    tbill_memo_usd: s.econ.tbillMemo,
    token_odds: round4(s.od),
    robust: s.robust,
    verdict: s.verdict,
    on_watchlist: watch.has(s.p.slug),
    comps: [],
  }));
  for (const row of board) row.comps = compsFor(row, board);
  return { board, inter, sectors };
}

/** A board row's compact form for data.js. */
export function radarRow(row: BoardRow): RadarRow {
  return {
    rank: row.rank,
    slug: row.slug,
    name: row.name,
    category: row.category,
    chains: row.chains,
    tvl_usd: row.tvl_usd,
    change_7d: row.change_7d,
    age_days: row.age_days,
    implied_value_usd: row.implied_value_usd,
    net_cond: row.net_cond,
    net_ev: row.net_ev,
    token_odds: row.token_odds,
    verdict: row.verdict,
    robust: row.robust,
    on_watchlist: row.on_watchlist,
    farm_steps: row.farm_steps,
    comps: row.comps,
    model: row.model,
    economics: {
      deposit_usd: row.deposit_usd,
      slice_usd: row.slice_usd,
      net_d1k: row.net_d1k,
      net_low: row.net_low,
      tbill_memo_usd: row.tbill_memo_usd,
    },
  };
}

/** The measured fit of the shipped model (computed offline by the builder's
 *  verification script; stated in the dashboard with its scheme). */
export const FIT: FitStats = {
  intercept: 3.5644,
  slope: SLOPE,
  loo_rmse: 0.9001,
  fivefold_max: 0.8996,
  fivefold_scheme: '5-fold, seeds 0/1/2, split by shuffled position mod 5',
  wf35_median_miss: 2.03,
  category_blind_miss: 3.33,
  range_p25_p75: 50,
  range_p10_p90: 81,
  live_n: 119,
};

/** Everything the dashboard renders, from the snapshot. */
export function buildRadar(snapshot: Snapshot): { board: BoardRow[]; radar: RadarData } {
  const { board, inter } = buildBoard(snapshot);
  const live = liveRows(snapshot);
  const early = board.filter((r) => !snapshot.watchlist.includes(r.slug)).length;
  const total = board.reduce((s, r) => s + r.implied_value_usd, 0);
  const radar: RadarData = {
    as_of: snapshot.as_of,
    source: snapshot.source,
    floor_usd: snapshot.floor_usd,
    model_version: MODEL_VERSION,
    fit: { ...FIT, intercept: round4(inter) },
    watchlist_size: snapshot.watchlist.length,
    board_size: board.length,
    early_size: early,
    live_size: live.length,
    total_implied_usd: total,
    top_implied_usd: board[0]!.implied_value_usd,
    rows: board.map(radarRow),
    live,
  };
  return { board, radar };
}

/** The snapshot out of a file's text, refused unless it is the shape the model scores. */
export function parseSnapshot(text: string): Snapshot {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SnapshotError('snapshot.json is not JSON');
  }
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) throw new SnapshotError('snapshot.json is not a JSON object');
  const o = raw as Record<string, unknown>;
  if (typeof o.as_of !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(o.as_of)) throw new SnapshotError('snapshot.json has no as_of date');
  if (typeof o.source !== 'string') throw new SnapshotError('snapshot.json has no source');
  if (typeof o.floor_usd !== 'number' || !Number.isSafeInteger(o.floor_usd) || o.floor_usd <= 0) throw new SnapshotError('snapshot.json has no floor_usd');
  if (!Array.isArray(o.protocols)) throw new SnapshotError('snapshot.json has no protocols array');
  if (!Array.isArray(o.watchlist) || o.watchlist.some((s) => typeof s !== 'string')) throw new SnapshotError('snapshot.json has no watchlist of slugs');
  const protocols = o.protocols.map((v, i) => {
    if (typeof v !== 'object' || v === null || Array.isArray(v)) throw new SnapshotError(`snapshot.json's protocol ${i} is not an object`);
    const p = v as Record<string, unknown>;
    if (typeof p.slug !== 'string' || typeof p.name !== 'string' || typeof p.tvl_usd !== 'number' || !Number.isFinite(p.tvl_usd)) {
      throw new SnapshotError(`snapshot.json's protocol ${i} lacks a slug, a name or a TVL`);
    }
    return {
      slug: p.slug,
      name: p.name,
      category: typeof p.category === 'string' ? p.category : null,
      chains: Array.isArray(p.chains) ? p.chains.filter((c): c is string => typeof c === 'string') : [],
      tvl_usd: p.tvl_usd,
      change_7d: typeof p.change_7d === 'number' && Number.isFinite(p.change_7d) ? p.change_7d : null,
      mcap_usd: typeof p.mcap_usd === 'number' && Number.isFinite(p.mcap_usd) ? p.mcap_usd : null,
      listed_at: typeof p.listed_at === 'string' ? p.listed_at : null,
      gecko_id: typeof p.gecko_id === 'string' ? p.gecko_id : null,
      symbol: typeof p.symbol === 'string' ? p.symbol : null,
    };
  });
  return {
    as_of: o.as_of,
    source: o.source,
    floor_usd: o.floor_usd,
    protocols,
    watchlist: o.watchlist as string[],
  };
}

/**
 * Why a board is not one the gate will take, or null. Mirrors the starter's
 * boardIssue plus the live-gate checks (the P13 superset): coverage, ranks,
 * order, one shared implied value, farm steps, whole-number implied values,
 * row count, snapshot membership, non-empty names, unique slugs.
 */
export function boardIssue(board: BoardRow[], snapshot: Snapshot): string | null {
  if (board.length < 100 || board.length > 4000) return `the board has ${board.length} rows, outside 100..4000`;
  const slugs = new Set(board.map((r) => r.slug));
  if (slugs.size !== board.length) return 'the board repeats a slug';
  const missing = snapshot.watchlist.filter((s) => !slugs.has(s));
  if (missing.length > 0) return `the board misses ${missing.length} watchlist slug${missing.length === 1 ? '' : 's'}: ${missing.slice(0, 5).join(', ')}`;
  const known = new Set(snapshot.protocols.map((p) => p.slug));
  const invented = board.find((r) => !known.has(r.slug));
  if (invented !== undefined) return `${invented.slug} is not one of the snapshot's protocols`;
  const ranks = board.map((r) => r.rank).sort((a, b) => a - b);
  for (let i = 0; i < ranks.length; i++) if (ranks[i] !== i + 1) return `rank ${i + 1} is ${ranks[i]}`;
  for (let i = 1; i < board.length; i++) if (board[i]!.implied_value_usd > board[i - 1]!.implied_value_usd) return `row ${i + 1} outranks row ${i} on implied value`;
  if (board.length >= 2 && board[0]!.implied_value_usd === board[board.length - 1]!.implied_value_usd) {
    return `all ${board.length} rows share the same implied value $${board[0]!.implied_value_usd}: a board that ranks nothing by value is not a ranking`;
  }
  for (const r of board) {
    if (r.name.length === 0) return `${r.slug} has an empty name`;
    if (!Number.isSafeInteger(r.implied_value_usd) || r.implied_value_usd <= 0) return `${r.slug} has implied value ${r.implied_value_usd}`;
    if (r.implied_value_usd > 1e14) return `${r.slug} has implied value over $100,000,000,000,000`;
    const steps = r.farm_steps;
    if (!Array.isArray(steps) || steps.length < 3 || steps.length > 12) return `${r.slug} has ${steps.length} farm steps`;
    for (const s of steps) {
      const t = s.trim();
      if (t.length < 20 || t.length > 600) return `${r.slug} has a farm step of ${t.length} characters`;
    }
  }
  return null;
}

/** A compact data.js: the dashboard's whole dataset as one script, no fetch and no network. */
export function dataScript(radar: RadarData): string {
  return `window.RADAR=${JSON.stringify(radar)};\n`;
}
