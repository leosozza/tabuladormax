import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MoreVertical, Phone, TrendingUp, UserCheck, UserX, Clock, Ban } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

interface ScoutersListViewProps {
  scouters: Scouter[];
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

export function ScoutersListView({
  scouters,
  onStatusChange,
  onEdit,
  onViewPerformance,
}: ScoutersListViewProps) {
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

  const openWhatsApp = (whatsapp: string) => {
    const phone = whatsapp.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}`, "_blank");
  };

  return (
    <div className="rounded-md border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Scouter</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead className="text-right">Leads Total</TableHead>
            <TableHead className="text-right">Leads 30d</TableHead>
            <TableHead>Última Atividade</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {scouters.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                Nenhum scouter encontrado
              </TableCell>
            </TableRow>
          ) : (
            scouters.map((scouter) => {
              const StatusIcon = STATUS_CONFIG[scouter.status].icon;
              return (
                <TableRow key={scouter.id} className="hover:bg-muted/50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={scouter.photo_url} alt={scouter.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {getInitials(scouter.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col">
                        <span className="font-medium text-foreground">{scouter.name}</span>
                        {scouter.notes && (
                          <span className="text-xs text-muted-foreground line-clamp-1">
                            {scouter.notes}
                          </span>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={STATUS_CONFIG[scouter.status].color}>
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {STATUS_CONFIG[scouter.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {scouter.whatsapp ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-0 text-xs hover:text-primary"
                        onClick={() => openWhatsApp(scouter.whatsapp!)}
                      >
                        <Phone className="h-3 w-3 mr-1" />
                        {scouter.whatsapp}
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="secondary">{scouter.total_leads}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline">{scouter.leads_last_30_days}</Badge>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">
                      {formatLastActivity(scouter.last_activity_at)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewPerformance(scouter)}>
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Ver Performance
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(scouter)}>
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
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
