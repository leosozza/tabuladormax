import { useState, useMemo } from 'react';
import { useRoadmapFeatures, RoadmapFeature, RoadmapFeatureInsert } from '@/hooks/useRoadmapFeatures';
import { useUserRole } from '@/hooks/useUserRole';
import { FeatureModule, FeatureStatus, moduleConfig, statusConfig } from '@/types/roadmap';
import { RoadmapCard } from '@/components/roadmap/RoadmapCard';
import { RoadmapStats } from '@/components/roadmap/RoadmapStats';
import { RoadmapFilters } from '@/components/roadmap/RoadmapFilters';
import { RoadmapFeatureDialog } from '@/components/roadmap/RoadmapFeatureDialog';
import { RoadmapDeleteDialog } from '@/components/roadmap/RoadmapDeleteDialog';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Map, ArrowLeft, Plus, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Roadmap() {
  const [search, setSearch] = useState('');
  const [selectedModule, setSelectedModule] = useState<FeatureModule | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<FeatureStatus | 'all'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState<RoadmapFeature | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingFeature, setDeletingFeature] = useState<RoadmapFeature | null>(null);

  const { features, isLoading, createFeature, updateFeature, deleteFeature, updateStatus, isCreating, isUpdating, isDeleting } = useRoadmapFeatures();
  const { canManageRoadmap } = useUserRole();

  const filteredFeatures = useMemo(() => {
    return features.filter((feature) => {
      const matchesSearch = 
        feature.name.toLowerCase().includes(search.toLowerCase()) ||
        feature.description.toLowerCase().includes(search.toLowerCase()) ||
        feature.tags?.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
      
      const matchesModule = selectedModule === 'all' || feature.module === selectedModule;
      const matchesStatus = selectedStatus === 'all' || feature.status === selectedStatus;
      
      return matchesSearch && matchesModule && matchesStatus;
    });
  }, [features, search, selectedModule, selectedStatus]);

  const groupedByModule = useMemo(() => {
    const groups: Record<string, RoadmapFeature[]> = {};
    filteredFeatures.forEach((feature) => {
      const key = feature.module;
      if (!groups[key]) groups[key] = [];
      groups[key].push(feature);
    });
    return groups;
  }, [filteredFeatures]);

  // Simple stats features
  const statsFeatures = features.map(f => ({
    id: f.id,
    status: f.status,
    progress: f.progress,
  }));

  const handleSave = async (data: RoadmapFeatureInsert) => {
    if (editingFeature) {
      await updateFeature({ id: editingFeature.id, ...data });
    } else {
      await createFeature(data);
    }
  };

  const handleEdit = (feature: RoadmapFeature) => {
    setEditingFeature(feature);
    setDialogOpen(true);
  };

  const handleDelete = (feature: RoadmapFeature) => {
    setDeletingFeature(feature);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (deletingFeature) {
      await deleteFeature(deletingFeature.id);
    }
  };

  const handleStatusChange = async (id: string, status: RoadmapFeature['status']) => {
    await updateStatus({ id, status });
  };

  const handleOpenNewDialog = () => {
    setEditingFeature(null);
    setDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
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
            {canManageRoadmap && (
              <Button onClick={handleOpenNewDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Nova Funcionalidade
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        <RoadmapStats features={statsFeatures} />

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
            <span className="font-medium text-foreground">{features.length}</span> funcionalidades
          </p>
        </div>

        {/* Features Grid/List */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredFeatures.map((feature) => (
              <RoadmapCard
                key={feature.id}
                feature={feature}
                canManage={canManageRoadmap}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onStatusChange={handleStatusChange}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedByModule).map(([module, moduleFeatures]) => (
              <div key={module} className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className={`w-3 h-3 rounded-full ${moduleConfig[module as FeatureModule].color}`} />
                  <h2 className="text-lg font-semibold">{moduleConfig[module as FeatureModule].label}</h2>
                  <Badge variant="secondary">{moduleFeatures.length}</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {moduleFeatures.map((feature) => (
                    <RoadmapCard
                      key={feature.id}
                      feature={feature}
                      canManage={canManageRoadmap}
                      onEdit={handleEdit}
                      onDelete={handleDelete}
                      onStatusChange={handleStatusChange}
                    />
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

        {/* Dialogs */}
        <RoadmapFeatureDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          feature={editingFeature}
          onSave={handleSave}
          isLoading={isCreating || isUpdating}
        />

        <RoadmapDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          feature={deletingFeature}
          onConfirm={handleConfirmDelete}
          isLoading={isDeleting}
        />
      </div>
    </div>
  );
}
