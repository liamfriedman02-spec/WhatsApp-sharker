/**
 * Playbooks: multi-day plans the coach leads, one step per day, everything prepared.
 * The 10-day launch program teaches a new Boss how the money works, opens their social
 * pages and brings their first players; short campaigns run when the moment is right
 * (bring-a-friend week, comeback week, new-channel week).
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
import { money } from "../util/format.js";

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
  /** One thing the Boss learns today about how the money works (shown before the task). */
  lesson?: (ctx: ContentCtx, state: CoachState) => string;
  /** The 2-minute version, offered when the day is busy or the step stays undone (lowercase, single line). */
  small?: (ctx: ContentCtx, state: CoachState) => string;
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
/** The Boss already runs this page (told us at the start, or the AI Agent posts there). */
const hasSocial = (c: ContentCtx, s: CoachState, network: string) =>
  c.boss.aiAgent.connectedSocials.includes(network) || s.prefs.socials.includes(network) || !!s.channels[network];
const invitesFor = (c: ContentCtx, s: CoachState, fallback: string[]) => {
  const picked = s.audiences.map(getAudience).filter((a) => a !== undefined);
  return (picked.length ? picked : fallback.map(getAudience).filter((a) => a !== undefined)).slice(0, 2).map((a) => a.invite(c));
};

export const PLAYBOOKS: Playbook[] = [
  {
    id: "launch",
    kind: "sprint",
    emoji: "🚀",
    title: "Launch program",
    description: "10 days: learn how the money works, open your pages, first players",
    intro: (c) =>
      `Here's how we build *${brand(c)}* together: 10 days, one step a day, about 10 minutes each. Every day I teach you one thing about how the money works, I prepare the texts and the guides, and you press send. I'm with you every day.`,
    eligible: (c) => c.boss.brandLaunchedAt !== null && c.boss.stats.totalPlayers < 10 && launchedDays(c) <= 45,
    score: (c) => (c.boss.stats.totalPlayers < 10 ? 100 : 0),
    success: (c) =>
      `🏁 *You did it, ${first(c)}!* 10 days of real work on *${brand(c)}*: your pages are open, your people know about you, and you know how the money works. From here we keep the rhythm: one mission a day, and your goal for the month. I'm still right here.`,
    steps: [
      {
        title: "Your first 5 players",
        mission: () => "invite_friends",
        ask: "audience",
        lesson: () => "You earn from your players' activity. Your first players are people who already trust you, so that's where we start.",
        brief: () => "Day 1. Tell me who's around you and I'll write each invite in your voice. Then you send it to 5 people today.",
        small: () => "send your invite to just one person you trust",
      },
      {
        title: "Your Instagram page",
        mission: (c, s) => (hasSocial(c, s, "instagram") ? "bio_link" : "open_instagram"),
        lesson: () => "Your Instagram page is your shop window. People look at it before they join. Your brand name, one clear line and your link turn a visit into a player.",
        brief: (c, s) =>
          hasSocial(c, s, "instagram")
            ? "Day 2. You already have Instagram, great. Today we make it sell: your brand link in the bio and one line that says why people should join."
            : "Day 2. Today we open your brand's Instagram. I'll walk you through it, step by step, in about 10 minutes.",
        button: (c, s) => (hasSocial(c, s, "instagram") ? null : { id: "guide:open_instagram", title: "🧭 Open it with me" }),
        small: (c, s) => (hasSocial(c, s, "instagram") ? "put your brand link in your bio, nothing else" : "create the account with your brand name, the rest can wait"),
      },
      {
        title: "Marketing on autopilot",
        mission: (c) => agentMission(c),
        lesson: () => "Your AI Marketing Agent creates and publishes posts on your pages every day. You do the personal part, it does the public part, even while you sleep.",
        brief: (c) =>
          c.stage === "live"
            ? "Day 3. Your AI Agent is already posting for you. Today you multiply its reach."
            : c.stage === "needs_socials"
              ? "Day 3. Your AI Agent is on. Connect your Instagram to it and it starts posting for you."
              : "Day 3. Turn on your AI Marketing Agent and connect your Instagram. One minute each, and your marketing runs itself.",
        button: (c) => agentButton(c),
        small: (c) => (c.stage === "not_activated" ? "just tap Activate on the AI Agent page" : "connect one account, that's all"),
      },
      {
        title: "Your TikTok page",
        mission: (c, s) => (hasSocial(c, s, "tiktok") ? "first_video" : "open_tiktok"),
        lesson: () => "TikTok shows your videos to people who don't know you yet. That's how you grow beyond the people around you.",
        brief: (c, s) =>
          hasSocial(c, s, "tiktok")
            ? "Day 4. You already have TikTok. Today you use it: one short video about your brand."
            : "Day 4. Today we open your brand's TikTok. Same as Instagram: your brand name, your link, done.",
        button: (c, s) => (hasSocial(c, s, "tiktok") ? null : { id: "guide:open_tiktok", title: "🧭 Open it with me" }),
        small: (c, s) => (hasSocial(c, s, "tiktok") ? "film one 10-second clip, you can post it tomorrow" : "create the account with your brand name"),
      },
      {
        title: "Groups and status",
        mission: () => "share_groups",
        lesson: () => "Your WhatsApp status and your groups reach many people at once, and they already know your name.",
        brief: () => "Day 5. Today we go wide: 3 groups where people know you, and your status. Here are your texts. Forward, post, done.",
        texts: (c) => [getAudience("community")!.invite(c), fallbackPosts(c)[0]!],
        small: () => "post your link on your WhatsApp status, 30 seconds",
      },
      {
        title: "Your first video",
        mission: () => "first_video",
        lesson: () => "People join people. A short video with your face beats any perfect design.",
        brief: () => "Day 6. Ten seconds, your face, your phone. Here's what to say, word for word.",
        texts: (c) => [`Script: "Hi! I just launched my own brand, ${brand(c)}. I built it myself and I'd love you to join me. The link is in my bio!"`],
        small: () => "post one story with your link instead",
      },
      {
        title: "Welcome and follow up",
        mission: (c) => (c.boss.stats.newPlayers7d > 0 ? "welcome_players" : "second_touch"),
        lesson: () => "A sign-up isn't money yet. Money comes when players play. A personal welcome is the best start a player can get.",
        brief: (c) =>
          c.boss.stats.newPlayers7d > 0
            ? `Day 7. ${c.boss.stats.newPlayers7d} people joined *${brand(c)}* this week. Welcome each one personally, then send one friendly follow-up to the people who didn't answer yet.`
            : "Day 7. Not everyone answers the first message. Today you send a friendly follow-up to everyone who got your invite. No pressure, just a reminder.",
        texts: (c) => [welcomeText(c), followUpText(c)],
        small: () => "send the follow-up to one person",
      },
      {
        title: "Bring a friend",
        mission: (c) => (c.boss.stats.totalPlayers >= 1 ? "ask_referral" : "invite_friends"),
        lesson: () => "Players bring players. An invite from a friend is the strongest invite there is.",
        brief: (c) =>
          c.boss.stats.totalPlayers >= 1
            ? "Day 8. Your players know people like them. Today you ask 3 of them to bring one friend each."
            : "Day 8. Five more personal invites today. Pick people you haven't written to yet.",
        texts: (c, s) => (c.boss.stats.totalPlayers >= 1 ? [referralText(c)] : invitesFor(c, s, ["friends"])),
        small: () => "ask one player, or invite one more person",
      },
      {
        title: "Get paid",
        mission: (c) => (c.boss.payouts.methodConfigured ? "see_earnings" : "setup_payouts"),
        lesson: (c) =>
          c.boss.stats.earningsTotal > 0
            ? `Your brand has earned ${money(c.boss.stats.earningsTotal, c.boss.stats.currency)} so far. Every time your players play, that number grows, and your payouts bring it to you.`
            : "Every time your players play, you earn. Your payout method is where that money goes, so we set it up before the first earnings arrive.",
        brief: (c) =>
          c.boss.payouts.methodConfigured
            ? "Day 9. Your payouts are set. Today open your earnings and see where your money comes from."
            : "Day 9. Today we set up your payouts, once, so every earning can reach you.",
        button: (c) => (c.boss.payouts.methodConfigured ? null : { id: "guide:setup_payouts", title: "🧭 Guide me" }),
        small: () => "open Boss Hub, Earnings, and just look",
      },
      {
        title: "Your plan for the month",
        mission: () => "plan_month",
        lesson: () => "Now you know how it works: more players, more activity, more earnings. A clear target tells us how many players to bring.",
        brief: (c) => `Day 10. Look at what you built. Now we turn it into a plan: how much you want *${brand(c)}* to earn a month, and the players that takes.`,
        button: () => ({ id: "money:menu", title: "💰 Earnings math" }),
        small: () => "tell me one number: how much you want to earn a month",
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
    intro: (c) => `You already brought these players to *${brand(c)}*. For 3 days we bring them back. That's the fastest earnings you can add.`,
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
        brief: (c) => (c.stage === "live" ? "Day 3. Your AI Agent posts for you. Share its best post on the new channel too." : "Day 3. Connect the new channel to your AI Agent so it keeps posting there without you."),
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
