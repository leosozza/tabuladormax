import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { RoadmapFeature } from '@/hooks/useRoadmapFeatures';
import { moduleConfig, statusConfig, priorityConfig, FeatureModule, FeatureStatus, FeaturePriority } from '@/types/roadmap';
import { RoadmapStatusBadge } from './RoadmapStatusBadge';
import { 
  Circle, LayoutDashboard, MousePointerClick, Sparkles, FileDown, FileText,
  Phone, Table, Users, Map, MapPin, Pentagon, Flame, TrendingUp, DollarSign,
  Clock, BarChart3, Shield, Route, Stethoscope, RefreshCw, GitCompare, RotateCcw,
  Upload, Download, Settings, Brain, ScrollText, Package, Briefcase, Calculator,
  GitBranch, History, PhoneCall, Megaphone, Send, BarChart, Mic, RefreshCcw,
  MessageCircle, MessageSquare, Workflow, Webhook, Bell, Sun, Smartphone,
  ChevronRight, Globe, Zap, Activity, UserCheck, Pencil, Trash2, Calendar,
  Scan, FileUser, Wallet, UserCog, FileSpreadsheet, Rocket, Mail, Link,
  MessagesSquare, Hash, Wrench, Bug, Gauge, LineChart, Bot, CloudCog,
  AlertTriangle, ArrowUp, Minus, ArrowDown
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Circle, LayoutDashboard, MousePointerClick, Sparkles, FileDown, FileText,
  Phone, Table, Users, Map, MapPin, Pentagon, Flame, TrendingUp, DollarSign,
  Clock, BarChart3, Shield, Route, Stethoscope, RefreshCw, GitCompare, RotateCcw,
  Upload, Download, Settings, Brain, ScrollText, Package, Briefcase, Calculator,
  GitBranch, History, PhoneCall, Megaphone, Send, BarChart, Mic, RefreshCcw,
  MessageCircle, MessageSquare, Workflow, Webhook, Bell, Sun, Smartphone,
  ChevronRight, Globe, Zap, Activity, UserCheck, Calendar, Scan, FileUser,
  Wallet, UserCog, FileSpreadsheet, Rocket, Mail, Link, MessagesSquare, Hash,
  Wrench, Bug, Gauge, LineChart, Bot, CloudCog, AlertTriangle, ArrowUp, Minus, ArrowDown
};

const priorityIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  AlertTriangle, ArrowUp, Minus, ArrowDown
};

interface RoadmapCardProps {
  feature: RoadmapFeature;
  canManage?: boolean;
  onEdit?: (feature: RoadmapFeature) => void;
  onDelete?: (feature: RoadmapFeature) => void;
  onStatusChange?: (id: string, status: RoadmapFeature['status']) => Promise<void>;
}

export function RoadmapCard({ feature, canManage, onEdit, onDelete, onStatusChange }: RoadmapCardProps) {
  const module = moduleConfig[feature.module as FeatureModule];
  const priority = priorityConfig[feature.priority as FeaturePriority] || priorityConfig.medium;
  const IconComponent = iconMap[feature.icon] || Circle;
  const PriorityIcon = priorityIconMap[priority.icon] || Minus;

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${module.color} bg-opacity-20 shrink-0`}>
            <IconComponent className="h-5 w-5 text-foreground" />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-sm leading-tight line-clamp-2">{feature.name}</h3>
            <p className="text-xs text-muted-foreground">{module.label}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Badges: Status + Prioridade na mesma linha */}
        <div className="flex items-center gap-2 flex-wrap">
          <RoadmapStatusBadge 
            feature={feature} 
            canManage={canManage} 
            onStatusChange={onStatusChange} 
          />
          <Badge className={`${priority.bgColor} ${priority.color} text-xs`}>
            <PriorityIcon className="h-3 w-3 mr-1" />
            {priority.label}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
        
        {feature.status === 'in-progress' && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{feature.progress}%</span>
            </div>
            <Progress value={feature.progress} className="h-1.5" />
          </div>
        )}

        {feature.tags && feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {feature.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {feature.tags.length > 3 && (
              <Badge variant="outline" className="text-xs px-1.5 py-0">
                +{feature.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {feature.launch_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>Lançamento: {new Date(feature.launch_date).toLocaleDateString('pt-BR')}</span>
          </div>
        )}

        {canManage && (
          <div className="flex gap-2 pt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => onEdit?.(feature)}>
              <Pencil className="h-3 w-3 mr-1" />
              Editar
            </Button>
            <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => onDelete?.(feature)}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
