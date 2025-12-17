import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Bot, 
  MessageSquare, 
  Users, 
  ArrowRightLeft, 
  CheckCircle2, 
  Clock,
  TrendingUp,
  Eye
} from 'lucide-react';
import { useBotStats, useBotConversations, useBotMessages, type BotConversation } from '@/hooks/useWhatsAppBot';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BotDashboardProps {
  projectId: string;
}

export function BotDashboard({ projectId }: BotDashboardProps) {
  const { data: stats, isLoading: loadingStats } = useBotStats(projectId);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);

  const { data: conversations, isLoading: loadingConversations } = useBotConversations(
    projectId, 
    statusFilter === 'all' ? undefined : statusFilter
  );
  const { data: messages } = useBotMessages(selectedConversation || undefined);

  const statCards = [
    {
      title: 'Total de Conversas',
      value: stats?.totalConversations || 0,
      icon: MessageSquare,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'Conversas Ativas',
      value: stats?.activeConversations || 0,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'Resolvidas pelo Bot',
      value: stats?.resolvedByBot || 0,
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'Transferidas',
      value: stats?.transferred || 0,
      icon: ArrowRightLeft,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
    },
    {
      title: 'Taxa de Resolução',
      value: `${stats?.resolutionRate || 0}%`,
      icon: TrendingUp,
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
    },
    {
      title: 'Média de Mensagens',
      value: stats?.avgMessagesPerConversation || 0,
      icon: MessageSquare,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10',
    },
  ];

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      active: { label: 'Ativa', variant: 'default' },
      transferred: { label: 'Transferida', variant: 'secondary' },
      completed: { label: 'Concluída', variant: 'outline' },
      abandoned: { label: 'Abandonada', variant: 'destructive' },
    };
    const { label, variant } = variants[status] || { label: status, variant: 'outline' };
    return <Badge variant={variant}>{label}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Cards de Estatísticas */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className={cn("p-3 rounded-lg", stat.bgColor)}>
                  <stat.icon className={cn("h-5 w-5", stat.color)} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista de Conversas */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4" />
                  Conversas do Bot
                </CardTitle>
                <CardDescription>
                  Histórico de atendimentos automatizados
                </CardDescription>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="active">Ativas</SelectItem>
                  <SelectItem value="transferred">Transferidas</SelectItem>
                  <SelectItem value="completed">Concluídas</SelectItem>
                  <SelectItem value="abandoned">Abandonadas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {loadingConversations ? (
                <div className="text-center py-8 text-muted-foreground">
                  Carregando...
                </div>
              ) : conversations && conversations.length > 0 ? (
                <div className="space-y-2">
                  {conversations.map((conv: BotConversation) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedConversation === conv.id 
                          ? "bg-primary/5 border-primary" 
                          : "hover:bg-muted/50"
                      )}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium text-sm">{conv.phone_number}</span>
                        {getStatusBadge(conv.status)}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3" />
                          {conv.messages_count} msgs
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(conv.started_at), 'dd/MM HH:mm', { locale: ptBR })}
                        </span>
                        {conv.resolved_by_bot && (
                          <Badge variant="outline" className="text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Resolvido
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Bot className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Nenhuma conversa encontrada</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Detalhes da Conversa */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Detalhes da Conversa
            </CardTitle>
            <CardDescription>
              {selectedConversation 
                ? 'Visualize as mensagens trocadas'
                : 'Selecione uma conversa para ver detalhes'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px]">
              {selectedConversation && messages && messages.length > 0 ? (
                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        "flex",
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div className={cn(
                        "max-w-[85%] rounded-lg p-3",
                        msg.role === 'user' 
                          ? "bg-primary text-primary-foreground" 
                          : "bg-muted"
                      )}>
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <div className={cn(
                          "flex items-center gap-2 mt-1 text-xs",
                          msg.role === 'user' ? "text-primary-foreground/70" : "text-muted-foreground"
                        )}>
                          <span>
                            {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                          </span>
                          {msg.response_time_ms && (
                            <span>• {msg.response_time_ms}ms</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Selecione uma conversa para ver as mensagens</p>
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
