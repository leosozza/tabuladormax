import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DocumentUpload } from '@/components/admin/DocumentUpload';
import { InstructionForm } from '@/components/admin/InstructionForm';
import { TrainingList } from '@/components/admin/TrainingList';
import { ContextPreview } from '@/components/admin/ContextPreview';
import { Brain, Upload, FileText, List, Eye } from 'lucide-react';

export default function AITraining() {
  return (
    <AdminPageLayout
      title="Treinamento de IA"
      description="Configure instruções e documentos para treinar o agente MAXconnect"
      showBackButton
      backTo="/home-choice"
    >
      <div className="space-y-6">
        {/* Header with icon */}
        <div className="flex items-center gap-3 pb-4 border-b">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Sistema de Treinamento Dinâmico
            </h2>
            <p className="text-sm text-muted-foreground">
              Adicione PDFs e instruções personalizadas para customizar o comportamento do agente
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="upload" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload" className="flex items-center gap-2">
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">Upload</span>
            </TabsTrigger>
            <TabsTrigger value="instructions" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <span className="hidden sm:inline">Instruções</span>
            </TabsTrigger>
            <TabsTrigger value="manage" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              <span className="hidden sm:inline">Gerenciar</span>
            </TabsTrigger>
            <TabsTrigger value="preview" className="flex items-center gap-2">
              <Eye className="w-4 h-4" />
              <span className="hidden sm:inline">Preview</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Upload de Documentos
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Faça upload de PDFs, DOCX ou TXT. O sistema irá extrair o texto automaticamente
                e incorporá-lo ao conhecimento do agente.
              </p>
            </div>
            <DocumentUpload />
          </TabsContent>

          <TabsContent value="instructions" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Instruções Manuais
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Adicione instruções de texto para definir o tom de resposta, procedimentos,
                regras de negócio e outras diretrizes.
              </p>
            </div>
            <InstructionForm />
          </TabsContent>

          <TabsContent value="manage" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Gerenciar Treinamentos
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Visualize, edite e controle todas as instruções e documentos cadastrados.
                Use o switch para ativar/desativar instruções conforme necessário.
              </p>
            </div>
            <TrainingList />
          </TabsContent>

          <TabsContent value="preview" className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Preview do Context
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                Visualize como ficará o context completo que será enviado para o agente.
                Apenas instruções ativas são incluídas.
              </p>
            </div>
            <ContextPreview />
          </TabsContent>
        </Tabs>
      </div>
    </AdminPageLayout>
  );
}
