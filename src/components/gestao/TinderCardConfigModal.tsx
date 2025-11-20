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
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useTinderCardConfig } from "@/hooks/useTinderCardConfig";
import { ALL_LEAD_FIELDS } from "@/config/leadFields";
import { Settings2, RotateCcw } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { TinderCardPreview } from "./TinderCardPreview";
import { DraggableFieldList } from "./DraggableFieldList";

interface TinderCardConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TinderCardConfigModal({ open, onOpenChange }: TinderCardConfigModalProps) {
  const {
    config,
    setPhotoField,
    setPhotoStyle,
    setPhotoSize,
    addDetailField,
    removeDetailField,
    addBadgeField,
    removeBadgeField,
    reorderDetailFields,
    reorderBadgeFields,
    resetToDefault,
    canAddDetailField,
    canAddBadgeField,
    validation,
  } = useTinderCardConfig();

  const [selectedDetailField, setSelectedDetailField] = useState("");
  const [selectedBadgeField, setSelectedBadgeField] = useState("");

  const availableFields = ALL_LEAD_FIELDS.filter(f => f.key !== config.photoField);
  const availableDetailFields = availableFields.filter(f => 
    !config.detailFields.includes(f.key) && 
    !config.mainFields.includes(f.key) &&
    !config.badgeFields.includes(f.key)
  );
  const availableBadgeFields = availableFields.filter(f => 
    !config.badgeFields.includes(f.key) &&
    !config.mainFields.includes(f.key) &&
    !config.detailFields.includes(f.key)
  );

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

  const detailFieldsWithLabels = config.detailFields.map(key => ({
    key,
    label: getFieldLabel(key)
  }));

  const badgeFieldsWithLabels = config.badgeFields.map(key => ({
    key,
    label: getFieldLabel(key)
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Editor Visual do Cartão
          </DialogTitle>
          <DialogDescription>
            Personalize aparência e campos com drag-and-drop
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 px-6 pb-6">
          {/* ESQUERDA: Preview */}
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">📱 Pré-visualização</h3>
              <TinderCardPreview config={config} />
            </div>
          </ScrollArea>

          {/* DIREITA: Configurações */}
          <ScrollArea className="h-[calc(90vh-200px)]">
            <div className="space-y-6 pr-4">
              {/* Configuração da Foto */}
              <Card className="p-4 space-y-4">
                <h3 className="text-sm font-semibold">📸 Área da Foto</h3>
                
                <div className="space-y-2">
                  <Label>Estilo</Label>
                  <ToggleGroup 
                    type="single" 
                    value={config.photoStyle}
                    onValueChange={(value) => value && setPhotoStyle(value as any)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="circle" className="flex-1">
                      Circular
                    </ToggleGroupItem>
                    <ToggleGroupItem value="rounded" className="flex-1">
                      Retangular
                    </ToggleGroupItem>
                    <ToggleGroupItem value="fullscreen" className="flex-1">
                      Tela Cheia
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label>Tamanho</Label>
                  <ToggleGroup 
                    type="single" 
                    value={config.photoSize}
                    onValueChange={(value) => value && setPhotoSize(value as any)}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="small" className="flex-1">P</ToggleGroupItem>
                    <ToggleGroupItem value="medium" className="flex-1">M</ToggleGroupItem>
                    <ToggleGroupItem value="large" className="flex-1">G</ToggleGroupItem>
                  </ToggleGroup>
                </div>

                <div className="space-y-2">
                  <Label>Campo de Foto</Label>
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
              </Card>

              <Separator />

              {/* Campos Principais */}
              <Card className="p-4 space-y-3">
                <h3 className="text-sm font-semibold">🆔 Campos Principais</h3>
                <div className="space-y-2">
                  {config.mainFields.map((field, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="default" className="text-sm">
                        {getFieldLabel(field)}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {idx === 0 ? '(Título principal - grande)' : '(Subtítulo - referência)'}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  💡 O primeiro campo é exibido em destaque (grande e negrito). 
                  O segundo campo aparece menor, como referência.
                </p>
              </Card>

              <Separator />

              {/* Detail Fields - Drag and Drop */}
              <DraggableFieldList
                title="📊 Campos de Detalhes"
                fields={detailFieldsWithLabels}
                onReorder={reorderDetailFields}
                onRemove={removeDetailField}
                onAdd={() => {
                  if (canAddDetailField() && availableDetailFields.length > 0) {
                    setSelectedDetailField(availableDetailFields[0].key);
                  }
                }}
                maxFields={validation.detailFields.max}
              />

              {/* Add detail field selector */}
              {selectedDetailField && (
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
                    size="sm"
                    variant="default"
                  >
                    Adicionar
                  </Button>
                  <Button
                    onClick={() => setSelectedDetailField("")}
                    size="sm"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              )}

              <Separator />

              {/* Badge Fields - Drag and Drop */}
              <DraggableFieldList
                title="🏷️ Badges"
                fields={badgeFieldsWithLabels}
                onReorder={reorderBadgeFields}
                onRemove={removeBadgeField}
                onAdd={() => {
                  if (canAddBadgeField() && availableBadgeFields.length > 0) {
                    setSelectedBadgeField(availableBadgeFields[0].key);
                  }
                }}
                maxFields={validation.badgeFields.max}
              />

              {/* Add badge field selector */}
              {selectedBadgeField && (
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
                    size="sm"
                    variant="default"
                  >
                    Adicionar
                  </Button>
                  <Button
                    onClick={() => setSelectedBadgeField("")}
                    size="sm"
                    variant="outline"
                  >
                    Cancelar
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

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
