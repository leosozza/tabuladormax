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
import { Search, User, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ProducerSelectDialogProps {
  open: boolean;
  onClose: () => void;
  onSelect: (producer: Producer) => void;
  title?: string;
}

export function ProducerSelectDialog({
  open,
  onClose,
  onSelect,
  title = 'Selecionar Produtor',
}: ProducerSelectDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedProducer, setSelectedProducer] = useState<Producer | null>(null);
  const { data: producers, isLoading } = useActiveProducers();

  const filteredProducers = producers?.filter((producer) =>
    producer.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleConfirm = () => {
    if (selectedProducer) {
      onSelect(selectedProducer);
      setSelectedProducer(null);
      setSearch('');
    }
  };

  const handleClose = () => {
    setSelectedProducer(null);
    setSearch('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Selecione o produtor que irá atender esta negociação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
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
            ) : filteredProducers?.length === 0 ? (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProducer}>
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
