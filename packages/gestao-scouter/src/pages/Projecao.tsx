import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip as RTooltip } from 'recharts'
import { TrendingUp, Calculator, Target, Calendar, AlertCircle } from 'lucide-react'
import { ProjectionFilters } from '@/components/projection/ProjectionFilters'
import { 
  fetchProjectionAdvanced, 
  getAvailableFilters, 
  type AdvancedProjectionData, 
  type ProjectionType,
  type Granularidade
} from '@/repositories/projectionsRepo'
import { useAppSettings } from '@/hooks/useAppSettings'

export default function ProjecaoPage() {
  const { settings } = useAppSettings()
  const [projectionData, setProjectionData] = useState<AdvancedProjectionData | null>(null)
  const [loading, setLoading] = useState(false)
  const [projectionType, setProjectionType] = useState<ProjectionType>('scouter')
  const [selectedFilter, setSelectedFilter] = useState<string | undefined>(undefined)
  const [granularidade, setGranularidade] = useState<Granularidade>('diaria')
  const [availableFilters, setAvailableFilters] = useState<{ scouters: string[], projetos: string[] }>({ 
    scouters: [], 
    projetos: [] 
  })

  // Período de Análise - default: mês passado
  const [dataInicioAnalise, setDataInicioAnalise] = useState(() => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    return lastMonth.toISOString().slice(0, 10)
  })
  const [dataFimAnalise, setDataFimAnalise] = useState(() => {
    const now = new Date()
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    return lastMonthEnd.toISOString().slice(0, 10)
  })

  // Período de Projeção - default: próximo mês
  const [dataInicioProjecao, setDataInicioProjecao] = useState(() => {
    const now = new Date()
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    return nextMonth.toISOString().slice(0, 10)
  })
  const [dataFimProjecao, setDataFimProjecao] = useState(() => {
    const now = new Date()
    const nextMonthEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0)
    return nextMonthEnd.toISOString().slice(0, 10)
  })

  useEffect(() => {
    loadAvailableFilters()
  }, [])

  const loadAvailableFilters = async () => {
    const filters = await getAvailableFilters()
    setAvailableFilters(filters)
  }

  const fetchData = async () => {
    if (!dataInicioAnalise || !dataFimAnalise || !dataInicioProjecao || !dataFimProjecao) return
    
    setLoading(true)
    try {
      const params = {
        dataInicioAnalise,
        dataFimAnalise,
        dataInicioProj: dataInicioProjecao,
        dataFimProj: dataFimProjecao,
        granularidade,
        valor_ficha_padrao: settings?.valor_base_ficha || 10,
        ...(selectedFilter && projectionType === 'scouter' ? { scouter: selectedFilter } : {}),
        ...(selectedFilter && projectionType === 'projeto' ? { projeto: selectedFilter } : {})
      }

      const projection = await fetchProjectionAdvanced(params)
      setProjectionData(projection)
    } catch (error) {
      console.error('Error fetching projection:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleProjectionTypeChange = (type: ProjectionType) => {
    setProjectionType(type)
    setSelectedFilter(undefined) // Reset filter when changing type
  }

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
  const fmtNumber = new Intl.NumberFormat('pt-BR')

  // Prepare chart data
  const chartData = projectionData ? [
    ...projectionData.serie_analise.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: item.acumulado,
      projetado: null,
      type: 'analise'
    })),
    ...projectionData.serie_projecao.map(item => ({
      dia: item.dia,
      data: new Date(item.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      realizado: null,
      projetado: item.acumulado,
      type: 'projecao'
    }))
  ].sort((a, b) => a.dia.localeCompare(b.dia)) : []

  const availableOptions = projectionType === 'scouter' ? availableFilters.scouters : availableFilters.projetos
  const filterLabel = projectionType === 'scouter' ? 'Scouter' : 'Projeto'

  const granularidadeLabel = {
    'diaria': 'dia',
    'semanal': 'semana',
    'mensal': 'mês'
  }

  if (loading) {
    return (
      <AppShell sidebar={<Sidebar />}>
        <div className="flex items-center justify-center min-h-[calc(100vh-8rem)]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Carregando projeções...</p>
          </div>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Projeções Avançadas</h1>
          <p className="text-muted-foreground">
            Análise com períodos separados e granularidade configurável (diária, semanal ou mensal)
          </p>
        </div>

        {/* Filtros */}
        <ProjectionFilters
          projectionType={projectionType}
          selectedFilter={selectedFilter}
          availableScouters={availableFilters.scouters}
          availableProjetos={availableFilters.projetos}
          dataInicioAnalise={dataInicioAnalise}
          dataFimAnalise={dataFimAnalise}
          dataInicioProjecao={dataInicioProjecao}
          dataFimProjecao={dataFimProjecao}
          granularidade={granularidade}
          onProjectionTypeChange={handleProjectionTypeChange}
          onSelectedFilterChange={setSelectedFilter}
          onDataInicioAnaliseChange={setDataInicioAnalise}
          onDataFimAnaliseChange={setDataFimAnalise}
          onDataInicioProjecaoChange={setDataInicioProjecao}
          onDataFimProjecaoChange={setDataFimProjecao}
          onGranularidadeChange={setGranularidade}
        />

        <div className="flex justify-end">
          <Button onClick={fetchData} className="flex items-center gap-2" size="lg">
            <Calculator className="h-4 w-4" />
            Calcular Projeção
          </Button>
        </div>

        {projectionData && (
          <>
            {/* Fallback Warning */}
            {projectionData.fallbackUsado && (
              <Card className="rounded-2xl border-yellow-500/50 bg-yellow-50">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-yellow-800">
                    <AlertCircle className="h-5 w-5" />
                    <p className="text-sm font-medium">
                      Atenção: Não foram encontrados dados históricos para o {filterLabel} selecionado. 
                      Usando média global de todos os {projectionType === 'scouter' ? 'scouters' : 'projetos'}.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fichas Analisadas</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{fmtNumber.format(projectionData.periodoAnalise.totalLeads)}</div>
                  <p className="text-xs text-muted-foreground">
                    {projectionData.periodoAnalise.dias} dias ({new Date(projectionData.periodoAnalise.inicio).toLocaleDateString('pt-BR')} - {new Date(projectionData.periodoAnalise.fim).toLocaleDateString('pt-BR')})
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Realizado</CardTitle>
                  <Calculator className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">{fmtBRL.format(projectionData.realizado.valor)}</div>
                  <p className="text-xs text-muted-foreground">Receita do período de análise</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Fichas Projetadas</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{fmtNumber.format(projectionData.projetado.leads)}</div>
                  <p className="text-xs text-muted-foreground">
                    {projectionData.periodoProjecao.dias} dias ({new Date(projectionData.periodoProjecao.inicio).toLocaleDateString('pt-BR')} - {new Date(projectionData.periodoProjecao.fim).toLocaleDateString('pt-BR')})
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Valor Projetado</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">{fmtBRL.format(projectionData.projetado.valor)}</div>
                  <p className="text-xs text-muted-foreground">Receita estimada para período futuro</p>
                </CardContent>
              </Card>
            </div>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média Diária (Análise)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{projectionData.periodoAnalise.mediaDiaria.toFixed(1)} leads/dia</div>
                  <p className="text-xs text-muted-foreground">Base para projeção</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Média por {granularidadeLabel[granularidade]}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {granularidade === 'semanal' && `${(projectionData.periodoAnalise.mediaDiaria * 7).toFixed(1)} leads/semana`}
                    {granularidade === 'mensal' && `${(projectionData.periodoAnalise.mediaDiaria * 30).toFixed(1)} leads/mês`}
                    {granularidade === 'diaria' && `${projectionData.periodoAnalise.mediaDiaria.toFixed(1)} leads/dia`}
                  </div>
                  <p className="text-xs text-muted-foreground">Granularidade: {granularidade}</p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Valor Médio/Ficha</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{fmtBRL.format(projectionData.valor_medio_por_ficha)}</div>
                  <p className="text-xs text-muted-foreground">Média do período de análise</p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Projeção - Leads Acumuladas</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Linha contínua: período de análise | Linha tracejada: projeção futura
                </p>
              </CardHeader>
              <CardContent className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="data" 
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <RTooltip 
                      labelFormatter={(label) => `Data: ${label}`}
                      formatter={(value: number, name: string) => [
                        value !== null ? fmtNumber.format(value) : '-',
                        name === 'realizado' ? 'Analisado' : 'Projetado'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="realizado" 
                      stroke="hsl(var(--primary))"
                      strokeWidth={3}
                      dot={false}
                      connectNulls={false}
                      name="Analisado"
                    />
                    <Line 
                      type="monotone" 
                      dataKey="projetado" 
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      connectNulls={false}
                      name="Projetado"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Explanation */}
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Como Funciona a Projeção Avançada</CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  <strong>Período de Análise:</strong> {new Date(projectionData.periodoAnalise.inicio).toLocaleDateString('pt-BR')} a {new Date(projectionData.periodoAnalise.fim).toLocaleDateString('pt-BR')} 
                  ({projectionData.periodoAnalise.dias} dias, {projectionData.periodoAnalise.totalLeads} leads)
                </p>
                <p>
                  <strong>Período de Projeção:</strong> {new Date(projectionData.periodoProjecao.inicio).toLocaleDateString('pt-BR')} a {new Date(projectionData.periodoProjecao.fim).toLocaleDateString('pt-BR')} 
                  ({projectionData.periodoProjecao.dias} dias, {projectionData.periodoProjecao.unidades} {granularidadeLabel[granularidade]}s)
                </p>
                <p>
                  <strong>Lógica de Cálculo:</strong> A projeção utiliza a média diária de leads do período de análise ({projectionData.periodoAnalise.mediaDiaria.toFixed(1)} leads/dia) 
                  multiplicada pelos {projectionData.periodoProjecao.dias} dias do período de projeção.
                </p>
                <p>
                  <strong>Granularidade:</strong> {granularidade.charAt(0).toUpperCase() + granularidade.slice(1)} 
                  {granularidade === 'semanal' && ` (média de ${(projectionData.periodoAnalise.mediaDiaria * 7).toFixed(1)} leads por semana)`}
                  {granularidade === 'mensal' && ` (média de ${(projectionData.periodoAnalise.mediaDiaria * 30).toFixed(1)} leads por mês)`}
                </p>
                <p>
                  <strong>Filtro Aplicado:</strong> {selectedFilter
                    ? `${filterLabel}: ${selectedFilter}` 
                    : `Todos os ${projectionType === 'scouter' ? 'scouters' : 'projetos'}`}
                  {projectionData.fallbackUsado && ' (usando média global - fallback)'}
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {!projectionData && (
          <Card className="rounded-2xl">
            <CardContent className="text-center py-12">
              <Calculator className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Configure sua Projeção</h3>
              <p className="text-muted-foreground mb-4">
                Defina os períodos de análise e projeção, escolha a granularidade e clique em "Calcular Projeção"
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}