import { ProcessDiagram, categoryConfig } from '@/types/bpmn';
import { moduleConfig } from '@/types/roadmap';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Calendar, GitBranch, Boxes, Users, Link } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ProcessCardProps {
  diagram: ProcessDiagram;
  onView?: (diagram: ProcessDiagram) => void;
  onEdit?: (diagram: ProcessDiagram) => void;
  onDelete?: (diagram: ProcessDiagram) => void;
  canManage?: boolean;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  processo: GitBranch,
  arquitetura: Boxes,
  'fluxo-usuario': Users,
  integracao: Link,
};

export function ProcessCard({ diagram, onView, onEdit, onDelete, canManage }: ProcessCardProps) {
  const category = categoryConfig[diagram.category];
  const module = diagram.module ? moduleConfig[diagram.module as keyof typeof moduleConfig] : null;
  const CategoryIcon = categoryIcons[diagram.category] || GitBranch;
  
  const nodeCount = diagram.diagram_data?.nodes?.length || 0;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded ${category?.color || 'bg-gray-500'} flex items-center justify-center`}>
              <CategoryIcon className="w-4 h-4 text-white" />
            </div>
            <div>
              <CardTitle className="text-base">{diagram.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {category?.label || diagram.category}
                </Badge>
                {module && (
                  <Badge variant="secondary" className="text-xs">
                    {module.label}
                  </Badge>
                )}
              </div>
            </div>
          </div>
          {canManage && (
            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit?.(diagram)}>
                <Edit className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete?.(diagram)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {diagram.description && (
          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{diagram.description}</p>
        )}
        
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span>{nodeCount} elementos</span>
            <span>v{diagram.version}</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span>{format(new Date(diagram.updated_at), "dd MMM yyyy", { locale: ptBR })}</span>
          </div>
        </div>
        
        <div className="mt-3 flex gap-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={() => onView?.(diagram)}>
            <Eye className="w-4 h-4 mr-1" />
            Visualizar
          </Button>
          {canManage && (
            <Button size="sm" className="flex-1" onClick={() => onEdit?.(diagram)}>
              <Edit className="w-4 h-4 mr-1" />
              Editar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
