// Domain validation for login (FR-09).
// Google's `hd` param only matches ONE exact domain, so subdomains like
// sd.alakhyar.sch.id / smp.alakhyar.sch.id would be rejected. We instead
// check the email host is the allowed domain OR any of its subdomains.

export const ALLOWED_DOMAIN = (
  process.env.ALLOWED_EMAIL_DOMAIN || 'alakhyar.sch.id'
).toLowerCase();

export function emailDomainAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf('@');
  if (at < 0) return false;
  const host = email.slice(at + 1).trim().toLowerCase();
  if (!host) return false;
  // Exact match, or a subdomain (…​.alakhyar.sch.id). The leading dot check
  // prevents "notalakhyar.sch.id" from sneaking through a naive endsWith.
  return host === ALLOWED_DOMAIN || host.endsWith('.' + ALLOWED_DOMAIN);
}
