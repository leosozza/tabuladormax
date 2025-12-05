import { RoadmapFeature, statusConfig, moduleConfig } from '@/types/roadmap';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LayoutDashboard, MousePointerClick, Scan, Download, FileUser, MessageCircle,
  Users, Map, Pentagon, Flame, TrendingUp, Wallet, BarChart3, Clock,
  UserCog, Shield, Activity, RefreshCw, GitMerge, RotateCcw, FileSpreadsheet,
  Brain, ScrollText, Rocket, Briefcase, Calculator, GitBranch, History,
  FileText, Mail, Phone, Megaphone, Send, PhoneCall, Mic, Link,
  MessagesSquare, CloudCog, Workflow, Hash, MapPin, Wrench, Bug, Gauge,
  LineChart, Smartphone, Bot, Calendar, Circle
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, MousePointerClick, Scan, Download, FileUser, MessageCircle,
  Users, Map, Pentagon, Flame, TrendingUp, Wallet, BarChart3, Clock,
  UserCog, Shield, Activity, RefreshCw, GitMerge, RotateCcw, FileSpreadsheet,
  Brain, ScrollText, Rocket, Briefcase, Calculator, GitBranch, History,
  FileText, Mail, Phone, Megaphone, Send, PhoneCall, Mic, Link,
  MessagesSquare, CloudSync: CloudCog, Workflow, Hash, MapPin, Wrench, Bug, Gauge,
  LineChart, Smartphone, Bot, Calendar, Circle
};

interface RoadmapCardProps {
  feature: RoadmapFeature;
}

export function RoadmapCard({ feature }: RoadmapCardProps) {
  const statusInfo = statusConfig[feature.status];
  const moduleInfo = moduleConfig[feature.module];
  
  const IconComponent = iconMap[feature.icon] || Circle;

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-lg ${moduleInfo.color}/10 group-hover:${moduleInfo.color}/20 transition-colors`}>
              <IconComponent className={`h-5 w-5 ${moduleInfo.color.replace('bg-', 'text-')}`} />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold text-foreground leading-tight">{feature.name}</h3>
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${moduleInfo.color}`} />
                <span className="text-xs text-muted-foreground">{moduleInfo.label}</span>
              </div>
            </div>
          </div>
          <Badge variant="secondary" className={`${statusInfo.bgColor} ${statusInfo.color} shrink-0`}>
            {statusInfo.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{feature.description}</p>
        
        {feature.progress !== undefined && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Progresso</span>
              <span className="font-medium">{feature.progress}%</span>
            </div>
            <Progress value={feature.progress} className="h-1.5" />
          </div>
        )}
        
        <div className="flex flex-wrap gap-1.5 pt-1">
          {feature.tags?.slice(0, 3).map(tag => (
            <Badge key={tag} variant="outline" className="text-xs px-2 py-0 font-normal">
              {tag}
            </Badge>
          ))}
        </div>
        
        {feature.launchDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pt-1">
            <Calendar className="h-3 w-3" />
            <span>Lançado em {feature.launchDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
