import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { TinderAnalysisModal } from '@/components/leads/TinderAnalysisModal'
import { CreateLeadDialog } from '@/components/leads/CreateLeadDialog'
import { ColumnSelectorModal } from '@/components/leads/ColumnSelectorModal'
import { TinderConfigModal } from '@/components/leads/TinderConfigModal'
import { useLeadColumnConfig } from '@/hooks/useLeadColumnConfig'
import { ALL_LEAD_FIELDS } from '@/config/leadFields'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Plus, Users, TrendingUp, Calendar, Phone, Heart, ThumbsUp, ThumbsDown, Clock, Trash2, Settings } from 'lucide-react'
import { getLeads, deleteLeads } from '@/repositories/leadsRepo'
import type { Lead, LeadsFilters } from '@/repositories/types'
import { formatDateBR } from '@/utils/dataHelpers'
import { toast } from 'sonner'

export default function Leads() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<LeadsFilters>({})
  const [selectedLeads, setSelectedLeads] = useState<Lead[]>([])
  const [showTinderModal, setShowTinderModal] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showColumnConfig, setShowColumnConfig] = useState(false)
  const [showTinderConfig, setShowTinderConfig] = useState(false)
  const { visibleColumns } = useLeadColumnConfig()

  const filterOptions = [
    {
      key: 'dataInicio',
      label: 'Data Início',
      type: 'date' as const
    },
    {
      key: 'dataFim', 
      label: 'Data Fim',
      type: 'date' as const
    },
    {
      key: 'scouter',
      label: 'Scouter',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.scouter).filter(Boolean)))
        .map(scouter => ({ value: scouter, label: scouter }))
    },
    {
      key: 'projeto',
      label: 'Projeto', 
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.projetos).filter(Boolean)))
        .map(projeto => ({ value: projeto, label: projeto }))
    },
    {
      key: 'etapa',
      label: 'Status',
      type: 'select' as const,
      options: Array.from(new Set(leads.map(lead => lead.etapa).filter(Boolean)))
        .map(etapa => ({ value: etapa, label: etapa }))
    }
  ]

  const allTableColumns = ALL_LEAD_FIELDS;
  
  const tableColumns = allTableColumns
    .filter(col => visibleColumns.includes(col.key))
    .sort((a, b) => {
      const indexA = visibleColumns.indexOf(a.key);
      const indexB = visibleColumns.indexOf(b.key);
      return indexA - indexB;
    })
    .map(col => ({
      key: col.key,
      label: col.label,
      sortable: col.sortable,
      formatter: col.formatter
    }));

  const tableColumnsOld = [
    { 
      key: 'nome', 
      label: 'Nome', 
      sortable: true,
      formatter: (value: string) => (
        <div className="font-medium">{value || '-'}</div>
      )
    },
    { 
      key: 'scouter', 
      label: 'Scouter', 
      sortable: true,
      formatter: (value: string) => value || '-'
    },
    { 
      key: 'projetos', 
      label: 'Projeto', 
      sortable: true,
      formatter: (value: string) => value || '-'
    },
    { 
      key: 'telefone', 
      label: 'Telefone', 
      sortable: true,
      formatter: (value: string) => (
        <div className="flex items-center gap-2">
          {value ? (
            <>
              <Phone className="w-3 h-3 text-muted-foreground" />
              {value}
            </>
          ) : '-'}
        </div>
      )
    },
    { 
      key: 'valor_ficha', 
      label: 'Valor Ficha', 
      sortable: true,
      formatter: (value: number) => value ? `R$ ${value.toFixed(2)}` : '-'
    },
    {
      key: 'cadastro_existe_foto',
      label: 'Foto',
      sortable: true,
      formatter: (value: boolean | string) => {
        const hasFoto = value === true || value === 'SIM';
        return (
          <Badge variant={hasFoto ? "default" : "outline"} className="rounded-xl">
            {hasFoto ? 'Sim' : 'Não'}
          </Badge>
        );
      }
    },
    { 
      key: 'criado', 
      label: 'Data Criação', 
      sortable: true,
      formatter: (value: string) => (
        <div className="flex items-center gap-2">
          <Calendar className="w-3 h-3 text-muted-foreground" />
          {value ? formatDateBR(value) : '-'}
        </div>
      )
    },
    {
      key: 'aprovado',
      label: 'Aprovado',
      sortable: true,
      formatter: (value: boolean | null | undefined) => {
        if (value === true) {
          return (
            <Badge variant="default" className="bg-green-500 rounded-xl">
              <ThumbsUp className="w-3 h-3 mr-1" />
              Sim
            </Badge>
          );
        } else if (value === false) {
          return (
            <Badge variant="destructive" className="rounded-xl">
              <ThumbsDown className="w-3 h-3 mr-1" />
              Não
            </Badge>
          );
        } else {
          return (
            <Badge variant="outline" className="rounded-xl">
              <Clock className="w-3 h-3 mr-1" />
              Pendente
            </Badge>
          );
        }
      }
    }
  ]

  useEffect(() => {
    loadLeads()
  }, [filters])

  const loadLeads = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getLeads(filters)
      setLeads(data)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao carregar leads'
      setError(errorMessage)
      toast.error('Erro ao carregar leads', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setLoading(false)
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Convertido': return 'default'
      case 'Agendado': return 'secondary'
      case 'Contato': return 'outline'
      default: return 'outline'
    }
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    const leadsFilters: LeadsFilters = {
      scouter: newFilters.scouter,
      projeto: newFilters.projeto,
      etapa: newFilters.etapa,
      dataInicio: newFilters.dataInicio,
      dataFim: newFilters.dataFim
    }
    setFilters(leadsFilters)
  }

  const handleSearch = (term: string) => {
    // Filtro rápido, pode implementar se desejar
    // console.log('Buscar:', term)
  }

  const handleCreateSuccess = async () => {
    await loadLeads()
  }

  const handleStartAnalysis = () => {
    if (selectedLeads.length === 0) {
      toast.error('Selecione ao menos um lead para análise')
      return
    }
    setShowTinderModal(true)
  }

  const handleAnalysisComplete = async () => {
    await loadLeads()
    setSelectedLeads([])
    setShowTinderModal(false)
  }

  const handleSelectionChange = (selected: Lead[]) => {
    setSelectedLeads(selected)
  }

  const handleDeleteClick = () => {
    if (selectedLeads.length === 0) {
      toast.error('Nenhum lead selecionado')
      return
    }
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (selectedLeads.length === 0) return

    try {
      setIsDeleting(true)
      const leadIds = selectedLeads.map(lead => lead.id).filter((id): id is number => id !== undefined && id !== 0)
      if (leadIds.length === 0) {
        toast.error('Nenhum lead válido selecionado para exclusão')
        return
      }
      await deleteLeads(leadIds)
      toast.success(`${leadIds.length} lead(s) excluído(s) com sucesso`)
      await loadLeads()
      setSelectedLeads([])
      setShowDeleteDialog(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido ao deletar leads'
      toast.error('Erro ao deletar leads', {
        description: errorMessage,
        duration: 5000,
      })
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Gerencie todos os leads capturados pela equipe de scouting
          </p>
        </div>

        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-red-100 p-2">
                  <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-red-900">Erro ao Carregar Dados</h3>
                  <p className="mt-1 text-sm text-red-700">{error}</p>
                  <div className="mt-3">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={loadLeads}
                      className="border-red-300 text-red-700 hover:bg-red-100"
                    >
                      Tentar Novamente
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Leads"
          defaultExpanded={false}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
          {/* ... summary cards ... */}
          {/* (mantém igual ao seu código original) */}
          {/* ... */}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Lista de Leads</CardTitle>
                  <div className="flex gap-2 flex-wrap">
                    <Button 
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setShowColumnConfig(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Colunas
                    </Button>
                    <Button 
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setShowTinderConfig(true)}
                    >
                      <Settings className="h-4 w-4 mr-2" />
                      Config Análise
                    </Button>
                    {selectedLeads.length > 0 && (
                      <Button 
                        variant="destructive"
                        className="rounded-xl"
                        onClick={handleDeleteClick}
                        disabled={isDeleting}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir Selecionados ({selectedLeads.length})
                      </Button>
                    )}
                    <Button 
                      variant="default"
                      className="rounded-xl"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Criar Lead
                    </Button>
                    <Button 
                      variant="default"
                      className="rounded-xl bg-pink-500 hover:bg-pink-600"
                      onClick={handleStartAnalysis}
                      disabled={selectedLeads.length === 0}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Iniciar Análise ({selectedLeads.length})
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <DataTable
                  data={leads}
                  columns={tableColumns}
                  searchable={true}
                  exportable={true}
                  selectable={true}
                  onSelectionChange={handleSelectionChange}
                  actions={{
                    view: (row) => console.log('Ver lead:', row),
                    edit: (row) => console.log('Editar lead:', row)
                  }}
                />
              </CardContent>
            </Card>
          </div>
          <div>
            <AIAnalysis 
              data={leads}
              title="Análise de Leads"
            />
          </div>
        </div>
      </div>

      {/* Tinder Analysis Modal */}
      <TinderAnalysisModal
        open={showTinderModal}
        onClose={() => setShowTinderModal(false)}
        leads={selectedLeads}
        onComplete={handleAnalysisComplete}
      />

      {/* Create Lead Dialog */}
      <CreateLeadDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onSuccess={handleCreateSuccess}
      />

      {/* Column Configuration Modal */}
      <ColumnSelectorModal 
        open={showColumnConfig}
        onOpenChange={setShowColumnConfig}
      />

      {/* Tinder Configuration Modal */}
      <TinderConfigModal 
        open={showTinderConfig}
        onOpenChange={setShowTinderConfig}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Você tem certeza que deseja excluir {selectedLeads.length} lead(s) selecionado(s)? 
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  )
}