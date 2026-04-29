'use client';

import { Bot } from 'lucide-react';
import { LobsterClaw } from '@/components/icons/lobster-claw';

type AgentLike = {
  name?: string | null;
  avatarUrl?: string | null;
  avatar_url?: string | null;
};

type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

const SIZE_PX: Record<Size, string> = {
  xs: 'w-6 h-6',
  sm: 'w-8 h-8',
  md: 'w-12 h-12',
  lg: 'w-16 h-16',
  xl: 'w-24 h-24',
};

const ICON_PX: Record<Size, string> = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-6 w-6',
  lg: 'h-8 w-8',
  xl: 'h-12 w-12',
};

const RADIUS: Record<Size, string> = {
  xs: 'rounded-md',
  sm: 'rounded-lg',
  md: 'rounded-xl',
  lg: 'rounded-2xl',
  xl: 'rounded-2xl',
};

function fallbackIcon(name?: string | null) {
  if (name && name.includes('Inference API Consumer')) {
    return {
      Icon: LobsterClaw,
      bgColor: 'bg-orange-100 dark:bg-orange-950',
      textColor: 'text-orange-600 dark:text-orange-400',
    };
  }
  return {
    Icon: Bot,
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    textColor: 'text-blue-600 dark:text-blue-400',
  };
}

export function AgentAvatar({
  agent,
  size = 'md',
  className = '',
}: {
  agent: AgentLike;
  size?: Size;
  className?: string;
}) {
  const url = agent.avatarUrl ?? agent.avatar_url ?? null;
  const boxBase = `${SIZE_PX[size]} ${RADIUS[size]} flex items-center justify-center overflow-hidden flex-shrink-0 ${className}`;

  if (url) {
    return (
      <div className={`${boxBase} bg-gray-100 dark:bg-gray-800`}>
        <img
          src={url}
          alt={agent.name ?? 'agent avatar'}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const { Icon, bgColor, textColor } = fallbackIcon(agent.name);
  return (
    <div className={`${boxBase} ${bgColor}`}>
      <Icon className={`${ICON_PX[size]} ${textColor}`} />
    </div>
  );
}
