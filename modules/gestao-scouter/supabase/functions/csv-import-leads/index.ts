import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ImportStats {
  total: number
  inserted: number
  updated: number
  failed: number
  errors: string[]
}

// Common CSV field name variations and their mappings
const FIELD_MAPPINGS: Record<string, string[]> = {
  'nome': ['nome', 'name', 'Nome', 'Name'],
  'idade': ['idade', 'age', 'Idade', 'Age'],
  'scouter': ['scouter', 'Scouter', 'scout'],
  'projeto': ['projeto', 'projetos', 'Projeto', 'Projetos', 'project'],
  'criado': ['criado', 'data', 'created', 'Data'],
  'telefone': ['telefone', 'phone', 'celular', 'Telefone'],
  'email': ['email', 'Email', 'e-mail', 'E-mail'],
  'local_da_abordagem': ['local_da_abordagem', 'local', 'Local', 'local da abordagem'],
  'etapa': ['etapa', 'Etapa', 'stage'],
}

function normalizeFieldName(field: string): string {
  const trimmed = field.trim()
  
  for (const [normalized, variations] of Object.entries(FIELD_MAPPINGS)) {
    if (variations.some(v => v.toLowerCase() === trimmed.toLowerCase())) {
      return normalized
    }
  }
  
  return trimmed.toLowerCase().replace(/\s+/g, '_')
}

function parseCSVLine(line: string, separator: string = ','): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    
    if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === separator && !inQuotes) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }
  
  result.push(current.trim())
  return result
}

function detectSeparator(firstLine: string): string {
  const separators = [',', ';', '\t', '|']
  let maxCount = 0
  let detectedSep = ','
  
  for (const sep of separators) {
    const count = firstLine.split(sep).length
    if (count > maxCount) {
      maxCount = count
      detectedSep = sep
    }
  }
  
  console.log(`🔍 Separador detectado: "${detectedSep}" (${maxCount} colunas)`)
  return detectedSep
}

/**
 * Parse date from multiple formats
 * Supports: ISO (2024-01-15), DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, timestamps
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr || dateStr.trim() === '') return null;
  
  const trimmed = dateStr.trim();
  
  // Try ISO format first
  const isoDate = new Date(trimmed);
  if (!isNaN(isoDate.getTime())) {
    return isoDate.toISOString();
  }
  
  // Try DD/MM/YYYY or DD-MM-YYYY
  const ddmmyyyyMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyyMatch) {
    const [, day, month, year] = ddmmyyyyMatch;
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(date.getTime())) {
      return date.toISOString();
    }
  }
  
  // Try timestamp (milliseconds)
  if (/^\d+$/.test(trimmed)) {
    const timestamp = parseInt(trimmed);
    if (timestamp > 0) {
      const date = new Date(timestamp);
      if (!isNaN(date.getTime())) {
        return date.toISOString();
      }
    }
  }
  
  console.warn(`⚠️ Não foi possível parsear data: "${dateStr}"`);
  return null;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🚀 [CSV Import] Iniciando importação...')

    // Get Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_PUBLISHABLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const formData = await req.formData()
    const file = formData.get('file') as File
    const targetTable = formData.get('table') as string || 'leads'

    if (!file) {
      throw new Error('Nenhum arquivo enviado')
    }

    console.log(`📁 Arquivo: ${file.name} (${file.size} bytes)`)
    console.log(`📊 Tabela destino: ${targetTable}`)

    // Read file content with UTF-8 encoding
    const csvText = await file.text()
    
    // Handle different encodings (convert from common encodings to UTF-8)
    let decodedText = csvText
    
    // Check for BOM (Byte Order Mark)
    if (csvText.charCodeAt(0) === 0xFEFF) {
      decodedText = csvText.slice(1)
      console.log('✂️ BOM removido')
    }

    // Split into lines
    const lines = decodedText.split(/\r?\n/).filter(line => line.trim().length > 0)
    
    if (lines.length < 2) {
      throw new Error('Arquivo deve ter pelo menos cabeçalho e uma linha de dados')
    }

    console.log(`📝 Total de linhas: ${lines.length}`)

    // Detect separator
    const separator = detectSeparator(lines[0])
    
    // Parse header
    const headerLine = lines[0]
    const rawHeaders = parseCSVLine(headerLine, separator)
    const headers = rawHeaders.map(normalizeFieldName)
    
    console.log(`📋 Cabeçalhos detectados (${headers.length}):`, headers.slice(0, 10))

    // Validate required fields
    const requiredFields = ['nome', 'scouter']
    const missingFields = requiredFields.filter(field => !headers.includes(field))
    
    if (missingFields.length > 0) {
      console.warn(`⚠️ Campos obrigatórios ausentes: ${missingFields.join(', ')}`)
      console.warn(`📋 Cabeçalhos disponíveis: ${headers.join(', ')}`)
    }

    // Process rows
    const stats: ImportStats = {
      total: lines.length - 1, // exclude header
      inserted: 0,
      updated: 0,
      failed: 0,
      errors: []
    }

    for (let i = 1; i < lines.length; i++) {
      try {
        const values = parseCSVLine(lines[i], separator)
        
        // Skip empty rows
        if (values.every(v => !v || v.trim() === '')) {
          continue
        }

        // Build row object
        const row: Record<string, any> = {}
        headers.forEach((header, index) => {
          const value = values[index]?.trim() || ''
          row[header] = value
        })

        // Generate ID if not present
        const id = row.id || `csv_${Date.now()}_${i}`
        
        // Prepare data for insertion into leads table
        const leadData = {
          id,
          scouter: row.scouter || null,
          projeto: row.projeto || row.project || null,
          criado: parseDate(row.criado),
          valor_ficha: row.valor_ficha ? parseFloat(row.valor_ficha.replace(',', '.')) : null,
          deleted: false,
          nome: row.nome || null,
          name: row.nome || null,
          age: row.idade ? parseInt(row.idade) : null,
          telefone: row.telefone || null,
          email: row.email || null,
          etapa: row.etapa || null,
          local_abordagem: row.local_da_abordagem || null,
          raw: row,
        }

        // Validate required data
        if (!leadData.scouter && !leadData.nome) {
          stats.failed++
          stats.errors.push(`Linha ${i + 1}: Dados insuficientes (nome ou scouter ausentes)`)
          continue
        }

        // Insert/Update
        const { error: upsertError } = await supabase
          .from(targetTable)
          .upsert(leadData, {
            onConflict: 'id',
            ignoreDuplicates: false
          })

        if (upsertError) {
          console.error(`❌ Erro na linha ${i + 1}:`, upsertError)
          stats.failed++
          stats.errors.push(`Linha ${i + 1}: ${upsertError.message}`)
        } else {
          stats.updated++
        }

      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.error(`❌ Exceção na linha ${i + 1}:`, error)
        stats.failed++
        stats.errors.push(`Linha ${i + 1}: ${error.message}`)
      }
    }

    stats.inserted = stats.updated // For CSV import, we consider all as updates/inserts

    console.log(`✅ [CSV Import] Importação concluída:`, stats)

    // Save import log
    await supabase.from('sync_logs').insert({
      endpoint: 'csv-import-leads',
      table_name: targetTable,
      status: stats.failed === 0 ? 'success' : 'error',
      records_count: stats.total,
      response_data: stats,
      execution_time_ms: 0,
    })

    return new Response(
      JSON.stringify({
        success: true,
        stats,
        message: `Importados ${stats.updated} registros de ${stats.total} com ${stats.failed} falhas`,
        errors: stats.errors.slice(0, 10) // Return first 10 errors
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err))
    console.error('❌ [CSV Import] Erro fatal:', error)
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.stack
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
