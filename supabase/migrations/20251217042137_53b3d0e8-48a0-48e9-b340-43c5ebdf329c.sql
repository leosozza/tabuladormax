-- Create table for AI training suggestions
CREATE TABLE public.ai_training_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_project_id UUID REFERENCES public.commercial_projects(id),
  suggested_title TEXT NOT NULL,
  suggested_content TEXT NOT NULL,
  suggested_category TEXT DEFAULT 'general',
  confidence_score DECIMAL(3,2) DEFAULT 0.00,
  source_type TEXT DEFAULT 'conversation_analysis',
  source_data JSONB DEFAULT '{}',
  sample_questions JSONB DEFAULT '[]',
  frequency_count INTEGER DEFAULT 1,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'merged')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  created_instruction_id UUID REFERENCES public.ai_training_instructions(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_training_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view suggestions" 
ON public.ai_training_suggestions 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert suggestions" 
ON public.ai_training_suggestions 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update suggestions" 
ON public.ai_training_suggestions 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can delete suggestions" 
ON public.ai_training_suggestions 
FOR DELETE 
USING (auth.uid() IS NOT NULL);

-- Create analysis jobs table
CREATE TABLE public.conversation_analysis_jobs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  commercial_project_id UUID REFERENCES public.commercial_projects(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  conversations_analyzed INTEGER DEFAULT 0,
  suggestions_generated INTEGER DEFAULT 0,
  date_range_start TIMESTAMP WITH TIME ZONE,
  date_range_end TIMESTAMP WITH TIME ZONE,
  analysis_results JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.conversation_analysis_jobs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Authenticated users can view analysis jobs" 
ON public.conversation_analysis_jobs 
FOR SELECT 
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can insert analysis jobs" 
ON public.conversation_analysis_jobs 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update analysis jobs" 
ON public.conversation_analysis_jobs 
FOR UPDATE 
USING (auth.uid() IS NOT NULL);

-- Add indexes for performance
CREATE INDEX idx_suggestions_project ON public.ai_training_suggestions(commercial_project_id);
CREATE INDEX idx_suggestions_status ON public.ai_training_suggestions(status);
CREATE INDEX idx_analysis_jobs_project ON public.conversation_analysis_jobs(commercial_project_id);
CREATE INDEX idx_analysis_jobs_status ON public.conversation_analysis_jobs(status);

-- Add trigger for updated_at
CREATE TRIGGER update_ai_training_suggestions_updated_at
BEFORE UPDATE ON public.ai_training_suggestions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();