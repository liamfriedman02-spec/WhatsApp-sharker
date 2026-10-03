/**
 * Buttons the AI coach may attach under a free-text reply, so every answer ends with the
 * obvious next tap. Ids are the router's reply ids; the model only picks from this list.
 */
export const QUICK_BUTTONS = {
  "mission:today": "🎯 Today's mission",
  "mission:done": "✅ Done",
  "play:today": "🚀 My plan today",
  "play:menu": "📣 Campaigns",
  "texts:menu": "💌 Texts for me",
  "post:write": "✍️ Write me a post",
  "money:menu": "💰 Earnings math",
  "goal:new": "🎯 Set a goal",
  "coach:progress": "🏆 My progress",
  "channels:menu": "📣 My channels",
  "menu:business": "📊 My business",
  "menu:ai_agent": "🤖 My AI Agent",
  "handoff:start": "🙋 Talk to a human",
  "menu:main": "🏠 Menu",
} as const satisfies Record<string, string>;

export type QuickButtonId = keyof typeof QUICK_BUTTONS;
export const QUICK_BUTTON_IDS = Object.keys(QUICK_BUTTONS) as QuickButtonId[];

export const isQuickButton = (v: string): v is QuickButtonId => v in QUICK_BUTTONS;
