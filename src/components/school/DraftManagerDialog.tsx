import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Trash2, Clock, User } from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const DRAFTS_INDEX_KEY = 'aluno-ficha-drafts-index';

export interface DraftMetadata {
  id: string;
  nome: string;
  responsavelNome: string;
  timestamp: number;
  escolinhaId: string;
}

export interface DraftData extends DraftMetadata {
  dataNascimento: string;
  cpf: string;
  valorMensalidade: string;
  diaVencimento: string;
  formaCobranca: 'mensal' | 'isento';
  dataInicioCobranca: string;
  statusFinanceiro: 'ativo' | 'suspenso' | 'isento';
  valorMatricula: string;
  valorUniforme: string;
  responsavelEmail: string;
  responsavelEmailConfirm: string;
  responsavelTelefone: string;
  responsavelCpf: string;
  parentesco: string;
  cep: string;
  rua: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  selectedTurmaId: string;
  categoria: string;
  activeTab: string;
  savedStudentId: string | null;
  savedResponsavelId: string | null;
  resumoSaved: boolean;
  enderecoSaved: boolean;
  financeiroSaved: boolean;
  cobrancaGerada: boolean;
  credentiaisEnviadas: boolean;
  isMigration: boolean;
}

// Helper functions for draft management
export const getDraftKey = (id: string) => `aluno-ficha-draft-${id}`;

export const generateDraftId = () => crypto.randomUUID();

export const getDraftsIndex = (escolinhaId: string): DraftMetadata[] => {
  try {
    const indexStr = localStorage.getItem(DRAFTS_INDEX_KEY);
    if (!indexStr) return [];
    const allDrafts: DraftMetadata[] = JSON.parse(indexStr);
    // Filter by escolinha and remove expired (24h)
    const maxAge = 24 * 60 * 60 * 1000;
    const validDrafts = allDrafts.filter(d => 
      d.escolinhaId === escolinhaId && 
      Date.now() - d.timestamp < maxAge
    );
    // Update index if we removed any
    if (validDrafts.length !== allDrafts.length) {
      const invalidDrafts = allDrafts.filter(d => 
        d.escolinhaId !== escolinhaId || 
        Date.now() - d.timestamp >= maxAge
      );
      // Remove expired draft data
      invalidDrafts.forEach(d => {
        if (Date.now() - d.timestamp >= maxAge) {
          localStorage.removeItem(getDraftKey(d.id));
        }
      });
      saveDraftsIndex([...validDrafts, ...allDrafts.filter(d => 
        d.escolinhaId !== escolinhaId && Date.now() - d.timestamp < maxAge
      )]);
    }
    return validDrafts;
  } catch {
    return [];
  }
};

export const saveDraftsIndex = (drafts: DraftMetadata[]) => {
  localStorage.setItem(DRAFTS_INDEX_KEY, JSON.stringify(drafts));
};

export const saveDraft = (draft: DraftData) => {
  // Save full draft
  localStorage.setItem(getDraftKey(draft.id), JSON.stringify(draft));
  
  // Update index
  const indexStr = localStorage.getItem(DRAFTS_INDEX_KEY);
  let allDrafts: DraftMetadata[] = [];
  try {
    if (indexStr) allDrafts = JSON.parse(indexStr);
  } catch {
    allDrafts = [];
  }
  
  // Remove existing entry for this ID
  allDrafts = allDrafts.filter(d => d.id !== draft.id);
  
  // Add updated metadata
  allDrafts.push({
    id: draft.id,
    nome: draft.nome,
    responsavelNome: draft.responsavelNome,
    timestamp: draft.timestamp,
    escolinhaId: draft.escolinhaId
  });
  
  saveDraftsIndex(allDrafts);
};

export const loadDraft = (id: string): DraftData | null => {
  try {
    const draftStr = localStorage.getItem(getDraftKey(id));
    if (!draftStr) return null;
    return JSON.parse(draftStr);
  } catch {
    return null;
  }
};

export const deleteDraft = (id: string) => {
  localStorage.removeItem(getDraftKey(id));
  
  const indexStr = localStorage.getItem(DRAFTS_INDEX_KEY);
  if (!indexStr) return;
  
  try {
    const allDrafts: DraftMetadata[] = JSON.parse(indexStr);
    saveDraftsIndex(allDrafts.filter(d => d.id !== id));
  } catch {
    // Ignore errors
  }
};

interface DraftManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  escolinhaId: string;
  onSelectDraft: (draft: DraftData) => void;
  onNewStudent: () => void;
}

const DraftManagerDialog = ({ 
  open, 
  onOpenChange, 
  escolinhaId, 
  onSelectDraft,
  onNewStudent 
}: DraftManagerDialogProps) => {
  const [drafts, setDrafts] = useState<DraftMetadata[]>([]);

  useEffect(() => {
    if (open) {
      setDrafts(getDraftsIndex(escolinhaId));
    }
  }, [open, escolinhaId]);

  const handleSelectDraft = (metadata: DraftMetadata) => {
    const draft = loadDraft(metadata.id);
    if (draft) {
      onSelectDraft(draft);
      onOpenChange(false);
    }
  };

  const handleDeleteDraft = (id: string) => {
    deleteDraft(id);
    setDrafts(getDraftsIndex(escolinhaId));
  };

  const handleNewStudent = () => {
    onNewStudent();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Cadastros em Andamento
          </DialogTitle>
          <DialogDescription>
            Retome um cadastro anterior ou inicie um novo
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button 
            onClick={handleNewStudent}
            className="w-full gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Aluno
          </Button>

          {drafts.length > 0 && (
            <>
              <div className="text-sm font-medium text-muted-foreground">
                Rascunhos salvos ({drafts.length})
              </div>
              
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2">
                  {drafts.sort((a, b) => b.timestamp - a.timestamp).map((draft) => (
                    <div 
                      key={draft.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <button
                        onClick={() => handleSelectDraft(draft)}
                        className="flex-1 text-left"
                      >
                        <div className="font-medium">
                          {draft.nome || 'Sem nome'}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          {draft.responsavelNome && (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {draft.responsavelNome}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(draft.timestamp, { 
                              addSuffix: true, 
                              locale: ptBR 
                            })}
                          </span>
                        </div>
                      </button>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDraft(draft.id)}
                        className="text-destructive hover:text-destructive/90"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          {drafts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum rascunho salvo</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DraftManagerDialog;
