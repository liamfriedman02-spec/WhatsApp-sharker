/**
 * Playbooks — multi-day plans the coach leads, one step per day, everything prepared:
 * the 7-day launch sprint (first players, first earnings) and short campaigns a Boss
 * runs when the moment is right (bring-a-friend week, comeback week, new-channel week).
 *
 * Each step names a mission (so ✅ Done, points, streaks and verification all work),
 * says what the coach says, and hands over the ready-to-send texts for the day.
 */
import type { CoachState } from "../coach/types.js";
import type { Button } from "../whatsapp/types.js";
import { nextChannel } from "./channels.js";
import type { ContentCtx } from "./context.js";
import { comebackText, followUpText, getAudience, referralText, welcomeText } from "./invites.js";
import { fallbackPosts } from "./posts.js";

export type PlaybookId = "launch" | "friend_week" | "comeback_week" | "channel_week";

export interface PlaybookStep {
  /** Short name of the day (≤ 40 chars). */
  title: string;
  /** Mission id for the day (may depend on the Boss's situation). */
  mission: (ctx: ContentCtx, state: CoachState) => string;
  /** The coach's lead-in: decisive, one or two sentences. */
  brief: (ctx: ContentCtx, state: CoachState) => string;
  /** Ready-to-send texts, each sent as its own message ("{link}" = brand link). */
  texts?: (ctx: ContentCtx, state: CoachState) => string[];
  /** The step opens with a question instead of texts. */
  ask?: "audience";
  /** Extra button for the day (a guide, the goal setter…). */
  button?: (ctx: ContentCtx, state: CoachState) => Button | null;
}

export interface Playbook {
  id: PlaybookId;
  kind: "sprint" | "campaign";
  emoji: string;
  /** ≤ 20 chars (fits a list row with the emoji). */
  title: string;
  /** List row description (≤ 72 chars). */
  description: string;
  intro: (ctx: ContentCtx) => string;
  steps: PlaybookStep[];
  /** Can this Boss run it now? */
  eligible: (ctx: ContentCtx, state: CoachState) => boolean;
  /** How valuable it is right now (highest eligible one is proposed). */
  score: (ctx: ContentCtx, state: CoachState) => number;
  success: (ctx: ContentCtx) => string;
}

const brand = (c: ContentCtx) => c.boss.brandName;
const first = (c: ContentCtx) => c.boss.firstName;
const launchedDays = (c: ContentCtx) => (c.boss.brandLaunchedAt ? (c.now.getTime() - new Date(c.boss.brandLaunchedAt).getTime()) / 86_400_000 : 99);

/** The Agent step of a playbook: always the Boss's *next* Agent step. */
const agentMission = (c: ContentCtx) => (c.stage === "not_activated" ? "activate_agent" : c.stage === "needs_socials" ? "connect_socials" : c.boss.aiAgent.postsPublished7d > 0 ? "share_agent_post" : "post_story");
const agentButton = (c: ContentCtx): Button | null =>
  c.stage === "not_activated" ? { id: "guide:activate_agent", title: "🧭 Guide me" } : c.stage === "needs_socials" ? { id: "guide:connect_socials", title: "🧭 Guide me" } : null;
const channelButton = (c: ContentCtx, s: CoachState): Button | null => {
  const ch = nextChannel(c, s);
  return ch?.guide ? { id: `guide:${ch.guide}`, title: `🧭 Open ${ch.name.split(" ")[0]}` } : null;
};
const invitesFor = (c: ContentCtx, s: CoachState, fallback: string[]) => {
  const picked = s.audiences.map(getAudience).filter((a) => a !== undefined);
  return (picked.length ? picked : fallback.map(getAudience).filter((a) => a !== undefined)).slice(0, 2).map((a) => a.invite(c));
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "launch",
    kind: "sprint",
    emoji: "🚀",
    title: "7-day launch sprint",
    description: "Your first players and your first earnings, 10 minutes a day",
    intro: (c) =>
      `Here's how we get *${brand(c)}* its first players: 7 days, one step a day, 10 minutes each. I prepare every text, you press send. Day 1 starts now.`,
    eligible: (c) => c.boss.brandLaunchedAt !== null && c.boss.stats.totalPlayers < 10 && launchedDays(c) <= 45,
    score: (c) => (c.boss.stats.totalPlayers < 10 ? 100 : 0),
    success: (c) =>
      `🏁 *Sprint complete, ${first(c)}!* 7 days of real work on *${brand(c)}*. From here we keep the rhythm: one mission a day, and your goal for the month. I'm with you.`,
    steps: [
      {
        title: "Your list of 20",
        mission: () => "invite_friends",
        ask: "audience",
        brief: (c) =>
          `Day 1. Your first players come from people who know you — not from strangers. Tell me who's around you and I'll write each invite in your voice. Then you send it to 5 people today.`,
      },
      {
        title: "Groups and status",
        mission: () => "share_groups",
        brief: () => "Day 2. Today we go wide: 3 groups where people know you, and your WhatsApp status. Here are your texts — forward, post, done.",
        texts: (c) => [getAudience("community")!.invite(c), fallbackPosts(c)[0]!],
      },
      {
        title: "Marketing on autopilot",
        mission: (c) => agentMission(c),
        brief: (c) =>
          c.stage === "live"
            ? "Day 3. Your AI Agent is already posting for you — today you multiply its reach."
            : "Day 3. You've been doing the personal part. Now put the public part on autopilot: your AI Marketing Agent posts for your brand every day, even while you sleep.",
        button: (c) => agentButton(c),
      },
      {
        title: "A new channel",
        mission: (c, s) => (nextChannel(c, s) ? "open_channel" : "bio_link"),
        brief: (c, s) => {
          const ch = nextChannel(c, s);
          return ch
            ? `Day 4. Time for a new door into *${brand(c)}*: ${ch.emoji} ${ch.name}. ${ch.why} I'll walk you through it in 10 minutes.`
            : `Day 4. Every channel you have should carry your link. Today: your bio, everywhere.`;
        },
        texts: (c) => [getAudience("online")!.invite(c)],
        button: (c, s) => channelButton(c, s),
      },
      {
        title: "Welcome and follow up",
        mission: (c) => (c.boss.stats.newPlayers7d > 0 ? "welcome_players" : "second_touch"),
        brief: (c) =>
          c.boss.stats.newPlayers7d > 0
            ? `Day 5. ${c.boss.stats.newPlayers7d} people joined *${brand(c)}* this week. A welcome from you is what turns a sign-up into a player who plays. Then one friendly follow-up to the ones who didn't answer yet.`
            : "Day 5. Most people join on the second message. Today you send a friendly follow-up to everyone who got your invite and didn't answer. No pressure, just a reminder.",
        texts: (c) => [welcomeText(c), followUpText(c)],
      },
      {
        title: "Bring a friend",
        mission: (c) => (c.boss.stats.totalPlayers >= 1 ? "ask_referral" : "invite_friends"),
        brief: (c) =>
          c.boss.stats.totalPlayers >= 1
            ? "Day 6. Your players know people like them. Today you ask 3 of them to bring one friend each — the cheapest new players you'll ever get."
            : "Day 6. Five more personal invites today. Pick people you haven't written to yet.",
        texts: (c, s) => (c.boss.stats.totalPlayers >= 1 ? [referralText(c)] : invitesFor(c, s, ["friends"])),
      },
      {
        title: "Your plan for the month",
        mission: () => "plan_month",
        brief: (c) => `Day 7. Look at what you built this week. Now we turn it into a plan: your goal for the next 3 weeks, from *${brand(c)}*'s own numbers.`,
        button: () => ({ id: "money:menu", title: "💰 Earnings math" }),
      },
    ],
  },
  {
    id: "friend_week",
    kind: "campaign",
    emoji: "🤝",
    title: "Bring-a-friend week",
    description: "Your players bring the next players. 3 days.",
    intro: (c) => `Your players are your best marketers. For 3 days we make *${brand(c)}* grow through them: ask, post, welcome. Texts ready.`,
    eligible: (c) => c.boss.stats.totalPlayers >= 3,
    score: (c) => (c.boss.stats.activePlayers7d >= 3 ? 60 : 0),
    success: (c) => `🤝 *Bring-a-friend week done!* Every friend who joined *${brand(c)}* this week came because you asked. Keep asking.`,
    steps: [
      { title: "Ask your players", mission: () => "ask_referral", brief: () => "Day 1. Send this to your 3 most active players today. Personal, one by one.", texts: (c) => [referralText(c)] },
      {
        title: "Say it publicly",
        mission: () => "share_status",
        brief: () => "Day 2. Now everyone: post this on your status so every player sees the ask.",
        texts: (c) => [`This week on *${brand(c)}*: bring a friend 🤝 Send them my link and let's grow together: {link}`],
      },
      { title: "Welcome the newcomers", mission: () => "welcome_players", brief: () => "Day 3. Welcome every new player personally, and thank the players who brought them.", texts: (c) => [welcomeText(c)] },
    ],
  },
  {
    id: "comeback_week",
    kind: "campaign",
    emoji: "🔁",
    title: "Comeback week",
    description: "Bring your inactive players back. 3 days.",
    intro: (c) => `You already brought these players to *${brand(c)}*. For 3 days we bring them back — that's the fastest earnings you can add.`,
    eligible: (c) => c.boss.stats.totalPlayers - c.boss.stats.activePlayers7d >= 5,
    score: (c) => (c.boss.stats.totalPlayers - c.boss.stats.activePlayers7d >= 5 ? 70 : 0),
    success: (c) => `🔁 *Comeback week done!* Players who came back to *${brand(c)}* are earnings you didn't have last week.`,
    steps: [
      { title: "Message 5 players", mission: () => "reengage_players", brief: () => "Day 1. Five of your inactive players get this today. Short, warm, personal.", texts: (c) => [comebackText(c)] },
      {
        title: "Post for all of them",
        mission: () => "share_status",
        brief: () => "Day 2. Your status reaches the ones you didn't message. Post this.",
        texts: (c) => [`Missed some of you on *${brand(c)}* 👀 Come back for a round this week: {link}`],
      },
      { title: "Five more", mission: () => "reengage_players", brief: () => "Day 3. Five more players, same message. Consistency is what brings them back.", texts: (c) => [comebackText(c)] },
    ],
  },
  {
    id: "channel_week",
    kind: "campaign",
    emoji: "📣",
    title: "New-channel week",
    description: "Open a new channel and fill it. 3 days.",
    intro: (c) => `More channels, more doors into *${brand(c)}*. In 3 days we open your next channel, fill it, and connect it to your marketing.`,
    eligible: (c, s) => nextChannel(c, s) !== null,
    score: (c, s) => (nextChannel(c, s) ? 50 : 0),
    success: (c) => `📣 *New channel live for ${brand(c)}!* One more place where players find you every day.`,
    steps: [
      {
        title: "Open it",
        mission: () => "open_channel",
        brief: (c, s) => {
          const ch = nextChannel(c, s);
          return `Day 1. Your next channel: ${ch ? `${ch.emoji} ${ch.name}. ${ch.why}` : "pick one below."} Let's open it now.`;
        },
        button: (c, s) => channelButton(c, s),
      },
      { title: "Fill it", mission: () => "post_story", brief: () => "Day 2. A channel with one post is empty. Today: a story about your brand, with your link.", texts: (c) => fallbackPosts(c).slice(1, 2) },
      {
        title: "Connect it",
        mission: (c) => (c.stage === "live" ? "share_agent_post" : agentMission(c)),
        brief: (c) => (c.stage === "live" ? "Day 3. Your AI Agent posts for you — share its best post on the new channel too." : "Day 3. Connect the new channel to your AI Agent so it keeps posting there without you."),
        button: (c) => agentButton(c),
      },
    ],
  },
];

export function getPlaybook(id: string): Playbook | undefined {
  return PLAYBOOKS.find((p) => p.id === id);
}

/** Playbooks this Boss could start now, best first (active and already-run ones excluded). */
export function availablePlaybooks(ctx: ContentCtx, state: CoachState): Playbook[] {
  return PLAYBOOKS.filter((p) => p.id !== state.playbook?.id && !state.playbooksDone.includes(p.id) && p.eligible(ctx, state))
    .map((p) => ({ p, score: p.score(ctx, state) }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ p }) => p);
}

/** The playbook the coach would propose right now, if any. */
export function proposePlaybook(ctx: ContentCtx, state: CoachState): Playbook | null {
  if (state.playbook?.status === "active") return null;
  return availablePlaybooks(ctx, state)[0] ?? null;
}
