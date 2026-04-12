import type { LucideIcon } from 'lucide-react';
import {
  Brain,
  ChartColumn,
  Clock,
  FileText,
  LayoutDashboard,
  MessageSquare,
  ScrollText,
  Settings,
  Zap
} from 'lucide-react';

export type AppRoute = {
  href: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export const appRoutes: AppRoute[] = [
  { href: '/', label: 'Overview', description: 'System health', icon: LayoutDashboard },
  { href: '/sessions', label: 'Sessions', description: 'Activity history', icon: MessageSquare },
  { href: '/cron', label: 'Cron', description: 'Scheduled jobs', icon: Clock },
  { href: '/logs', label: 'Logs', description: 'Runtime logs', icon: ScrollText },
  { href: '/usage', label: 'Usage', description: 'Tokens and cost', icon: ChartColumn },
  { href: '/skills', label: 'Skills', description: 'Capabilities', icon: Zap },
  { href: '/memory', label: 'Memory', description: 'Saved context', icon: Brain },
  { href: '/files', label: 'Files', description: 'Key files', icon: FileText },
  { href: '/config', label: 'Config', description: 'Runtime configuration', icon: Settings }
];
