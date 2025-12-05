-- Create roadmap_features table
CREATE TABLE public.roadmap_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('active', 'beta', 'in-progress', 'planned', 'archived')),
  module TEXT NOT NULL CHECK (module IN ('telemarketing', 'gestao-scouter', 'admin', 'agenciamento', 'discador', 'integracoes', 'geral')),
  icon TEXT NOT NULL DEFAULT 'Circle',
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  launch_date DATE,
  tags TEXT[] DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.roadmap_features ENABLE ROW LEVEL SECURITY;

-- Everyone can view roadmap features
CREATE POLICY "Anyone can view roadmap features"
ON public.roadmap_features
FOR SELECT
USING (true);

-- Only admins and managers can insert
CREATE POLICY "Admins and managers can insert roadmap features"
ON public.roadmap_features
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Only admins and managers can update
CREATE POLICY "Admins and managers can update roadmap features"
ON public.roadmap_features
FOR UPDATE
USING (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'manager'));

-- Only admins can delete
CREATE POLICY "Admins can delete roadmap features"
ON public.roadmap_features
FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Create index for status filtering
CREATE INDEX idx_roadmap_features_status ON public.roadmap_features(status);
CREATE INDEX idx_roadmap_features_module ON public.roadmap_features(module);

-- Trigger for updated_at
CREATE TRIGGER update_roadmap_features_updated_at
  BEFORE UPDATE ON public.roadmap_features
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert existing features data
INSERT INTO public.roadmap_features (name, description, status, module, icon, progress, tags) VALUES
-- Telemarketing
('Dashboard Telemarketing', 'Painel principal com métricas de leads, filtros avançados e visualização de dados', 'active', 'telemarketing', 'LayoutDashboard', 100, ARRAY['dashboard', 'filtros', 'métricas']),
('Tabulação de Leads', 'Sistema de tabulação com botões configuráveis e sincronização com Bitrix24', 'active', 'telemarketing', 'MousePointerClick', 100, ARRAY['tabulação', 'botões', 'bitrix']),
('Análise Modo Tinder', 'Interface de análise de leads com sistema de swipe para aprovação/rejeição rápida', 'active', 'telemarketing', 'Sparkles', 100, ARRAY['análise', 'swipe', 'fotos']),
('Exportação PDF/CSV', 'Geração de relatórios em PDF e exportação de dados em CSV', 'active', 'telemarketing', 'FileDown', 100, ARRAY['exportação', 'pdf', 'csv', 'relatórios']),
('Ficha de Cadastro', 'Visualização completa dos dados do lead com histórico', 'active', 'telemarketing', 'FileText', 100, ARRAY['cadastro', 'ficha', 'detalhes']),
('Histórico de Ligações', 'Registro e playback de gravações de chamadas por lead', 'active', 'telemarketing', 'Phone', 100, ARRAY['ligações', 'gravações', 'histórico']),
('Tabela Configurável', 'Tabela com colunas personalizáveis e ordenação dinâmica', 'active', 'telemarketing', 'Table', 100, ARRAY['tabela', 'colunas', 'ordenação']),

-- Gestão Scouter
('Dashboard Scouters', 'Painel de gestão com métricas de performance por scouter', 'active', 'gestao-scouter', 'Users', 100, ARRAY['dashboard', 'scouters', 'performance']),
('Mapa Interativo', 'Mapa com localização de leads e scouters em tempo real', 'active', 'gestao-scouter', 'Map', 100, ARRAY['mapa', 'localização', 'realtime']),
('Área de Abordagem', 'Definição de áreas geográficas para atuação dos scouters', 'active', 'gestao-scouter', 'MapPin', 100, ARRAY['área', 'abordagem', 'território']),
('Desenho de Polígonos', 'Ferramenta para desenhar regiões no mapa', 'active', 'gestao-scouter', 'Pentagon', 100, ARRAY['polígonos', 'desenho', 'mapa']),
('Mapa de Calor', 'Visualização de densidade de leads por região', 'active', 'gestao-scouter', 'Flame', 100, ARRAY['heatmap', 'densidade', 'visualização']),
('Projeções Financeiras', 'Cálculo de projeções baseado em dados históricos', 'active', 'gestao-scouter', 'TrendingUp', 100, ARRAY['projeções', 'financeiro', 'previsão']),
('Controle de Pagamentos', 'Gestão de pagamentos e comissões dos scouters', 'active', 'gestao-scouter', 'DollarSign', 100, ARRAY['pagamentos', 'comissões', 'financeiro']),
('Timesheet Scouters', 'Registro de horas trabalhadas e produtividade', 'active', 'gestao-scouter', 'Clock', 100, ARRAY['timesheet', 'horas', 'produtividade']),
('Relatórios de Performance', 'Relatórios detalhados por scouter e período', 'active', 'gestao-scouter', 'BarChart3', 100, ARRAY['relatórios', 'performance', 'análise']),

-- Admin
('Gerenciamento de Usuários', 'CRUD completo de usuários com atribuição de roles', 'active', 'admin', 'Users', 100, ARRAY['usuários', 'crud', 'roles']),
('Sistema de Permissões', 'Controle granular de acesso por role e departamento', 'active', 'admin', 'Shield', 100, ARRAY['permissões', 'acesso', 'segurança']),
('Gerenciamento de Rotas', 'Configuração de permissões por rota da aplicação', 'active', 'admin', 'Route', 100, ARRAY['rotas', 'permissões', 'navegação']),
('Diagnóstico do Sistema', 'Verificação de integridade e status dos serviços', 'active', 'admin', 'Stethoscope', 100, ARRAY['diagnóstico', 'saúde', 'monitoramento']),
('Monitor de Sincronização', 'Acompanhamento em tempo real das sincronizações', 'active', 'admin', 'RefreshCw', 100, ARRAY['sync', 'monitoramento', 'bitrix']),
('Mapeamento de Campos', 'Configuração de mapeamento entre sistemas', 'active', 'admin', 'GitCompare', 100, ARRAY['mapeamento', 'campos', 'integração']),
('Ressincronização de Leads', 'Ferramenta para ressinc em massa com filtros', 'active', 'admin', 'RotateCcw', 100, ARRAY['ressync', 'leads', 'batch']),
('Importação CSV', 'Upload e processamento de arquivos CSV', 'active', 'admin', 'Upload', 100, ARRAY['importação', 'csv', 'upload']),
('Importação Bitrix', 'Importação em massa de leads do Bitrix24', 'active', 'admin', 'Download', 100, ARRAY['importação', 'bitrix', 'leads']),
('Configuração de Botões', 'Editor visual de botões de tabulação', 'active', 'admin', 'Settings', 100, ARRAY['botões', 'configuração', 'tabulação']),
('AI Training', 'Configuração de instruções para assistente IA', 'active', 'admin', 'Brain', 100, ARRAY['ia', 'treinamento', 'assistente']),
('Logs de Sincronização', 'Histórico detalhado de operações de sync', 'active', 'admin', 'ScrollText', 100, ARRAY['logs', 'sync', 'histórico']),
('Gerenciador de Releases', 'Controle de versões do app mobile', 'active', 'admin', 'Package', 100, ARRAY['releases', 'versões', 'mobile']),

-- Agenciamento
('CRUD de Negociações', 'Gestão completa de contratos e negociações', 'active', 'agenciamento', 'Briefcase', 100, ARRAY['negociações', 'contratos', 'crud']),
('Cálculos Financeiros', 'Simulação de valores e comissões', 'active', 'agenciamento', 'Calculator', 100, ARRAY['cálculos', 'financeiro', 'simulação']),
('Workflow de Aprovação', 'Fluxo de aprovação multinível', 'active', 'agenciamento', 'GitBranch', 100, ARRAY['workflow', 'aprovação', 'fluxo']),
('Histórico de Auditoria', 'Registro de todas as alterações em negociações', 'active', 'agenciamento', 'History', 100, ARRAY['auditoria', 'histórico', 'alterações']),
('Exportação de Contratos PDF', 'Geração automática de contratos em PDF', 'planned', 'agenciamento', 'FileText', 0, ARRAY['pdf', 'contratos', 'exportação']),
('Notificações por Email', 'Alertas automáticos de status de negociações', 'planned', 'agenciamento', 'Mail', 0, ARRAY['email', 'notificações', 'alertas']),

-- Discador
('Integração Syscall', 'Conexão com discador automático Syscall', 'active', 'discador', 'PhoneCall', 100, ARRAY['syscall', 'discador', 'integração']),
('Gestão de Campanhas', 'Criação e monitoramento de campanhas de ligação', 'active', 'discador', 'Megaphone', 100, ARRAY['campanhas', 'ligações', 'gestão']),
('Envio de Leads', 'Exportação de leads para campanhas do discador', 'active', 'discador', 'Send', 100, ARRAY['envio', 'leads', 'campanhas']),
('Métricas de Ligações', 'Dashboard com estatísticas de chamadas', 'active', 'discador', 'BarChart', 100, ARRAY['métricas', 'ligações', 'estatísticas']),
('Gravação de Chamadas', 'Armazenamento e playback de gravações', 'active', 'discador', 'Mic', 100, ARRAY['gravações', 'chamadas', 'áudio']),

-- Integrações
('Sincronização Bitrix24', 'Integração bidirecional com CRM Bitrix24', 'active', 'integracoes', 'RefreshCcw', 100, ARRAY['bitrix', 'crm', 'sync']),
('WhatsApp Chatwoot', 'Integração com Chatwoot para atendimento', 'active', 'integracoes', 'MessageCircle', 100, ARRAY['whatsapp', 'chatwoot', 'atendimento']),
('Templates Gupshup', 'Gerenciamento de templates de mensagem', 'active', 'integracoes', 'MessageSquare', 100, ARRAY['gupshup', 'templates', 'whatsapp']),
('Flows v2 Automações', 'Sistema de automações visuais', 'beta', 'integracoes', 'Workflow', 80, ARRAY['automação', 'flows', 'visual']),
('Geocodificação', 'Conversão de endereços em coordenadas', 'active', 'integracoes', 'MapPin', 100, ARRAY['geocoding', 'endereços', 'coordenadas']),
('Webhook Bitrix', 'Recebimento de eventos do Bitrix em tempo real', 'active', 'integracoes', 'Webhook', 100, ARRAY['webhook', 'bitrix', 'eventos']),
('Integração Slack/Discord', 'Notificações em canais de comunicação', 'planned', 'integracoes', 'Bell', 0, ARRAY['slack', 'discord', 'notificações']),

-- Geral
('Tema Dark/Light', 'Alternância entre modos claro e escuro', 'active', 'geral', 'Sun', 100, ARRAY['tema', 'dark', 'light']),
('PWA Mobile', 'App instalável com suporte offline', 'active', 'geral', 'Smartphone', 100, ARRAY['pwa', 'mobile', 'offline']),
('Sistema de Toasts', 'Notificações visuais de feedback', 'active', 'geral', 'Bell', 100, ARRAY['toasts', 'notificações', 'feedback']),
('Breadcrumbs', 'Navegação contextual por breadcrumbs', 'active', 'geral', 'ChevronRight', 100, ARRAY['breadcrumbs', 'navegação', 'contexto']),
('Multi-idioma', 'Suporte a múltiplos idiomas', 'planned', 'geral', 'Globe', 0, ARRAY['i18n', 'idiomas', 'tradução']),

-- Em desenvolvimento
('Melhorias Ressincronização', 'Otimização do processo de ressync em lotes', 'in-progress', 'admin', 'Zap', 60, ARRAY['ressync', 'performance', 'otimização']),
('Monitor de Jobs', 'Dashboard para acompanhamento de jobs assíncronos', 'in-progress', 'admin', 'Activity', 40, ARRAY['jobs', 'monitoramento', 'async']),
('Correção de Nomes Scouters', 'Resolução automática de IDs para nomes', 'in-progress', 'gestao-scouter', 'UserCheck', 80, ARRAY['scouters', 'nomes', 'correção']);