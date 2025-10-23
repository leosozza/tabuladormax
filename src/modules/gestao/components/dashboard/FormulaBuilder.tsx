/**
 * Formula Builder Component
 * Visual editor for creating custom dashboard formulas
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Code, Lightbulb } from 'lucide-react';
import { validateFormula, getFormuleFunctions, FORMULA_TEMPLATES } from '@/utils/formulaEngine';
import type { CustomFormula } from '@/types/dashboard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface FormulaBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (formula: CustomFormula) => void;
  initialFormula?: CustomFormula;
  availableFields?: string[];
}

export function FormulaBuilder({
  open,
  onOpenChange,
  onSave,
  initialFormula,
  availableFields = []
}: FormulaBuilderProps) {
  const [name, setName] = useState(initialFormula?.name || '');
  const [expression, setExpression] = useState(initialFormula?.expression || '');
  const [description, setDescription] = useState(initialFormula?.description || '');
  const [validation, setValidation] = useState<{ valid: boolean; error?: string }>({ valid: true });

  const functions = getFormuleFunctions();

  const handleExpressionChange = (value: string) => {
    setExpression(value);
    const result = validateFormula(value);
    setValidation(result);
  };

  const handleInsertFunction = (funcName: string) => {
    // Insert function at cursor position or at end
    const newExpression = expression ? `${expression} ${funcName}()` : `${funcName}()`;
    setExpression(newExpression);
    handleExpressionChange(newExpression);
  };

  const handleInsertField = (field: string) => {
    const newExpression = expression ? `${expression} ${field}` : field;
    setExpression(newExpression);
    handleExpressionChange(newExpression);
  };

  const handleLoadTemplate = (template: string) => {
    setExpression(template);
    handleExpressionChange(template);
  };

  const handleSave = () => {
    if (!validation.valid) return;
    
    const formula: CustomFormula = {
      id: initialFormula?.id || `formula-${Date.now()}`,
      name: name || 'Nova Fórmula',
      expression,
      description
    };
    
    onSave(formula);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {initialFormula ? 'Editar Fórmula' : 'Nova Fórmula Personalizada'}
          </DialogTitle>
          <DialogDescription>
            Crie fórmulas personalizadas para calcular métricas customizadas
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {/* Left: Formula Editor */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="formula-name">Nome da Fórmula</Label>
              <Input
                id="formula-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Taxa de Conversão"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="formula-expression">Expressão</Label>
              <Textarea
                id="formula-expression"
                value={expression}
                onChange={(e) => handleExpressionChange(e.target.value)}
                placeholder="Ex: PERCENT(COUNT_DISTINCT(id), COUNT(*))"
                rows={4}
                className="font-mono text-sm"
              />
              {validation.valid ? (
                <Alert>
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-600">
                    Fórmula válida
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {validation.error || 'Fórmula inválida'}
                  </AlertDescription>
                </Alert>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="formula-description">Descrição (opcional)</Label>
              <Textarea
                id="formula-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva o que esta fórmula calcula..."
                rows={2}
              />
            </div>

            {/* Templates */}
            <div className="space-y-2">
              <Label>Templates Rápidos</Label>
              <Select onValueChange={handleLoadTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar template..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(FORMULA_TEMPLATES).map(([name, formula]) => (
                    <SelectItem key={name} value={formula}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Right: Reference */}
          <div className="space-y-4">
            <ScrollArea className="h-[500px] pr-4">
              {/* Functions */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Funções Disponíveis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {functions.map(func => (
                    <div key={func.name} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge
                          variant="outline"
                          className="cursor-pointer hover:bg-primary/10"
                          onClick={() => handleInsertFunction(func.name)}
                        >
                          {func.name}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {func.description}
                      </p>
                      <code className="text-xs bg-muted px-2 py-1 rounded block">
                        {func.example}
                      </code>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Separator className="my-4" />

              {/* Available Fields */}
              {availableFields.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Campos Disponíveis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {availableFields.map(field => (
                        <Badge
                          key={field}
                          variant="secondary"
                          className="cursor-pointer hover:bg-secondary/80"
                          onClick={() => handleInsertField(field)}
                        >
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Separator className="my-4" />

              {/* Tips */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Dicas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-xs text-muted-foreground">
                  <p>• Use COUNT(*) para contar todos os registros</p>
                  <p>• Combine funções: PERCENT(SUM(a), SUM(b))</p>
                  <p>• Operadores matemáticos: +, -, *, /</p>
                  <p>• Campos devem corresponder aos nomes das colunas dos dados</p>
                  <p>• Fórmulas são case-sensitive para campos</p>
                </CardContent>
              </Card>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={!validation.valid || !name}>
            {initialFormula ? 'Atualizar' : 'Criar'} Fórmula
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
