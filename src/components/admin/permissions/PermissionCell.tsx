import React from 'react';
import { cn } from '@/lib/utils';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Globe, Building2, User, Ban } from 'lucide-react';

export type PermissionScope = 'global' | 'department' | 'own' | 'none';

interface PermissionCellProps {
  type: 'route' | 'resource';
  value: boolean | PermissionScope;
  onChange: (value: boolean | PermissionScope) => void;
  disabled?: boolean;
  isSystemAdmin?: boolean;
}

const scopeConfig: Record<PermissionScope, { label: string; icon: React.ElementType; color: string }> = {
  global: { label: 'Global', icon: Globe, color: 'text-green-600 bg-green-100 dark:bg-green-900/30' },
  department: { label: 'Departamento', icon: Building2, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/30' },
  own: { label: 'Próprio', icon: User, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/30' },
  none: { label: 'Sem acesso', icon: Ban, color: 'text-muted-foreground bg-muted' },
};

export const PermissionCell: React.FC<PermissionCellProps> = ({
  type,
  value,
  onChange,
  disabled = false,
  isSystemAdmin = false,
}) => {
  // Admin always has full access
  if (isSystemAdmin) {
    return (
      <div className="flex items-center justify-center">
        <div className={cn(
          'flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium',
          scopeConfig.global.color
        )}>
          <Globe className="h-3 w-3" />
          <span>Total</span>
        </div>
      </div>
    );
  }

  // Simple switch for routes
  if (type === 'route') {
    const isEnabled = value === true || value === 'global';
    return (
      <div className="flex items-center justify-center">
        <Switch
          checked={isEnabled}
          onCheckedChange={(checked) => onChange(checked)}
          disabled={disabled}
          className="data-[state=checked]:bg-green-600"
        />
      </div>
    );
  }

  // Scope selector for resources
  const currentScope = typeof value === 'boolean' 
    ? (value ? 'global' : 'none') 
    : (value as PermissionScope);
  
  const config = scopeConfig[currentScope];
  const Icon = config.icon;

  return (
    <div className="flex items-center justify-center">
      <Select
        value={currentScope}
        onValueChange={(val) => onChange(val as PermissionScope)}
        disabled={disabled}
      >
        <SelectTrigger className={cn(
          'w-[130px] h-8 text-xs border-0',
          config.color
        )}>
          <SelectValue>
            <div className="flex items-center gap-1.5">
              <Icon className="h-3 w-3" />
              <span>{config.label}</span>
            </div>
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {Object.entries(scopeConfig).map(([key, cfg]) => {
            const ScopeIcon = cfg.icon;
            return (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <ScopeIcon className="h-3.5 w-3.5" />
                  <span>{cfg.label}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
};
