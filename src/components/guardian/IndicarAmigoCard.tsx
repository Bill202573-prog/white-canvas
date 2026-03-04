import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Share2, Users } from 'lucide-react';
import { useGuardianProfile, useGuardianChildren } from '@/hooks/useSchoolData';
import { toast } from 'sonner';
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

const IndicarAmigoCard = () => {
  const { data: guardian, isLoading: guardianLoading } = useGuardianProfile();
  const { data: children = [], isLoading: childrenLoading } = useGuardianChildren();
  const [showSchoolSelector, setShowSchoolSelector] = useState(false);

  // Get unique active schools from guardian's children
  const getActiveEscolinhas = (): Escolinha[] => {
    const escolinhasMap = new Map<string, Escolinha>();
    
    children.forEach(child => {
      if (child.escolinhas) {
        child.escolinhas.forEach(e => {
          if (e.ativo && !escolinhasMap.has(e.id)) {
            escolinhasMap.set(e.id, { id: e.id, nome: e.nome, ativo: e.ativo });
          }
        });
      }
    });
    
    return Array.from(escolinhasMap.values());
  };

  const activeEscolinhas = getActiveEscolinhas();

  const isLoading = guardianLoading || childrenLoading;
  const canShare = !!guardian && activeEscolinhas.length > 0;

  const generateReferralLink = (escolinhaId: string) => {
    // Link curto: /i?e=escolinha_id&r=ref_id
    return `https://atletaid.com.br/i?e=${escolinhaId}&r=${guardian?.id}`;
  };

  const openWhatsAppShare = (escolinha: Escolinha) => {
    const referralLink = generateReferralLink(escolinha.id);
    
    // Mensagem pré-definida (exatamente conforme solicitado)
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

  const handleIndicarClick = () => {
    if (!canShare) {
      toast.error('Você precisa ter ao menos uma escolinha ativa vinculada.');
      return;
    }

    if (activeEscolinhas.length === 1) {
      // Single school - share directly
      openWhatsAppShare(activeEscolinhas[0]);
    } else {
      // Multiple schools - show selector
      setShowSchoolSelector(true);
    }
  };

  const handleSchoolSelect = (escolinhaId: string) => {
    const escolinha = activeEscolinhas.find(e => e.id === escolinhaId);
    if (escolinha) {
      openWhatsAppShare(escolinha);
    }
  };

  return (
    <>
      {/* Botão principal estilo destaque como na referência */}
      <Button 
        onClick={handleIndicarClick}
        className="w-full h-14 text-base font-semibold bg-primary hover:bg-primary/90"
        disabled={isLoading || !canShare}
      >
        {isLoading ? (
          <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Share2 className="w-5 h-5 mr-3" />
            Indicar amigos
          </>
        )}
      </Button>

      {/* School Selector Dialog */}
      <Dialog open={showSchoolSelector} onOpenChange={setShowSchoolSelector}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Selecione a escola
            </DialogTitle>
            <DialogDescription>
              Para qual escola você deseja fazer a indicação?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <Select onValueChange={handleSchoolSelect}>
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
    </>
  );
};

export default IndicarAmigoCard;
