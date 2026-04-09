export const mockSecurityFeeds = [
  {
    id: 'cve-2026-101',
    title: 'Critical RCE Vulnerability in Next.js Image Optimization',
    technology: 'Next.js',
    severity: 'High',
    date: '2026-04-09T08:00:00Z',
    description: 'A remote code execution vulnerability was identified in the Next.js image optimization pipeline. Users should upgrade to v15.1.2 immediately.',
    link: 'https://github.com/vercel/next.js/security/advisories/GHSA-1234'
  },
  {
    id: 'cve-2026-102',
    title: 'Node.js Security Release: HTTP/2 DoS',
    technology: 'Node.js',
    severity: 'Critical',
    date: '2026-04-08T14:30:00Z',
    description: 'An attacker can cause a Denial of Service via malicious HTTP/2 frames. Update to Node.js v24.12.0 or specific patched versions.',
    link: 'https://nodejs.org/en/blog/vulnerability/april-2026-security-releases/'
  },
  {
    id: 'cve-2026-103',
    title: 'Appwrite Console CSRF Mitigation',
    technology: 'Appwrite',
    severity: 'Medium',
    date: '2026-04-05T09:15:00Z',
    description: 'A potential CSRF vulnerability was fixed in the Appwrite Console. Session hijacking risk is low but update is recommended.',
    link: 'https://github.com/appwrite/appwrite/security/advisories/GHSA-5678'
  },
  {
    id: 'cve-2026-104',
    title: 'Matrix Synapse Federation Memory Leak',
    technology: 'Matrix',
    severity: 'Medium',
    date: '2026-04-02T11:20:00Z',
    description: 'Synapse incorrectly handles certain federation responses causing a memory leak over time. Fixed in v1.104.',
    link: 'https://matrix.org/blog/security-update/'
  },
  {
    id: 'cve-2026-105',
    title: 'LiveKit Server RTC crash fix',
    technology: 'LiveKit',
    severity: 'Low',
    date: '2026-04-01T16:00:00Z',
    description: 'Certain invalid RTC packets could cause the worker thread to crash, affecting single rooms. Fixed in v1.6.0.',
    link: 'https://github.com/livekit/livekit/releases/tag/v1.6.0'
  }
];
