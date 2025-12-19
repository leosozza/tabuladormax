
-- Remover a constraint fixa de categorias para permitir categorias dinâmicas
ALTER TABLE public.button_config DROP CONSTRAINT button_config_category_check;

-- Adicionar uma constraint que valida contra a tabela button_categories
-- Usando um trigger em vez de CHECK constraint (mais flexível)
CREATE OR REPLACE FUNCTION public.validate_button_category()
RETURNS TRIGGER AS $$
BEGIN
  -- Se category for NULL, permitir
  IF NEW.category IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Verificar se a categoria existe na tabela button_categories
  IF NOT EXISTS (SELECT 1 FROM public.button_categories WHERE name = NEW.category) THEN
    RAISE EXCEPTION 'Categoria "%" não existe. Crie-a primeiro em button_categories.', NEW.category;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para validar categoria antes de insert/update
DROP TRIGGER IF EXISTS validate_button_category_trigger ON public.button_config;
CREATE TRIGGER validate_button_category_trigger
  BEFORE INSERT OR UPDATE ON public.button_config
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_button_category();
