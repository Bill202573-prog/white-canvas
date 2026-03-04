import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Loader2 } from 'lucide-react';
import { usePwaInstallsByEscolinha } from '@/hooks/usePwaInstallsData';

export function PwaInstallsSection({ escolinhaId }: { escolinhaId: string }) {
  const { data: installs = [], isLoading } = usePwaInstallsByEscolinha(escolinhaId);

  const androidCount = installs.filter(i => i.os === 'android').length;
  const iosCount = installs.filter(i => i.os === 'ios').length;
  const otherCount = installs.filter(i => i.os !== 'android' && i.os !== 'ios').length;
  const total = installs.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Instalações do App</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : total === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma instalação registrada.</p>
        ) : (
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-foreground">{total}</p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {androidCount > 0 && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                  Android: {androidCount}
                </Badge>
              )}
              {iosCount > 0 && (
                <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">
                  iPhone: {iosCount}
                </Badge>
              )}
              {otherCount > 0 && (
                <Badge variant="outline">
                  Outros: {otherCount}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
