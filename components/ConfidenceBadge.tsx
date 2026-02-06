import { CheckCircle2, AlertCircle, XCircle } from 'lucide-react';
import { getConfidenceLevel } from '@/types/mapper';

interface ConfidenceBadgeProps {
  confidence: number;
  showLabel?: boolean;
}

const ConfidenceBadge = ({ confidence, showLabel = true }: ConfidenceBadgeProps) => {
  const level = getConfidenceLevel(confidence);
  const percentage = Math.round(confidence * 100);

  const config = {
    high: {
      className: 'badge-high',
      icon: CheckCircle2,
      iconClass: 'text-emerald-600',
    },
    medium: {
      className: 'badge-medium',
      icon: AlertCircle,
      iconClass: 'text-amber-600',
    },
    low: {
      className: 'badge-low',
      icon: XCircle,
      iconClass: 'text-red-600',
    },
  };

  const { className, icon: Icon, iconClass } = config[level];

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${className}`}>
      <Icon className={`w-3 h-3 ${iconClass}`} />
      {showLabel && <span>{percentage}%</span>}
    </span>
  );
};

export default ConfidenceBadge;
