import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminPageLayout } from '@/components/layouts/AdminPageLayout';
import { DocumentationModuleList } from '@/components/admin/app-docs/DocumentationModuleList';
import { DocumentationDetailView } from '@/components/admin/app-docs/DocumentationDetailView';
import { DocumentationEditor } from '@/components/admin/app-docs/DocumentationEditor';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, BookOpen, LayoutGrid, Database } from 'lucide-react';
import { FieldDocumentationList } from '@/components/admin/app-docs/FieldDocumentationList';

export default function AppDocumentation() {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('pages');

  const { data: documentation, isLoading, refetch } = useQuery({
    queryKey: ['app-documentation', moduleFilter, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from('app_documentation')
        .select('*, app_metrics_documentation(*)')
        .eq('is_active', true)
        .order('module')
        .order('name');

      if (moduleFilter !== 'all') {
        query = query.eq('module', moduleFilter);
      }

      if (searchTerm) {
        query = query.ilike('name', `%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      // Cast JSON fields to proper types
      return (data || []).map(doc => ({
        ...doc,
        hooks_used: (doc.hooks_used as string[]) || [],
        rpcs_used: (doc.rpcs_used as string[]) || [],
        tables_accessed: (doc.tables_accessed as string[]) || [],
        filters_available: (doc.filters_available as string[]) || [],
        app_metrics_documentation: doc.app_metrics_documentation?.map((m: any) => ({
          ...m,
          fields_used: (m.fields_used as string[]) || [],
        })) || [],
      }));
    }
  });

  const handleSelectDoc = (id: string) => {
    setSelectedDocId(id);
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCreate = () => {
    setSelectedDocId(null);
    setIsCreating(true);
    setIsEditing(false);
  };

  const handleSave = () => {
    setIsEditing(false);
    setIsCreating(false);
    refetch();
  };

  const handleCancel = () => {
    setIsEditing(false);
    setIsCreating(false);
  };

  const handleBack = () => {
    setSelectedDocId(null);
    setIsEditing(false);
    setIsCreating(false);
  };

  const selectedDoc = documentation?.find(d => d.id === selectedDocId);

  return (
    <AdminPageLayout
      title="Documentação Técnica"
      description="Documentação completa de todas as áreas da aplicação"
      actions={
        <Button onClick={handleCreate} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Documentação
        </Button>
      }
    >
      {isCreating || isEditing ? (
        <DocumentationEditor
          documentation={isEditing ? selectedDoc : null}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      ) : selectedDocId && selectedDoc ? (
        <DocumentationDetailView
          documentation={selectedDoc}
          onBack={handleBack}
          onEdit={handleEdit}
        />
      ) : (
        <div className="space-y-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documentação..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={moduleFilter} onValueChange={setModuleFilter}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Filtrar por módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Módulos</SelectItem>
                <SelectItem value="telemarketing">Telemarketing</SelectItem>
                <SelectItem value="scouter">Scouter</SelectItem>
                <SelectItem value="produtor">Produtor</SelectItem>
                <SelectItem value="gestao">Gestão</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="pages" className="gap-2">
                <LayoutGrid className="h-4 w-4" />
                Páginas
              </TabsTrigger>
              <TabsTrigger value="fields" className="gap-2">
                <Database className="h-4 w-4" />
                Campos
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pages" className="mt-6">
              <DocumentationModuleList
                documentation={documentation || []}
                isLoading={isLoading}
                onSelectDoc={handleSelectDoc}
              />
            </TabsContent>

            <TabsContent value="fields" className="mt-6">
              <FieldDocumentationList />
            </TabsContent>
          </Tabs>
        </div>
      )}
    </AdminPageLayout>
  );
}
