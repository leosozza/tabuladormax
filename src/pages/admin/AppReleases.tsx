import { useState } from 'react';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Download, Trash2, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface AppRelease {
  id: string;
  version: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  is_latest: boolean;
  notes: string | null;
}

export default function AppReleases() {
  const [uploading, setUploading] = useState(false);
  const [version, setVersion] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const queryClient = useQueryClient();

  // Buscar releases
  const { data: releases, isLoading } = useQuery({
    queryKey: ['app-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_releases')
        .select('*')
        .order('uploaded_at', { ascending: false });
      
      if (error) throw error;
      return data as AppRelease[];
    }
  });

  // Upload do APK
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !version) {
        throw new Error('Selecione um arquivo APK e informe a versão');
      }

      setUploading(true);

      // Upload para storage
      const fileName = `tabuladormax-${version}.apk`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-releases')
        .upload(fileName, selectedFile, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) throw uploadError;

      // Salvar metadados
      const { error: insertError } = await supabase
        .from('app_releases')
        .insert({
          version,
          file_path: uploadData.path,
          file_size: selectedFile.size,
          notes,
          is_latest: true
        });

      if (insertError) throw insertError;

      return uploadData;
    },
    onSuccess: () => {
      toast.success('APK enviado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['app-releases'] });
      setVersion('');
      setNotes('');
      setSelectedFile(null);
      setUploading(false);
    },
    onError: (error: Error) => {
      toast.error(`Erro ao enviar APK: ${error.message}`);
      setUploading(false);
    }
  });

  // Deletar release
  const deleteMutation = useMutation({
    mutationFn: async (release: AppRelease) => {
      // Deletar do storage
      const { error: storageError } = await supabase.storage
        .from('app-releases')
        .remove([release.file_path]);

      if (storageError) throw storageError;

      // Deletar metadados
      const { error: dbError } = await supabase
        .from('app_releases')
        .delete()
        .eq('id', release.id);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      toast.success('Release removida com sucesso');
      queryClient.invalidateQueries({ queryKey: ['app-releases'] });
    },
    onError: (error: Error) => {
      toast.error(`Erro ao remover release: ${error.message}`);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.apk')) {
        setSelectedFile(file);
      } else {
        toast.error('Por favor, selecione um arquivo .apk');
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  return (
    <AdminPageLayout
      title="Gerenciar Releases do App"
      description="Upload e gerenciamento de versões do aplicativo Android"
    >
      <div className="space-y-6">
        {/* Card de Upload */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Enviar Nova Versão
            </CardTitle>
            <CardDescription>
              Faça upload do arquivo APK do aplicativo TabuladorMax
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="version">Versão</Label>
              <Input
                id="version"
                placeholder="Ex: 1.0.0"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="apk-file">Arquivo APK</Label>
              <Input
                id="apk-file"
                type="file"
                accept=".apk"
                onChange={handleFileChange}
              />
              {selectedFile && (
                <p className="text-sm text-muted-foreground">
                  Arquivo: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notas da Versão (Opcional)</Label>
              <Textarea
                id="notes"
                placeholder="Descreva as mudanças desta versão..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button
              onClick={() => uploadMutation.mutate()}
              disabled={!selectedFile || !version || uploading}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              {uploading ? 'Enviando...' : 'Enviar APK'}
            </Button>
          </CardContent>
        </Card>

        {/* Lista de Releases */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5" />
              Versões Disponíveis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Carregando...</p>
            ) : releases && releases.length > 0 ? (
              <div className="space-y-3">
                {releases.map((release) => (
                  <div
                    key={release.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">Versão {release.version}</h4>
                        {release.is_latest && (
                          <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
                            Atual
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(release.file_size)} • {new Date(release.uploaded_at).toLocaleDateString('pt-BR')}
                      </p>
                      {release.notes && (
                        <p className="text-sm text-muted-foreground mt-1">{release.notes}</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={async () => {
                          const { data } = supabase.storage
                            .from('app-releases')
                            .getPublicUrl(release.file_path);
                          window.open(data.publicUrl, '_blank');
                        }}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => deleteMutation.mutate(release)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma versão disponível</p>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPageLayout>
  );
}
