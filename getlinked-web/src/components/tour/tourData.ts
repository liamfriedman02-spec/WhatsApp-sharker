/**
 * Everything the tour says and shows. All figures are sample data for illustration;
 * none of them are real customer results.
 */

/** The product canvas is designed at a fixed size and scaled by the camera. */
export const APP_W = 1280;
export const APP_H = 820;
export const SIDEBAR_W = 224;
export const TOPBAR_H = 56;
/** Main content area origin inside the canvas. */
export const MAIN_X = SIDEBAR_W;
export const MAIN_Y = TOPBAR_H;

export type Rect = { x: number; y: number; w: number; h: number };

/** Flow-view layout, in main-area coordinates. */
export const FLOW = {
  lead: { x: 24, y: 90, w: 280, h: 320 },
  log: { x: 24, y: 426, w: 280, h: 338 },
  bucket: { x: 348, y: 90, w: 320, h: 454 },
  bucketHeader: 70,
  nodes: { x: 712, w: 320, h: 84, ys: [160, 256, 352, 448] },
  slot: { x: 712, y: 550, w: 320, h: 206 },
  kpi: { x: 348, y: 562, w: 320, h: 194 },
};

/** Paths the lead travels along, in main-area coordinates. */
export const PATHS = {
  toBucket: 'M304 250 C 330 250, 322 394, 348 394',
  toAdvertiser: 'M668 394 L712 394',
  recycle: 'M712 394 L692 394 C 678 394, 678 490, 692 490 L712 490',
  postback: 'M712 520 C 692 520, 692 553, 668 553 L 340 553 C 324 553, 324 330, 304 330',
};

/** Camera focus regions for each beat, in canvas coordinates. */
const toCanvas = (r: Rect, pad = 0): Rect => ({
  x: r.x + MAIN_X - pad,
  y: r.y + MAIN_Y - pad,
  w: r.w + pad * 2,
  h: r.h + pad * 2,
});

export const FOCUS = {
  full: { x: 0, y: 0, w: APP_W, h: APP_H },
  track: toCanvas({ x: 24, y: 70, w: 420, h: 560 }, 16),
  distribute: toCanvas({ x: 304, y: 70, w: 728, h: 480 }, 14),
  recycle: toCanvas({ x: 640, y: 150, w: 392, h: 610 }, 14),
  convert: toCanvas({ x: 24, y: 70, w: 1008, h: 690 }, 10),
  money: toCanvas({ x: 348, y: 330, w: 684, h: 430 }, 16),
};

export type NavIcon = 'grid' | 'cursor' | 'chart' | 'target' | 'users' | 'user' | 'layers' | 'recycle' | 'invoice' | 'shield';
export type NavItem = { id: string; label: string; icon: NavIcon };

export const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'Overview', items: [{ id: 'dashboard', label: 'Dashboard', icon: 'grid' }] },
  {
    group: 'Reports',
    items: [
      { id: 'clicks', label: 'Clicks', icon: 'cursor' },
      { id: 'drill', label: 'Drill-down', icon: 'chart' },
      { id: 'leads', label: 'Leads', icon: 'target' },
    ],
  },
  {
    group: 'Accounts',
    items: [
      { id: 'affiliates', label: 'Affiliates', icon: 'users' },
      { id: 'users', label: 'Users', icon: 'user' },
    ],
  },
  {
    group: 'Operations',
    items: [
      { id: 'buckets', label: 'Buckets', icon: 'layers' },
      { id: 'recycling', label: 'Lead Recycling', icon: 'recycle' },
    ],
  },
  { group: 'Finance', items: [{ id: 'invoices', label: 'Invoices', icon: 'invoice' }] },
  { group: 'Admin', items: [{ id: 'permissions', label: 'Show permissions', icon: 'shield' }] },
];

export const LEAD = {
  id: 'GL-48213',
  fields: [
    { label: 'Affiliate', value: 'Affiliate #214' },
    { label: 'Offer', value: 'Finance · Tier 1' },
    { label: 'Country', value: 'Canada', chip: 'CA' },
    { label: 'Language', value: 'English' },
    { label: 'Device', value: 'Mobile · iOS' },
    { label: 'Sub ID', value: 'fb_cmp_17', mono: true },
    { label: 'Click ID', value: '9f3a71c2e04b', mono: true },
    { label: 'Received', value: '14:09:22 UTC', mono: true },
  ],
};

export type CheckState = 'pass' | 'fail' | 'idle';

export const ADVERTISERS: {
  key: 'A' | 'B' | 'C' | 'D';
  priority: number;
  cap: [number, number];
  budget: string;
  checks: [CheckState, CheckState, CheckState, CheckState];
}[] = [
  { key: 'A', priority: 1, cap: [50, 50], budget: '$4,200 left', checks: ['pass', 'pass', 'fail', 'idle'] },
  { key: 'B', priority: 2, cap: [31, 80], budget: '$0 left', checks: ['pass', 'pass', 'pass', 'fail'] },
  { key: 'C', priority: 3, cap: [12, 40], budget: '$9,850 left', checks: ['pass', 'pass', 'pass', 'pass'] },
  { key: 'D', priority: 4, cap: [8, 60], budget: '$6,100 left', checks: ['pass', 'pass', 'pass', 'pass'] },
];

export const CHECKS = ['GEO', 'Schedule', 'Cap', 'Budget'] as const;

export const LOG: { step: number; time: string; event: string; detail: string; tone: 'info' | 'skip' | 'ok' | 'money' }[] = [
  { step: 1, time: '14:09:22.104', event: 'click.tracked', detail: 'aff 214 · sub fb_cmp_17', tone: 'info' },
  { step: 1, time: '14:09:22.109', event: 'lead.created', detail: 'GL-48213 · CA · mobile', tone: 'info' },
  { step: 2, time: '14:09:22.118', event: 'bucket.matched', detail: 'CA · Finance · Tier 1', tone: 'info' },
  { step: 2, time: '14:09:22.121', event: 'advertiser.skipped', detail: 'A · cap reached 50/50', tone: 'skip' },
  { step: 2, time: '14:09:22.124', event: 'advertiser.skipped', detail: 'B · budget unavailable', tone: 'skip' },
  { step: 2, time: '14:09:22.131', event: 'lead.routed', detail: 'C · priority 3', tone: 'ok' },
  { step: 2, time: '14:09:22.342', event: 'delivery.accepted', detail: 'C · 201 · 211 ms', tone: 'ok' },
  { step: 3, time: '18:09:22.000', event: 'recycle.triggered', detail: 'no conversion in 4h', tone: 'info' },
  { step: 3, time: '18:09:22.016', event: 'lead.recycled', detail: 'C → D · cycle 1 of 2', tone: 'ok' },
  { step: 3, time: '18:09:22.231', event: 'delivery.accepted', detail: 'D · 201 · 215 ms', tone: 'ok' },
  { step: 4, time: '18:47:05.511', event: 'postback.received', detail: 'D · ftd · 1,000.00', tone: 'ok' },
  { step: 4, time: '18:47:05.514', event: 'lead.converted', detail: 'GL-48213', tone: 'ok' },
  { step: 5, time: '18:47:05.520', event: 'income.booked', detail: '+$1,000.00 · Advertiser D', tone: 'money' },
  { step: 5, time: '18:47:05.521', event: 'commission.booked', detail: '−$650.00 · Affiliate #214', tone: 'money' },
  { step: 5, time: '18:47:05.523', event: 'invoice.updated', detail: 'INV-2026-1042', tone: 'money' },
];

export const LIVE_FEED = [
  { geo: 'CA', vertical: 'Finance', to: 'Advertiser C', time: '14:09:22' },
  { geo: 'UK', vertical: 'Crypto', to: 'Advertiser F', time: '14:09:19' },
  { geo: 'IT', vertical: 'Investing', to: 'Advertiser A', time: '14:09:16' },
  { geo: 'IE', vertical: 'iGaming', to: 'Advertiser K', time: '14:09:12' },
  { geo: 'NO', vertical: 'Finance', to: 'Advertiser D', time: '14:09:09' },
  { geo: 'ES', vertical: 'iGaming', to: 'Advertiser H', time: '14:09:05' },
];

export const STEPS = [
  {
    id: 'track',
    label: 'Track',
    title: 'Every click becomes a lead you can trace.',
    body: 'GetLinked tracks clicks, leads and conversions from the first touch. Each lead is tied to its affiliate, offer, sub ID, country and device the moment it arrives.',
    chips: ['Click and lead tracking', 'Postbacks and pixels', 'Sub IDs'],
  },
  {
    id: 'distribute',
    label: 'Distribute',
    title: 'Every lead deserves the right destination.',
    body: 'Buckets decide who gets each lead. GetLinked checks GEO, schedule, caps and budget for each advertiser in priority order, skips the ones that can’t take it and routes to the one that can.',
    chips: ['Buckets', 'Priority and rotation', 'Caps and budgets', 'GEO and schedule'],
  },
  {
    id: 'recycle',
    label: 'Recycle',
    title: 'Leads that don’t convert get a second chance.',
    body: 'Lead Recycling sends unconverted leads to the next eligible advertiser after the delay you choose, skipping advertisers that already received them.',
    chips: ['Lead Recycling', 'Rule-based delays', 'Cycle limits'],
  },
  {
    id: 'convert',
    label: 'Convert',
    title: 'From first click to final conversion.',
    body: 'Advertisers report back by postback. Statuses and deposits sync on their own, and every conversion shows up in real-time reports.',
    chips: ['Postbacks', 'Status sync', 'Real-time reports'],
  },
  {
    id: 'money',
    label: 'Get paid',
    title: 'Every dollar, accounted for.',
    body: 'Income from advertisers, commission for affiliates and profit per lead are calculated as conversions land. Balances and invoices stay current, with no spreadsheets.',
    chips: ['Commissions', 'Profit per lead', 'Invoicing'],
  },
] as const;

/** Dashboard KPIs before and after the lead converts. */
export const KPI = {
  leads: { before: 34855, after: 34856 },
  conversions: { before: 574, after: 575 },
  profit: { before: 48210.4, after: 48560.4 },
};

/** Tighter camera regions for phones, where the copy sits below the product. */
export const FOCUS_MOBILE = {
  full: FOCUS.full,
  track: toCanvas({ x: 24, y: 90, w: 280, h: 320 }, 8),
  distribute: toCanvas({ x: 348, y: 160, w: 320, h: 288 }, 8),
  recycle: toCanvas({ x: 712, y: 352, w: 320, h: 404 }, 8),
  convert: toCanvas({ x: 712, y: 448, w: 320, h: 308 }, 8),
  money: toCanvas({ x: 712, y: 550, w: 320, h: 206 }, 8),
};
