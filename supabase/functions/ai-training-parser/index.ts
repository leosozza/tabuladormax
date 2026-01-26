import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Remove null bytes and other problematic characters from text
function sanitizeText(text: string): string {
  // Remove null bytes
  let sanitized = text.replace(/\x00/g, '');
  // Remove other control characters except newlines and tabs
  sanitized = sanitized.replace(/[\x01-\x08\x0B\x0C\x0E-\x1F]/g, '');
  // Normalize whitespace
  sanitized = sanitized.replace(/\r\n/g, '\n');
  // Remove excessive whitespace
  sanitized = sanitized.replace(/\n{3,}/g, '\n\n');
  return sanitized.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { filePath, fileName } = await req.json();

    if (!filePath) {
      throw new Error('File path is required');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('ai-training-docs')
      .download(filePath);

    if (downloadError) {
      throw new Error(`Failed to download file: ${downloadError.message}`);
    }

    // Parse based on file type
    let content = '';
    const fileExt = fileName.split('.').pop()?.toLowerCase();

    if (fileExt === 'txt') {
      // Simple text file
      const rawText = await fileData.text();
      content = sanitizeText(rawText);
    } else if (fileExt === 'pdf') {
      // For PDFs, we need to handle binary content
      // Try to extract text, but handle binary content gracefully
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        // Try to decode as UTF-8, replacing invalid sequences
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let rawText = decoder.decode(uint8Array);
        
        // Extract text between stream/endstream (basic PDF text extraction)
        const textMatches = rawText.match(/(?:stream[\r\n]+)([\s\S]*?)(?:[\r\n]+endstream)/g);
        if (textMatches && textMatches.length > 0) {
          // Try to extract readable text from streams
          const extractedText = textMatches
            .map(match => match.replace(/stream[\r\n]+/, '').replace(/[\r\n]+endstream/, ''))
            .join('\n')
            .replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, ' ') // Keep printable chars
            .replace(/\s+/g, ' ')
            .trim();
          
          if (extractedText.length > 50) {
            content = sanitizeText(extractedText);
          }
        }
        
        // If no text found, try extracting from /Contents or text blocks
        if (!content || content.length < 50) {
          // Look for BT...ET text blocks
          const btMatches = rawText.match(/BT[\s\S]*?ET/g);
          if (btMatches && btMatches.length > 0) {
            const btText = btMatches
              .map(match => {
                // Extract text from Tj and TJ operators
                const tjMatches = match.match(/\(([^)]*)\)\s*Tj/g);
                if (tjMatches) {
                  return tjMatches.map(tj => tj.replace(/\(|\)\s*Tj/g, '')).join(' ');
                }
                return '';
              })
              .filter(t => t.length > 0)
              .join(' ');
            
            if (btText.length > 50) {
              content = sanitizeText(btText);
            }
          }
        }

        // If still no content, provide a fallback message
        if (!content || content.length < 50) {
          content = `[Conteúdo extraído do PDF: ${fileName}]\n\n` +
            'O arquivo PDF foi carregado, mas a extração automática de texto não foi possível. ' +
            'Por favor, copie e cole o conteúdo do PDF manualmente ou use um arquivo TXT.';
        }
      } catch (err) {
        console.error('PDF parsing error:', err);
        content = `[Erro ao processar PDF: ${fileName}]\n\n` +
          'Não foi possível extrair o texto deste PDF. ' +
          'Por favor, tente converter para TXT ou copie o conteúdo manualmente.';
      }
    } else if (fileExt === 'docx') {
      // For DOCX, extract text content
      try {
        const arrayBuffer = await fileData.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        const decoder = new TextDecoder('utf-8', { fatal: false });
        let rawText = decoder.decode(uint8Array);
        
        // DOCX is a ZIP file with XML content - look for text in document.xml
        const textMatches = rawText.match(/<w:t[^>]*>([^<]+)<\/w:t>/g);
        if (textMatches && textMatches.length > 0) {
          content = textMatches
            .map(match => match.replace(/<[^>]+>/g, ''))
            .join(' ');
          content = sanitizeText(content);
        }
        
        if (!content || content.length < 20) {
          content = `[Conteúdo extraído do DOCX: ${fileName}]\n\n` +
            'O arquivo foi carregado, mas a extração automática não foi possível. ' +
            'Por favor, salve como TXT e faça upload novamente.';
        }
      } catch (err) {
        console.error('DOCX parsing error:', err);
        content = `[Erro ao processar DOCX: ${fileName}]\n\n` +
          'Não foi possível extrair o texto. Por favor, salve como TXT.';
      }
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    // Final sanitization and truncation
    content = sanitizeText(content);
    if (content.length > 50000) {
      content = content.substring(0, 50000) + '\n\n[Content truncated due to size...]';
    }

    console.log(`Successfully parsed file: ${fileName} (${content.length} characters)`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        content,
        length: content.length 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    console.error('Error parsing document:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});