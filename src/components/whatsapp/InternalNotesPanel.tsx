import { useState } from 'react';
import { StickyNote, Send, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInternalNotes, useSendInternalNote } from '@/hooks/useInternalNotes';
import { cn } from '@/lib/utils';

interface InternalNotesPanelProps {
  phoneNumber: string;
  bitrixId?: string;
}

export function InternalNotesPanel({ phoneNumber, bitrixId }: InternalNotesPanelProps) {
  const [newNote, setNewNote] = useState('');
  const { notes, isLoading } = useInternalNotes(phoneNumber);
  const sendNote = useSendInternalNote();

  const handleSend = async () => {
    if (!newNote.trim() || sendNote.isPending) return;

    await sendNote.mutateAsync({
      phoneNumber,
      bitrixId,
      content: newNote,
    });

    setNewNote('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-amber-50/30 dark:bg-amber-950/10">
      {/* Header */}
      <div className="p-3 border-b bg-amber-100/50 dark:bg-amber-900/20">
        <div className="flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-amber-600" />
          <span className="font-medium text-sm text-amber-800 dark:text-amber-200">
            Notas Internas
          </span>
          <Badge variant="secondary" className="text-xs bg-amber-200/50 dark:bg-amber-800/50">
            Não enviadas ao cliente
          </Badge>
        </div>
        <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
          Converse com outros agentes sobre este atendimento
        </p>
      </div>

      {/* Notes List */}
      <ScrollArea className="flex-1 p-3">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
          </div>
        ) : notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-amber-600/60 py-8">
            <StickyNote className="h-10 w-10 mb-2" />
            <p className="text-sm">Nenhuma nota interna</p>
            <p className="text-xs">Adicione uma nota para outros agentes</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notes.map((note) => (
              <div
                key={note.id}
                className={cn(
                  "p-3 rounded-lg border shadow-sm",
                  "bg-amber-100 dark:bg-amber-900/30",
                  "border-amber-200 dark:border-amber-800"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="h-6 w-6 rounded-full bg-amber-200 dark:bg-amber-800 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-amber-700 dark:text-amber-300" />
                  </div>
                  <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                    {note.author_name || 'Operador'}
                  </span>
                  <span className="text-xs text-amber-600 dark:text-amber-400 ml-auto">
                    {format(new Date(note.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                <p className="text-sm text-amber-900 dark:text-amber-100 whitespace-pre-wrap">
                  {note.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-amber-100/30 dark:bg-amber-900/10">
        <div className="flex gap-2">
          <Textarea
            placeholder="Escreva uma nota interna..."
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[60px] max-h-[120px] resize-none bg-background border-amber-200 dark:border-amber-800 focus-visible:ring-amber-500"
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!newNote.trim() || sendNote.isPending}
            className="h-[60px] w-12 bg-amber-500 hover:bg-amber-600 text-white"
          >
            {sendNote.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
