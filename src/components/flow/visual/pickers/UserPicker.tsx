// ============================================
// User Picker - Select users from profiles
// ============================================

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, User } from 'lucide-react';

interface UserPickerProps {
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
  placeholder?: string;
}

interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
}

export function UserPicker({ value, onChange, multiple = false, placeholder = 'Selecionar usuário' }: UserPickerProps) {
  const [search, setSearch] = useState('');

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ['profiles-picker'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, display_name, email')
        .order('display_name', { ascending: true });
      
      if (error) throw error;
      // Map to Profile format with null avatar_url
      return (data || []).map(p => ({ ...p, avatar_url: null })) as Profile[];
    }
  });

  const filteredProfiles = useMemo(() => {
    if (!search) return profiles;
    const searchLower = search.toLowerCase();
    return profiles.filter(p => 
      (p.display_name?.toLowerCase().includes(searchLower)) ||
      (p.email?.toLowerCase().includes(searchLower))
    );
  }, [profiles, search]);

  const selectedUsers = useMemo(() => {
    if (!value) return [];
    const ids = Array.isArray(value) ? value : [value];
    return profiles.filter(p => ids.includes(p.id));
  }, [value, profiles]);

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  if (multiple) {
    const selectedIds = Array.isArray(value) ? value : value ? [value] : [];
    
    return (
      <div className="space-y-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar usuários..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 text-sm"
          />
        </div>
        
        {selectedUsers.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedUsers.map(user => (
              <Badge key={user.id} variant="secondary" className="gap-1">
                <Avatar className="h-4 w-4">
                  <AvatarImage src={user.avatar_url || undefined} />
                  <AvatarFallback className="text-[8px]">{getInitials(user.display_name)}</AvatarFallback>
                </Avatar>
                {user.display_name || user.email}
              </Badge>
            ))}
          </div>
        )}

        <ScrollArea className="h-[150px] border rounded-md p-2">
          {isLoading ? (
            <div className="text-sm text-muted-foreground p-2">Carregando...</div>
          ) : filteredProfiles.length === 0 ? (
            <div className="text-sm text-muted-foreground p-2">Nenhum usuário encontrado</div>
          ) : (
            <div className="space-y-1">
              {filteredProfiles.map(profile => (
                <div
                  key={profile.id}
                  className="flex items-center gap-2 p-2 rounded hover:bg-accent cursor-pointer"
                  onClick={() => {
                    const newIds = selectedIds.includes(profile.id)
                      ? selectedIds.filter(id => id !== profile.id)
                      : [...selectedIds, profile.id];
                    onChange(newIds);
                  }}
                >
                  <Checkbox checked={selectedIds.includes(profile.id)} />
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={profile.avatar_url || undefined} />
                    <AvatarFallback className="text-xs">{getInitials(profile.display_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{profile.display_name || 'Sem nome'}</div>
                    <div className="text-xs text-muted-foreground truncate">{profile.email}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>
    );
  }

  // Single selection mode
  return (
    <Select 
      value={typeof value === 'string' ? value : undefined} 
      onValueChange={(val) => onChange(val)}
    >
      <SelectTrigger className="text-sm">
        <SelectValue placeholder={placeholder}>
          {selectedUsers[0] && (
            <div className="flex items-center gap-2">
              <Avatar className="h-5 w-5">
                <AvatarImage src={selectedUsers[0].avatar_url || undefined} />
                <AvatarFallback className="text-[10px]">{getInitials(selectedUsers[0].display_name)}</AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedUsers[0].display_name || selectedUsers[0].email}</span>
            </div>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {isLoading ? (
          <div className="p-2 text-sm text-muted-foreground">Carregando...</div>
        ) : profiles.length === 0 ? (
          <div className="p-2 text-sm text-muted-foreground">Nenhum usuário</div>
        ) : (
          profiles.map(profile => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={profile.avatar_url || undefined} />
                  <AvatarFallback className="text-[10px]">{getInitials(profile.display_name)}</AvatarFallback>
                </Avatar>
                <span>{profile.display_name || profile.email}</span>
              </div>
            </SelectItem>
          ))
        )}
      </SelectContent>
    </Select>
  );
}
