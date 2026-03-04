import { Child } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import BirthdayBadge from './BirthdayBadge';
import { isBirthdayToday, isBirthdayThisMonth, calculateAge, formatDate } from '@/data/mockData';
import { Check, X, Cake } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudentCardProps {
  child: Child;
  showAttendance?: boolean;
  attendance?: 'present' | 'absent' | null;
  onMarkPresent?: () => void;
  onMarkAbsent?: () => void;
  onClick?: () => void;
}

const StudentCard = ({ 
  child, 
  showAttendance = false,
  attendance,
  onMarkPresent,
  onMarkAbsent,
  onClick 
}: StudentCardProps) => {
  const birthdayToday = isBirthdayToday(child.birthDate);
  const birthdayMonth = isBirthdayThisMonth(child.birthDate);
  const age = calculateAge(child.birthDate);

  return (
    <Card 
      variant={birthdayToday ? 'birthday' : 'default'}
      className={cn(
        "transition-all duration-200 hover:shadow-lg cursor-pointer",
        attendance === 'present' && "ring-2 ring-success",
        attendance === 'absent' && "ring-2 ring-destructive opacity-60"
      )}
      onClick={onClick}
    >
      {birthdayToday && (
        <div className="absolute top-0 left-0 right-0 h-1 gradient-birthday" />
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Avatar size="lg">
              <AvatarImage src={child.photoUrl} alt={child.fullName} />
              <AvatarFallback>{child.fullName.charAt(0)}</AvatarFallback>
            </Avatar>
            {birthdayToday && (
              <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-warning flex items-center justify-center animate-bounce-subtle">
                <Cake className="w-3 h-3 text-warning-foreground" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground truncate">{child.fullName}</h3>
            <p className="text-sm text-muted-foreground">{age} anos</p>
            {(birthdayToday || birthdayMonth) && (
              <BirthdayBadge isToday={birthdayToday} isThisMonth={birthdayMonth && !birthdayToday} className="mt-1" />
            )}
          </div>

          {showAttendance && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                variant={attendance === 'present' ? 'success' : 'outline'}
                size="icon"
                onClick={onMarkPresent}
                className={cn(
                  attendance !== 'present' && "border-success text-success hover:bg-success hover:text-success-foreground"
                )}
              >
                <Check className="w-4 h-4" />
              </Button>
              <Button
                variant={attendance === 'absent' ? 'destructive' : 'outline'}
                size="icon"
                onClick={onMarkAbsent}
                className={cn(
                  attendance !== 'absent' && "border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                )}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StudentCard;
