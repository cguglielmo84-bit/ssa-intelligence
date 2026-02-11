/**
 * Shared email-domain validation utilities.
 * Used by both auth middleware and invite API.
 */

export const parseAllowedDomains = (): string[] => {
  const raw = process.env.AUTH_EMAIL_DOMAIN || process.env.OAUTH2_PROXY_EMAIL_DOMAINS || 'ssaandco.com';
  return raw
    .split(',')
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
};

export const isAllowedDomain = (email: string, allowedDomains: string[]): boolean => {
  if (!email.includes('@')) return false;
  if (allowedDomains.includes('*')) return true;
  const domain = email.split('@').pop() || '';
  return allowedDomains.includes(domain.toLowerCase());
};
