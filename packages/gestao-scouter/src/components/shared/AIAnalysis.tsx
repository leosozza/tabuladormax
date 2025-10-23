import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Brain, TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface AIInsight {
  type: 'trend' | 'alert' | 'opportunity' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
}

interface AIAnalysisProps {
  data?: any[];
  title?: string;
}

export function AIAnalysis({ data = [], title = "Análise Inteligente" }: AIAnalysisProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [customQuery, setCustomQuery] = useState('');

  const generateInsights = () => {
    setIsAnalyzing(true);
    
    // Simulação de análise AI com base nos dados
    setTimeout(() => {
      const mockInsights: AIInsight[] = [
        {
          type: 'trend',
          title: 'Tendência de Crescimento',
          description: 'Performance dos scouters aumentou 15% nas últimas 2 semanas',
          confidence: 85,
          impact: 'high'
        },
        {
          type: 'alert',
          title: 'Queda na Conversão',
          description: 'Taxa de conversão em SP caiu 8% - requer atenção',
          confidence: 92,
          impact: 'medium'
        },
        {
          type: 'opportunity',
          title: 'Oportunidade de Expansão',
          description: 'Região Norte apresenta potencial inexplorado',
          confidence: 78,
          impact: 'high'
        },
        {
          type: 'recommendation',
          title: 'Otimização Sugerida',
          description: 'Redistributir scouters entre projetos pode aumentar ROI em 12%',
          confidence: 88,
          impact: 'medium'
        }
      ];
      
      setInsights(mockInsights);
      setIsAnalyzing(false);
    }, 2000);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'trend': return <TrendingUp className="h-4 w-4" />;
      case 'alert': return <AlertTriangle className="h-4 w-4" />;
      case 'opportunity': return <CheckCircle className="h-4 w-4" />;
      case 'recommendation': return <Brain className="h-4 w-4" />;
      default: return <Brain className="h-4 w-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>{title}</CardTitle>
          </div>
          <Button 
            onClick={generateInsights}
            disabled={isAnalyzing}
            size="sm"
          >
            {isAnalyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Brain className="h-4 w-4 mr-2" />
            )}
            {isAnalyzing ? 'Analisando...' : 'Gerar Insights'}
          </Button>
        </div>
        <CardDescription>
          Análise inteligente dos dados para insights estratégicos
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Consulta Personalizada
          </label>
          <Textarea
            value={customQuery}
            onChange={(e) => setCustomQuery(e.target.value)}
            placeholder="Ex: Analise a performance dos scouters no último mês..."
            className="min-h-[80px]"
          />
        </div>

        {insights.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground">
              Insights Identificados ({insights.length})
            </h4>
            
            {insights.map((insight, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getInsightIcon(insight.type)}
                    <h5 className="font-medium">{insight.title}</h5>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={getImpactColor(insight.impact)}>
                      {insight.impact.toUpperCase()}
                    </Badge>
                    <Badge variant="secondary">
                      {insight.confidence}% confiança
                    </Badge>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {insight.description}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {isAnalyzing && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center space-y-2">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">
                Processando dados e gerando insights...
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}