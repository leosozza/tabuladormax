import { useState, useMemo } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { UserPlus, Loader2, Search, Users, Building2 } from 'lucide-react';
import { useInviteParticipant, useConversationParticipants } from '@/hooks/useConversationParticipants';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PrioritySelector } from './PrioritySelector';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface InviteAgentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  bitrixId?: string;
}

interface Operator {
  id: string;
  display_name: string | null;
  email: string | null;
  department?: string | null;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export function InviteAgentDialog({
  open,
  onOpenChange,
  phoneNumber,
  bitrixId,
}: InviteAgentDialogProps) {
  const [search, setSearch] = useState('');
  const [selectedOperators, setSelectedOperators] = useState<string[]>([]);
  const [priority, setPriority] = useState(0);
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const inviteParticipant = useInviteParticipant();
  const { data: currentParticipants = [] } = useConversationParticipants(phoneNumber);

  // Fetch departments
  const { data: departments = [] } = useQuery({
    queryKey: ['departments-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('id, name, code')
        .eq('active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Department[];
    },
    enabled: open,
  });

  // Fetch available operators with their departments
  const { data: operators = [], isLoading } = useQuery({
    queryKey: ['available-operators-with-departments'],
    queryFn: async () => {
      // First get all profiles
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name');

      if (profilesError) throw profilesError;

      // Then get user departments
      const { data: userDepts, error: deptsError } = await supabase
        .from('user_departments')
        .select('user_id, department');

      if (deptsError) throw deptsError;

      // Map departments to users
      const deptMap = new Map(userDepts?.map(ud => [ud.user_id, ud.department]) || []);
      
      return (profiles || []).map(p => ({
        ...p,
        department: deptMap.get(p.id) || null
      })) as Operator[];
    },
    enabled: open,
  });

  // Filter out already participating operators
  const availableOperators = useMemo(() => {
    const participantIds = new Set(currentParticipants.map(p => p.operator_id));
    return operators.filter(op => !participantIds.has(op.id));
  }, [operators, currentParticipants]);

  // Filter by department first, then by search
  const filteredOperators = useMemo(() => {
    let filtered = availableOperators;
    
    // Filter by department
    if (departmentFilter && departmentFilter !== 'all') {
      filtered = filtered.filter(op => op.department === departmentFilter);
    }
    
    // Filter by search
    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(op => 
        op.display_name?.toLowerCase().includes(searchLower) ||
        op.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return filtered;
  }, [availableOperators, departmentFilter, search]);

  const toggleOperator = (operatorId: string) => {
    setSelectedOperators(prev => 
      prev.includes(operatorId)
        ? prev.filter(id => id !== operatorId)
        : [...prev, operatorId]
    );
  };

  const handleInvite = async () => {
    for (const operatorId of selectedOperators) {
      const operator = operators.find(op => op.id === operatorId);
      await inviteParticipant.mutateAsync({
        phoneNumber,
        bitrixId,
        operatorId,
        operatorName: operator?.display_name || undefined,
        priority,
      });
    }
    setSelectedOperators([]);
    setSearch('');
    setPriority(0);
    setDepartmentFilter('all');
    onOpenChange(false);
  };

  const getInitials = (name: string | null, email: string | null) => {
    if (name) return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    if (email) return email.substring(0, 2).toUpperCase();
    return '?';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Convidar Agentes
          </DialogTitle>
          <DialogDescription>
            Selecione os agentes que você deseja convidar para esta conversa.
            Eles serão notificados e poderão visualizar o histórico de mensagens.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar operadores..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
              <SelectTrigger className="w-[160px]">
                <Building2 className="h-4 w-4 mr-2 text-muted-foreground" />
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.code}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ScrollArea className="h-[300px] rounded-md border p-2">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredOperators.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Users className="h-10 w-10 mb-2 opacity-50" />
                <p className="text-sm">
                  {search ? 'Nenhum operador encontrado' : 'Todos os operadores já estão na conversa'}
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredOperators.map((operator) => (
                  <label
                    key={operator.id}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-muted cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedOperators.includes(operator.id)}
                      onCheckedChange={() => toggleOperator(operator.id)}
                    />
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs bg-primary/10 text-primary">
                        {getInitials(operator.display_name, operator.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {operator.display_name || 'Sem nome'}
                      </span>
                      {operator.email && (
                        <span className="text-xs text-muted-foreground">
                          {operator.email}
                        </span>
                      )}
                    </div>
                  </label>
                ))}
              </div>
            )}
          </ScrollArea>

          {selectedOperators.length > 0 && (
            <>
              <p className="text-sm text-muted-foreground">
                {selectedOperators.length} operador(es) selecionado(s)
              </p>
              <Separator className="my-2" />
              <PrioritySelector value={priority} onChange={setPriority} />
            </>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => {
              setSelectedOperators([]);
              setSearch('');
              setPriority(0);
              setDepartmentFilter('all');
              onOpenChange(false);
            }}
            disabled={inviteParticipant.isPending}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleInvite}
            disabled={selectedOperators.length === 0 || inviteParticipant.isPending}
          >
            {inviteParticipant.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Convidando...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Convidar ({selectedOperators.length})
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
