import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface PendingConversation {
  phone_number: string;
  bitrix_id: string | null;
  last_customer_message_at: string;
  unread_count: number;
}

export function WhatsAppPendingTable() {
  const [limit, setLimit] = useState(10);

  const { data, isLoading } = useQuery({
    queryKey: ['whatsapp-pending-conversations', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mv_whatsapp_conversation_stats')
        .select('phone_number, bitrix_id, last_customer_message_at, unread_count')
        .eq('response_status', 'waiting')
        .order('last_customer_message_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return data as PendingConversation[];
    },
    staleTime: 60000,
  });

  const handleOpenChat = (phoneNumber: string) => {
    // Navigate to the WhatsApp page with this conversation selected
    window.open(`/whatsapp?phone=${encodeURIComponent(phoneNumber)}`, '_blank');
  };

  if (isLoading) {
    return (
      <Card className="rounded-xl">
        <CardHeader>
          <CardTitle>Conversas Aguardando Resposta</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[300px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-amber-500" />
          Conversas Aguardando Resposta
        </CardTitle>
        <span className="text-sm text-muted-foreground">
          Mostrando {data?.length ?? 0} de {limit}
        </span>
      </CardHeader>
      <CardContent>
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Telefone</TableHead>
                <TableHead>Esperando há</TableHead>
                <TableHead className="text-center">Não lidas</TableHead>
                <TableHead className="text-right">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data?.length ? (
                data.map((conversation) => (
                  <TableRow key={conversation.phone_number}>
                    <TableCell className="font-medium">
                      {conversation.phone_number}
                    </TableCell>
                    <TableCell>
                      <span className="text-amber-600 font-medium">
                        {formatDistanceToNow(new Date(conversation.last_customer_message_at), {
                          locale: ptBR,
                          addSuffix: false,
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      {conversation.unread_count > 0 && (
                        <span className="inline-flex items-center justify-center h-5 min-w-[20px] px-1.5 rounded-full bg-green-500 text-white text-xs font-medium">
                          {conversation.unread_count}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenChat(conversation.phone_number)}
                        className="text-primary hover:text-primary/80"
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                    Nenhuma conversa aguardando resposta
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {data?.length === limit && (
          <div className="flex justify-center mt-4">
            <Button variant="outline" size="sm" onClick={() => setLimit((prev) => prev + 10)}>
              Carregar mais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
