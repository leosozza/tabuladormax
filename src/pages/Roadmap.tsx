import { useState, useMemo } from 'react';
import { roadmapFeatures } from '@/data/roadmapFeatures';
import { FeatureModule, FeatureStatus, moduleConfig, statusConfig } from '@/types/roadmap';
import { RoadmapCard } from '@/components/roadmap/RoadmapCard';
import { RoadmapStats } from '@/components/roadmap/RoadmapStats';
import { RoadmapFilters } from '@/components/roadmap/RoadmapFilters';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Map, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export default function Roadmap() {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<FeatureModule | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredFeatures = useMemo(() => {
    return roadmapFeatures.filter((feature) => {
      const matchesSearch = 
        feature.name.toLowerCase().includes(search.toLowerCase()) ||
        feature.description.toLowerCase().includes(search.toLowerCase()) ||
        feature.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesModule = selectedModule === 'all' || feature.module === selectedModule;
      const matchesStatus = selectedStatus === 'all' || feature.status === selectedStatus;
      
      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [search, selectedModule, selectedStatus]);

  // Group by module for list view
  const groupedByModule = useMemo(() => {
    const groups: Record<string, typeof filteredFeatures> = {};
    filteredFeatures.forEach((feature) => {
      const key = feature.module;
      if (!groups[key]) groups[key] = [];
      groups[key].push(feature);
    });
    return groups;
  }, [filteredFeatures]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Map className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Roadmap TabuladorMax</h1>
                <p className="text-muted-foreground">
                  Acompanhe todas as funcionalidades implementadas e planejadas
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <RoadmapStats features={roadmapFeatures} />

        <Separator />

        {/* Filters */}
        <RoadmapFilters
          search={search}
          onSearchChange={setSearch}
          selectedModule={selectedModule}
          onModuleChange={setSelectedModule}
          selectedStatus={selectedStatus}
          onStatusChange={setSelectedStatus}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        {/* Results count */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Mostrando <span className="font-medium text-foreground">{filteredFeatures.length}</span> de{' '}
            <span className="font-medium text-foreground">{roadmapFeatures.length}</span> funcionalidades
          </p>
        </div>

        {/* Features Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => (
              <RoadmapCard key={feature.id} feature={feature} />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByModule).map(([module, features]) => (
              <div key={module} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${moduleConfig[module as FeatureModule].color}`} />
                  <h2 className="text-lg font-semibold">{moduleConfig[module as FeatureModule].label}</h2>
                  <Badge variant="secondary">{features.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {features.map((feature) => (
                    <RoadmapCard key={feature.id} feature={feature} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {filteredFeatures.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Nenhuma funcionalidade encontrada com os filtros aplicados.</p>
          </div>
        )}
      </div>
    </div>
  );
}
