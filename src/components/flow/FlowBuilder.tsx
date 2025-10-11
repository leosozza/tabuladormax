import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Flow, FlowDefinition, FlowVisibility } from "@/types/flow";

const SAMPLE_DEFINITION = `{
  "nodes": [
    {
      "id": "step-tabular",
      "type": "tabular",
      "name": "Atualizar status",
      "params": {
        "field": "STATUS_ID",
        "value": "NOVO_STATUS",
        "actionLabel": "Atualização automática"
      }
    }
  ]
}`;

interface FlowBuilderProps {
  onSaved?: (flow: Flow) => void;
}

export function FlowBuilder({ onSaved }: FlowBuilderProps) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<FlowVisibility>("private");
  const [definition, setDefinition] = useState(SAMPLE_DEFINITION);
  const [saving, setSaving] = useState(false);

  const handleReset = () => {
    setName("");
    setVisibility("private");
    setDefinition(SAMPLE_DEFINITION);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error("Informe um nome para o fluxo");
      return;
    }

    let parsed: FlowDefinition;
    try {
      parsed = JSON.parse(definition);
      if (!Array.isArray((parsed as FlowDefinition).nodes)) {
        throw new Error("A definição precisa conter o array 'nodes'");
      }
    } catch (error) {
      toast.error("JSON inválido na definição do fluxo");
      console.error("Erro ao parsear definição de flow", error);
      return;
    }

    setSaving(true);
    const { data, error } = await supabase.functions.invoke<{ flow?: Flow }>("flows-api", {
      body: {
        name,
        definition: parsed,
        visibility,
      },
      headers: {
        "x-flow-path": "/create",
      },
      method: "POST",
    });

    setSaving(false);

    if (error) {
      console.error("Erro ao salvar flow", error);
      toast.error("Não foi possível salvar o fluxo");
      return;
    }

    if (data?.flow) {
      toast.success("Fluxo criado com sucesso");
      onSaved?.(data.flow);
      handleReset();
    } else {
      toast.error("Resposta inesperada ao criar fluxo");
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div>
        <h3 className="text-lg font-semibold">Criar novo fluxo</h3>
        <p className="text-sm text-muted-foreground">
          Descreva o fluxo em JSON. Cada nó é executado sequencialmente.
        </p>
      </div>

      <div className="grid gap-3">
        <div className="grid gap-1">
          <Label htmlFor="flow-name">Nome</Label>
          <Input
            id="flow-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Ex: Pós tabulação - enviar webhooks"
          />
        </div>

        <div className="grid gap-1">
          <Label>Visibilidade</Label>
          <Select value={visibility} onValueChange={(value: FlowVisibility) => setVisibility(value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-background">
              <SelectItem value="private">Privado</SelectItem>
              <SelectItem value="org">Equipe/Organização</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1">
          <Label>Definição (JSON)</Label>
          <Textarea
            value={definition}
            onChange={(event) => setDefinition(event.target.value)}
            rows={14}
            className="font-mono text-sm"
          />
        </div>
      </div>

      <div className="flex flex-wrap gap-2 justify-end">
        <Button variant="outline" onClick={handleReset} disabled={saving}>
          Limpar
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? "Salvando..." : "Salvar fluxo"}
        </Button>
      </div>
    </Card>
  );
}

export default FlowBuilder;
