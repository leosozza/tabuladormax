import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Send } from 'lucide-react';

interface TemplateSelectorProps {
  onSendTemplate: (params: {
    name: string;
    namespace: string;
    language: string;
    parameters?: Array<{ type: string; text: string }>;
  }) => Promise<boolean>;
  disabled?: boolean;
}

export const TemplateSelector = ({ onSendTemplate, disabled }: TemplateSelectorProps) => {
  const [templateName, setTemplateName] = useState('');
  const [namespace, setNamespace] = useState('');
  const [language, setLanguage] = useState('pt_BR');
  const [param1, setParam1] = useState('');
  const [param2, setParam2] = useState('');

  const handleSend = async () => {
    if (!templateName || !namespace) return;

    const parameters = [];
    if (param1) parameters.push({ type: 'text', text: param1 });
    if (param2) parameters.push({ type: 'text', text: param2 });

    const success = await onSendTemplate({
      name: templateName,
      namespace,
      language,
      parameters: parameters.length > 0 ? parameters : undefined,
    });

    if (success) {
      setTemplateName('');
      setParam1('');
      setParam2('');
    }
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/20">
      <h3 className="font-semibold text-sm">Enviar Template WhatsApp</h3>
      
      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label htmlFor="template">Nome do Template</Label>
          <Input
            id="template"
            placeholder="ex: saudacao_inicial"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="namespace">Namespace</Label>
          <Input
            id="namespace"
            placeholder="ex: sua_empresa_namespace"
            value={namespace}
            onChange={(e) => setNamespace(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="language">Idioma</Label>
          <Select value={language} onValueChange={setLanguage} disabled={disabled}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pt_BR">Português (BR)</SelectItem>
              <SelectItem value="en_US">English (US)</SelectItem>
              <SelectItem value="es_ES">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="param1">Parâmetro 1 (opcional)</Label>
          <Input
            id="param1"
            placeholder="ex: Nome do cliente"
            value={param1}
            onChange={(e) => setParam1(e.target.value)}
            disabled={disabled}
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="param2">Parâmetro 2 (opcional)</Label>
          <Input
            id="param2"
            placeholder="ex: Código da promoção"
            value={param2}
            onChange={(e) => setParam2(e.target.value)}
            disabled={disabled}
          />
        </div>

        <Button
          onClick={handleSend}
          disabled={disabled || !templateName || !namespace}
          className="w-full"
        >
          <Send className="w-4 h-4 mr-2" />
          Enviar Template
        </Button>
      </div>
    </div>
  );
};
