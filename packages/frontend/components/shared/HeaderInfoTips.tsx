'use client';

import { AlertTriangle, Info, Lightbulb, LucideIcon, OctagonAlert, Shield } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

type TipItem = {
  title: string;
  text: string;
  icon?: LucideIcon;
  variant?: 'info' | 'tip' | 'security' | 'warning' | 'danger';
};

type Props = {
  items: TipItem[];
};

const VARIANT_STYLE: Record<NonNullable<TipItem['variant']>, { icon: LucideIcon; button: string; iconClass: string; tooltip: string }> = {
  info: {
    icon: Info,
    button: 'text-blue-700 bg-blue-100 border-blue-400 hover:bg-blue-200 hover:text-blue-900 hover:border-blue-600',
    iconClass: 'h-6 w-6',
    tooltip: 'bg-blue-100 text-blue-900 border border-blue-300 [&>svg]:fill-blue-100 [&>svg]:bg-blue-100',
  },
  tip: {
    icon: Lightbulb,
    button: 'text-amber-700 bg-amber-100 border-amber-400 hover:bg-amber-200 hover:text-amber-900 hover:border-amber-600',
    iconClass: 'h-6 w-6',
    tooltip: 'bg-amber-100 text-amber-900 border border-amber-300 [&>svg]:fill-amber-100 [&>svg]:bg-amber-100',
  },
  security: {
    icon: Shield,
    button: 'text-emerald-700 bg-emerald-100 border-emerald-400 hover:bg-emerald-200 hover:text-emerald-900 hover:border-emerald-600',
    iconClass: 'h-6 w-6',
    tooltip: 'bg-emerald-100 text-emerald-900 border border-emerald-300 [&>svg]:fill-emerald-100 [&>svg]:bg-emerald-100',
  },
  warning: {
    icon: AlertTriangle,
    button: 'text-orange-700 bg-orange-100 border-orange-400 hover:bg-orange-200 hover:text-orange-900 hover:border-orange-600',
    iconClass: 'h-6 w-6',
    tooltip: 'bg-orange-100 text-orange-900 border border-orange-300 [&>svg]:fill-orange-100 [&>svg]:bg-orange-100',
  },
  danger: {
    icon: OctagonAlert,
    button: 'text-red-700 bg-red-100 border-red-400 hover:bg-red-200 hover:text-red-900 hover:border-red-600',
    iconClass: 'h-6 w-6',
    tooltip: 'bg-red-100 text-red-900 border border-red-300 [&>svg]:fill-red-100 [&>svg]:bg-red-100',
  },
};

export default function HeaderInfoTips({ items }: Props) {
  if (!items.length) return null;

  return (
    <div className="flex items-center gap-2">
      {items.map((tip, idx) => {
        const variant = tip.variant || 'info';
        const style = VARIANT_STYLE[variant];
        const Icon = tip.icon || style.icon;
        return (
          <Tooltip key={`${tip.title}-${idx}`}>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label={tip.title}
                className={`h-11 w-11 min-h-11 min-w-11 flex items-center justify-center rounded-full border transition-all duration-150 hover:shadow-md hover:scale-105 ${style.button}`}
              >
                <Icon className={style.iconClass} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className={`max-w-xl text-left leading-relaxed text-sm px-3 py-2 ${style.tooltip}`}>
              <div className="font-semibold">{tip.title}</div>
              <div className="mt-1 text-sm">{tip.text}</div>
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}
