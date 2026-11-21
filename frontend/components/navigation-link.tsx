import type { AnchorHTMLAttributes } from 'react';

// Native navigation avoids the vinext client Link crash in the Vercel build.
export default function NavigationLink(props: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a {...props} />;
}
