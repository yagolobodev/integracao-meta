import {
  MessageCircleHeart,
  MessageCircleOff,
  GitBranch,
  RouteOff,
  Link2Off,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { statusStyle } from './StatusIcon.jsx';

const ICONS = {
  MessageCircleHeart,
  MessageCircleOff,
  GitBranch,
  MapOff: RouteOff,
  LinkOff: Link2Off,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Info,
};

export default function EventIcon({ name, tone }) {
  const Icon = ICONS[name] ?? Info;
  const style = statusStyle(tone);

  return (
    <span
      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-800 ring-4 ring-slate-900 ${style.text}`}
    >
      <Icon size={14} strokeWidth={2.25} />
    </span>
  );
}
