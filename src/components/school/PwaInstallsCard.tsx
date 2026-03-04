import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Smartphone } from 'lucide-react';
import { useSchoolPwaInstalls } from '@/hooks/usePwaInstallsData';

const osLabels: Record<string, string> = {
  android: 'Android',
  ios: 'iPhone',
  desktop: 'Desktop',
  unknown: 'Outro',
};

export function PwaInstallsCard({ escolinhaId }: { escolinhaId: string }) {
  const { data: installs = [], isLoading } = useSchoolPwaInstalls();

  const androidCount = installs.filter(i => i.os === 'android').length;
  const iosCount = installs.filter(i => i.os === 'ios').length;
  const otherCount = installs.filter(i => i.os !== 'android' && i.os !== 'ios').length;
  const total = installs.length;

  if (isLoading || total === 0) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-primary" />
          <CardTitle>Instalações do App</CardTitle>
        </div>
        <CardDescription>Responsáveis que instalaram o aplicativo</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <p className="text-3xl font-bold text-foreground">{total}</p>
            <p className="text-xs text-muted-foreground">Instalações</p>
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
      </CardContent>
    </Card>
  );
}
