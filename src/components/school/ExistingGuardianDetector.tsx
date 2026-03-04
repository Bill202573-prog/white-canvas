import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Users, 
  Check, 
  Search, 
  UserPlus, 
  Loader2,
  Phone,
  Mail,
  MapPin,
  Baby
} from 'lucide-react';
import { useExistingGuardianLookup, ExistingGuardian } from '@/hooks/useExistingGuardianLookup';
import { validateCPF } from '@/lib/cpf-validator';

interface ExistingGuardianDetectorProps {
  email: string;
  cpf: string;
  onGuardianFound: (guardian: ExistingGuardian) => void;
  onUseExistingGuardian: (guardian: ExistingGuardian) => void;
  onCreateNewGuardian: () => void;
  isSearchEnabled: boolean;
}

// CPF formatting
const formatCpf = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

// Phone formatting
const formatPhone = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export function ExistingGuardianDetector({
  email,
  cpf,
  onGuardianFound,
  onUseExistingGuardian,
  onCreateNewGuardian,
  isSearchEnabled,
}: ExistingGuardianDetectorProps) {
  const { isSearching, searchByEmail, searchByCpf, resetSearch } = useExistingGuardianLookup();
  const [foundGuardian, setFoundGuardian] = useState<ExistingGuardian | null>(null);
  const [searchSource, setSearchSource] = useState<'email' | 'cpf' | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Search by email when it changes
  useEffect(() => {
    if (!isSearchEnabled || dismissed) return;
    
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      return;
    }

    const timer = setTimeout(async () => {
      const result = await searchByEmail(normalizedEmail);
      if (result.found && result.guardian) {
        setFoundGuardian(result.guardian);
        setSearchSource('email');
        onGuardianFound(result.guardian);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [email, isSearchEnabled, dismissed, searchByEmail, onGuardianFound]);

  // Search by CPF when it changes
  useEffect(() => {
    if (!isSearchEnabled || dismissed || foundGuardian) return;
    
    const normalizedCpf = cpf.replace(/\D/g, '');
    if (normalizedCpf.length !== 11 || !validateCPF(cpf)) {
      return;
    }

    const timer = setTimeout(async () => {
      const result = await searchByCpf(normalizedCpf);
      if (result.found && result.guardian) {
        setFoundGuardian(result.guardian);
        setSearchSource('cpf');
        onGuardianFound(result.guardian);
      }
    }, 500); // Debounce

    return () => clearTimeout(timer);
  }, [cpf, isSearchEnabled, dismissed, foundGuardian, searchByCpf, onGuardianFound]);

  // Reset when email/cpf changes significantly
  useEffect(() => {
    if (foundGuardian) {
      const emailMatches = foundGuardian.email.toLowerCase() === email.trim().toLowerCase();
      const cpfMatches = foundGuardian.cpf === cpf.replace(/\D/g, '');
      
      if (!emailMatches && !cpfMatches) {
        setFoundGuardian(null);
        setSearchSource(null);
        setDismissed(false);
        resetSearch();
      }
    }
  }, [email, cpf, foundGuardian, resetSearch]);

  const handleUseExisting = useCallback(() => {
    if (foundGuardian) {
      onUseExistingGuardian(foundGuardian);
    }
  }, [foundGuardian, onUseExistingGuardian]);

  const handleCreateNew = useCallback(() => {
    setDismissed(true);
    setFoundGuardian(null);
    onCreateNewGuardian();
  }, [onCreateNewGuardian]);

  if (!foundGuardian || dismissed) {
    return null;
  }

  return (
    <Card className="border-primary/30 bg-primary/5 animate-fade-in">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2 text-primary">
          <Search className="w-4 h-4" />
          Responsável Encontrado
          <Badge variant="secondary" className="ml-auto">
            Via {searchSource === 'email' ? 'E-mail' : 'CPF'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 bg-background rounded-lg border">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0 space-y-2">
              <div>
                <p className="font-semibold text-lg">{foundGuardian.nome}</p>
                <div className="flex flex-wrap gap-2 mt-1">
                  {foundGuardian.hasCredentials && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs">
                      <Check className="w-3 h-3 mr-1" />
                      Acesso Ativo
                    </Badge>
                  )}
                  {foundGuardian.childrenCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      <Baby className="w-3 h-3 mr-1" />
                      {foundGuardian.childrenCount} filho(s)
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{foundGuardian.email}</span>
                </div>
                {foundGuardian.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{formatPhone(foundGuardian.telefone)}</span>
                  </div>
                )}
              </div>

              {foundGuardian.cidade && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{foundGuardian.cidade}{foundGuardian.estado ? `, ${foundGuardian.estado}` : ''}</span>
                </div>
              )}

              {foundGuardian.childrenNames.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground mb-1">Filhos vinculados:</p>
                  <div className="flex flex-wrap gap-1">
                    {foundGuardian.childrenNames.map((name, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 rounded-md">
          <p className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Este responsável já está cadastrado.</strong> Você pode vincular o novo aluno a ele diretamente, 
            herdando os dados e acesso já existentes.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            onClick={handleUseExisting} 
            className="flex-1"
            size="lg"
          >
            <Check className="w-4 h-4 mr-2" />
            Usar Este Responsável
          </Button>
          <Button 
            onClick={handleCreateNew} 
            variant="outline"
            size="lg"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Criar Novo
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ExistingGuardianDetector;
