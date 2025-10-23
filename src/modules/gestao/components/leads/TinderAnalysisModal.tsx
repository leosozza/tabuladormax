import React, { useState, useRef, useMemo } from 'react';
import TinderCard from 'react-tinder-card';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase-helper';
import { toast } from 'sonner';
import type { Lead } from '@/repositories/types';
import { useTinderCardConfig } from '@/hooks/useTinderCardConfig';
import { ALL_LEAD_FIELDS } from '@/config/leadFields';

interface TinderAnalysisModalProps {
  open: boolean;
  onClose: () => void;
  leads: Lead[];
  onComplete: () => void;
}

interface CardDirection {
  left: boolean;
  right: boolean;
}

export function TinderAnalysisModal({ open, onClose, leads, onComplete }: TinderAnalysisModalProps) {
  const [currentIndex, setCurrentIndex] = useState(leads.length - 1);
  const [lastDirection, setLastDirection] = useState<string>();
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'approve' | 'reject'>('approve');
  const currentIndexRef = useRef(currentIndex);
  const { config } = useTinderCardConfig();

  const childRefs = useMemo(
    () =>
      Array(leads.length)
        .fill(0)
        .map(() => React.createRef<any>()),
    [leads.length]
  );

  const updateCurrentIndex = (val: number) => {
    setCurrentIndex(val);
    currentIndexRef.current = val;
  };

  const canSwipe = currentIndex >= 0;

  const swiped = async (direction: string, leadToUpdate: Lead, index: number) => {
    setLastDirection(direction);
    updateCurrentIndex(index - 1);

    // Show visual feedback
    const isApproved = direction === 'right';
    setFeedbackType(isApproved ? 'approve' : 'reject');
    setShowFeedback(true);
    setTimeout(() => setShowFeedback(false), 500);

    // Update database using RPC
    try {
      const { error } = await supabase.rpc('set_lead_analysis', {
        p_lead_id: leadToUpdate.id,
        p_aprovado: isApproved
      });

      if (error) {
        console.error('Error updating lead:', error);
        toast.error('Erro ao salvar decisão');
      } else {
        toast.success(isApproved ? 'Lead aprovado!' : 'Lead rejeitado');
      }
    } catch (err) {
      console.error('Exception updating lead:', err);
      toast.error('Erro ao salvar decisão');
    }

    // Check if we're done
    if (index === 0) {
      setTimeout(() => {
        toast.success('Análise concluída!');
        onComplete();
        onClose();
      }, 600);
    }
  };

  const outOfFrame = (name: string, idx: number) => {
    console.log(`${name} (${idx}) left the screen!`, currentIndexRef.current);
  };

  const swipe = async (dir: 'left' | 'right') => {
    if (canSwipe && currentIndex >= 0 && currentIndex < childRefs.length) {
      await childRefs[currentIndex].current?.swipe(dir);
    }
  };

  const getCurrentLead = () => {
    if (currentIndex >= 0 && currentIndex < leads.length) {
      return leads[currentIndex];
    }
    return null;
  };

  const getFieldValue = (lead: Lead, fieldKey: string) => {
    return (lead as any)[fieldKey];
  };

  const getFieldLabel = (fieldKey: string) => {
    const field = ALL_LEAD_FIELDS.find(f => f.key === fieldKey);
    return field?.label || fieldKey;
  };

  const getPhotoUrl = (lead: Lead) => {
    if (!config.photoField || config.photoField === 'none') return null;
    const value = getFieldValue(lead, config.photoField);
    
    // Handle boolean fields (cadastro_existe_foto)
    if (typeof value === 'boolean' || value === 'SIM') {
      return lead.foto; // Fallback to foto field
    }
    
    return value;
  };

  const currentLead = getCurrentLead();
  const totalLeads = leads.length;
  const currentPosition = totalLeads - currentIndex;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[90vh] p-0 overflow-hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Análise de Leads</h2>
              <Badge variant="secondary" className="text-lg px-4 py-2">
                {currentPosition} de {totalLeads}
              </Badge>
            </div>
          </div>

          {/* Card Container */}
          <div className="flex-1 relative flex items-center justify-center p-8">
            {/* Visual Feedback Overlay */}
            {showFeedback && (
              <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none">
                {feedbackType === 'approve' ? (
                  <div className="w-32 h-32 bg-green-500 rounded-full flex items-center justify-center animate-ping">
                    <Heart className="w-16 h-16 text-white" fill="white" />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-red-500 rounded-full flex items-center justify-center animate-ping">
                    <X className="w-16 h-16 text-white" strokeWidth={4} />
                  </div>
                )}
              </div>
            )}

            {/* Tinder Cards */}
            <div className="relative w-full max-w-md h-[500px]">
              {leads.map((lead, index) => (
                <TinderCard
                  ref={childRefs[index]}
                  className="absolute w-full h-full"
                  key={lead.id}
                  onSwipe={(dir) => swiped(dir, lead, index)}
                  onCardLeftScreen={() => outOfFrame(lead.nome || 'Unknown', index)}
                  preventSwipe={['up', 'down']}
                >
                  <div className="w-full h-full bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
                    {/* Photo Section */}
                    <div className="h-64 bg-gradient-to-br from-blue-400 to-purple-500 relative">
                      {getPhotoUrl(lead) ? (
                        <img
                          src={getPhotoUrl(lead) as string}
                          alt={getFieldValue(lead, 'nome') || 'Lead'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-6xl font-bold">
                          {(getFieldValue(lead, 'nome') || 'U').toString().charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>

                    {/* Info Section */}
                    <div className="p-6 space-y-4">
                      {/* Main Fields */}
                      <div>
                        {config.mainFields.map((fieldKey, idx) => {
                          const value = getFieldValue(lead, fieldKey);
                          if (!value) return null;
                          
                          if (idx === 0) {
                            return (
                              <h3 key={fieldKey} className="text-2xl font-bold text-gray-900">
                                {value}
                              </h3>
                            );
                          }
                          return (
                            <p key={fieldKey} className="text-lg text-gray-600">
                              {value}
                            </p>
                          );
                        })}
                      </div>

                      {/* Detail Fields */}
                      {config.detailFields.length > 0 && (
                        <div className="grid grid-cols-2 gap-4">
                          {config.detailFields.map(fieldKey => {
                            const value = getFieldValue(lead, fieldKey);
                            if (!value) return null;
                            
                            return (
                              <div key={fieldKey}>
                                <p className="text-sm text-gray-500">{getFieldLabel(fieldKey)}</p>
                                <p className="font-medium text-gray-900">{value}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* Badge Fields */}
                      {config.badgeFields.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {config.badgeFields.map(fieldKey => {
                            const value = getFieldValue(lead, fieldKey);
                            if (!value || value === 'Não' || value === false) return null;
                            
                            return (
                              <Badge key={fieldKey} variant="default">
                                {getFieldLabel(fieldKey)}
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </TinderCard>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 border-t bg-gray-50">
            <div className="flex items-center justify-center gap-8">
              <Button
                size="lg"
                variant="destructive"
                className="rounded-full w-20 h-20 shadow-lg hover:scale-110 transition-transform"
                onClick={() => swipe('left')}
                disabled={!canSwipe}
              >
                <X className="w-10 h-10" />
              </Button>
              <Button
                size="lg"
                className="rounded-full w-20 h-20 shadow-lg bg-green-500 hover:bg-green-600 hover:scale-110 transition-transform"
                onClick={() => swipe('right')}
                disabled={!canSwipe}
              >
                <Heart className="w-10 h-10" fill="white" />
              </Button>
            </div>
            <div className="text-center mt-4 text-sm text-gray-500">
              Deslize para a direita para aprovar ou esquerda para rejeitar
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
