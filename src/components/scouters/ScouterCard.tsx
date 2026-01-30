import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Phone, Calendar, TrendingUp, UserCheck, UserX, Clock, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

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

interface ScouterCardProps {
  scouter: Scouter;
  onStatusChange: (id: string, newStatus: string) => void;
  onEdit: (scouter: Scouter) => void;
  onViewPerformance: (scouter: Scouter) => void;
}

const STATUS_CONFIG = {
  ativo: { icon: UserCheck, label: "Ativo", color: "bg-blue-100 text-blue-700" },
  inativo: { icon: UserX, label: "Inativo", color: "bg-purple-100 text-purple-700" },
  standby: { icon: Clock, label: "Standby", color: "bg-cyan-100 text-cyan-700" },
  blacklist: { icon: Ban, label: "Black-list", color: "bg-gray-800 text-white" },
};

export function ScouterCard({ scouter, onStatusChange, onEdit, onViewPerformance }: ScouterCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: scouter.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .slice(0, 2)
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const formatLastActivity = (date?: string) => {
    if (!date) return "Sem atividade";
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const openWhatsApp = () => {
    if (scouter.whatsapp) {
      const phone = scouter.whatsapp.replace(/\D/g, "");
      window.open(`https://wa.me/55${phone}`, "_blank");
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="p-4 hover:shadow-md transition-shadow cursor-move bg-card"
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <Avatar className="h-12 w-12 flex-shrink-0">
          <AvatarImage src={scouter.photo_url} alt={scouter.name} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {getInitials(scouter.name)}
          </AvatarFallback>
        </Avatar>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with name and menu */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="font-semibold text-sm text-foreground truncate">
              {scouter.name}
            </h3>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onPointerDownOutside={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onViewPerformance(scouter); }}>
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Ver Performance
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(scouter); }}>
                  Editar Informações
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>Mudar Status</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                      <DropdownMenuItem
                        key={status}
                        onClick={() => onStatusChange(scouter.id, status)}
                        disabled={scouter.status === status}
                      >
                        <config.icon className="h-4 w-4 mr-2" />
                        {config.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* WhatsApp */}
          {scouter.whatsapp && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-xs text-muted-foreground hover:text-primary mb-2"
              onClick={(e) => {
                e.stopPropagation();
                openWhatsApp();
              }}
            >
              <Phone className="h-3 w-3 mr-1" />
              {scouter.whatsapp}
            </Button>
          )}

          {/* Last Activity */}
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
            <Calendar className="h-3 w-3" />
            <span>{formatLastActivity(scouter.last_activity_at)}</span>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {scouter.total_leads} leads total
            </Badge>
            <Badge variant="outline" className="text-xs">
              {scouter.leads_last_30_days} em 30d
            </Badge>
          </div>

          {/* Notes preview */}
          {scouter.notes && (
            <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
              {scouter.notes}
            </p>
          )}
        </div>
      </div>
    </Card>
  );
}
