import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, action, plan } = await req.json();
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não está configurada');
    }
    
    if (!description) {
      throw new Error('Descrição do processo é obrigatória');
    }

    console.log(`Processing BPMN generation - Action: ${action}`);

    if (action === 'analyze') {
      // Step 1: Analyze the description and create a plan
      const analyzePrompt = `Você é um especialista em BPMN (Business Process Model and Notation). 
Analise a seguinte descrição de processo e extraia:
1. As etapas principais (tarefas)
2. Os pontos de decisão (gateways)
3. As conexões entre elementos

Descrição do processo:
${description}

Responda APENAS com JSON válido no seguinte formato:
{
  "steps": [
    { "id": "step_1", "name": "Nome da etapa", "type": "task" }
  ],
  "decisions": [
    { "id": "decision_1", "name": "Nome da decisão", "condition": "condição" }
  ],
  "connections": [
    { "from": "step_1", "to": "decision_1", "label": "opcional" }
  ],
  "preview": {
    "nodeCount": 5,
    "edgeCount": 4,
    "hasGateways": true
  }
}

Regras:
- Sempre inclua um evento de início (startEvent) e fim (endEvent)
- Use "task" para ações, "userTask" para ações manuais, "serviceTask" para automações
- Use "gateway" para decisões/ramificações
- Identifique palavras como "se", "quando", "caso" como decisões
- Mantenha os IDs únicos e descritivos`;

      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Você é um assistente que responde APENAS com JSON válido, sem markdown ou texto adicional.' },
            { role: 'user', content: analyzePrompt }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI API Error:', response.status, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns segundos.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        
        throw new Error(`Erro na API de IA: ${response.status}`);
      }

      const aiResponse = await response.json();
      const content = aiResponse.choices?.[0]?.message?.content;
      
      if (!content) {
        throw new Error('Resposta vazia da IA');
      }

      // Parse the JSON response
      let planData;
      try {
        // Clean the response - remove markdown code blocks if present
        const cleanedContent = content
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        planData = JSON.parse(cleanedContent);
      } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Erro ao processar resposta da IA');
      }

      return new Response(JSON.stringify({ plan: planData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    if (action === 'generate') {
      // Step 2: Generate actual ReactFlow nodes and edges from the plan
      if (!plan) {
        throw new Error('Plano é obrigatório para gerar o fluxo');
      }

      // Calculate positions using a simple layout algorithm
      const nodes: any[] = [];
      const edges: any[] = [];
      
      const startX = 250;
      const startY = 100;
      const nodeSpacingX = 200;
      const nodeSpacingY = 150;
      
      let currentX = startX;
      let currentY = startY;
      let nodeIdCounter = 0;
      
      // Map original IDs to new IDs
      const idMap: Record<string, string> = {};
      
      // Add start event
      const startId = `node_${nodeIdCounter++}`;
      idMap['start'] = startId;
      nodes.push({
        id: startId,
        type: 'startEvent',
        position: { x: currentX, y: currentY },
        data: { label: 'Início' },
      });
      
      currentY += nodeSpacingY;
      
      // Process steps and decisions
      const allElements = [
        ...plan.steps.map((s: any) => ({ ...s, elementType: 'step' })),
        ...plan.decisions.map((d: any) => ({ ...d, elementType: 'decision' })),
      ];
      
      // Sort by appearance in connections to maintain order
      const processedElements = new Set<string>();
      const orderedElements: any[] = [];
      
      // Start with elements connected from start
      const findConnectedFrom = (fromId: string) => {
        const connected = plan.connections
          .filter((c: any) => c.from === fromId || c.from === 'start')
          .map((c: any) => c.to);
        return connected;
      };
      
      // Simple ordering: process steps first, then decisions
      for (const step of plan.steps) {
        if (!processedElements.has(step.id)) {
          processedElements.add(step.id);
          orderedElements.push({ ...step, elementType: 'step' });
        }
      }
      
      for (const decision of plan.decisions) {
        if (!processedElements.has(decision.id)) {
          processedElements.add(decision.id);
          orderedElements.push({ ...decision, elementType: 'decision' });
        }
      }
      
      // Create nodes
      let row = 0;
      let col = 0;
      const maxCols = 3;
      
      for (const element of orderedElements) {
        const newId = `node_${nodeIdCounter++}`;
        idMap[element.id] = newId;
        
        let type = 'task';
        if (element.elementType === 'decision') {
          type = 'gateway';
        } else if (element.type === 'userTask') {
          type = 'userTask';
        } else if (element.type === 'serviceTask') {
          type = 'serviceTask';
        }
        
        const xPos = startX + (col * nodeSpacingX);
        const yPos = currentY;
        
        nodes.push({
          id: newId,
          type,
          position: { x: xPos, y: yPos },
          data: { 
            label: element.name,
            color: element.elementType === 'decision' ? 'yellow' : 'blue'
          },
        });
        
        col++;
        if (col >= maxCols) {
          col = 0;
          currentY += nodeSpacingY;
        }
      }
      
      // Reset for end event
      if (col !== 0) {
        currentY += nodeSpacingY;
      }
      
      // Add end event
      const endId = `node_${nodeIdCounter++}`;
      idMap['end'] = endId;
      nodes.push({
        id: endId,
        type: 'endEvent',
        position: { x: startX, y: currentY },
        data: { label: 'Fim' },
      });
      
      // Create edges from connections
      let edgeIdCounter = 0;
      
      // Connect start to first element
      if (orderedElements.length > 0) {
        edges.push({
          id: `edge_${edgeIdCounter++}`,
          source: startId,
          target: idMap[orderedElements[0].id],
          type: 'smart',
          data: { routingMode: 'orthogonal', waypoints: [] },
        });
      }
      
      // Process defined connections
      for (const conn of plan.connections) {
        const sourceId = idMap[conn.from] || idMap['start'];
        const targetId = idMap[conn.to] || idMap['end'];
        
        if (sourceId && targetId) {
          edges.push({
            id: `edge_${edgeIdCounter++}`,
            source: sourceId,
            target: targetId,
            type: 'smart',
            data: { 
              routingMode: 'orthogonal', 
              waypoints: [],
              label: conn.label || undefined
            },
          });
        }
      }
      
      // Connect last element to end if not already connected
      const lastElement = orderedElements[orderedElements.length - 1];
      if (lastElement) {
        const hasEndConnection = plan.connections.some(
          (c: any) => c.from === lastElement.id && c.to === 'end'
        );
        if (!hasEndConnection) {
          edges.push({
            id: `edge_${edgeIdCounter++}`,
            source: idMap[lastElement.id],
            target: endId,
            type: 'smart',
            data: { routingMode: 'orthogonal', waypoints: [] },
          });
        }
      }

      console.log(`Generated ${nodes.length} nodes and ${edges.length} edges`);

      return new Response(JSON.stringify({ nodes, edges }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Ação inválida');

  } catch (error: any) {
    console.error('Error in generate-bpmn-flow:', error);
    return new Response(JSON.stringify({ error: error.message || 'Erro interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
