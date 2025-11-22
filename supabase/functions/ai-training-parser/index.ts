import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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
      content = await fileData.text();
    } else if (fileExt === 'pdf' || fileExt === 'docx') {
      // For PDFs and DOCX, we'll use a simple extraction
      // In production, you might want to use a proper PDF/DOCX parser
      try {
        content = await fileData.text();
      } catch (err) {
        // If text extraction fails, return error
        const errorMessage = err instanceof Error ? err.message : 'Unknown parsing error';
        throw new Error(`Failed to parse ${fileExt} file: ${errorMessage}`);
      }
    } else {
      throw new Error(`Unsupported file type: ${fileExt}`);
    }

    // Clean and truncate content if too large
    content = content.trim();
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
