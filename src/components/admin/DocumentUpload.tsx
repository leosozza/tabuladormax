import { useState, useCallback } from 'react';
import { Upload, FileText, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useCreateInstruction } from '@/hooks/useAITraining';

const CATEGORIES = [
  { value: 'procedures', label: 'Procedimentos' },
  { value: 'product_knowledge', label: 'Conhecimento de Produto' },
  { value: 'responses', label: 'Tom de Resposta' },
  { value: 'business_rules', label: 'Regras de Negócio' },
  { value: 'other', label: 'Outros' },
];

export function DocumentUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('product_knowledge');
  const [priority, setPriority] = useState(5);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const createInstruction = useCreateInstruction();

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleFileSelect = (selectedFile: File) => {
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    const maxSize = 20 * 1024 * 1024; // 20MB

    if (!validTypes.includes(selectedFile.type)) {
      toast.error('Tipo de arquivo não suportado. Use PDF, DOCX ou TXT.');
      return;
    }

    if (selectedFile.size > maxSize) {
      toast.error('Arquivo muito grande. Máximo 20MB.');
      return;
    }

    setFile(selectedFile);
    if (!title) {
      setTitle(selectedFile.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (!file || !title.trim()) {
      toast.error('Preencha o título e selecione um arquivo');
      return;
    }

    setUploading(true);

    try {
      // Upload file to storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('ai-training-docs')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Parse document
      const { data: functionData, error: functionError } = await supabase.functions.invoke(
        'ai-training-parser',
        {
          body: { filePath, fileName: file.name, category, priority }
        }
      );

      if (functionError) throw functionError;

      if (functionData?.content) {
        // Create instruction with parsed content
        await createInstruction.mutateAsync({
          title,
          type: file.type === 'application/pdf' ? 'pdf' : 'document',
          content: functionData.content,
          file_path: filePath,
          priority,
          category,
          is_active: true,
        });

        // Reset form
        setFile(null);
        setTitle('');
        setPriority(5);
      } else {
        throw new Error('Falha ao processar documento');
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Erro ao fazer upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Drag & Drop Area */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
          }`}
        >
          {file ? (
            <div className="flex items-center justify-center gap-3">
              <FileText className="w-8 h-8 text-primary" />
              <div className="flex-1 text-left">
                <p className="font-medium text-foreground">{file.name}</p>
                <p className="text-sm text-muted-foreground">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setFile(null)}
                disabled={uploading}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <>
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-foreground font-medium mb-2">
                Arraste um arquivo aqui ou clique para selecionar
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                PDF, DOCX ou TXT • Máximo 20MB
              </p>
              <Input
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
                className="hidden"
                id="file-upload"
                disabled={uploading}
              />
              <Button variant="outline" asChild disabled={uploading}>
                <label htmlFor="file-upload" className="cursor-pointer">
                  Selecionar Arquivo
                </label>
              </Button>
            </>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Título</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Manual de Vendas Projeto X"
              disabled={uploading}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={uploading}>
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="priority">Prioridade (0-10)</Label>
              <Input
                id="priority"
                type="number"
                min="0"
                max="10"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                disabled={uploading}
              />
            </div>
          </div>
        </div>

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={!file || !title.trim() || uploading}
          className="w-full"
        >
          {uploading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <Upload className="w-4 h-4 mr-2" />
              Fazer Upload e Processar
            </>
          )}
        </Button>
      </div>
    </Card>
  );
}
