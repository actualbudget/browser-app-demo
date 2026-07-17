import type {
  Snapshot,
  AccountDTO,
  TransactionDTO,
  CategoryDTO,
  CategoryGroupDTO,
  PayeeDTO,
  CurrencyFormat,
} from './types';
import { today } from '../lib/date';

// Synthetic-but-realistic budget used by the "Try the demo" flow. Everything is
// generated locally and deterministically (a seeded PRNG, never Math.random) so
// the dashboard always has rich data to show without a real Actual server.
//
// All money is integer minor units (cents). Outflows negative, inflows positive.
// Dates are anchored to the real clock at call time so the data always looks
// current — ~36 months of history ending today.

const USD: CurrencyFormat = { code: 'USD', symbol: '$', symbolFirst: true };

// Account ids.
const A_CHECKING = 'demo-acct-checking';
const A_SAVINGS = 'demo-acct-savings';
const A_BROKERAGE = 'demo-acct-brokerage';
const A_CREDIT = 'demo-acct-credit';

// Category group ids.
const G_INCOME = 'demo-grp-income';
const G_HOUSING = 'demo-grp-housing';
const G_GROCERIES = 'demo-grp-groceries';
const G_DINING = 'demo-grp-dining';
const G_TRANSPORT = 'demo-grp-transport';
const G_UTILITIES = 'demo-grp-utilities';
const G_SUBSCRIPTIONS = 'demo-grp-subscriptions';
const G_HEALTH = 'demo-grp-health';
const G_SHOPPING = 'demo-grp-shopping';
const G_TRAVEL = 'demo-grp-travel';

// Category ids.
const C_SALARY = 'demo-cat-salary';
const C_RENT = 'demo-cat-rent';
const C_GROCERIES = 'demo-cat-groceries';
const C_DINING = 'demo-cat-dining';
const C_TRANSPORT = 'demo-cat-transport';
const C_UTILITIES = 'demo-cat-utilities';
const C_SUBSCRIPTIONS = 'demo-cat-subscriptions';
const C_HEALTH = 'demo-cat-health';
const C_SHOPPING = 'demo-cat-shopping';
const C_TRAVEL = 'demo-cat-travel';

// Payee ids.
const P_EMPLOYER = 'demo-payee-employer';
const P_LANDLORD = 'demo-payee-landlord';
const P_WHOLEFOODS = 'demo-payee-wholefoods';
const P_TRADERJOES = 'demo-payee-traderjoes';
const P_CHIPOTLE = 'demo-payee-chipotle';
const P_BISTRO = 'demo-payee-bistro';
const P_SUSHI = 'demo-payee-sushi';
const P_NETFLIX = 'demo-payee-netflix';
const P_SPOTIFY = 'demo-payee-spotify';
const P_GYM = 'demo-payee-gym';
const P_ELECTRIC = 'demo-payee-electric';
const P_INTERNET = 'demo-payee-internet';
const P_GAS = 'demo-payee-gas';
const P_TRANSIT = 'demo-payee-transit';
const P_AMAZON = 'demo-payee-amazon';
const P_TARGET = 'demo-payee-target';
const P_PHARMACY = 'demo-payee-pharmacy';
const P_AIRLINE = 'demo-payee-airline';
const P_HOTEL = 'demo-payee-hotel';
// Transfer payees — transfer_acct points at the account the money moves to/from.
const P_XFER_CHECKING = 'demo-payee-xfer-checking';
const P_XFER_SAVINGS = 'demo-payee-xfer-savings';
const P_XFER_BROKERAGE = 'demo-payee-xfer-brokerage';
const P_XFER_CREDIT = 'demo-payee-xfer-credit';

const categoryGroups: CategoryGroupDTO[] = [
  { id: G_INCOME, name: 'Income', is_income: true },
  { id: G_HOUSING, name: 'Housing', is_income: false },
  { id: G_GROCERIES, name: 'Groceries', is_income: false },
  { id: G_DINING, name: 'Dining', is_income: false },
  { id: G_TRANSPORT, name: 'Transport', is_income: false },
  { id: G_UTILITIES, name: 'Utilities', is_income: false },
  { id: G_SUBSCRIPTIONS, name: 'Subscriptions', is_income: false },
  { id: G_HEALTH, name: 'Health', is_income: false },
  { id: G_SHOPPING, name: 'Shopping', is_income: false },
  { id: G_TRAVEL, name: 'Travel', is_income: false },
];

const categories: CategoryDTO[] = [
  { id: C_SALARY, name: 'Salary', group_id: G_INCOME, is_income: true },
  { id: C_RENT, name: 'Rent', group_id: G_HOUSING, is_income: false },
  { id: C_GROCERIES, name: 'Groceries', group_id: G_GROCERIES, is_income: false },
  { id: C_DINING, name: 'Dining', group_id: G_DINING, is_income: false },
  { id: C_TRANSPORT, name: 'Transport', group_id: G_TRANSPORT, is_income: false },
  { id: C_UTILITIES, name: 'Utilities', group_id: G_UTILITIES, is_income: false },
  { id: C_SUBSCRIPTIONS, name: 'Subscriptions', group_id: G_SUBSCRIPTIONS, is_income: false },
  { id: C_HEALTH, name: 'Health', group_id: G_HEALTH, is_income: false },
  { id: C_SHOPPING, name: 'Shopping', group_id: G_SHOPPING, is_income: false },
  { id: C_TRAVEL, name: 'Travel', group_id: G_TRAVEL, is_income: false },
];

const payees: PayeeDTO[] = [
  { id: P_EMPLOYER, name: 'Acme Corp Payroll', transfer_acct: null },
  { id: P_LANDLORD, name: 'Oakwood Properties', transfer_acct: null },
  { id: P_WHOLEFOODS, name: 'Whole Foods', transfer_acct: null },
  { id: P_TRADERJOES, name: "Trader Joe's", transfer_acct: null },
  { id: P_CHIPOTLE, name: 'Chipotle', transfer_acct: null },
  { id: P_BISTRO, name: 'Corner Bistro', transfer_acct: null },
  { id: P_SUSHI, name: 'Sakura Sushi', transfer_acct: null },
  { id: P_NETFLIX, name: 'Netflix', transfer_acct: null },
  { id: P_SPOTIFY, name: 'Spotify', transfer_acct: null },
  { id: P_GYM, name: 'PowerHouse Gym', transfer_acct: null },
  { id: P_ELECTRIC, name: 'City Electric', transfer_acct: null },
  { id: P_INTERNET, name: 'FiberNet', transfer_acct: null },
  { id: P_GAS, name: 'Shell', transfer_acct: null },
  { id: P_TRANSIT, name: 'Metro Transit', transfer_acct: null },
  { id: P_AMAZON, name: 'Amazon', transfer_acct: null },
  { id: P_TARGET, name: 'Target', transfer_acct: null },
  { id: P_PHARMACY, name: 'Walgreens', transfer_acct: null },
  { id: P_AIRLINE, name: 'United Airlines', transfer_acct: null },
  { id: P_HOTEL, name: 'Marriott', transfer_acct: null },
  { id: P_XFER_CHECKING, name: 'Transfer: Checking', transfer_acct: A_CHECKING },
  { id: P_XFER_SAVINGS, name: 'Transfer: Savings', transfer_acct: A_SAVINGS },
  { id: P_XFER_BROKERAGE, name: 'Transfer: Brokerage', transfer_acct: A_BROKERAGE },
  { id: P_XFER_CREDIT, name: 'Transfer: Credit Card', transfer_acct: A_CREDIT },
];

/** Deterministic PRNG (mulberry32) — stable output for a fixed seed. */
function mulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const pad = (n: number) => String(n).padStart(2, '0');

const MONTHS_OF_HISTORY = 36; // ~3 years including the current month

export function buildDemoSnapshot(): Snapshot {
  const now = new Date();
  const todayStr = today(now);
  const rand = mulberry32(0x5eed1234);

  const transactions: TransactionDTO[] = [];
  const balances: Record<string, number> = {
    [A_CHECKING]: 0,
    [A_SAVINGS]: 0,
    [A_BROKERAGE]: 0,
    [A_CREDIT]: 0,
  };
  let seq = 0;

  // Random integer in [min, max].
  const ri = (min: number, max: number) => min + Math.floor(rand() * (max - min + 1));

  // Build a 'YYYY-MM-DD' string for (year, month, day), clamping the day to the
  // month length. Returns null if the date is in the future (so the most recent
  // month only contains days up to today).
  function dateStr(year: number, month: number, day: number): string | null {
    const lastDay = new Date(year, month, 0).getDate();
    const d = Math.min(day, lastDay);
    const s = `${year}-${pad(month)}-${pad(d)}`;
    return s > todayStr ? null : s;
  }

  function addTxn(
    account: string,
    date: string,
    amount: number,
    payee: string | null,
    category: string | null,
    transfer_id: string | null = null,
  ): void {
    transactions.push({
      id: `demo-txn-${seq++}`,
      account,
      date,
      amount,
      payee,
      category,
      transfer_id,
      is_parent: false,
      is_child: false,
    });
    balances[account] += amount;
  }

  // A transfer moves `amount` (positive) from one account to another: an outflow
  // leg on `from` and an inflow leg on `to`, both carrying a shared transfer_id
  // and the matching transfer payee, so the analysis treats them as transfers
  // (movement between own accounts) rather than spending/income.
  function addTransfer(
    from: string,
    to: string,
    date: string,
    amount: number,
    fromPayee: string,
    toPayee: string,
  ): void {
    const tid = `demo-xfer-${seq}`;
    addTxn(from, date, -amount, fromPayee, null, tid);
    addTxn(to, date, amount, toPayee, null, tid);
  }

  // Established starting position lives entirely in the off-budget brokerage so
  // it never shows up as a giant income spike in the spending/cashflow charts.
  // (Off-budget activity is excluded from spending analysis but still counts
  // toward net worth.)
  const firstMonth = new Date(now.getFullYear(), now.getMonth() - (MONTHS_OF_HISTORY - 1), 1);
  const start = dateStr(firstMonth.getFullYear(), firstMonth.getMonth() + 1, 1);
  if (start) addTxn(A_BROKERAGE, start, 4_200_000, null, null);

  for (let monthsAgo = MONTHS_OF_HISTORY - 1; monthsAgo >= 0; monthsAgo--) {
    const anchor = new Date(now.getFullYear(), now.getMonth() - monthsAgo, 1);
    const year = anchor.getFullYear();
    const month = anchor.getMonth() + 1; // 1-12
    const idx = MONTHS_OF_HISTORY - 1 - monthsAgo; // 0 = oldest, increases to today
    const holidays = month === 11 || month === 12; // gifts + travel season

    let ccCharges = 0; // accumulated credit-card spend this month (negative)
    const cc = (date: string | null, amount: number, payee: string, category: string) => {
      if (!date) return;
      addTxn(A_CREDIT, date, amount, payee, category);
      ccCharges += amount;
    };

    // Salary — a raise lands roughly halfway through the history.
    const salary = idx < 18 ? 550_000 : 625_000;
    const salaryDate = dateStr(year, month, 2);
    if (salaryDate) addTxn(A_CHECKING, salaryDate, salary, P_EMPLOYER, C_SALARY);

    // Rent (Housing).
    const rentDate = dateStr(year, month, 1);
    if (rentDate) addTxn(A_CHECKING, rentDate, -180_000, P_LANDLORD, C_RENT);

    // Recurring subscriptions (steady monthly cadence, on the credit card).
    cc(dateStr(year, month, 5), -1_549, P_NETFLIX, C_SUBSCRIPTIONS);
    cc(dateStr(year, month, 8), -1_099, P_SPOTIFY, C_SUBSCRIPTIONS);
    cc(dateStr(year, month, 3), -3_999, P_GYM, C_HEALTH);

    // Utilities — monthly, mild variance.
    const elecDate = dateStr(year, month, 12);
    if (elecDate) addTxn(A_CHECKING, elecDate, -(7_500 + ri(0, 5_500)), P_ELECTRIC, C_UTILITIES);
    const netDate = dateStr(year, month, 15);
    if (netDate) addTxn(A_CHECKING, netDate, -6_500, P_INTERNET, C_UTILITIES);

    // Groceries — ~weekly, alternating stores, on the credit card.
    const groceryDays = [4, 11, 18, 25];
    for (let i = 0; i < groceryDays.length; i++) {
      const payee = i % 2 === 0 ? P_WHOLEFOODS : P_TRADERJOES;
      cc(dateStr(year, month, groceryDays[i]), -(8_500 + ri(0, 6_000)), payee, C_GROCERIES);
    }

    // Dining — a few outings a month.
    const diningPayees = [P_CHIPOTLE, P_BISTRO, P_SUSHI];
    const diningDays = [7, 16, 26];
    for (let i = 0; i < diningDays.length; i++) {
      cc(dateStr(year, month, diningDays[i]), -(1_800 + ri(0, 4_500)), diningPayees[i], C_DINING);
    }

    // Transport — gas + transit.
    const gasDate = dateStr(year, month, 9);
    if (gasDate) addTxn(A_CHECKING, gasDate, -(3_500 + ri(0, 3_500)), P_GAS, C_TRANSPORT);
    const transitDate = dateStr(year, month, 21);
    if (transitDate) addTxn(A_CHECKING, transitDate, -(2_800 + ri(0, 1_500)), P_TRANSIT, C_TRANSPORT);

    // Shopping — heavier during the holidays.
    const shopDate = dateStr(year, month, 14);
    if (shopDate) cc(shopDate, -(2_500 + ri(0, 5_000)), P_AMAZON, C_SHOPPING);
    if (holidays) {
      cc(dateStr(year, month, 6), -(16_000 + ri(0, 16_000)), P_TARGET, C_SHOPPING);
      cc(dateStr(year, month, 19), -(11_000 + ri(0, 12_000)), P_AMAZON, C_SHOPPING);
      cc(dateStr(year, month, 23), -(7_000 + ri(0, 8_000)), P_BISTRO, C_DINING);
    }

    // Health — occasional pharmacy run.
    if (idx % 3 === 0) {
      const rxDate = dateStr(year, month, 17);
      if (rxDate) cc(rxDate, -(1_500 + ri(0, 2_500)), P_PHARMACY, C_HEALTH);
    }

    // Travel — a summer trip plus holiday-season getaways.
    if (month === 7) {
      const flightDate = dateStr(year, month, 13);
      if (flightDate) addTxn(A_CHECKING, flightDate, -(45_000 + ri(0, 25_000)), P_AIRLINE, C_TRAVEL);
    }
    if (holidays) {
      const hotelDate = dateStr(year, month, 22);
      if (hotelDate) addTxn(A_CHECKING, hotelDate, -(50_000 + ri(0, 35_000)), P_HOTEL, C_TRAVEL);
    }

    // Anomalous one-off months: a medical bill and a big vacation.
    if (idx === 8) {
      const billDate = dateStr(year, month, 20);
      if (billDate) addTxn(A_CHECKING, billDate, -360_000, P_PHARMACY, C_HEALTH);
    }
    if (idx === 22) {
      const tripDate = dateStr(year, month, 10);
      if (tripDate) addTxn(A_CHECKING, tripDate, -430_000, P_AIRLINE, C_TRAVEL);
    }

    // Monthly savings + investment contributions (transfers, not spending).
    const xferDate = dateStr(year, month, 4);
    if (xferDate) {
      addTransfer(A_CHECKING, A_SAVINGS, xferDate, 50_000, P_XFER_SAVINGS, P_XFER_CHECKING);
      addTransfer(A_CHECKING, A_BROKERAGE, xferDate, 90_000, P_XFER_BROKERAGE, P_XFER_CHECKING);
    }

    // Brokerage market appreciation — keeps the investment line growing beyond
    // contributions. Off-budget, so excluded from spending, included in net worth.
    const gainDate = dateStr(year, month, 27);
    if (gainDate) addTxn(A_BROKERAGE, gainDate, 12_000 + idx * 900 + ri(0, 8_000), null, null);

    // Pay off the month's credit-card charges (transfer from checking).
    if (ccCharges < 0) {
      const payDate = dateStr(year, month, 28);
      if (payDate) addTransfer(A_CHECKING, A_CREDIT, payDate, -ccCharges, P_XFER_CREDIT, P_XFER_CHECKING);
    }
  }

  const accounts: AccountDTO[] = [
    { id: A_CHECKING, name: 'Checking', offbudget: false, closed: false, balance: balances[A_CHECKING] },
    { id: A_SAVINGS, name: 'Savings', offbudget: false, closed: false, balance: balances[A_SAVINGS] },
    { id: A_BROKERAGE, name: 'Brokerage', offbudget: true, closed: false, balance: balances[A_BROKERAGE] },
    { id: A_CREDIT, name: 'Credit Card', offbudget: false, closed: false, balance: balances[A_CREDIT] },
  ];

  return {
    budgetName: 'Demo Budget',
    currency: USD,
    accounts,
    transactions,
    categories,
    categoryGroups,
    payees,
    generatedAt: now.toISOString(),
  };
}
