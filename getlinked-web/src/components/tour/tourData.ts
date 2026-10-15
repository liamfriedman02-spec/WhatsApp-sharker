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
