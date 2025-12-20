import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Headset, Target, Briefcase, BarChart3, Shield, 
  FileText, ExternalLink, ChevronRight, Database, Code
} from 'lucide-react';

interface Documentation {
  id: string;
  name: string;
  description: string | null;
  page_route: string;
  category: string;
  module: string;
  main_component: string | null;
  hooks_used: string[];
  rpcs_used: string[];
  tables_accessed: string[];
  app_metrics_documentation: any[];
}

interface Props {
  documentation: Documentation[];
  isLoading: boolean;
  onSelectDoc: (id: string) => void;
}

const moduleIcons: Record<string, any> = {
  telemarketing: Headset,
  scouter: Target,
  produtor: Briefcase,
  gestao: BarChart3,
  admin: Shield,
};

const moduleLabels: Record<string, string> = {
  telemarketing: 'Telemarketing',
  scouter: 'Scouter',
  produtor: 'Produtor',
  gestao: 'Gestão',
  admin: 'Admin',
};

const moduleColors: Record<string, string> = {
  telemarketing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  scouter: 'bg-green-500/10 text-green-500 border-green-500/20',
  produtor: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  gestao: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  admin: 'bg-red-500/10 text-red-500 border-red-500/20',
};

const categoryLabels: Record<string, string> = {
  page: 'Página',
  dashboard: 'Dashboard',
  report: 'Relatório',
  portal: 'Portal',
};

export function DocumentationModuleList({ documentation, isLoading, onSelectDoc }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-6">
        {[1, 2, 3].map(i => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-8 w-40" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map(j => (
                <Skeleton key={j} className="h-40" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Group by module
  const grouped = documentation.reduce((acc, doc) => {
    if (!acc[doc.module]) {
      acc[doc.module] = [];
    }
    acc[doc.module].push(doc);
    return acc;
  }, {} as Record<string, Documentation[]>);

  if (Object.keys(grouped).length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhuma documentação encontrada</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Crie uma nova documentação para começar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {Object.entries(grouped).map(([module, docs]) => {
        const Icon = moduleIcons[module] || FileText;
        
        return (
          <div key={module}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">{moduleLabels[module] || module}</h2>
              <Badge variant="secondary" className="ml-2">
                {docs.length} {docs.length === 1 ? 'item' : 'itens'}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {docs.map(doc => (
                <Card 
                  key={doc.id} 
                  className="cursor-pointer hover:border-primary/50 transition-colors group"
                  onClick={() => onSelectDoc(doc.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base line-clamp-1">{doc.name}</CardTitle>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    <Badge 
                      variant="outline" 
                      className={`w-fit ${moduleColors[doc.module]}`}
                    >
                      {categoryLabels[doc.category] || doc.category}
                    </Badge>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {doc.description || 'Sem descrição'}
                    </p>
                    
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <ExternalLink className="h-3 w-3" />
                      <code className="bg-muted px-1 py-0.5 rounded text-[10px]">
                        {doc.page_route}
                      </code>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {doc.app_metrics_documentation?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <BarChart3 className="h-3 w-3 mr-1" />
                          {doc.app_metrics_documentation.length} métricas
                        </Badge>
                      )}
                      {doc.rpcs_used?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Code className="h-3 w-3 mr-1" />
                          {doc.rpcs_used.length} RPCs
                        </Badge>
                      )}
                      {doc.tables_accessed?.length > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          <Database className="h-3 w-3 mr-1" />
                          {doc.tables_accessed.length} tabelas
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
