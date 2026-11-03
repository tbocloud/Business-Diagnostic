// ─────────────────────────────────────────────────────────────
// Brand & contact settings — edit this one file to rebrand.
// ─────────────────────────────────────────────────────────────

export const BRAND = {
  /** Company shown in the header and footer. */
  company: 'Team Back Office',
  /** Short mark used in the logo. */
  mark: 'TBO',
  product: 'Business Health Check',
  tagline: 'Find the real gaps in your business — in about 10 minutes.',

  /**
   * What we offer. Gaps in the report link to these where they fit, so the client sees how
   * each service solves THEIR problem — and the BDE sees what to pitch.
   */
  services: {
    erp: {
      name: 'ERP',
      long: 'ERP (ERPNext)',
      icon: 'Boxes',
      pitch: 'One system for sales & CRM, stock, billing & accounts, HR & payroll and projects — set up for how you work.',
    },
    marketing: {
      name: 'Digital Marketing',
      long: 'Digital Marketing',
      icon: 'Megaphone',
      pitch: 'A website that brings enquiries, Google & Maps visibility, social media and WhatsApp campaigns.',
    },
    ai: {
      name: 'AI',
      long: 'AI Solutions',
      icon: 'Bot',
      pitch: 'AI assistants that answer customers 24/7, automation that removes manual work, and AI insights & forecasts inside your ERP.',
    },
  },

  /** "Talk to us" call-to-action at the end of the results. Leave a value empty to hide that button. */
  contact: {
    heading: 'Want help closing these gaps?',
    body: 'Book a free 30-minute call. We’ll walk through your results together and agree the first three fixes.',
    /** e.g. 'hello@yourcompany.com' */
    email: '',
    /** International format without + or spaces, e.g. '919876543210' */
    whatsapp: '',
    /** e.g. a Calendly link */
    bookingUrl: '',
  },
};
