/**
 * Formula Engine for Custom Dashboard Calculations
 * Allows users to create custom metrics using expressions
 */

export interface FormulaContext {
  data: Record<string, number | string>[];
  aggregations: Record<string, number>;
}

export type FormulaFunction = 
  | 'SUM'
  | 'AVG'
  | 'MIN'
  | 'MAX'
  | 'COUNT'
  | 'COUNT_DISTINCT'
  | 'PERCENT'
  | 'IF'
  | 'DIVIDE'
  | 'MULTIPLY'
  | 'ADD'
  | 'SUBTRACT';

export interface FormulaExpression {
  type: 'function' | 'field' | 'constant' | 'operator';
  value: string | number;
  args?: FormulaExpression[];
}

/**
 * Parse a formula string into an expression tree
 * Examples:
 *   "SUM(valor_ficha)"
 *   "PERCENT(COUNT_DISTINCT(id), COUNT(*))"
 *   "DIVIDE(SUM(valor_ficha), COUNT(*))"
 *   "IF(COUNT(*) > 10, SUM(valor_ficha), 0)"
 */
export function parseFormula(formula: string): FormulaExpression {
  // Remove whitespace
  const clean = formula.trim();
  
  // Check if it's a function call
  const functionMatch = clean.match(/^([A-Z_]+)\((.*)\)$/);
  if (functionMatch) {
    const [, func, argsStr] = functionMatch;
    return {
      type: 'function',
      value: func,
      args: parseArguments(argsStr)
    };
  }
  
  // Check if it's a number
  const numMatch = clean.match(/^-?\d+(\.\d+)?$/);
  if (numMatch) {
    return {
      type: 'constant',
      value: parseFloat(clean)
    };
  }
  
  // Check for operators
  const operatorMatch = clean.match(/^(.+)\s*([\+\-\*\/])\s*(.+)$/);
  if (operatorMatch) {
    const [, left, op, right] = operatorMatch;
    const operatorMap: Record<string, string> = {
      '+': 'ADD',
      '-': 'SUBTRACT',
      '*': 'MULTIPLY',
      '/': 'DIVIDE'
    };
    return {
      type: 'operator',
      value: operatorMap[op],
      args: [parseFormula(left), parseFormula(right)]
    };
  }
  
  // Otherwise it's a field reference
  return {
    type: 'field',
    value: clean
  };
}

function parseArguments(argsStr: string): FormulaExpression[] {
  if (!argsStr.trim()) return [];
  
  const args: FormulaExpression[] = [];
  let current = '';
  let depth = 0;
  
  for (const char of argsStr) {
    if (char === '(' ) depth++;
    if (char === ')') depth--;
    
    if (char === ',' && depth === 0) {
      args.push(parseFormula(current));
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(parseFormula(current));
  }
  
  return args;
}

/**
 * Evaluate a formula expression against data
 */
export function evaluateFormula(
  expression: FormulaExpression,
  data: Record<string, number | string>[]
): number {
  switch (expression.type) {
    case 'constant':
      return Number(expression.value);
    
    case 'field':
      // For field references, we typically want to aggregate them
      // Default to SUM if used directly
      return data.reduce((sum, row) => {
        const val = row[String(expression.value)];
        return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
      }, 0);
    
    case 'function':
      return evaluateFunction(String(expression.value), expression.args || [], data);
    
    case 'operator':
      return evaluateFunction(String(expression.value), expression.args || [], data);
    
    default:
      return 0;
  }
}

function evaluateFunction(
  func: string,
  args: FormulaExpression[],
  data: Record<string, number | string>[]
): number {
  switch (func) {
    case 'SUM': {
      if (args.length === 0) return 0;
      const field = String(args[0].value);
      return data.reduce((sum, row) => {
        const val = row[field];
        return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
      }, 0);
    }
    
    case 'AVG': {
      if (args.length === 0) return 0;
      const field = String(args[0].value);
      const sum = data.reduce((sum, row) => {
        const val = row[field];
        return sum + (typeof val === 'number' ? val : parseFloat(String(val)) || 0);
      }, 0);
      return data.length > 0 ? sum / data.length : 0;
    }
    
    case 'MIN': {
      if (args.length === 0) return 0;
      const field = String(args[0].value);
      const values = data.map(row => {
        const val = row[field];
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      });
      return values.length > 0 ? Math.min(...values) : 0;
    }
    
    case 'MAX': {
      if (args.length === 0) return 0;
      const field = String(args[0].value);
      const values = data.map(row => {
        const val = row[field];
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      });
      return values.length > 0 ? Math.max(...values) : 0;
    }
    
    case 'COUNT': {
      if (args.length === 0 || String(args[0].value) === '*') {
        return data.length;
      }
      const field = String(args[0].value);
      return data.filter(row => row[field] != null && row[field] !== '').length;
    }
    
    case 'COUNT_DISTINCT': {
      if (args.length === 0) return 0;
      const field = String(args[0].value);
      const uniqueValues = new Set(data.map(row => row[field]));
      return uniqueValues.size;
    }
    
    case 'PERCENT': {
      if (args.length < 2) return 0;
      const numerator = evaluateFormula(args[0], data);
      const denominator = evaluateFormula(args[1], data);
      return denominator !== 0 ? (numerator / denominator) * 100 : 0;
    }
    
    case 'IF': {
      if (args.length < 3) return 0;
      // For simplicity, just return the true case for now
      // Full implementation would need condition parsing
      return evaluateFormula(args[1], data);
    }
    
    case 'DIVIDE': {
      if (args.length < 2) return 0;
      const numerator = evaluateFormula(args[0], data);
      const denominator = evaluateFormula(args[1], data);
      return denominator !== 0 ? numerator / denominator : 0;
    }
    
    case 'MULTIPLY': {
      if (args.length < 2) return 0;
      const val1 = evaluateFormula(args[0], data);
      const val2 = evaluateFormula(args[1], data);
      return val1 * val2;
    }
    
    case 'ADD': {
      if (args.length < 2) return 0;
      const val1 = evaluateFormula(args[0], data);
      const val2 = evaluateFormula(args[1], data);
      return val1 + val2;
    }
    
    case 'SUBTRACT': {
      if (args.length < 2) return 0;
      const val1 = evaluateFormula(args[0], data);
      const val2 = evaluateFormula(args[1], data);
      return val1 - val2;
    }
    
    default:
      return 0;
  }
}

/**
 * Validate a formula string
 */
export function validateFormula(formula: string): { valid: boolean; error?: string } {
  try {
    const expression = parseFormula(formula);
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Invalid formula'
    };
  }
}

/**
 * Get available formula functions with descriptions
 */
export function getFormuleFunctions(): Array<{
  name: string;
  description: string;
  example: string;
}> {
  return [
    {
      name: 'SUM',
      description: 'Soma todos os valores de um campo',
      example: 'SUM(valor_ficha)'
    },
    {
      name: 'AVG',
      description: 'Calcula a média dos valores',
      example: 'AVG(valor_ficha)'
    },
    {
      name: 'MIN',
      description: 'Retorna o valor mínimo',
      example: 'MIN(valor_ficha)'
    },
    {
      name: 'MAX',
      description: 'Retorna o valor máximo',
      example: 'MAX(valor_ficha)'
    },
    {
      name: 'COUNT',
      description: 'Conta o número de registros',
      example: 'COUNT(*)'
    },
    {
      name: 'COUNT_DISTINCT',
      description: 'Conta valores únicos',
      example: 'COUNT_DISTINCT(id)'
    },
    {
      name: 'PERCENT',
      description: 'Calcula percentual (numerador/denominador * 100)',
      example: 'PERCENT(COUNT_DISTINCT(id), COUNT(*))'
    },
    {
      name: 'DIVIDE',
      description: 'Divide dois valores',
      example: 'DIVIDE(SUM(valor_ficha), COUNT(*))'
    },
    {
      name: 'MULTIPLY',
      description: 'Multiplica dois valores',
      example: 'MULTIPLY(AVG(valor_ficha), 1.1)'
    },
    {
      name: 'ADD',
      description: 'Soma dois valores',
      example: 'ADD(SUM(valor_ficha), 100)'
    },
    {
      name: 'SUBTRACT',
      description: 'Subtrai dois valores',
      example: 'SUBTRACT(COUNT(*), COUNT_DISTINCT(id))'
    }
  ];
}

/**
 * Quick formula templates
 */
export const FORMULA_TEMPLATES = {
  'Taxa de Conversão %': 'PERCENT(COUNT_DISTINCT(id_convertido), COUNT_DISTINCT(id))',
  'Valor Médio': 'AVG(valor_ficha)',
  'Valor Total': 'SUM(valor_ficha)',
  'Ticket Médio': 'DIVIDE(SUM(valor_ficha), COUNT(*))',
  'Taxa de Crescimento %': 'PERCENT(SUBTRACT(COUNT(*), COUNT_mes_anterior), COUNT_mes_anterior)',
  'ROI %': 'PERCENT(SUBTRACT(SUM(receita), SUM(custo)), SUM(custo))'
};
