import React from 'react';
import {
  Heart,
  Activity,
  Droplet,
  TrendingUp,
  TrendingDown,
  AlertTriangle } from
'lucide-react';
type ColorKey =
'cyan' |
'green' |
'blue' |
'orange' |
'red' |
'purple' |
'teal' |
'indigo' |
'yellow';
type IconKey =
'heart' |
'activity' |
'droplet' |
'trending-up' |
'trending-down' |
'alert';
interface VitalCardProps {
  label: string;
  value: string;
  unit?: string;
  color?: ColorKey;
  icon?: IconKey;
}
const colorMap: Record<
  ColorKey,
  {
    bg: string;
    border: string;
    text: string;
    value: string;
    unit: string;
  }> =
{
  cyan: {
    bg: 'bg-cyan-500/10',
    border: 'border-cyan-500/30',
    text: 'text-cyan-400',
    value: 'text-cyan-100',
    unit: 'text-cyan-400/70'
  },
  green: {
    bg: 'bg-green-500/10',
    border: 'border-green-500/30',
    text: 'text-green-400',
    value: 'text-green-100',
    unit: 'text-green-400/70'
  },
  blue: {
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/30',
    text: 'text-blue-400',
    value: 'text-blue-100',
    unit: 'text-blue-400/70'
  },
  orange: {
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/30',
    text: 'text-orange-400',
    value: 'text-orange-100',
    unit: 'text-orange-400/70'
  },
  red: {
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    text: 'text-red-400',
    value: 'text-red-100',
    unit: 'text-red-400/70'
  },
  purple: {
    bg: 'bg-purple-500/10',
    border: 'border-purple-500/30',
    text: 'text-purple-400',
    value: 'text-purple-100',
    unit: 'text-purple-400/70'
  },
  teal: {
    bg: 'bg-teal-500/10',
    border: 'border-teal-500/30',
    text: 'text-teal-400',
    value: 'text-teal-100',
    unit: 'text-teal-400/70'
  },
  indigo: {
    bg: 'bg-indigo-500/10',
    border: 'border-indigo-500/30',
    text: 'text-indigo-400',
    value: 'text-indigo-100',
    unit: 'text-indigo-400/70'
  },
  yellow: {
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/30',
    text: 'text-yellow-400',
    value: 'text-yellow-100',
    unit: 'text-yellow-400/70'
  }
};
const iconMap: Record<IconKey, React.ReactNode> = {
  heart: <Heart className="w-4 h-4" />,
  activity: <Activity className="w-4 h-4" />,
  droplet: <Droplet className="w-4 h-4" />,
  'trending-up': <TrendingUp className="w-4 h-4" />,
  'trending-down': <TrendingDown className="w-4 h-4" />,
  alert: <AlertTriangle className="w-4 h-4" />
};
export function VitalCard({
  label,
  value,
  unit,
  color = 'cyan',
  icon = 'activity'
}: VitalCardProps) {
  const c = colorMap[color];
  return (
    <div
      className={`rounded-xl border ${c.bg} ${c.border} p-4 flex flex-col gap-2`}>
      
      <div className={`flex items-center gap-1.5 ${c.text}`}>
        {iconMap[icon]}
        <span className="text-xs font-semibold uppercase tracking-wider">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-2xl font-bold tabular-nums ${c.value}`}>
          {value}
        </span>
        {unit &&
        <span className={`text-xs font-medium ${c.unit}`}>{unit}</span>
        }
      </div>
    </div>);

}