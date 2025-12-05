export type FeatureStatus = 'active' | 'beta' | 'in-progress' | 'planned' | 'archived';

export type FeatureModule = 
  | 'telemarketing' 
  | 'gestao-scouter' 
  | 'admin' 
  | 'agenciamento' 
  | 'discador' 
  | 'integracoes'
  | 'geral';

export interface RoadmapFeature {
  id: string;
  name: string;
  description: string;
  status: FeatureStatus;
  module: FeatureModule;
  icon: string;
  progress?: number; // 0-100 for in-progress items
  launchDate?: string;
  tags?: string[];
}

export const statusConfig: Record<FeatureStatus, { label: string; color: string; bgColor: string }> = {
  active: { label: 'Ativo', color: 'text-green-700 dark:text-green-400', bgColor: 'bg-green-100 dark:bg-green-900/30' },
  beta: { label: 'Beta', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30' },
  'in-progress': { label: 'Em Desenvolvimento', color: 'text-yellow-700 dark:text-yellow-400', bgColor: 'bg-yellow-100 dark:bg-yellow-900/30' },
  planned: { label: 'Planejado', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30' },
  archived: { label: 'Arquivado', color: 'text-gray-500', bgColor: 'bg-gray-100 dark:bg-gray-800' },
};

export const moduleConfig: Record<FeatureModule, { label: string; color: string }> = {
  telemarketing: { label: 'Telemarketing', color: 'bg-orange-500' },
  'gestao-scouter': { label: 'Gestão Scouter', color: 'bg-emerald-500' },
  admin: { label: 'Administração', color: 'bg-red-500' },
  agenciamento: { label: 'Agenciamento', color: 'bg-indigo-500' },
  discador: { label: 'Discador', color: 'bg-cyan-500' },
  integracoes: { label: 'Integrações', color: 'bg-pink-500' },
  geral: { label: 'Geral', color: 'bg-gray-500' },
};
