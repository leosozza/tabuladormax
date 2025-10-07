import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ButtonConfig {
  id: string;
  label: string;
  color: string;
  category: string;
  hotkey?: string;
  pos?: { x: number; y: number; w: number; h: number };
}

export default function Designer() {
  const navigate = useNavigate();
  const [buttons, setButtons] = useState<ButtonConfig[]>([]);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  useEffect(() => {
    loadButtons();
  }, []);

  const loadButtons = async () => {
    try {
      const { data } = await supabase
        .from('button_config')
        .select('*')
        .order('sort');

      if (data) {
        setButtons(data.map(btn => ({
          ...btn,
          pos: typeof btn.pos === 'object' && btn.pos !== null 
            ? btn.pos as { x: number; y: number; w: number; h: number }
            : { x: 0, y: 0, w: 1, h: 1 }
        })) as ButtonConfig[]);
      }
    } catch (error) {
      console.error('Erro ao carregar botões:', error);
      toast.error('Erro ao carregar configuração');
    }
  };

  const saveLayout = async () => {
    try {
      const updates = buttons.map(btn => ({
        id: btn.id,
        category: btn.category,
        pos: btn.pos || { x: 0, y: 0, w: 1, h: 1 }
      }));

      for (const update of updates) {
        await supabase
          .from('button_config')
          .update({ category: update.category, pos: update.pos })
          .eq('id', update.id);
      }

      toast.success('Layout salvo!');
    } catch (error) {
      console.error('Erro ao salvar layout:', error);
      toast.error('Erro ao salvar layout');
    }
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDrop = (targetCategory: string) => {
    if (!draggedId) return;

    setButtons(buttons.map(btn =>
      btn.id === draggedId ? { ...btn, category: targetCategory } : btn
    ));

    setDraggedId(null);
  };

  const cycleSize = (id: string) => {
    setButtons(buttons.map(btn => {
      if (btn.id !== id) return btn;

      const currentW = btn.pos?.w || 1;
      const currentH = btn.pos?.h || 1;

      const sizes = [
        { w: 1, h: 1 },
        { w: 2, h: 1 },
        { w: 2, h: 2 },
        { w: 3, h: 2 }
      ];

      const currentIndex = sizes.findIndex(s => s.w === currentW && s.h === currentH);
      const nextSize = sizes[(currentIndex + 1) % sizes.length];

      return {
        ...btn,
        pos: { x: btn.pos?.x || 0, y: btn.pos?.y || 0, ...nextSize }
      };
    }));
  };

  const categories = [
    { key: 'NAO_AGENDADO', title: '🟥 Não agendado', bg: 'bg-red-50', border: 'border-red-200' },
    { key: 'RETORNAR', title: '🟨 Retornar o contato', bg: 'bg-amber-50', border: 'border-amber-200' },
    { key: 'AGENDAR', title: '🟩 Agendar', bg: 'bg-emerald-50', border: 'border-emerald-200' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              🎛️ Designer de Botões
            </h1>
            <p className="text-muted-foreground mt-2">
              Arraste botões entre categorias e dê duplo clique para redimensionar
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate(-1)}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
            <Button
              onClick={saveLayout}
              className="gap-2 shadow-[var(--shadow-button)] hover:shadow-[var(--shadow-hover)]"
            >
              <Save className="h-4 w-4" />
              Salvar Layout
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          {categories.map(cat => (
            <Card
              key={cat.key}
              className={`p-6 ${cat.bg} ${cat.border}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(cat.key)}
            >
              <h2 className="text-xl font-bold mb-4">{cat.title}</h2>
              <div className="grid grid-cols-6 gap-4 min-h-[200px]">
                {buttons
                  .filter(b => b.category === cat.key)
                  .map(btn => {
                    const w = btn.pos?.w || 1;
                    const h = btn.pos?.h || 1;

                    return (
                      <div
                        key={btn.id}
                        draggable
                        onDragStart={() => handleDragStart(btn.id)}
                        onDoubleClick={() => cycleSize(btn.id)}
                        style={{
                          gridColumn: `span ${Math.min(w, 6)}`,
                          gridRow: `span ${h}`,
                          backgroundColor: btn.color
                        }}
                        className="rounded-2xl shadow-lg flex items-center justify-center text-white font-medium text-center p-4 cursor-grab active:cursor-grabbing hover:scale-105 transition-transform"
                      >
                        <div>
                          <div>{btn.label}</div>
                          {btn.hotkey && (
                            <div className="text-xs opacity-80 mt-1">[{btn.hotkey}]</div>
                          )}
                          <div className="text-xs opacity-60 mt-1">
                            {w}x{h}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
