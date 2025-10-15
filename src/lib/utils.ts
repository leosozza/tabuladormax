import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Valida se uma string é um UUID válido
 * Aceita UUIDs em formato geral (case-insensitive)
 * Exemplo: '550e8400-e29b-41d4-a716-446655440000'
 */
export function isValidUUID(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

/**
 * Gera SQL pronto para corrigir responsáveis inválidos nos leads
 * @param invalidResponsibles - Array de valores inválidos (não-UUID) encontrados
 * @returns String com SQL comentado e pronto para uso
 */
export function generateFixResponsibleSQL(invalidResponsibles: string[]): string {
  if (invalidResponsibles.length === 0) {
    return '-- Nenhum responsável inválido encontrado';
  }

  const sql = `-- ====================================================================
-- SQL para corrigir responsáveis inválidos nos leads
-- ====================================================================

-- Passo 1: Identificar todos os leads com responsáveis inválidos
SELECT id, name, responsible 
FROM leads 
WHERE responsible IS NOT NULL 
  AND responsible !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
ORDER BY responsible;

-- Passo 2: Ver lista de usuários disponíveis para mapeamento
SELECT id, display_name, email
FROM profiles
ORDER BY display_name;

-- Passo 3: Atualizar leads com UUIDs corretos
-- IMPORTANTE: Substitua os UUIDs de exemplo pelos IDs reais da tabela profiles
${invalidResponsibles.map((responsible, index) => 
  `-- UPDATE leads SET responsible = 'UUID_DO_USUARIO_CORRETO' WHERE responsible = '${responsible.replace(/'/g, "''")}';`
).join('\n')}

-- Passo 4: Para responsáveis que não podem ser mapeados, defina como NULL
-- UPDATE leads SET responsible = NULL WHERE responsible !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Passo 5: Verificar que não há mais responsáveis inválidos
SELECT COUNT(*) as leads_invalidos
FROM leads 
WHERE responsible IS NOT NULL 
  AND responsible !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
-- Deve retornar 0`;

  return sql;
}
