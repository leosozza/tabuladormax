import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Star, Trash2 } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";

interface AgentFavoritesProps {
  currentQuestion?: string;
  onSelectFavorite: (question: string) => void;
}

const STORAGE_KEY = 'maxconnect_agent_favorites';

export function AgentFavorites({ currentQuestion, onSelectFavorite }: AgentFavoritesProps) {
  const [favorites, setFavorites] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setFavorites(JSON.parse(stored));
    }
  }, []);

  const saveFavorites = (newFavorites: string[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newFavorites));
    setFavorites(newFavorites);
  };

  const addFavorite = () => {
    if (!currentQuestion || currentQuestion.trim() === '') {
      toast({
        title: "Erro",
        description: "Digite uma pergunta primeiro",
        variant: "destructive",
      });
      return;
    }

    if (favorites.includes(currentQuestion)) {
      toast({
        title: "Já existe",
        description: "Esta pergunta já está nos favoritos",
        variant: "destructive",
      });
      return;
    }

    const newFavorites = [...favorites, currentQuestion];
    saveFavorites(newFavorites);
    
    toast({
      title: "Adicionado",
      description: "Pergunta salva nos favoritos",
    });
  };

  const removeFavorite = (question: string) => {
    const newFavorites = favorites.filter(f => f !== question);
    saveFavorites(newFavorites);
    
    toast({
      title: "Removido",
      description: "Pergunta removida dos favoritos",
    });
  };

  const isFavorite = currentQuestion && favorites.includes(currentQuestion);

  return (
    <div className="flex gap-2">
      <Button
        variant={isFavorite ? "default" : "outline"}
        size="sm"
        onClick={addFavorite}
        title="Salvar pergunta nos favoritos"
      >
        <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
      </Button>

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm">
            <Star className="w-4 h-4 mr-2" />
            Favoritos ({favorites.length})
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80">
          <div className="space-y-2">
            <h4 className="font-semibold text-sm mb-3">Perguntas Favoritas</h4>
            {favorites.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nenhuma pergunta salva ainda
              </p>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {favorites.map((fav, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 rounded-md hover:bg-accent group"
                  >
                    <button
                      onClick={() => onSelectFavorite(fav)}
                      className="flex-1 text-left text-sm"
                    >
                      {fav}
                    </button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => removeFavorite(fav)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
