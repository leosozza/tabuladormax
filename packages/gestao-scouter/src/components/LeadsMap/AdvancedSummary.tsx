/**
 * Advanced Summary Component
 * Collapsible summary panel with PDF/CSV export buttons and AI Q&A
 */
import React, { useState } from 'react';
import { X, Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AIQAPanel } from './AIQAPanel';
import { generateSelectionHash } from '@/utils/selection-hash';
import { answerQuestion } from '@/utils/ai-qa-service';

interface ProjetoSummary {
  projeto: string;
  total: number;
  byScout: Map<string, number>;
}

interface AnalysisSummary {
  total: number;
  byProjeto: ProjetoSummary[];
  // Enhanced analysis data
  byEtapa?: Map<string, number>;
  byConfirmado?: Map<string, number>;
  totalComFoto?: number;
  totalConfirmados?: number;
  valorTotal?: number;
  idadeMedia?: number;
  supervisores?: Set<string>;
}

interface AIAnalysisResult {
  topProjetos: string[];
  topScouters: string[];
  densidade: string;
  hotspot: string;
  recomendacoes: string[];
  // Enhanced insights
  etapas?: Array<{ etapa: string; count: number }>;
  taxaConfirmacao?: number;
  taxaComFoto?: number;
  insights?: string[];
}

interface AdvancedSummaryProps {
  summary: AnalysisSummary;
  aiAnalysis: AIAnalysisResult;
  selectionCoords?: number[][];
  centerLatLng?: { lat: number; lng: number };
  onClose: () => void;
  onExportPDF: () => void;
  onExportCSV: () => void;
  isExporting?: boolean;
}

export function AdvancedSummary({ 
  summary, 
  aiAnalysis,
  selectionCoords = [],
  centerLatLng,
  onClose, 
  onExportPDF, 
  onExportCSV,
  isExporting = false
}: AdvancedSummaryProps) {
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  const toggleProject = (projeto: string) => {
    const newExpanded = new Set(expandedProjects);
    if (newExpanded.has(projeto)) {
      newExpanded.delete(projeto);
    } else {
      newExpanded.add(projeto);
    }
    setExpandedProjects(newExpanded);
  };

  // Generate selection hash for Q&A context
  const selectionHash = generateSelectionHash(selectionCoords);

  // Handle Q&A questions
  const handleAskQuestion = async (question: string): Promise<string> => {
    try {
      // Use local heuristic service
      const answer = answerQuestion(question, summary, aiAnalysis);
      return answer;
    } catch (error) {
      console.error('Error answering question:', error);
      throw error;
    }
  };

  return (
    <div className="absolute top-4 right-4 z-[9999] w-[min(90vw,420px)] bg-white/95 rounded-lg shadow-lg border p-4 max-h-[70vh] overflow-y-auto backdrop-blur-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-lg">Análise da Área</h3>
        <button 
          className="p-1 rounded hover:bg-gray-100 min-w-[44px] min-h-[44px] touch-manipulation flex items-center justify-center"
          onClick={onClose}
          title="Fechar"
        >
          <X size={20} />
        </button>
      </div>

      {/* Export buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          size="sm"
          onClick={onExportPDF}
          disabled={isExporting}
          className="flex-1"
        >
          <FileText className="h-4 w-4 mr-2" />
          Baixar PDF
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onExportCSV}
          disabled={isExporting}
          className="flex-1"
        >
          <Download className="h-4 w-4 mr-2" />
          Baixar CSV
        </Button>
      </div>

      {/* Total */}
      <div className="mb-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
        <div className="text-lg font-semibold text-orange-900">
          Total: {summary.total} leads
        </div>
      </div>

      {/* Projects breakdown */}
      {summary.byProjeto.length > 0 && (
        <div>
          <h4 className="font-semibold mb-2 text-sm text-muted-foreground">Por Projeto:</h4>
          {summary.byProjeto.map((proj) => {
            const isExpanded = expandedProjects.has(proj.projeto);
            return (
              <div key={proj.projeto} className="mb-2 border rounded-lg overflow-hidden">
                <button
                  className="w-full flex items-center justify-between p-3 hover:bg-gray-50 transition"
                  onClick={() => toggleProject(proj.projeto)}
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <span className="font-medium">{proj.projeto}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">{proj.total} leads</span>
                </button>
                
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0">
                    <div className="pl-6 text-sm space-y-1">
                      {Array.from(proj.byScout.entries())
                        .sort((a, b) => b[1] - a[1])
                        .map(([scouter, count]) => (
                          <div key={scouter} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                            <span className="text-muted-foreground">{scouter}</span>
                            <span className="font-medium">{count}</span>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* AI Analysis if provided */}
      {aiAnalysis && (
        <AIQAPanel
          selectionHash={selectionHash}
          totalLeads={summary.total}
          topProjetos={aiAnalysis.topProjetos}
          topScouters={aiAnalysis.topScouters}
          densidade={aiAnalysis.densidade}
          onAskQuestion={handleAskQuestion}
        />
      )}
    </div>
  );
}
