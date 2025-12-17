import { useState } from 'react';
import { Settings2, GripVertical, Eye, EyeOff, RotateCcw, Keyboard, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useAgentButtonConfig, ButtonWithShortcut } from '@/hooks/useAgentButtonConfig';
import { toast } from 'sonner';

interface AgentButtonSettingsProps {
  bitrixTelemarketingId: number | null;
}

export function AgentButtonSettings({ bitrixTelemarketingId }: AgentButtonSettingsProps) {
  const [open, setOpen] = useState(false);
  const [editingHotkey, setEditingHotkey] = useState<string | null>(null);
  const [localButtons, setLocalButtons] = useState<ButtonWithShortcut[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const {
    buttonsWithShortcuts,
    isLoading,
    saveShortcut,
    saveButtonOrder,
    resetToDefault,
    isSaving,
  } = useAgentButtonConfig(bitrixTelemarketingId);

  // Sincronizar estado local quando dados carregarem
  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && buttonsWithShortcuts) {
      setLocalButtons([...buttonsWithShortcuts]);
      setHasChanges(false);
    }
  };

  const handleToggleVisibility = (buttonId: string) => {
    setLocalButtons(prev => 
      prev.map(b => 
        b.id === buttonId ? { ...b, is_visible: !b.is_visible } : b
      )
    );
    setHasChanges(true);
  };

  const handleHotkeyChange = (buttonId: string, hotkey: string) => {
    // Validar: apenas 1-9 ou vazio
    if (hotkey && !/^[1-9]$/.test(hotkey)) {
      toast.error('Use apenas teclas de 1 a 9');
      return;
    }

    // Verificar se já está em uso
    if (hotkey) {
      const existing = localButtons.find(b => b.hotkey === hotkey && b.id !== buttonId);
      if (existing) {
        toast.error(`Tecla ${hotkey} já está em uso por "${existing.label}"`);
        return;
      }
    }

    setLocalButtons(prev =>
      prev.map(b =>
        b.id === buttonId ? { ...b, hotkey: hotkey || null } : b
      )
    );
    setEditingHotkey(null);
    setHasChanges(true);
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    setLocalButtons(prev => {
      const newButtons = [...prev];
      [newButtons[index - 1], newButtons[index]] = [newButtons[index], newButtons[index - 1]];
      return newButtons.map((b, i) => ({ ...b, sort_order: i }));
    });
    setHasChanges(true);
  };

  const handleMoveDown = (index: number) => {
    if (index === localButtons.length - 1) return;
    setLocalButtons(prev => {
      const newButtons = [...prev];
      [newButtons[index], newButtons[index + 1]] = [newButtons[index + 1], newButtons[index]];
      return newButtons.map((b, i) => ({ ...b, sort_order: i }));
    });
    setHasChanges(true);
  };

  const handleSaveAll = () => {
    // Salvar ordem
    const orderedButtons = localButtons.map((b, index) => ({
      buttonConfigId: b.id,
      sortOrder: index,
    }));
    saveButtonOrder(orderedButtons);

    // Salvar visibilidade e hotkeys individuais
    localButtons.forEach(button => {
      const original = buttonsWithShortcuts?.find(b => b.id === button.id);
      if (
        original?.is_visible !== button.is_visible ||
        original?.hotkey !== button.hotkey
      ) {
        saveShortcut({
          buttonConfigId: button.id,
          hotkey: button.hotkey,
          isVisible: button.is_visible,
          sortOrder: button.sort_order,
        });
      }
    });

    setHasChanges(false);
    toast.success('Configurações salvas!');
  };

  const handleReset = () => {
    resetToDefault();
    if (buttonsWithShortcuts) {
      setLocalButtons([...buttonsWithShortcuts]);
    }
    setHasChanges(false);
  };

  if (!bitrixTelemarketingId) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Settings2 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Configurar Atalhos
          </DialogTitle>
          <DialogDescription>
            Personalize a ordem, visibilidade e teclas de atalho dos botões
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando configurações...
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {localButtons.map((button, index) => (
                  <div
                    key={button.id}
                    className={`flex items-center gap-2 p-3 rounded-lg border bg-card ${
                      !button.is_visible ? 'opacity-50' : ''
                    }`}
                  >
                    {/* Controles de ordenação */}
                    <div className="flex flex-col gap-0.5">
                      <button
                        onClick={() => handleMoveUp(index)}
                        disabled={index === 0}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <GripVertical className="h-3 w-3 rotate-90" />
                      </button>
                      <button
                        onClick={() => handleMoveDown(index)}
                        disabled={index === localButtons.length - 1}
                        className="p-0.5 hover:bg-muted rounded disabled:opacity-30"
                      >
                        <GripVertical className="h-3 w-3 -rotate-90" />
                      </button>
                    </div>

                    {/* Cor e Nome */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: button.color }}
                        />
                        <span className="font-medium truncate">{button.label}</span>
                      </div>
                      {button.category && (
                        <Badge variant="outline" className="text-xs mt-1">
                          {button.category}
                        </Badge>
                      )}
                    </div>

                    {/* Hotkey */}
                    <div className="w-12">
                      {editingHotkey === button.id ? (
                        <Input
                          autoFocus
                          maxLength={1}
                          className="w-10 h-8 text-center px-0"
                          placeholder="?"
                          onBlur={(e) => handleHotkeyChange(button.id, e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              handleHotkeyChange(button.id, (e.target as HTMLInputElement).value);
                            } else if (e.key === 'Escape') {
                              setEditingHotkey(null);
                            }
                          }}
                        />
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-10 h-8 text-xs font-mono"
                          onClick={() => setEditingHotkey(button.id)}
                        >
                          {button.hotkey || '—'}
                        </Button>
                      )}
                    </div>

                    {/* Visibilidade */}
                    <button
                      onClick={() => handleToggleVisibility(button.id)}
                      className="p-1.5 hover:bg-muted rounded"
                    >
                      {button.is_visible ? (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleReset}
                disabled={isSaving}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Restaurar
              </Button>

              <Button
                onClick={handleSaveAll}
                disabled={!hasChanges || isSaving}
                size="sm"
              >
                <Save className="h-4 w-4 mr-2" />
                {isSaving ? 'Salvando...' : 'Salvar'}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
