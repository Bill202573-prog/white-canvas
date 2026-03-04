import { useMemo, useState } from 'react';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { LogOut, Settings, ChevronDown, Check, Bell, User, Users, ShoppingBag, ExternalLink } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ChangePasswordDialog from '@/components/auth/ChangePasswordDialog';
import { useUnreadComunicados } from '@/hooks/useUnreadComunicados';
import { useGuardianChildren, useGuardianProfile } from '@/hooks/useSchoolData';
import AthleteProfileSheet from '@/components/guardian/AthleteProfileSheet';
import { toast } from 'sonner';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Escolinha {
  id: string;
  nome: string;
  ativo: boolean;
}

interface Child {
  id: string;
  nome: string;
  foto_url?: string | null;
}

interface MobileHeaderProps {
  children: Child[];
  currentChild: Child | null;
  guardianName?: string;
  onChildChange: (childId: string) => void;
}

export function MobileHeader({ children, currentChild, guardianName, onChildChange }: MobileHeaderProps) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);
  const { hasUnread, unreadCount } = useUnreadComunicados();
  
  // Get full child data with escolinhas and turmas for profile
  const { data: fullChildren = [] } = useGuardianChildren();
  const { data: guardian } = useGuardianProfile();
  const currentFullChild = fullChildren.find(c => c.id === currentChild?.id) || null;

  // Carreira profiles query temporarily disabled
  const childProfiles: any[] = [];

  const activeEscolinhas = useMemo(() => {
    const escolinhasMap = new Map<string, Escolinha>();
    fullChildren.forEach((child) => {
      child.escolinhas?.forEach((e) => {
        if (e.ativo && !escolinhasMap.has(e.id)) {
          escolinhasMap.set(e.id, { id: e.id, nome: e.nome, ativo: e.ativo });
        }
      });
    });
    return Array.from(escolinhasMap.values());
  }, [fullChildren]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  const handleChildSelect = (childId: string) => {
    onChildChange(childId);
    setIsSheetOpen(false);
  };
  
  const handleOpenProfile = () => {
    setIsSheetOpen(false);
    setIsProfileOpen(true);
  };

  const handleOpenGuardianPerfilPage = () => {
    setIsSheetOpen(false);
    navigate('/dashboard/perfil');
  };

  const handleIndicarAmigos = () => {
    setIsSheetOpen(false);

    if (!guardian) {
      toast.error('Não foi possível identificar o responsável.');
      return;
    }

    if (activeEscolinhas.length === 0) {
      toast.error('Você precisa ter ao menos uma escolinha ativa vinculada ao atleta.');
      return;
    }

    if (activeEscolinhas.length === 1) {
      openWhatsAppShare(activeEscolinhas[0]);
    } else {
      setShowSchoolSelector(true);
    }
  };

  const openWhatsAppShare = (escolinha: Escolinha) => {
    // Link curto: /i?e=escolinha_id&r=ref_id
    const referralLink = `https://atletaid.com.br/i?e=${escolinha.id}&r=${guardian?.id}`;

    const message =
      `E aí, tudo bem?\n` +
      `Só pra te indicar a escolinha de futebol que eu te falei.\n` +
      `É lá que meu filho está treinando.\n` +
      `Se quiser testar uma aula, é só clicar no link e mandar as informações que eles já entram em contato pra agendar.\n\n` +
      referralLink;

    // Ação de compartilhamento: abre o WhatsApp do usuário (sem número definido)
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const opened = window.open(whatsappUrl, '_blank', 'noopener,noreferrer');

    // Se o navegador bloquear pop-up, não devemos redirecionar a SPA.
    if (!opened) {
      toast.error('Seu navegador bloqueou a abertura do WhatsApp. Permita pop-ups e tente novamente.');
    }
    setShowSchoolSelector(false);
  };

  const handleSchoolSelectForWhatsapp = (escolinhaId: string) => {
    const escolinha = activeEscolinhas.find(e => e.id === escolinhaId);
    if (escolinha) {
      openWhatsAppShare(escolinha);
    }
  };

  // Format guardian name: first + last
  const formatGuardianName = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return parts[0] || '';
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Format athlete name: first + second (if compound) + last
  const formatAthleteName = (name?: string) => {
    if (!name) return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 2) return name;
    if (parts.length === 3) return `${parts[0]} ${parts[2]}`;
    // 4+ parts: first + second + last
    return `${parts[0]} ${parts[1]} ${parts[parts.length - 1]}`;
  };

  const formattedGuardianName = formatGuardianName(guardianName);
  const formattedChildName = formatAthleteName(currentChild?.nome);

  return (
    <header className="sticky top-0 z-40 bg-primary text-primary-foreground safe-area-top">
      <div className="flex items-center justify-between h-14 px-4">
        {/* Child selector */}
        <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
          <SheetTrigger asChild>
            <button className="flex items-center gap-3 touch-manipulation active:opacity-80">
              <Avatar className="w-9 h-9 border-2 border-primary-foreground/30">
                {currentChild?.foto_url && (
                  <AvatarImage src={currentChild.foto_url} alt={currentChild?.nome} />
                )}
                <AvatarFallback className="bg-primary-foreground/20 text-primary-foreground text-sm font-semibold">
                  {currentChild?.nome?.charAt(0) || ''}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-start">
                <span className="text-sm font-semibold leading-tight truncate max-w-[140px]">
                  {formattedChildName || 'Selecionar'}
                </span>
                {formattedGuardianName && (
                  <span className="text-[10px] text-primary-foreground/70 leading-tight">
                    {formattedGuardianName}
                  </span>
                )}
              </div>
              {children.length > 1 && (
                <ChevronDown className="w-4 h-4 text-primary-foreground/70" />
              )}
            </button>
          </SheetTrigger>
          
          <SheetContent side="top" className="pt-safe">
            <SheetHeader>
              <SheetTitle>Selecionar Atleta</SheetTitle>
            </SheetHeader>
            
            <div className="mt-4 space-y-2">
              {children.map((child) => (
                <button
                  key={child.id}
                  onClick={() => handleChildSelect(child.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors touch-manipulation active:scale-[0.98] ${
                    currentChild?.id === child.id 
                      ? 'bg-primary/10 border-2 border-primary' 
                      : 'bg-muted border-2 border-transparent hover:bg-muted/80'
                  }`}
                >
                  <Avatar className="w-12 h-12">
                    {child.foto_url && <AvatarImage src={child.foto_url} alt={child.nome} />}
                    <AvatarFallback className="text-lg font-semibold">
                      {child.nome.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 text-left font-medium">{child.nome}</span>
                  {currentChild?.id === child.id && (
                    <Check className="w-5 h-5 text-primary" />
                  )}
                </button>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t space-y-2">
              {currentChild && (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3"
                  onClick={handleOpenProfile}
                >
                  <User className="w-5 h-5" />
                  Perfil do Atleta
                </Button>
              )}

              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={() => {
                  setIsSheetOpen(false);
                  navigate('/dashboard/loja');
                }}
              >
                <ShoppingBag className="w-5 h-5" />
                Loja
              </Button>

              {/* Carreira links temporarily disabled */}

              <Button
                variant="ghost"
                className="w-full justify-start gap-3"
                onClick={handleIndicarAmigos}
              >
                <Users className="w-5 h-5" />
                Indicar Amigos
              </Button>

              <ChangePasswordDialog 
                trigger={
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                  >
                    <Settings className="w-5 h-5" />
                    Alterar Senha
                  </Button>
                }
              />
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleLogout}
              >
                <LogOut className="w-5 h-5" />
                Sair
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {/* Notification Bell */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/inicio')}
            className="relative p-2 touch-manipulation active:opacity-80"
            title="Mensagens"
          >
            <Bell className="w-5 h-5 text-primary-foreground" />
            {hasUnread && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[9px] font-bold text-destructive-foreground">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          <span className="text-xs font-semibold text-primary-foreground/80">ATLETA ID</span>
        </div>
      </div>
      
      {/* Athlete Profile Sheet */}
      <AthleteProfileSheet 
        open={isProfileOpen} 
        onOpenChange={setIsProfileOpen} 
        child={currentFullChild} 
      />

      {/* School Selector Dialog for WhatsApp */}
      <Dialog open={showSchoolSelector} onOpenChange={setShowSchoolSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Selecione a escola</DialogTitle>
            <DialogDescription>
              Para qual escola você deseja enviar a indicação?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Select onValueChange={handleSchoolSelectForWhatsapp}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma escola" />
              </SelectTrigger>
              <SelectContent>
                {activeEscolinhas.map((escolinha) => (
                    <SelectItem key={escolinha.id} value={escolinha.id}>
                      {escolinha.nome}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </DialogContent>
      </Dialog>
    </header>
  );
}
