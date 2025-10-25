import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useTinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS, CATEGORY_LABELS } from "@/config/leadFields";
import { Settings2, X, Plus, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

interface TinderCardConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TinderCardConfigModal({ open, onOpenChange }: TinderCardConfigModalProps) {
  const {
    config,
    setPhotoField,
    addMainField,
    removeMainField,
    addDetailField,
    removeDetailField,
    addBadgeField,
    removeBadgeField,
    resetToDefault,
    canAddMainField,
    canRemoveMainField,
    canAddDetailField,
    canAddBadgeField,
    validation,
  } = useTinderCardConfig();

  const [selectedMainField, setSelectedMainField] = useState("");
  const [selectedDetailField, setSelectedDetailField] = useState("");
  const [selectedBadgeField, setSelectedBadgeField] = useState("");

  const availableFields = ALL_LEAD_FIELDS.filter(f => f.key !== config.photoField);
  const availableMainFields = availableFields.filter(f => !config.mainFields.includes(f.key));
  const availableDetailFields = availableFields.filter(f => !config.detailFields.includes(f.key));
  const availableBadgeFields = availableFields.filter(f => !config.badgeFields.includes(f.key));

  const handleAddMainField = () => {
    if (selectedMainField && canAddMainField()) {
      addMainField(selectedMainField);
      setSelectedMainField("");
      toast({ title: "Campo principal adicionado" });
    }
  };

  const handleAddDetailField = () => {
    if (selectedDetailField && canAddDetailField()) {
      addDetailField(selectedDetailField);
      setSelectedDetailField("");
      toast({ title: "Campo de detalhe adicionado" });
    }
  };

  const handleAddBadgeField = () => {
    if (selectedBadgeField && canAddBadgeField()) {
      addBadgeField(selectedBadgeField);
      setSelectedBadgeField("");
      toast({ title: "Badge adicionado" });
    }
  };

  const handleReset = () => {
    resetToDefault();
    toast({ title: "Configuração restaurada para o padrão" });
  };

  const getFieldLabel = (key: string) => {
    const field = ALL_LEAD_FIELDS.find(f => f.key === key);
    return field?.label || key;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Configuração do Cartão de Análise
          </DialogTitle>
          <DialogDescription>
            Personalize quais campos aparecem no cartão de análise de leads
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6 py-4 max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Photo Field */}
            <div className="space-y-2">
              <Label className="text-base font-semibold">Campo de Foto</Label>
              <p className="text-sm text-muted-foreground">
                Selecione qual campo será usado para exibir a foto do lead
              </p>
              <Select value={config.photoField} onValueChange={setPhotoField}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_LEAD_FIELDS.map((field) => (
                    <SelectItem key={field.key} value={field.key}>
                      {field.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Main Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Campos Principais</Label>
                <p className="text-sm text-muted-foreground">
                  Nome e informação destacada (mín: {validation.mainFields.min}, máx: {validation.mainFields.max})
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {config.mainFields.map((fieldKey) => (
                  <Badge
                    key={fieldKey}
                    variant="default"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    {getFieldLabel(fieldKey)}
                    {canRemoveMainField() && (
                      <button
                        onClick={() => removeMainField(fieldKey)}
                        className="hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </Badge>
                ))}
              </div>

              {canAddMainField() && (
                <div className="flex gap-2">
                  <Select value={selectedMainField} onValueChange={setSelectedMainField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableMainFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddMainField}
                    disabled={!selectedMainField}
                    size="icon"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Detail Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Campos de Detalhes</Label>
                <p className="text-sm text-muted-foreground">
                  Informações adicionais exibidas no corpo do cartão (máx: {validation.detailFields.max})
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {config.detailFields.map((fieldKey) => (
                  <Badge
                    key={fieldKey}
                    variant="secondary"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    {getFieldLabel(fieldKey)}
                    <button
                      onClick={() => removeDetailField(fieldKey)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {canAddDetailField() && (
                <div className="flex gap-2">
                  <Select value={selectedDetailField} onValueChange={setSelectedDetailField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableDetailFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddDetailField}
                    disabled={!selectedDetailField}
                    size="icon"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <Separator />

            {/* Badge Fields */}
            <div className="space-y-3">
              <div>
                <Label className="text-base font-semibold">Badges de Status</Label>
                <p className="text-sm text-muted-foreground">
                  Badges exibidos no canto superior do cartão (máx: {validation.badgeFields.max})
                </p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {config.badgeFields.map((fieldKey) => (
                  <Badge
                    key={fieldKey}
                    variant="outline"
                    className="flex items-center gap-2 px-3 py-1"
                  >
                    {getFieldLabel(fieldKey)}
                    <button
                      onClick={() => removeBadgeField(fieldKey)}
                      className="hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>

              {canAddBadgeField() && (
                <div className="flex gap-2">
                  <Select value={selectedBadgeField} onValueChange={setSelectedBadgeField}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um campo" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableBadgeFields.map((field) => (
                        <SelectItem key={field.key} value={field.key}>
                          {field.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={handleAddBadgeField}
                    disabled={!selectedBadgeField}
                    size="icon"
                    variant="outline"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </ScrollArea>

        <DialogFooter className="px-6 pb-6 pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            Restaurar Padrão
          </Button>
          <Button onClick={() => onOpenChange(false)}>
            Salvar e Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
