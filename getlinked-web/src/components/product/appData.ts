/**
 * Layout of the GetLinked app recreation. All figures shown in it are sample data for
 * illustration; none of them are real customer results.
 */

/** The product canvas is designed at a fixed size and scaled to fit. */
export const APP_W = 1280;
export const APP_H = 820;
export const SIDEBAR_W = 224;
export const TOPBAR_H = 56;

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
