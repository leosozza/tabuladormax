import { useState, useEffect } from 'react'
import { AppShell } from '@/layouts/AppShell'
import { Sidebar } from '@/components/layout/Sidebar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/shared/DataTable'
import { FilterHeader } from '@/components/shared/FilterHeader'
import { Calendar, DollarSign, CreditCard, FileText, Users, TrendingUp } from 'lucide-react'
import { getLeads } from '@/repositories/leadsRepo'
import { getValorFichaFromRow } from '@/utils/values'

export default function Pagamentos() {
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<Record<string, any>>({})

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { value: 'Pago', label: 'Pago' },
        { value: 'Pendente', label: 'Pendente' },
        { value: 'Processando', label: 'Processando' },
        { value: 'Cancelado', label: 'Cancelado' }
      ]
    },
    {
      key: 'periodo',
      label: 'Período',
      type: 'dateRange' as const
    },
    {
      key: 'valorMin',
      label: 'Valor Mínimo',
      type: 'number' as const,
      placeholder: 'R$ 0,00'
    },
    {
      key: 'valorMax',
      label: 'Valor Máximo',
      type: 'number' as const,
      placeholder: 'R$ 999999,99'
    }
  ]

  const fmtBRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

  const tableColumns = [
    { key: 'scouter', label: 'Scouter', sortable: true },
    { key: 'periodo', label: 'Período', sortable: true },
    { key: 'fichas', label: 'Fichas', sortable: true },
    { 
      key: 'valorFicha', 
      label: 'R$/Ficha', 
      sortable: true,
      render: (value: number) => fmtBRL.format(value)
    },
    { 
      key: 'ajudaCusto', 
      label: 'Ajuda Custo', 
      sortable: true,
      render: (value: number) => fmtBRL.format(value)
    },
    { 
      key: 'bonusQuality', 
      label: 'Bônus Quality', 
      sortable: true,
      render: (value: number) => fmtBRL.format(value)
    },
    { 
      key: 'valorTotal', 
      label: 'Total', 
      sortable: true,
      render: (value: number) => (
        <span className="font-medium">{fmtBRL.format(value)}</span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (value: string) => (
        <Badge variant={getStatusVariant(value)} className="rounded-xl">
          {value}
        </Badge>
      )
    },
    { 
      key: 'dataPagamento', 
      label: 'Data Pagamento',
      render: (value: string | null) => value || '-'
    }
  ]

  useEffect(() => {
    loadPagamentos()
  }, [filters])

  const loadPagamentos = async () => {
    try {
      setLoading(true)
      const leads = await getLeads(filters)
      
      // Gerar dados de pagamento baseados nos leads
      const scouterStats = new Map()
      
      leads.forEach(lead => {
        if (!lead.scouter) return
        
        if (!scouterStats.has(lead.scouter)) {
          scouterStats.set(lead.scouter, {
            scouter: lead.scouter,
            leads: 0,
            convertidos: 0,
            somaValorFichas: 0
          })
        }
        
        const stats = scouterStats.get(lead.scouter)
        stats.fichas++
        stats.somaValorFichas += getValorFichaFromRow(lead)
        
        if (lead.etapa === 'Convertido') {
          stats.convertidos++
        }
      })
      
      // Converter para dados de pagamento
      const pagamentosData = Array.from(scouterStats.values()).map((stats, index) => {
        const valorMedioFicha = stats.leads > 0 ? stats.somaValorFichas / stats.leads : 0
        return {
          id: index + 1,
          scouter: stats.scouter,
          periodo: '2024-01-01 - 2024-01-07',
          leads: stats.fichas,
          valorFicha: valorMedioFicha,
          ajudaCusto: getAjudaCustoPorTier(stats.fichas),
          bonusQuality: stats.convertidos * 5, // R$ 5 por conversão
          valorTotal: 0,
          status: ['Pago', 'Pendente', 'Processando'][Math.floor(Math.random() * 3)],
          dataPagamento: Math.random() > 0.5 ? '2024-01-15' : null
        }
      })
      
      // Calcular valor total
      pagamentosData.forEach(p => {
        p.valorTotal = (p.leads * p.valorFicha) + p.ajudaCusto + p.bonusQuality
      })
      
      setPagamentos(pagamentosData)
    } catch (error) {
      console.error('Erro ao carregar pagamentos:', error)
    } finally {
      setLoading(false)
    }
  }

  const getValorFichaPorTier = (fichas: number) => {
    if (fichas >= 80) return 20.00
    if (fichas >= 60) return 18.00
    if (fichas >= 40) return 15.00
    return 12.00
  }

  const getAjudaCustoPorTier = (fichas: number) => {
    if (fichas >= 80) return 350.00
    if (fichas >= 60) return 300.00
    if (fichas >= 40) return 250.00
    return 200.00
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Pago': return 'default'
      case 'Pendente': return 'secondary'
      case 'Processando': return 'outline'
      default: return 'outline'
    }
  }

  const handleFiltersChange = (newFilters: Record<string, any>) => {
    setFilters(newFilters)
  }

  const handleSearch = (term: string) => {
    console.log('Buscar pagamento:', term)
  }

  const handleProcessarLote = () => {
    console.log('Processar lote de pagamentos')
  }

  const filteredPagamentos = pagamentos.filter(pagamento => {
    if (filters.status && pagamento.status !== filters.status) return false
    if (filters.valorMin && pagamento.valorTotal < parseFloat(filters.valorMin)) return false
    if (filters.valorMax && pagamento.valorTotal > parseFloat(filters.valorMax)) return false
    return true
  })

  const totalPago = pagamentos
    .filter(p => p.status === 'Pago')
    .reduce((acc, p) => acc + p.valorTotal, 0)
  
  const totalPendente = pagamentos
    .filter(p => p.status === 'Pendente')
    .reduce((acc, p) => acc + p.valorTotal, 0)
  
  const totalProcessando = pagamentos
    .filter(p => p.status === 'Processando')
    .reduce((acc, p) => acc + p.valorTotal, 0)

  return (
    <AppShell sidebar={<Sidebar />}>
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Pagamentos</h1>
          <p className="text-muted-foreground">
            Gerencie pagamentos e remunerações da equipe de scouting
          </p>
        </div>

        {/* Filtros Avançados */}
        <FilterHeader
          filters={filterOptions}
          onFiltersChange={handleFiltersChange}
          onSearch={handleSearch}
          title="Filtros de Pagamentos"
          defaultExpanded={false}
        />

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pago</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">
                {fmtBRL.format(totalPago)}
              </div>
              <p className="text-xs text-muted-foreground">Este período</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendente</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">
                {fmtBRL.format(totalPendente)}
              </div>
              <p className="text-xs text-muted-foreground">A pagar</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Processando</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-info">
                {fmtBRL.format(totalProcessando)}
              </div>
              <p className="text-xs text-muted-foreground">Em análise</p>
            </CardContent>
          </Card>
          
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Geral</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {fmtBRL.format(totalPago + totalPendente + totalProcessando)}
              </div>
              <p className="text-xs text-muted-foreground">
                {pagamentos.length} pagamento{pagamentos.length !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Tabela de Pagamentos */}
        <Card className="rounded-2xl">
          <CardHeader>
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Histórico de Pagamentos
              </CardTitle>
              <Button 
                className="rounded-xl"
                onClick={handleProcessarLote}
              >
                <TrendingUp className="h-4 w-4 mr-2" />
                Processar Lote
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <DataTable
              data={filteredPagamentos}
              columns={tableColumns}
              searchable={true}
              exportable={true}
              actions={{
                view: (row) => console.log('Ver pagamento:', row),
                edit: (row) => console.log('Editar pagamento:', row)
              }}
            />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  )
}