'use client';

import { useState, type FormEvent, type ReactNode } from 'react';
import { DEMO_FORM_ENDPOINT } from '@/components/site/links';

const VERTICALS = ['Finance', 'iGaming', 'Both'];
const VOLUMES = ['Under 10k', '10k–50k', '50k–200k', '200k+'];

type Fields = { name: string; email: string; company: string; telegram: string; vertical: string; volume: string; message: string };
type Errors = Partial<Record<keyof Fields, string>>;
type Status = 'idle' | 'sending' | 'sent' | 'error' | 'unconnected';

const EMPTY: Fields = { name: '', email: '', company: '', telegram: '', vertical: '', volume: '', message: '' };

function validate(f: Fields): Errors {
  const e: Errors = {};
  if (!f.name.trim()) e.name = 'Enter your name.';
  if (!f.email.trim()) e.email = 'Enter your work email.';
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim())) e.email = 'Enter an email address like name@company.com.';
  if (!f.company.trim()) e.company = 'Enter your company name.';
  if (!f.vertical) e.vertical = 'Choose your industry.';
  if (!f.volume) e.volume = 'Choose your monthly lead volume.';
  return e;
}

const input =
  'block h-12 w-full rounded-xl bg-white px-4 text-[1rem] text-ink ring-1 ring-inset ring-line outline-none transition-shadow placeholder:text-faint focus:ring-2 focus:ring-accent aria-[invalid=true]:ring-2 aria-[invalid=true]:ring-[#d64545]';

function Field({ id, label, optional, error, children }: { id: string; label: string; optional?: boolean; error?: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="mb-1.5 flex items-baseline gap-2 text-[0.875rem] font-semibold text-ink">
        {label}
        {optional && <span className="text-[0.8125rem] font-normal text-faint">Optional</span>}
      </label>
      {children}
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-[0.8125rem] text-[#b42318]">
          {error}
        </p>
      )}
    </div>
  );
}

function Choices({ name, label, options, value, error, onChange }: { name: keyof Fields; label: string; options: string[]; value: string; error?: string; onChange: (v: string) => void }) {
  return (
    <fieldset aria-describedby={error ? `${name}-error` : undefined}>
      <legend className="mb-1.5 text-[0.875rem] font-semibold text-ink">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => (
          <label key={o} className="cursor-pointer">
            <input type="radio" id={`${name}-${o}`} name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="peer sr-only" />
            <span className="inline-flex h-10 items-center rounded-full bg-white px-4 text-[0.9375rem] font-medium text-muted ring-1 ring-inset ring-line transition-colors peer-checked:bg-brand peer-checked:text-white peer-checked:ring-brand peer-focus-visible:ring-2 peer-focus-visible:ring-accent hover:text-ink">
              {o}
            </span>
          </label>
        ))}
      </div>
      {error && (
        <p id={`${name}-error`} className="mt-1.5 text-[0.8125rem] text-[#b42318]">
          {error}
        </p>
      )}
    </fieldset>
  );
}

/** The demo request form. Posts JSON to DEMO_FORM_ENDPOINT when one is configured. */
export function DemoForm() {
  const [f, setF] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>('idle');
  const set = (k: keyof Fields) => (v: string) => {
    setF((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((p) => ({ ...p, [k]: undefined }));
  };

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const found = validate(f);
    setErrors(found);
    if (Object.keys(found).length) {
      const first = Object.keys(found)[0];
      document.getElementById(first === 'vertical' || first === 'volume' ? `${first}-${first === 'vertical' ? VERTICALS[0] : VOLUMES[0]}` : first)?.focus();
      return;
    }
    if (!DEMO_FORM_ENDPOINT) {
      setStatus('unconnected');
      return;
    }
    setStatus('sending');
    try {
      const res = await fetch(DEMO_FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...f, source: 'getlinked.io homepage' }),
      });
      setStatus(res.ok ? 'sent' : 'error');
    } catch {
      setStatus('error');
    }
  }

  if (status === 'sent') {
    return (
      <div role="status" className="flex min-h-[420px] flex-col items-center justify-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-tint text-accent">
          <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>
        <h3 className="mt-5 font-display text-[1.75rem] font-semibold tracking-[-0.03em] text-ink">Request received</h3>
        <p className="mt-2 max-w-[24rem] text-[1rem] leading-relaxed text-muted">
          Thanks, {f.name.trim().split(' ')[0]}. We’ll email {f.email.trim()} to set up your demo.
        </p>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={submit} className="space-y-5" aria-label="Book a demo">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="name" label="Full name" error={errors.name}>
          <input id="name" name="name" autoComplete="name" value={f.name} onChange={(e) => set('name')(e.target.value)} aria-invalid={!!errors.name} aria-describedby={errors.name ? 'name-error' : undefined} className={input} />
        </Field>
        <Field id="email" label="Work email" error={errors.email}>
          <input id="email" name="email" type="email" autoComplete="email" inputMode="email" value={f.email} onChange={(e) => set('email')(e.target.value)} aria-invalid={!!errors.email} aria-describedby={errors.email ? 'email-error' : undefined} className={input} />
        </Field>
        <Field id="company" label="Company" error={errors.company}>
          <input id="company" name="company" autoComplete="organization" value={f.company} onChange={(e) => set('company')(e.target.value)} aria-invalid={!!errors.company} aria-describedby={errors.company ? 'company-error' : undefined} className={input} />
        </Field>
        <Field id="telegram" label="Telegram" optional>
          <input id="telegram" name="telegram" placeholder="@username" value={f.telegram} onChange={(e) => set('telegram')(e.target.value)} className={input} />
        </Field>
      </div>

      <Choices name="vertical" label="Industry" options={VERTICALS} value={f.vertical} error={errors.vertical} onChange={set('vertical')} />
      <Choices name="volume" label="Leads per month" options={VOLUMES} value={f.volume} error={errors.volume} onChange={set('volume')} />

      <Field id="message" label="Anything we should know?" optional>
        <textarea
          id="message"
          name="message"
          rows={3}
          value={f.message}
          onChange={(e) => set('message')(e.target.value)}
          placeholder="Your current platform, what you want to improve…"
          className={`${input} h-auto resize-y py-3 leading-relaxed`}
        />
      </Field>

      <button
        type="submit"
        disabled={status === 'sending'}
        className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-[12px] bg-brand px-6 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgb(11_100_72/0.7)] transition-[background-color,transform] duration-300 hover:bg-accent active:scale-[0.99] disabled:opacity-70"
      >
        {status === 'sending' ? 'Sending…' : 'Book a Demo'}
      </button>

      {status === 'error' && (
        <p role="alert" className="rounded-xl bg-[#fdecec] px-4 py-3 text-[0.9375rem] text-[#b42318]">
          Your request didn’t go through. Try again, or message us on Telegram.
        </p>
      )}
      {status === 'unconnected' && (
        <p role="status" className="rounded-xl bg-[#fff4e0] px-4 py-3 text-[0.9375rem] text-[#8a5300]">
          This preview isn’t connected to GetLinked yet, so nothing was sent.
        </p>
      )}
      <p className="text-center text-[0.8125rem] text-faint">We’ll only use your details to arrange your demo.</p>
    </form>
  );
}
