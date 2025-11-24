import { useState } from "react";
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from "@dnd-kit/core";
import { UserCheck, UserX, Clock, Ban } from "lucide-react";
import { ScouterColumn } from "./ScouterColumn";
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

interface ScoutersKanbanProps {
  scouters: Scouter[];
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (scouter: Scouter) => void;
  onViewPerformance: (scouter: Scouter) => void;
  statusFilter?: 'todos' | 'ativo' | 'inativo' | 'standby' | 'blacklist';
}

const STATUS_CONFIG = {
  ativo: {
    id: "ativo",
    label: "Scouter Ativo",
    icon: UserCheck,
    color: "bg-blue-50 border-blue-300",
  },
  inativo: {
    id: "inativo",
    label: "Scouter Inativo",
    icon: UserX,
    color: "bg-purple-50 border-purple-300",
  },
  standby: {
    id: "standby",
    label: "Scouter Standby",
    icon: Clock,
    color: "bg-cyan-50 border-cyan-300",
  },
  blacklist: {
    id: "blacklist",
    label: "Black-list",
    icon: Ban,
    color: "bg-gray-100 border-gray-400",
  },
};

export function ScoutersKanban({
  scouters,
  onStatusChange,
  onEdit,
  onViewPerformance,
  statusFilter = 'todos',
}: ScoutersKanbanProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  
  // Filter visible columns based on statusFilter
  const visibleStatuses = statusFilter === 'todos' 
    ? Object.keys(STATUS_CONFIG) 
    : [statusFilter];

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const scouterId = active.id as string;
    const newStatus = over.id as string;

    const scouter = scouters.find((s) => s.id === scouterId);
    if (scouter && scouter.status !== newStatus) {
      onStatusChange(scouterId, newStatus);
    }
  };

  const groupedScouters = {
    ativo: scouters.filter((s) => s.status === "ativo"),
    inativo: scouters.filter((s) => s.status === "inativo"),
    standby: scouters.filter((s) => s.status === "standby"),
    blacklist: scouters.filter((s) => s.status === "blacklist"),
  };

  const activeScouter = activeId
    ? scouters.find((s) => s.id === activeId)
    : null;

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {Object.entries(STATUS_CONFIG)
          .filter(([status]) => visibleStatuses.includes(status))
          .map(([status, config]) => (
            <ScouterColumn
              key={status}
              id={status}
              title={config.label}
              icon={config.icon}
              color={config.color}
              scouters={groupedScouters[status as keyof typeof groupedScouters]}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onViewPerformance={onViewPerformance}
            />
          ))}
      </div>

      <DragOverlay>
        {activeScouter ? (
          <div className="opacity-80 rotate-3 scale-105">
            <ScouterCard
              scouter={activeScouter}
              onStatusChange={() => {}}
              onEdit={() => {}}
              onViewPerformance={() => {}}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
