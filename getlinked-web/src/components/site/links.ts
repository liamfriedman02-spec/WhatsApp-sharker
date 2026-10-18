/** Every "Book a Demo" button scrolls to the demo form at the bottom of the page. */
export const DEMO_URL = '#demo';

/**
 * Where the demo form sends its data (a POST with a JSON body). Set NEXT_PUBLIC_DEMO_FORM_ENDPOINT to a
 * form service or CRM webhook before launch. Without it the form validates but tells the visitor
 * that nothing was sent.
 */
export const DEMO_FORM_ENDPOINT = process.env.NEXT_PUBLIC_DEMO_FORM_ENDPOINT ?? '';

/** GetLinked's Telegram contact. Replace with the real username, e.g. https://t.me/<username>. */
export const TELEGRAM_URL = 'https://t.me/';
