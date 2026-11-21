import { URL } from 'url';

/**
 * Normalizes a website URL and extracts the canonical domain name.
 * e.g. "https://www.GrowthLabs.io/blog?ref=1" -> { domain: "growthlabs.io", url: "https://growthlabs.io" }
 *
 * @param {string} input - User input domain or URL
 * @returns {{ domain: string, url: string }}
 */
export function normalizeWebsiteInput(input) {
  if (!input || typeof input !== 'string') {
    throw new Error('A valid website URL or domain is required.');
  }

  let raw = input.trim();

  // If user omitted protocol, prepend https://
  if (!raw.startsWith('http://') && !raw.startsWith('https://')) {
    raw = `https://${raw}`;
  }

  let parsedUrl;
  try {
    parsedUrl = new URL(raw);
  } catch (err) {
    throw new Error('Invalid URL format. Please provide a valid domain (e.g. example.com or https://example.com).');
  }

  // Enforce http or https protocol
  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error('Only HTTP and HTTPS website protocols are supported.');
  }

  let hostname = parsedUrl.hostname.toLowerCase();

  // Remove leading 'www.' for canonical domain matching
  if (hostname.startsWith('www.')) {
    hostname = hostname.slice(4);
  }

  // Validate hostname structure: must contain at least one dot or be localhost for testing
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;
  const isLocalhost = hostname === 'localhost' || hostname.endsWith('.localhost');

  if (!domainRegex.test(hostname) && !isLocalhost) {
    throw new Error('Invalid domain name. Please enter a valid domain (e.g., example.com).');
  }

  // Prevent local IP addresses and internal networks (SSRF prevention)
  const isPrivateIp = /^(127\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|0\.|169\.254\.)/.test(hostname);
  if (isPrivateIp && process.env.NODE_ENV === 'production') {
    throw new Error('Internal or private IP addresses are not permitted.');
  }

  const cleanUrl = `${parsedUrl.protocol}//${hostname}`;

  return {
    domain: hostname,
    url: cleanUrl
  };
}
