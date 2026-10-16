import type { ReactNode } from 'react';
import { ButtonLink } from '@/components/site/ButtonLink';
import { DEMO_URL } from '@/components/site/links';

const TELEGRAM = '#2aabee';

const icon = (path: ReactNode) => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {path}
  </svg>
);

function TelegramMark({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill={TELEGRAM} />
      <path d="M5.4 11.7l11.3-4.4c.5-.2 1 .1.8.9l-1.9 9c-.1.6-.5.8-1.1.5l-2.9-2.2-1.4 1.4c-.2.2-.3.3-.6.3l.2-3 5.4-4.9c.2-.2 0-.3-.3-.1l-6.7 4.2-2.9-.9c-.6-.2-.6-.6.1-.8z" fill="#fff" />
    </svg>
  );
}

const CAPABILITIES = [
  {
    title: 'Analyzes your performance',
    body: 'Watches conversions, buyers and routes, and tells you what to change to get better results.',
    icon: icon(
      <>
        <path d="M4 20h16" />
        <path d="M6 16l4.5-5 3.5 3 5-6.5" />
        <path d="M15 7.5h4v4" />
      </>,
    ),
  },
  {
    title: 'Sends your reports to Telegram',
    body: 'Performance reports arrive in your Telegram on schedule, without logging in.',
    icon: icon(
      <>
        <path d="M6 3h9l3 3v15H6z" />
        <path d="M9 10h6M9 14h6M9 18h3" />
      </>,
    ),
  },
  {
    title: 'Control GetLinked from the chat',
    body: 'Act on a suggestion with one tap, or send a command to change your setup on the go.',
    icon: icon(
      <>
        <path d="M5 6h9M18 6h1M5 12h3M12 12h7M5 18h11M20 18h-1" />
        <circle cx="16" cy="6" r="2" />
        <circle cx="10" cy="12" r="2" />
        <circle cx="18" cy="18" r="2" />
      </>,
    ),
  },
];

function BotBubble({ children, time }: { children: ReactNode; time: string }) {
  return (
    <div className="mr-8 self-start rounded-[16px] rounded-bl-[6px] bg-white px-3 py-2 text-[12.5px] leading-snug text-[#0f1b2d] shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
      {children}
      <span className="mt-0.5 block text-right text-[10px] text-[#8a98a8]">{time}</span>
    </div>
  );
}

function UserBubble({ children, time }: { children: ReactNode; time: string }) {
  return (
    <div className="ml-10 self-end rounded-[16px] rounded-br-[6px] bg-[#e1f7d0] px-3 py-2 text-[12.5px] leading-snug text-[#0f1b2d] shadow-[0_1px_1px_rgb(0_0_0/0.08)]">
      {children}
      <span className="mt-0.5 flex items-center justify-end gap-1 text-[10px] text-[#4fae4e]">
        {time}
        <svg viewBox="0 0 16 10" className="h-2.5 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M1 5.5l2.5 2.5L9 2.5M7 8l5.5-5.5" />
        </svg>
      </span>
    </div>
  );
}

/** A Telegram conversation with GetLinked Bot, on a phone. Sample data. */
function TelegramPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[372px]">
      <div aria-hidden="true" className="absolute -inset-10 rounded-full bg-[radial-gradient(closest-side,rgb(47_91_234/0.22),transparent)]" />
      <div
        role="img"
        aria-label="Sample Telegram chat: GetLinked Bot sends a daily report, suggests moving traffic from Advertiser C to Advertiser D, and confirms the change and a new cap"
        className="relative rounded-[46px] bg-[#0c1838] p-[10px] shadow-[0_50px_100px_-40px_rgb(14_34_95/0.6)]"
      >
        <div aria-hidden="true" className="overflow-hidden rounded-[37px] bg-[#dfe6ee]">
          {/* Status bar and chat header */}
          <div className="bg-white px-5 pb-2.5 pt-3">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#0f1b2d]">
              <span>9:41</span>
              <span className="h-[22px] w-[86px] rounded-full bg-[#0c1838]" />
              <span className="flex items-center gap-1">
                <svg viewBox="0 0 18 12" className="h-2.5 w-4" fill="currentColor">
                  <rect x="0" y="8" width="3" height="4" rx="1" />
                  <rect x="5" y="5" width="3" height="7" rx="1" />
                  <rect x="10" y="2" width="3" height="10" rx="1" />
                  <rect x="15" y="0" width="3" height="12" rx="1" opacity="0.35" />
                </svg>
                <span className="inline-block h-2.5 w-5 rounded-[3px] border border-current p-px">
                  <span className="block h-full w-3/4 rounded-[1px] bg-current" />
                </span>
              </span>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <svg viewBox="0 0 10 16" className="h-4 w-2.5 text-[#2aabee]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2L2 8l6 6" />
              </svg>
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[linear-gradient(180deg,#2f5bea,#1c3fa6)] font-display text-[17px] font-bold text-white">g</span>
              <span className="min-w-0">
                <span className="block text-[13.5px] font-semibold text-[#0f1b2d]">GetLinked Bot</span>
                <span className="block text-[11px] text-[#8a98a8]">bot</span>
              </span>
            </div>
          </div>

          {/* Messages */}
          <div className="flex flex-col gap-2 bg-[radial-gradient(rgb(255_255_255/0.5)_1px,transparent_1px)] bg-[size:14px_14px] px-3 py-3">
            <span className="self-center rounded-full bg-black/15 px-2.5 py-0.5 text-[10.5px] font-medium text-white">Today</span>

            <BotBubble time="09:00">
              <span className="block font-semibold">Daily report · 15 Oct</span>
              <span className="mt-1.5 grid grid-cols-[1fr_auto] gap-x-6 gap-y-0.5 tabular-nums">
                <span className="text-[#5b6b80]">Leads</span>
                <span className="text-right font-medium">34,855</span>
                <span className="text-[#5b6b80]">FTDs</span>
                <span className="text-right font-medium">574</span>
                <span className="text-[#5b6b80]">Profit</span>
                <span className="text-right font-semibold text-[#149a55]">$48,210.40</span>
              </span>
            </BotBubble>

            <div className="mr-8 flex flex-col gap-1 self-start">
              <BotBubble time="11:24">
                <span className="block font-semibold">Suggestion</span>
                Advertiser C converts 1.2% on CA · Finance today, down from 2.1%. Advertiser D converts 1.9% on the same traffic.
              </BotBubble>
              <div className="grid grid-cols-2 gap-1">
                <span className="rounded-[10px] bg-black/20 py-1.5 text-center text-[11.5px] font-medium text-white">Move 20% to D</span>
                <span className="rounded-[10px] bg-black/20 py-1.5 text-center text-[11.5px] font-medium text-white">Ignore</span>
              </div>
            </div>

            <UserBubble time="11:25">Move 20% to D</UserBubble>
            <BotBubble time="11:25">Done. Advertiser D now gets 30% of CA · Finance · Tier 1.</BotBubble>

            <UserBubble time="11:31">
              <span className="font-medium text-[#2a7fd4]">/cap</span> Advertiser A 80
            </UserBubble>
            <BotBubble time="11:31">Daily cap for Advertiser A is now 80.</BotBubble>
          </div>

          {/* Input */}
          <div className="flex items-center gap-2 bg-white px-3 py-2.5">
            <span className="flex-1 rounded-full bg-[#f1f3f6] px-3.5 py-2 text-[12px] text-[#8a98a8]">Message</span>
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#2aabee] text-white">
              <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                <path d="M1.5 7.2l12.2-5.1c.6-.2 1 .2.8.8l-5.1 12.2c-.2.6-1 .6-1.2 0L6.8 9.2 1.5 7.2c-.6-.2-.6-.8 0-1z" />
              </svg>
            </span>
          </div>
        </div>
      </div>
      <p className="relative mt-4 text-center text-[0.8125rem] text-faint">Sample conversation.</p>
    </div>
  );
}

/** GetLinked Bot: analysis, reports and control, through Telegram. */
export function BotSection() {
  return (
    <section id="bot" className="scroll-mt-20 overflow-hidden bg-white py-24 sm:py-32">
      <div className="container-page grid items-center gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:gap-20">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-[#e8f6fd] py-1 pl-1 pr-3 text-[0.8125rem] font-semibold text-[#1683b9]">
            <TelegramMark className="h-5 w-5" />
            Works with Telegram
          </span>
          <h2 className="mt-5 font-display text-[clamp(2rem,4.2vw,3.25rem)] font-semibold leading-[1.04] tracking-[-0.035em] text-ink [text-wrap:balance]">
            Meet GetLinked Bot.
          </h2>
          <p className="mt-5 max-w-[34rem] text-[1.0625rem] leading-relaxed text-muted sm:text-[1.125rem]">
            Your network’s analyst, in Telegram. It studies your performance, tells you how to improve it, sends your reports
            and lets you run GetLinked from a chat.
          </p>

          <ul className="mt-10 space-y-7">
            {CAPABILITIES.map((c) => (
              <li key={c.title} className="grid grid-cols-[44px_1fr] gap-x-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-[13px] bg-mist text-bright">{c.icon}</span>
                <span>
                  <span className="block text-[1.125rem] font-semibold tracking-[-0.01em] text-ink">{c.title}</span>
                  <span className="mt-1 block max-w-[30rem] text-[1rem] leading-relaxed text-muted">{c.body}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-10">
            <ButtonLink href={DEMO_URL} size="lg">
              See GetLinked Bot in a demo
            </ButtonLink>
          </div>
        </div>

        <TelegramPhone />
      </div>
    </section>
  );
}
