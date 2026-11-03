import clsx from 'clsx';
import { CalendarCheck, Mail, MessageCircle, type LucideIcon } from 'lucide-react';
import { BRAND } from '@/lib/brand';

export interface ContactLink {
  key: 'book' | 'whatsapp' | 'email';
  href: string;
  label: string;
  Icon: LucideIcon;
  external: boolean;
  primary: boolean;
}

/** Contact buttons from BRAND.contact. Empty values are left out; an empty list means "hide the CTA". */
export function contactLinks(businessName: string): ContactLink[] {
  const { email, whatsapp, bookingUrl } = BRAND.contact;
  const mail = email.trim();
  const wa = whatsapp.replace(/\D/g, '');
  const book = bookingUrl.trim();
  const message = `Hi ${BRAND.company}, I just finished the ${BRAND.product} for ${businessName} and would like to talk through the results.`;
  const links: ContactLink[] = [];
  if (book) links.push({ key: 'book', href: book, label: 'Book a free call', Icon: CalendarCheck, external: true, primary: true });
  if (wa)
    links.push({
      key: 'whatsapp',
      href: `https://wa.me/${wa}?text=${encodeURIComponent(message)}`,
      label: 'WhatsApp us',
      Icon: MessageCircle,
      external: true,
      primary: !book,
    });
  if (mail)
    links.push({
      key: 'email',
      href: `mailto:${mail}?subject=${encodeURIComponent(`${BRAND.product}: ${businessName}`)}&body=${encodeURIComponent(message)}`,
      label: 'Email us',
      Icon: Mail,
      external: false,
      primary: !book && !wa,
    });
  return links;
}

export function ContactButtons({ links, size = 'md' }: { links: ContactLink[]; size?: 'md' | 'lg' }) {
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((l) => (
        <a
          key={l.key}
          href={l.href}
          {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
          className={clsx(
            'inline-flex items-center gap-2 font-semibold transition-colors',
            size === 'lg' ? 'min-h-[56px] rounded-2xl px-6 text-[17px]' : 'min-h-[48px] rounded-[14px] px-5 text-[15px]',
            l.primary ? 'bg-brand text-white hover:bg-brand-deep' : 'border border-line-strong bg-card text-ink hover:border-ink-2/60',
          )}
        >
          <l.Icon className="h-4 w-4" aria-hidden="true" />
          {l.label}
        </a>
      ))}
    </div>
  );
}

/** "Talk to us" block. Each button hides when its value is empty; the whole block hides when all are empty. */
export function ContactCta({ businessName }: { businessName: string }) {
  const links = contactLinks(businessName);
  if (!links.length) return null;
  return (
    <section
      aria-labelledby="contact-title"
      className="no-print relative overflow-hidden rounded-[28px] border border-accent/40 bg-accent-soft px-6 py-8 sm:px-10 sm:py-10"
    >
      <div className="relative max-w-2xl">
        <h2 id="contact-title" className="font-display text-[28px] font-medium leading-tight text-ink sm:text-[34px]">
          {BRAND.contact.heading}
        </h2>
        <p className="mt-2 text-[15.5px] leading-relaxed text-ink-2">{BRAND.contact.body}</p>
        <div className="mt-6">
          <ContactButtons links={links} />
        </div>
      </div>
    </section>
  );
}
