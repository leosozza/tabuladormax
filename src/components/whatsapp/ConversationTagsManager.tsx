import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tag, Plus, Trash2, Check, Loader2 } from 'lucide-react';
import {
  useAllTags,
  useConversationTags,
  useCreateTag,
  useDeleteTag,
  useAssignTag,
  useRemoveTagAssignment,
} from '@/hooks/useConversationTags';
import { TagBadge } from './TagBadge';
import { cn } from '@/lib/utils';

interface ConversationTagsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  bitrixId?: string;
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange
  '#F59E0B', // Amber
  '#84CC16', // Lime
  '#22C55E', // Green
  '#14B8A6', // Teal
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#A855F7', // Purple
  '#EC4899', // Pink
];

export function ConversationTagsManager({
  open,
  onOpenChange,
  phoneNumber,
  bitrixId,
}: ConversationTagsManagerProps) {
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[0]);

  const { data: allTags = [], isLoading: loadingAllTags } = useAllTags();
  const { data: assignedTags = [], isLoading: loadingAssigned } = useConversationTags(phoneNumber);
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const assignTag = useAssignTag();
  const removeAssignment = useRemoveTagAssignment();

  const assignedTagIds = new Set(assignedTags.map((t) => t.id));
  const availableTags = allTags.filter((t) => !assignedTagIds.has(t.id));

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTag.mutateAsync({ name: newTagName.trim(), color: newTagColor });
    setNewTagName('');
  };

  const handleAssignTag = async (tagId: string) => {
    await assignTag.mutateAsync({ phoneNumber, bitrixId, tagId });
  };

  const handleRemoveAssignment = async (tagId: string) => {
    await removeAssignment.mutateAsync({ phoneNumber, tagId });
  };

  const isLoading = loadingAllTags || loadingAssigned;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Gerenciar Etiquetas
          </DialogTitle>
          <DialogDescription>
            Adicione ou remova etiquetas desta conversa
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="assign" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="assign">Atribuir</TabsTrigger>
            <TabsTrigger value="create">Criar Nova</TabsTrigger>
          </TabsList>

          <TabsContent value="assign" className="space-y-4">
            {/* Assigned Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Etiquetas desta conversa</Label>
              {isLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : assignedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma etiqueta atribuída</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {assignedTags.map((tag) => (
                    <TagBadge
                      key={tag.id}
                      name={tag.name}
                      color={tag.color}
                      size="md"
                      onRemove={() => handleRemoveAssignment(tag.id)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Available Tags */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Etiquetas disponíveis</Label>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {isLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : availableTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Todas as etiquetas já estão atribuídas
                  </p>
                ) : (
                  <div className="space-y-1">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleAssignTag(tag.id)}
                        disabled={assignTag.isPending}
                        className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted transition-colors text-left"
                      >
                        <TagBadge name={tag.name} color={tag.color} size="md" />
                        <Plus className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>

          <TabsContent value="create" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tagName">Nome da etiqueta</Label>
              <Input
                id="tagName"
                placeholder="Ex: Urgente, VIP, Reclamação..."
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                maxLength={30}
              />
            </div>

            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewTagColor(color)}
                    className={cn(
                      'w-8 h-8 rounded-full transition-all',
                      newTagColor === color && 'ring-2 ring-offset-2 ring-primary'
                    )}
                    style={{ backgroundColor: color }}
                  >
                    {newTagColor === color && (
                      <Check className="h-4 w-4 text-white mx-auto" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {newTagName && (
              <div className="pt-2">
                <Label className="text-sm text-muted-foreground">Preview:</Label>
                <div className="mt-1">
                  <TagBadge name={newTagName} color={newTagColor} size="md" />
                </div>
              </div>
            )}

            <Button
              onClick={handleCreateTag}
              disabled={!newTagName.trim() || createTag.isPending}
              className="w-full"
            >
              {createTag.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Criar Etiqueta
                </>
              )}
            </Button>

            {/* Manage existing tags */}
            <div className="pt-4 border-t space-y-2">
              <Label className="text-sm font-medium">Gerenciar etiquetas existentes</Label>
              <ScrollArea className="h-[120px] rounded-md border p-2">
                {allTags.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma etiqueta criada ainda
                  </p>
                ) : (
                  <div className="space-y-1">
                    {allTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-2 rounded-md hover:bg-muted"
                      >
                        <TagBadge name={tag.name} color={tag.color} size="md" />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:text-destructive"
                          onClick={() => deleteTag.mutate(tag.id)}
                          disabled={deleteTag.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
