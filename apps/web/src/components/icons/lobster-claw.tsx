import type { SVGProps } from 'react';

export function LobsterClaw(props: SVGProps<SVGSVGElement> & { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {/* Left pincer */}
      <path d="M6 3C4 3 2 5 2 8c0 2 1 3.5 2.5 4.5" />
      <path d="M6 3c0 3-1 5-1.5 7" />
      {/* Right pincer */}
      <path d="M18 3c2 0 4 2 4 5 0 2-1 3.5-2.5 4.5" />
      <path d="M18 3c0 3 1 5 1.5 7" />
      {/* Claw body / junction */}
      <path d="M6 3h12" />
      <path d="M4.5 12.5C6 14 8 15 12 15s6-1 7.5-2.5" />
      {/* Arm / lower body */}
      <path d="M12 15v4" />
      <path d="M9 19h6" />
      <path d="M10 19v2" />
      <path d="M14 19v2" />
    </svg>
  );
}
