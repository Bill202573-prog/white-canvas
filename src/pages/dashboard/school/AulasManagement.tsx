import { Button } from '@/components/ui/button';
import { 
  ArrowLeft,
  Loader2,
  CalendarDays,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useSchoolTurmasWithRelations } from '@/hooks/useSchoolData';
import AulasCalendar from '@/components/school/AulasCalendar';

const AulasManagement = () => {
  const { data: turmas = [], isLoading } = useSchoolTurmasWithRelations();

  // Only show loading on initial load (no cached data)
  if (isLoading && turmas.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link to="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" />
            Calendário de Aulas
          </h1>
          <p className="text-muted-foreground">
            Visualize, cancele e crie aulas extras
          </p>
        </div>
      </div>

      {/* Calendar */}
      <AulasCalendar />
    </div>
  );
};

export default AulasManagement;
