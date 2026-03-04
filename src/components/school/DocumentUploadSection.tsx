import React, { useCallback, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Trash2,
  FileImage,
  File
} from 'lucide-react';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
const ACCEPTED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

interface DocumentoUpload {
  id: string;
  tipo_documento: string;
  nome_arquivo: string;
  storage_path: string;
  tamanho_bytes: number;
  mime_type: string;
  created_at: string;
}

interface DocumentUploadSectionProps {
  tipoPessoa: 'cpf' | 'cnpj';
  onDocumentChange?: () => void;
}

interface DocumentConfig {
  key: string;
  label: string;
  required: boolean;
  description: string;
}

const getDocumentConfigs = (tipoPessoa: 'cpf' | 'cnpj'): DocumentConfig[] => {
  if (tipoPessoa === 'cpf') {
    return [
      {
        key: 'documento_foto_pf',
        label: 'Documento com foto (RG ou CNH)',
        required: true,
        description: 'Upload de RG ou CNH do responsável'
      }
    ];
  }
  
  return [
    {
      key: 'contrato_social',
      label: 'Contrato Social ou Requerimento de Empresário',
      required: true,
      description: 'Upload do contrato social ou requerimento de empresário'
    },
    {
      key: 'documento_responsavel_pj',
      label: 'Documento do responsável legal (RG ou CNH)',
      required: true,
      description: 'Upload de RG ou CNH do responsável legal da empresa'
    }
  ];
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(mimeType: string | undefined | null) {
  if (mimeType?.startsWith('image/')) {
    return <FileImage className="w-4 h-4" />;
  }
  return <File className="w-4 h-4" />;
}

export default function DocumentUploadSection({ tipoPessoa, onDocumentChange }: DocumentUploadSectionProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);

  const documentConfigs = getDocumentConfigs(tipoPessoa);

  // Fetch existing documents
  const { data: documentos = [], isLoading } = useQuery({
    queryKey: ['escola-documentos', user?.escolinhaId],
    queryFn: async () => {
      if (!user?.escolinhaId) return [];

      const { data, error } = await supabase
        .from('escola_documentos')
        .select('*')
        .eq('escolinha_id', user.escolinhaId);

      if (error) throw error;
      return data as DocumentoUpload[];
    },
    enabled: !!user?.escolinhaId,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async ({ file, tipoDocumento }: { file: File; tipoDocumento: string }) => {
      if (!user?.escolinhaId || !user?.id) throw new Error('Dados do usuário não encontrados');

      // Validate file
      if (!ACCEPTED_TYPES.includes(file.type)) {
        throw new Error('Tipo de arquivo não aceito. Use PDF, JPG ou PNG.');
      }
      if (file.size > MAX_FILE_SIZE) {
        throw new Error('Arquivo muito grande. Tamanho máximo: 10MB.');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/${user.escolinhaId}/${tipoDocumento}_${Date.now()}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('escola-documentos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Delete previous document of same type if exists
      const existingDoc = documentos.find(d => d.tipo_documento === tipoDocumento);
      if (existingDoc) {
        // Delete from storage
        await supabase.storage
          .from('escola-documentos')
          .remove([existingDoc.storage_path]);
        
        // Delete from DB
        await supabase
          .from('escola_documentos')
          .delete()
          .eq('id', existingDoc.id);
      }

      // Save reference in DB
      const { error: dbError } = await supabase
        .from('escola_documentos')
        .insert({
          escolinha_id: user.escolinhaId,
          tipo_documento: tipoDocumento,
          nome_arquivo: file.name,
          storage_path: fileName,
          tamanho_bytes: file.size,
          mime_type: file.type,
        });

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Documento enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['escola-documentos'] });
      onDocumentChange?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar: ${error.message}`);
    },
    onSettled: () => {
      setUploadingDoc(null);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (documento: DocumentoUpload) => {
      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('escola-documentos')
        .remove([documento.storage_path]);

      if (storageError) throw storageError;

      // Delete from DB
      const { error: dbError } = await supabase
        .from('escola_documentos')
        .delete()
        .eq('id', documento.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Documento removido!');
      queryClient.invalidateQueries({ queryKey: ['escola-documentos'] });
      onDocumentChange?.();
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover: ${error.message}`);
    }
  });

  const handleFileSelect = useCallback(async (
    event: React.ChangeEvent<HTMLInputElement>,
    tipoDocumento: string
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingDoc(tipoDocumento);
    uploadMutation.mutate({ file, tipoDocumento });
    
    // Clear input so same file can be selected again
    event.target.value = '';
  }, [uploadMutation]);

  const getDocumentStatus = (tipoDocumento: string): DocumentoUpload | undefined => {
    return documentos.find(d => d.tipo_documento === tipoDocumento);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-muted-foreground" />
        <h3 className="font-medium">Documentos</h3>
      </div>
      <p className="text-sm text-muted-foreground">
        Envie os documentos necessários para validação do cadastro. Formatos aceitos: PDF, JPG ou PNG (máx. 10MB cada).
      </p>

      <div className="space-y-4">
        {documentConfigs.map((config) => {
          const existingDoc = getDocumentStatus(config.key);
          const isUploading = uploadingDoc === config.key;
          const isDeleting = deleteMutation.isPending && deleteMutation.variables?.tipo_documento === config.key;

          return (
            <div
              key={config.key}
              className={cn(
                "border rounded-lg p-4 transition-colors",
                existingDoc ? "border-green-200 bg-green-50/50 dark:border-green-900 dark:bg-green-950/20" : "border-dashed border-muted-foreground/30"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Label className="font-medium">
                      {config.label}
                    </Label>
                    {config.required && (
                      <span className="text-xs text-destructive">*</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {config.description}
                  </p>

                  {existingDoc && (
                    <div className="flex items-center gap-2 mt-2 text-sm text-green-700 dark:text-green-400">
                      {getFileIcon(existingDoc.mime_type)}
                      <span className="truncate max-w-[200px]">{existingDoc.nome_arquivo}</span>
                      <span className="text-muted-foreground">
                        ({formatFileSize(existingDoc.tamanho_bytes)})
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {existingDoc ? (
                    <>
                      <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
                        <CheckCircle2 className="w-4 h-4" />
                        <span className="text-xs font-medium">Enviado</span>
                      </div>
                      
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate(existingDoc)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4" />
                        )}
                      </Button>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept={ACCEPTED_EXTENSIONS}
                          onChange={(e) => handleFileSelect(e, config.key)}
                          disabled={isUploading}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5 pointer-events-none"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          Substituir
                        </Button>
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <AlertCircle className="w-4 h-4" />
                        <span className="text-xs">Não enviado</span>
                      </div>

                      <label className="cursor-pointer">
                        <input
                          type="file"
                          className="hidden"
                          accept={ACCEPTED_EXTENSIONS}
                          onChange={(e) => handleFileSelect(e, config.key)}
                          disabled={isUploading}
                        />
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="gap-1.5 pointer-events-none"
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Upload className="w-3.5 h-3.5" />
                          )}
                          Enviar
                        </Button>
                      </label>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
