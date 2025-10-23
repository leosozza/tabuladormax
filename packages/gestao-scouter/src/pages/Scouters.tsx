import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { AIAnalysis } from '@/components/shared/AIAnalysis'
import { UnifiedMapChart } from '@/components/dashboard/charts/UnifiedMapChart'
import { UserPlus, Award, Target, TrendingUp, Users } from 'lucide-react'
import { getScoutersData, getScoutersSummary, type ScouterData } from '@/repositories/scoutersRepo'

export default function Scouters() {
  const [scouters, setScouters] = useState<ScouterData[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [summary, setSummary] = useState({
    totalScouters: 0,
    activeScouters: 0,
    totalLeads: 0,
    averageConversion: 0
  })

  useEffect(() => {
    fetchScoutersData()
  }, [])

  const fetchScoutersData = async () => {
    setLoading(true)
    try {
      const [scoutersData, summaryData] = await Promise.all([
        getScoutersData(),
        getScoutersSummary()
      ])
      setScouters(scoutersData)
      setSummary(summaryData)
    } catch (error) {
      console.error('Error fetching scouters data:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterOptions = [
    {
      key: 'tier',
      label: 'Tier',
      type: 'select' as const,
      options: [
        { value: 'premium', label: 'Premium' },
        { value: 'coach', label: 'Coach' },
        { value: 'pleno', label: 'Pleno' },
        { value: 'iniciante', label: 'Iniciante' }
      ]
    },
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'ativo', label: 'Ativo' },
        { value: 'inativo', label: 'Inativo' },
        { value: 'ferias', label: 'Férias' }
      ]
    },
    {
      key: 'performance',
      label: 'Performance Mín.',
      type: 'number' as const,
      placeholder: 'Ex: 80'
    }
  ]

  const tableColumns = [
    {
      key: 'scouter_name',
      label: 'Scouter',
      sortable: true,
      render: (value: string, row: ScouterData) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback>
              {value.split(' ').map((n: string) => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <div className="font-medium">{value}</div>
        </div>
      )
    },
    {
      key: 'tier_name',
      label: 'Tier',
      sortable: true,
      render: (value: string) => (
        <Badge variant={getTierVariant(value)} className="rounded-xl">
          {value}
        </Badge>
      )
    },
    { key: 'total_fichas', label: 'Fichas/Sem', sortable: true },
    { key: 'weekly_goal', label: 'Meta', sortable: true },
    {
      key: 'conversion_rate',
      label: 'Performance',
      sortable: true,
      render: (value: number) => {
        return (
          <div className="space-y-1">
            <div className={`text-sm font-medium ${getPerformanceColor(value)}`}>
              {value.toFixed(0)}%
            </div>
            <Progress value={Math.min(value, 100)} className="h-1" />
          </div>
        )
      }
    },
    { 
      key: 'taxaConversao', 
      label: 'Conversão', 
      sortable: true,
      render: (value: number) => `${value.toFixed(1)}%`
    },
    { 
      key: 'qualityScore', 
      label: 'Quality', 
      sortable: true,
      render: (value: number) => value.toFixed(1)
    },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant="secondary" className="rounded-xl">
          {value}
        </Badge>
      )
    }
  ]


  const getTierFromCount = (count: number) => {
    if (count >= 80) return 'Scouter Coach Bronze'
    if (count >= 60) return 'Scouter Premium'
    if (count >= 40) return 'Scouter Pleno'
    return 'Scouter Iniciante'
  }

  const getTierMeta = (count: number) => {
    if (count >= 80) return 90
    if (count >= 60) return 80
    if (count >= 40) return 60
    return 40
  }

  const getTierVariant = (tier: string) => {
    if (tier.includes('Coach')) return 'default'
    if (tier.includes('Premium')) return 'secondary'
    if (tier.includes('Pleno')) return 'outline'
    return 'outline'
  }

  const getPerformanceColor = (percentage: number) => {
    if (percentage >= 90) return 'text-green-600'
    if (percentage >= 75) return 'text-blue-600'
    if (percentage >= 60) return 'text-orange-600'
    return 'text-red-600'
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
  }

  const handleSearch = (term: string) => {
    console.log('Buscar scouter:', term)
  }

  const filteredScouters = scouters.filter(scouter => {
    if (filters.tier && !scouter.tier_name.toLowerCase().includes(filters.tier)) return false
    if (filters.status && scouter.performance_status !== filters.status) return false
    if (filters.performance && scouter.conversion_rate < filters.performance) return false
    return true
  })


  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Scouters</h1>
          <p className="text-muted-foreground">
            Gerencie a equipe e acompanhe o desempenho individual
          </p>
        </div>

        {/* Filtros Avançados */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Scouters"
          defaultExpanded={false}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Scouters</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scouters.length}</div>
              <p className="text-xs text-muted-foreground">Ativos na equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Fichas/Semana</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.totalLeads}</div>
              <p className="text-xs text-muted-foreground">Total da equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversão Média</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.averageConversion.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Taxa da equipe</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Médio</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">75.2</div>
              <p className="text-xs text-muted-foreground">Score da equipe</p>
            </CardContent>
          </Card>
        </div>

        {/* Unified Map Component */}
        <UnifiedMapChart
          scouterData={filteredScouters.map((scouter, index) => ({
            lat: 0,
            lon: 0,
            scouterName: scouter.scouter_name,
            leads: scouter.total_fichas,
            fichas: scouter.total_fichas,
            conversao: scouter.conversion_rate
          }))}
          fichaData={[
            { lat: 0, lon: 0, leads: 45, fichas: 45, conversao: 85, endereco: 'Centro - SP' },
            { lat: 0, lon: 0, leads: 38, fichas: 38, conversao: 72, endereco: 'Zona Sul - SP' },
            { lat: 0, lon: 0, leads: 52, fichas: 52, conversao: 68, endereco: 'Zona Oeste - SP' },
            { lat: 0, lon: 0, leads: 29, fichas: 29, conversao: 55, endereco: 'Zona Leste - SP' },
            { lat: 0, lon: 0, leads: 41, fichas: 41, conversao: 78, endereco: 'Zona Norte - SP' },
          ]}
          isLoading={loading}
        />

        {/* Grid com Tabela e Análise AI */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            {/* Tabela de Scouters */}
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  <CardTitle>Lista de Scouters</CardTitle>
                  <Button className="rounded-xl">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
            <DataTable
              data={filteredScouters}
              columns={tableColumns}
              searchable={true}
              exportable={true}
              actions={{
                view: (row) => console.log('Ver scouter:', row),
                edit: (row) => console.log('Editar scouter:', row)
              }}
            />
              </CardContent>
            </Card>
          </div>

          <div>
            {/* AI Analysis */}
            <AIAnalysis 
              data={filteredScouters}
              title="Análise de Performance"
            />
          </div>
        </div>
      </div>
    </AppShell>
  )
}