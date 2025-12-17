import { useState } from 'react';
import { ChevronDown, ChevronRight, LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface AdminOption {
  path: string;
  icon: LucideIcon;
  title: string;
  description: string;
  color: string;
}

interface AdminCategorySectionProps {
  title: string;
  description: string;
  icon: LucideIcon;
  color: string;
  options: AdminOption[];
  totalOptions?: number;
  onNavigate: (path: string) => void;
  defaultExpanded?: boolean;
}

export function AdminCategorySection({
  title,
  description,
  icon: CategoryIcon,
  color,
  options,
  totalOptions,
  onNavigate,
  defaultExpanded = true,
}: AdminCategorySectionProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  if (options.length === 0) return null;

  const availableCount = options.length;
  const total = totalOptions ?? options.length;

  return (
    <div className="space-y-3">
      <Button
        variant="ghost"
        className="w-full justify-between p-4 h-auto hover:bg-muted/50"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className={cn("p-2.5 rounded-lg", color)}>
            <CategoryIcon className="w-5 h-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-base">{title}</span>
              <Badge variant="secondary" className="text-xs font-normal">
                {availableCount === total ? total : `${availableCount}/${total}`}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground font-normal">{description}</p>
          </div>
        </div>
        {isExpanded ? (
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        )}
      </Button>

      <div
        className={cn(
          "grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 overflow-hidden transition-all duration-300",
          isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        {options.map((option) => {
          const Icon = option.icon;
          return (
            <Card
              key={option.path}
              className="cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/50 group"
              onClick={() => onNavigate(option.path)}
            >
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-3">
                  <div className={cn("p-2 rounded-lg transition-transform group-hover:scale-110", option.color)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <CardTitle className="text-sm font-medium">{option.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0 pb-4 px-4">
                <CardDescription className="text-xs line-clamp-2">
                  {option.description}
                </CardDescription>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
