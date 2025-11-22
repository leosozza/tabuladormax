import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";
import { ScouterCard } from "./ScouterCard";

interface Scouter {
  id: string;
  name: string;
  photo_url?: string;
  whatsapp?: string;
  phone?: string;
  responsible_user_id?: string;
  last_activity_at?: string;
  total_leads: number;
  leads_last_30_days: number;
  status: 'ativo' | 'inativo' | 'standby' | 'blacklist';
  notes?: string;
}

interface ScouterColumnProps {
  id: string;
  title: string;
  icon: LucideIcon;
  color: string;
  scouters: Scouter[];
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (scouter: Scouter) => void;
  onViewPerformance: (scouter: Scouter) => void;
}

export function ScouterColumn({
  id,
  title,
  icon: Icon,
  color,
  scouters,
  onStatusChange,
  onEdit,
  onViewPerformance,
}: ScouterColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`flex-1 min-w-[280px] ${isOver ? 'ring-2 ring-primary' : ''}`}
    >
      <Card className={`${color} border-2 h-full`}>
        {/* Header */}
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" />
              <h3 className="font-semibold">{title}</h3>
            </div>
            <Badge variant="secondary" className="font-semibold">
              {scouters.length}
            </Badge>
          </div>
        </div>

        {/* Scouters List */}
        <div className="p-4 space-y-3 overflow-y-auto max-h-[calc(100vh-300px)]">
          <SortableContext
            items={scouters.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {scouters.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Nenhum scouter {title.toLowerCase()}
              </p>
            ) : (
              scouters.map((scouter) => (
                <ScouterCard
                  key={scouter.id}
                  scouter={scouter}
                  onStatusChange={onStatusChange}
                  onEdit={onEdit}
                  onViewPerformance={onViewPerformance}
                />
              ))
            )}
          </SortableContext>
        </div>
      </Card>
    </div>
  );
}
