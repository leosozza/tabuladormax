// Sistema de Grid Layout modular inspirado em Looker/Power BI
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';

export interface GridWidget {
  id: string;
  title: string;
  component: React.ReactNode;
  size: {
    cols: number; // 1-12
    rows: number; // altura em unidades
  };
  position?: {
    col: number;
    row: number;
  };
}

interface GridLayoutProps {
  widgets: GridWidget[];
  gap?: number;
  className?: string;
}

export function GridLayout({ widgets, gap = 4, className }: GridLayoutProps) {
  return (
    <div 
      className={cn(
        "grid grid-cols-12 auto-rows-min",
        `gap-${gap}`,
        className
      )}
    >
      {widgets.map((widget) => (
        <div
          key={widget.id}
          className={cn(
            "rounded-2xl transition-all hover:shadow-lg",
            `col-span-12 md:col-span-${widget.size.cols}`
          )}
          style={{ 
            minHeight: `${widget.size.rows * 80}px`,
            gridRow: widget.position ? `span ${widget.size.rows}` : undefined
          }}
        >
          <Card className="h-full rounded-2xl border-border/50">
            {widget.component}
          </Card>
        </div>
      ))}
    </div>
  );
}

// Widget wrapper com título e actions
interface WidgetContainerProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export function WidgetContainer({
  title,
  description,
  actions,
  children,
  className
}: WidgetContainerProps) {
  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4 border-b border-border/50">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
          {description && (
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          )}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
      
      {/* Content */}
      <div className="flex-1 p-6 overflow-auto">
        {children}
      </div>
    </div>
  );
}
