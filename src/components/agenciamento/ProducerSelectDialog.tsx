import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useActiveProducers, Producer } from '@/hooks/useProducers';
import { ProducerInQueueView } from '@/hooks/useProducerQueueView';
import { Search, User, Loader2, Crown, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface ProducerSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producer: Producer) => void;
  title?: string;
  suggestedProducer?: ProducerInQueueView | null;
}

export function ProducerSelectDialog({
  open,
  onClose,
  onSelect,
  title = 'Selecionar Produtor',
  suggestedProducer,
}: ProducerSelectDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const [showOtherProducers, setShowOtherProducers] = useState(false);
  const { data: producers, isLoading } = useActiveProducers();

  const filteredProducers = producers?.filter((producer) =>
    producer.name.toLowerCase().includes(search.toLowerCase())
  );

  // Convert suggested producer from queue to Producer format
  const suggestedAsProducer: Producer | null = suggestedProducer
    ? {
        id: suggestedProducer.producer_id,
        name: suggestedProducer.producer_name,
        photo_url: suggestedProducer.producer_photo,
        email: null,
        phone: null,
        status: 'ativo',
        bitrix_id: null,
      }
    : null;

  const handleConfirmSuggested = () => {
    if (suggestedAsProducer) {
      onSelect(suggestedAsProducer);
      resetState();
    }
  };

  const handleConfirm = () => {
    if (selectedProducer) {
      onSelect(selectedProducer);
      resetState();
    }
  };

  const resetState = () => {
    setSelectedProducer(null);
    setSearch('');
    setShowOtherProducers(false);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // Filter out the suggested producer from the list
  const otherProducers = filteredProducers?.filter(
    (p) => p.id !== suggestedProducer?.producer_id
  );

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {suggestedProducer
              ? 'Confirme o próximo produtor da fila ou escolha outro'
              : 'Selecione o produtor que irá atender esta negociação'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Suggested Producer from Queue */}
          {suggestedProducer && suggestedAsProducer && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Crown className="h-4 w-4 text-amber-500" />
                <span>Próximo da Fila</span>
              </div>
              
              <div className="p-4 rounded-lg border-2 border-primary bg-primary/5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 ring-2 ring-primary ring-offset-2">
                    <AvatarImage src={suggestedAsProducer.photo_url || undefined} />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {suggestedAsProducer.name
                        .split(' ')
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-lg">{suggestedAsProducer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Posição #{suggestedProducer.queue_pos} na fila
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleConfirmSuggested} 
                  className="flex-1"
                >
                  Confirmar {suggestedAsProducer.name.split(' ')[0]}
                </Button>
              </div>
            </div>
          )}

          {/* Collapsible Other Producers Section */}
          {suggestedProducer ? (
            <Collapsible open={showOtherProducers} onOpenChange={setShowOtherProducers}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between text-muted-foreground">
                  <span>Escolher outro produtor</span>
                  <ChevronDown className={cn("h-4 w-4 transition-transform", showOtherProducers && "rotate-180")} />
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-3 pt-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar produtor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <ScrollArea className="h-[200px] rounded-md border">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : !otherProducers || otherProducers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <User className="h-8 w-8 mb-2" />
                      <p>Nenhum outro produtor encontrado</p>
                    </div>
                  ) : (
                    <div className="p-2 space-y-1">
                      {otherProducers.map((producer) => (
                        <button
                          key={producer.id}
                          onClick={() => setSelectedProducer(producer)}
                          className={cn(
                            'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                            'hover:bg-accent',
                            selectedProducer?.id === producer.id
                              ? 'bg-primary/10 border border-primary'
                              : 'border border-transparent'
                          )}
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={producer.photo_url || undefined} />
                            <AvatarFallback>
                              {producer.name
                                .split(' ')
                                .map((n) => n[0])
                                .slice(0, 2)
                                .join('')
                                .toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{producer.name}</p>
                            {producer.phone && (
                              <p className="text-sm text-muted-foreground truncate">
                                {producer.phone}
                              </p>
                            )}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </ScrollArea>

                {selectedProducer && (
                  <Button onClick={handleConfirm} className="w-full">
                    Confirmar {selectedProducer.name.split(' ')[0]}
                  </Button>
                )}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            /* Original layout when no suggested producer */
            <>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtor..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <ScrollArea className="h-[280px] rounded-md border">
                {isLoading ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : !filteredProducers || filteredProducers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                    <User className="h-8 w-8 mb-2" />
                    <p>Nenhum produtor encontrado</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredProducers?.map((producer) => (
                      <button
                        key={producer.id}
                        onClick={() => setSelectedProducer(producer)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors',
                          'hover:bg-accent',
                          selectedProducer?.id === producer.id
                            ? 'bg-primary/10 border border-primary'
                            : 'border border-transparent'
                        )}
                      >
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={producer.photo_url || undefined} />
                          <AvatarFallback>
                            {producer.name
                              .split(' ')
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join('')
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{producer.name}</p>
                          {producer.phone && (
                            <p className="text-sm text-muted-foreground truncate">
                              {producer.phone}
                            </p>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </div>

        {/* Footer only for non-suggested mode */}
        {!suggestedProducer && (
          <DialogFooter>
            <Button variant="outline" onClick={handleClose}>
              Cancelar
            </Button>
            <Button onClick={handleConfirm} disabled={!selectedProducer}>
              Confirmar
            </Button>
          </DialogFooter>
        )}

        {/* Cancel button for suggested mode */}
        {suggestedProducer && (
          <div className="pt-2">
            <Button variant="ghost" onClick={handleClose} className="w-full text-muted-foreground">
              Cancelar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
