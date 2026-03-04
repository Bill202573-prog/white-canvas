import { Cake, PartyPopper } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BirthdayBadgeProps {
  isToday?: boolean;
  isThisMonth?: boolean;
  showLabel?: boolean;
  className?: string;
}

const BirthdayBadge = ({ isToday, isThisMonth, showLabel = true, className }: BirthdayBadgeProps) => {
  if (!isToday && !isThisMonth) return null;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold",
        isToday 
          ? "bg-warning text-warning-foreground animate-bounce-subtle" 
          : "bg-warning/20 text-warning-foreground",
        className
      )}
    >
      {isToday ? (
        <>
          <PartyPopper className="w-3 h-3" />
          {showLabel && <span>Aniversário hoje!</span>}
        </>
      ) : (
        <>
          <Cake className="w-3 h-3" />
          {showLabel && <span>Aniversário este mês</span>}
        </>
      )}
    </div>
  );
};

export default BirthdayBadge;
