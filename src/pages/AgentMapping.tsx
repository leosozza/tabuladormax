import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { TelemarketingSelector } from "@/components/TelemarketingSelector";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { toast } from "sonner";

interface AgentMapping {
  id: string;
  chatwoot_agent_email: string | null;
  tabuladormax_user_id: string | null;
  bitrix_telemarketing_id: number;
  bitrix_telemarketing_name: string | null;
  created_at: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
}

export default function AgentMapping() {
  const [mappings, setMappings] = useState<AgentMapping[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState<AgentMapping | null>(null);
  
  // Form state
  const [formType, setFormType] = useState<'chatwoot' | 'tabuladormax'>('chatwoot');
  const [chatwootEmail, setChatwootEmail] = useState("");
  const [tabuladormaxUserId, setTabuladormaxUserId] = useState("");
  const [telemarketingId, setTelemarketingId] = useState<number>();

  const loadMappings = async () => {
    try {
      const { data, error } = await supabase
        .from('agent_telemarketing_mapping')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMappings(data || []);
    } catch (error) {
      console.error('Erro ao carregar mapeamentos:', error);
      toast.error('Erro ao carregar mapeamentos');
    }
  };

  const loadProfiles = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');

      if (error) throw error;
      setProfiles(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([loadMappings(), loadProfiles()]);
      setLoading(false);
    };
    init();
  }, []);

  const resetForm = () => {
    setFormType('chatwoot');
    setChatwootEmail("");
    setTabuladormaxUserId("");
    setTelemarketingId(undefined);
    setSelectedMapping(null);
  };

  const openEditDialog = (mapping: AgentMapping) => {
    setSelectedMapping(mapping);
    setFormType(mapping.chatwoot_agent_email ? 'chatwoot' : 'tabuladormax');
    setChatwootEmail(mapping.chatwoot_agent_email || "");
    setTabuladormaxUserId(mapping.tabuladormax_user_id || "");
    setTelemarketingId(mapping.bitrix_telemarketing_id);
    setDialogOpen(true);
  };

  const openDeleteDialog = (mapping: AgentMapping) => {
    setSelectedMapping(mapping);
    setDeleteDialogOpen(true);
  };

  const handleSave = async () => {
    if (!telemarketingId) {
      toast.error('Selecione um telemarketing');
      return;
    }

    if (formType === 'chatwoot' && !chatwootEmail.trim()) {
      toast.error('Informe o email do agente Chatwoot');
      return;
    }

    if (formType === 'tabuladormax' && !tabuladormaxUserId) {
      toast.error('Selecione um usuário TabuladorMax');
      return;
    }

    try {
      // Buscar nome do telemarketing do cache
      const { data: cacheData } = await supabase
        .from('config_kv')
        .select('value')
        .eq('key', 'bitrix_telemarketing_list')
        .maybeSingle();

      let telemarketingName = null;
      if (cacheData?.value) {
        const items = cacheData.value as Array<{ id: number; title: string }>;
        const found = items.find(item => item.id === telemarketingId);
        telemarketingName = found?.title || null;
      }

      const mappingData = {
        chatwoot_agent_email: formType === 'chatwoot' ? chatwootEmail.trim() : null,
        tabuladormax_user_id: formType === 'tabuladormax' ? tabuladormaxUserId : null,
        bitrix_telemarketing_id: telemarketingId,
        bitrix_telemarketing_name: telemarketingName,
      };

      if (selectedMapping) {
        // Update
        const { error } = await supabase
          .from('agent_telemarketing_mapping')
          .update(mappingData)
          .eq('id', selectedMapping.id);

        if (error) throw error;
        toast.success('Mapeamento atualizado');
      } else {
        // Insert
        const { error } = await supabase
          .from('agent_telemarketing_mapping')
          .insert(mappingData);

        if (error) throw error;
        toast.success('Mapeamento criado');
      }

      setDialogOpen(false);
      resetForm();
      loadMappings();
    } catch (error: any) {
      console.error('Erro ao salvar mapeamento:', error);
      if (error.code === '23505') {
        toast.error('Já existe um mapeamento para este agente');
      } else {
        toast.error('Erro ao salvar mapeamento');
      }
    }
  };

  const handleDelete = async () => {
    if (!selectedMapping) return;

    try {
      const { error } = await supabase
        .from('agent_telemarketing_mapping')
        .delete()
        .eq('id', selectedMapping.id);

      if (error) throw error;

      toast.success('Mapeamento excluído');
      setDeleteDialogOpen(false);
      setSelectedMapping(null);
      loadMappings();
    } catch (error) {
      console.error('Erro ao excluir mapeamento:', error);
      toast.error('Erro ao excluir mapeamento');
    }
  };

  const filteredMappings = mappings.filter(m => {
    const search = searchTerm.toLowerCase();
    return (
      m.chatwoot_agent_email?.toLowerCase().includes(search) ||
      m.bitrix_telemarketing_name?.toLowerCase().includes(search) ||
      profiles.find(p => p.id === m.tabuladormax_user_id)?.display_name?.toLowerCase().includes(search)
    );
  });

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Mapeamento Agente ↔ Telemarketing</CardTitle>
              <CardDescription>
                Vincule agentes do Chatwoot ou usuários TabuladorMax aos operadores de telemarketing do Bitrix24
              </CardDescription>
            </div>
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Mapeamento
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {selectedMapping ? 'Editar Mapeamento' : 'Novo Mapeamento'}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Tipo de Agente</Label>
                    <Select value={formType} onValueChange={(v) => setFormType(v as 'chatwoot' | 'tabuladormax')}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="chatwoot">Agente Chatwoot</SelectItem>
                        <SelectItem value="tabuladormax">Usuário TabuladorMax</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {formType === 'chatwoot' ? (
                    <div>
                      <Label htmlFor="email">Email do Agente Chatwoot</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="agente@exemplo.com"
                        value={chatwootEmail}
                        onChange={(e) => setChatwootEmail(e.target.value)}
                      />
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="user">Usuário TabuladorMax</Label>
                      <Select value={tabuladormaxUserId} onValueChange={setTabuladormaxUserId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o usuário" />
                        </SelectTrigger>
                        <SelectContent>
                          {profiles.map((profile) => (
                            <SelectItem key={profile.id} value={profile.id}>
                              {profile.display_name || profile.email}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div>
                    <Label>Operador de Telemarketing (Bitrix24)</Label>
                    <TelemarketingSelector
                      value={telemarketingId}
                      onChange={setTelemarketingId}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave}>
                    {selectedMapping ? 'Atualizar' : 'Criar'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por email, nome ou telemarketing..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : filteredMappings.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhum mapeamento cadastrado'}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agente</TableHead>
                  <TableHead>Telemarketing Bitrix</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMappings.map((mapping) => {
                  const profile = profiles.find(p => p.id === mapping.tabuladormax_user_id);
                  return (
                    <TableRow key={mapping.id}>
                      <TableCell>
                        {mapping.chatwoot_agent_email || profile?.display_name || profile?.email || '—'}
                        <div className="text-xs text-muted-foreground">
                          {mapping.chatwoot_agent_email ? 'Chatwoot' : 'TabuladorMax'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {mapping.bitrix_telemarketing_name || `ID: ${mapping.bitrix_telemarketing_id}`}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEditDialog(mapping)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDeleteDialog(mapping)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este mapeamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
