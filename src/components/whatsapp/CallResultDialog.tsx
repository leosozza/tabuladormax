import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Phone, PhoneCall, PhoneOff, PhoneMissed, Voicemail, AlertCircle, HelpCircle, Loader2 } from 'lucide-react';
import { useCreateSipCallLog, CallResult, CALL_RESULT_LABELS } from '@/hooks/useSipCallLogs';

interface CallResultDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  bitrixId?: string;
  contactName?: string;
}

const CALL_RESULT_OPTIONS: { value: CallResult; label: string; icon: React.ReactNode; description: string }[] = [
  { 
    value: 'atendida', 
    label: 'Atendida', 
    icon: <PhoneCall className="w-4 h-4 text-green-600" />,
    description: 'Cliente atendeu a ligação'
  },
  { 
    value: 'nao_atendeu', 
    label: 'Não Atendeu', 
    icon: <PhoneMissed className="w-4 h-4 text-yellow-600" />,
    description: 'Chamou mas não atendeu'
  },
  { 
    value: 'ocupado', 
    label: 'Ocupado', 
    icon: <PhoneOff className="w-4 h-4 text-orange-600" />,
    description: 'Linha ocupada'
  },
  { 
    value: 'caixa_postal', 
    label: 'Caixa Postal', 
    icon: <Voicemail className="w-4 h-4 text-blue-600" />,
    description: 'Caiu na caixa postal'
  },
  { 
    value: 'numero_invalido', 
    label: 'Número Inválido', 
    icon: <AlertCircle className="w-4 h-4 text-red-600" />,
    description: 'Número inexistente ou incorreto'
  },
  { 
    value: 'outro', 
    label: 'Outro', 
    icon: <HelpCircle className="w-4 h-4 text-gray-600" />,
    description: 'Outro resultado'
  },
];

export function CallResultDialog({
  open,
  onOpenChange,
  phoneNumber,
  bitrixId,
  contactName
}: CallResultDialogProps) {
  const [callResult, setCallResult] = useState<CallResult | ''>('');
  const [notes, setNotes] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('');
  
  const createCallLog = useCreateSipCallLog();

  const handleSubmit = async () => {
    if (!callResult) return;

    await createCallLog.mutateAsync({
      phone_number: phoneNumber,
      bitrix_id: bitrixId,
      contact_name: contactName,
      call_result: callResult,
      notes: notes.trim() || undefined,
      call_duration_seconds: durationMinutes ? Math.round(parseFloat(durationMinutes) * 60) : undefined
    });

    // Reset form and close
    setCallResult('');
    setNotes('');
    setDurationMinutes('');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setCallResult('');
    setNotes('');
    setDurationMinutes('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="w-5 h-5 text-green-600" />
            Registrar Resultado da Chamada
          </DialogTitle>
          <DialogDescription>
            Registre o resultado da ligação para <strong>{contactName || phoneNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Call Result Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Resultado da Chamada *</Label>
            <RadioGroup
              value={callResult}
              onValueChange={(value) => setCallResult(value as CallResult)}
              className="grid grid-cols-2 gap-2"
            >
              {CALL_RESULT_OPTIONS.map((option) => (
                <div key={option.value}>
                  <RadioGroupItem
                    value={option.value}
                    id={option.value}
                    className="peer sr-only"
                  />
                  <Label
                    htmlFor={option.value}
                    className="flex items-center gap-2 rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary cursor-pointer transition-all"
                  >
                    {option.icon}
                    <div className="flex-1">
                      <p className="text-sm font-medium leading-none">{option.label}</p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>

          {/* Duration (optional, only for answered calls) */}
          {callResult === 'atendida' && (
            <div className="space-y-2">
              <Label htmlFor="duration" className="text-sm font-medium">
                Duração (minutos) - opcional
              </Label>
              <Input
                id="duration"
                type="number"
                min="0"
                step="0.5"
                placeholder="Ex: 5.5"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Observações (opcional)
            </Label>
            <Textarea
              id="notes"
              placeholder="Adicione observações sobre a ligação..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleCancel}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!callResult || createCallLog.isPending}
            className="gap-2"
          >
            {createCallLog.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
