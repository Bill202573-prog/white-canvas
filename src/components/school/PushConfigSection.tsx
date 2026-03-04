import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Bell, Loader2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

interface PushConfigSectionProps {
  escolinhaId: string;
}

export function PushConfigSection({ escolinhaId }: PushConfigSectionProps) {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['escola-push-config', escolinhaId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('escola_push_config')
        .select('*')
        .eq('escolinha_id', escolinhaId)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
  });

  const [form, setForm] = useState<Record<string, boolean>>({});

  const getValue = (key: string, defaultValue: boolean) => {
    if (key in form) return form[key];
    if (config && key in config) return (config as any)[key];
    return defaultValue;
  };

  const setField = (key: string, value: boolean) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        escolinha_id: escolinhaId,
        push_ativo: getValue('push_ativo', false),
        cobranca_3_dias_antes: getValue('cobranca_3_dias_antes', true),
        cobranca_1_dia_antes: getValue('cobranca_1_dia_antes', true),
        cobranca_no_dia: getValue('cobranca_no_dia', true),
        cobranca_1_dia_depois: getValue('cobranca_1_dia_depois', false),
        convocacao_2_dias_antes: getValue('convocacao_2_dias_antes', true),
        convocacao_1_dia_antes: getValue('convocacao_1_dia_antes', true),
        convocacao_no_dia: getValue('convocacao_no_dia', false),
        aula_3_dias_antes: getValue('aula_3_dias_antes', true),
        aula_1_dia_antes: getValue('aula_1_dia_antes', true),
        aula_no_dia: getValue('aula_no_dia', true),
        comunicado_push: getValue('comunicado_push', true),
      };

      const { error } = await supabase
        .from('escola_push_config')
        .upsert(payload, { onConflict: 'escolinha_id' });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Configurações de notificação salvas!');
      setForm({});
      queryClient.invalidateQueries({ queryKey: ['escola-push-config', escolinhaId] });
    },
    onError: () => {
      toast.error('Erro ao salvar configurações');
    },
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const hasChanges = Object.keys(form).length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bell className="w-5 h-5 text-primary" />
          Notificações Push
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Master toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
          <div>
            <Label className="font-semibold">Ativar Push Notifications</Label>
            <p className="text-xs text-muted-foreground">
              Enviar lembretes automáticos para os responsáveis
            </p>
          </div>
          <Switch
            checked={getValue('push_ativo', false)}
            onCheckedChange={(v) => setField('push_ativo', v)}
          />
        </div>

        {getValue('push_ativo', false) && (
          <>
            {/* Cobrança */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">💰 Lembretes de Cobrança</h4>
              <p className="text-xs text-muted-foreground pl-2">
                Lembra os responsáveis sobre o vencimento da mensalidade. Não é enviado se o pagamento já foi realizado.
              </p>
              <div className="space-y-2 pl-2">
                {[
                  { key: 'cobranca_3_dias_antes', label: '3 dias antes do vencimento', default: true },
                  { key: 'cobranca_1_dia_antes', label: '1 dia antes do vencimento', default: true },
                  { key: 'cobranca_no_dia', label: 'No dia do vencimento', default: true },
                  { key: 'cobranca_1_dia_depois', label: '1 dia após (atrasado)', default: false },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <Label className="text-sm">{item.label}</Label>
                    <Switch
                      checked={getValue(item.key, item.default)}
                      onCheckedChange={(v) => setField(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Lembrete de Presença nos Jogos */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">⚽ Lembrete de Presença nos Jogos</h4>
              <p className="text-xs text-muted-foreground pl-2">
                Enviado apenas para atletas que já confirmaram presença ou pagaram. Serve como lembrete do compromisso assumido (amistosos e campeonatos).
              </p>
              <div className="space-y-2 pl-2">
                {[
                  { key: 'convocacao_2_dias_antes', label: '2 dias antes do jogo', default: true },
                  { key: 'convocacao_1_dia_antes', label: '1 dia antes do jogo', default: true },
                  { key: 'convocacao_no_dia', label: 'No dia do jogo', default: false },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <Label className="text-sm">{item.label}</Label>
                    <Switch
                      checked={getValue(item.key, item.default)}
                      onCheckedChange={(v) => setField(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Aulas */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">📚 Lembretes de Confirmação de Aula</h4>
              <p className="text-xs text-muted-foreground pl-2">
                Lembra o responsável de confirmar a presença na aula. Não é enviado se a presença já foi confirmada. No dia da aula, envia uma mensagem motivacional.
              </p>
              <div className="space-y-2 pl-2">
                {[
                  { key: 'aula_3_dias_antes', label: '3 dias antes — pedir confirmação', default: true },
                  { key: 'aula_1_dia_antes', label: '1 dia antes — lembrar de confirmar', default: true },
                  { key: 'aula_no_dia', label: 'No dia — "Contamos com sua presença!"', default: true },
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between">
                    <Label className="text-sm">{item.label}</Label>
                    <Switch
                      checked={getValue(item.key, item.default)}
                      onCheckedChange={(v) => setField(item.key, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Comunicados */}
            <div className="space-y-3">
              <h4 className="font-semibold text-sm text-foreground">📋 Comunicados</h4>
              <p className="text-xs text-muted-foreground pl-2">
                Envia um push imediato quando um novo comunicado é publicado pela escola.
              </p>
              <div className="space-y-2 pl-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Enviar push ao publicar comunicado</Label>
                  <Switch
                    checked={getValue('comunicado_push', true)}
                    onCheckedChange={(v) => setField('comunicado_push', v)}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {hasChanges && (
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
            className="w-full"
          >
            {saveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            Salvar Configurações
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
