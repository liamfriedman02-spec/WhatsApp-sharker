import type { ReactNode } from 'react';
import { APP_H, APP_W, NAV, SIDEBAR_W, TOPBAR_H } from './appData';
import {
  IconBell,
  IconChart,
  IconCursor,
  IconGrid,
  IconInvoice,
  IconLayers,
  IconMoon,
  IconRecycle,
  IconSearch,
  IconShield,
  IconSidebar,
  IconTarget,
  IconUser,
  IconUsers,
} from './icons';

const ICONS = {
  grid: IconGrid,
  cursor: IconCursor,
  chart: IconChart,
  target: IconTarget,
  users: IconUsers,
  user: IconUser,
  layers: IconLayers,
  recycle: IconRecycle,
  invoice: IconInvoice,
  shield: IconShield,
};

/** Vertical position of every sidebar item, so the active pill can travel between them. */
export function navLayout() {
  const items: Record<string, number> = {};
  const groups: { label: string; y: number }[] = [];
  let y = 104;
  for (const g of NAV) {
    groups.push({ label: g.group, y });
    y += 18;
    for (const item of g.items) {
      items[item.id] = y;
      y += 30;
    }
    y += 12;
  }
  return { items, groups };
}

/** The GetLinked app shell: navy sidebar, top bar, and a main area for the active view. */
export function AppFrame({ children }: { children: ReactNode }) {
  const { items, groups } = navLayout();
  return (
    <div
      className="app-ui absolute left-0 top-0 rounded-[18px] bg-[var(--ui-bg)]"
      style={{ width: APP_W, height: APP_H }}
    >
      {/* Sidebar */}
      <div
        className="absolute left-0 top-0 h-full rounded-l-[18px] bg-[var(--ui-navy)] text-[#aeb8d0]"
        style={{ width: SIDEBAR_W }}
      >
        <div className="absolute left-4 right-4 top-[18px] flex h-7 items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[var(--ui-green)] text-[13px] font-bold text-white">
            g
          </span>
          <span className="text-[13.5px] font-semibold tracking-[-0.01em] text-white">getlinked</span>
          <IconSidebar size={13} className="ml-auto text-[#6f7ca0]" />
        </div>
        <div className="absolute left-3 right-3 top-[58px] flex h-[30px] items-center rounded-lg bg-[var(--ui-navy-2)] px-2.5 text-[11px] text-[#6f7ca0]">
          Search menu
          <span className="ui-mono ml-auto rounded border border-white/10 px-1 text-[9px]">Ctrl K</span>
        </div>

        <div
         
          className="absolute left-3 right-3 h-7 rounded-lg bg-[#1b2b5b] ring-1 ring-inset ring-white/[0.06]"
          style={{ top: items.dashboard }}
        />

        {groups.map((g) => (
          <span
            key={g.label}
            className="absolute left-5 text-[9px] font-semibold uppercase tracking-[0.08em] text-[#5d6a8f]"
            style={{ top: g.y }}
          >
            {g.label}
          </span>
        ))}
        {NAV.flatMap((g) => g.items).map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <span
              key={item.id}
             
              className={`absolute left-5 flex h-7 items-center gap-2.5 text-[11.5px] font-medium ${
                item.id === 'dashboard' ? 'text-white' : ''
              }`}
              style={{ top: items[item.id] }}
            >
              <Icon size={13} />
              {item.label}
            </span>
          );
        })}

        <div className="absolute bottom-3 left-3 right-3 flex h-8 items-center rounded-lg bg-[var(--ui-navy-2)] px-3 text-[10px] text-[#6f7ca0]">
          Sidebar colour
          <span className="ml-auto flex gap-1.5">
            <span className="h-3 w-3 rounded-full ring-2 ring-[var(--ui-green)]" />
            <span className="h-3 w-3 rounded-full bg-[#1d2b55]" />
            <span className="h-3 w-3 rounded-full bg-white" />
          </span>
        </div>
      </div>

      {/* Top bar */}
      <div
        className="absolute right-0 top-0 flex items-center gap-3 rounded-tr-[18px] border-b border-[var(--ui-line)] bg-white px-6"
        style={{ left: SIDEBAR_W, height: TOPBAR_H }}
      >
        <div className="flex h-[30px] w-[270px] items-center gap-2 rounded-lg border border-[var(--ui-line)] bg-[var(--ui-bg)] px-2.5 text-[11px] text-[var(--ui-faint)]">
          <IconSearch size={12} />
          Search leads, affiliates, offers…
          <span className="ui-mono ml-auto text-[9px]">⌘K</span>
        </div>
        <span className="ml-auto rounded-full bg-[var(--ui-green-soft)] px-2.5 py-1 text-[10px] font-medium text-[#1f7a43]">
          Sample data
        </span>
        <span className="ui-mono text-[10.5px] text-[var(--ui-muted)]">15 Oct 2026 · 14:09 UTC</span>
        <IconBell size={15} className="text-[var(--ui-muted)]" />
        <IconMoon size={15} className="text-[var(--ui-muted)]" />
      </div>

      {/* Main area */}
      <div className="absolute" style={{ left: SIDEBAR_W, top: TOPBAR_H, right: 0, bottom: 0 }}>
        {children}
      </div>
    </div>
  );
}
