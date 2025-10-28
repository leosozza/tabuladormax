-- ============================================
-- RPC Function: pay_fichas_transaction
-- ============================================
-- This RPC function handles batch payment transactions atomically.
-- It updates leads to mark fichas as paid and inserts payment records.
--
-- SECURITY CONSIDERATIONS:
-- 1. This function uses SECURITY DEFINER to bypass RLS (Row Level Security)
-- 2. SECURITY DEFINER means the function runs with the privileges of the user who created it
-- 3. This is necessary if RLS is enabled and you need to perform batch operations
-- 4. IMPORTANT: Only privileged users (like postgres or service_role) should create this function
-- 5. The function should validate inputs carefully to prevent SQL injection or unauthorized access
-- 6. In production, consider additional authorization checks within the function
--
-- ALTERNATIVE APPROACH:
-- If you prefer not to use SECURITY DEFINER, you can:
-- - Call this from a backend service using the service_role key
-- - Or adjust RLS policies to allow batch updates from authenticated users
--
-- USAGE:
-- SELECT pay_fichas_transaction(
--   p_batch_id := 'uuid-here',
--   p_payments := '[{...payment objects...}]'::jsonb,
--   p_created_by := 'uuid-of-user'::uuid
-- );

-- ============================================
-- Create the RPC function
-- ============================================

CREATE OR REPLACE FUNCTION public.pay_fichas_transaction(
    p_batch_id uuid,
    p_payments jsonb,
    p_created_by uuid DEFAULT NULL
)
RETURNS jsonb
SECURITY DEFINER -- IMPORTANT: This bypasses RLS. Only create this function as a privileged user.
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
    v_payment jsonb;
    v_lead_id bigint;
    v_success_count integer := 0;
    v_error_count integer := 0;
    v_errors jsonb := '[]'::jsonb;
    v_result jsonb;
BEGIN
    -- Validate input
    IF p_batch_id IS NULL THEN
        RAISE EXCEPTION 'batch_id cannot be null';
    END IF;
    
    IF p_payments IS NULL OR jsonb_array_length(p_payments) = 0 THEN
        RAISE EXCEPTION 'payments array cannot be null or empty';
    END IF;

    -- Log the operation start
    RAISE NOTICE 'Starting batch payment transaction with batch_id: %, payments count: %', 
        p_batch_id, jsonb_array_length(p_payments);

    -- Process each payment in the batch
    FOR v_payment IN SELECT * FROM jsonb_array_elements(p_payments)
    LOOP
        BEGIN
            -- Extract lead_id
            v_lead_id := (v_payment->>'lead_id')::bigint;
            
            IF v_lead_id IS NULL THEN
                v_errors := v_errors || jsonb_build_object(
                    'error', 'lead_id is required',
                    'payment', v_payment
                );
                v_error_count := v_error_count + 1;
                CONTINUE;
            END IF;

            -- Update the lead to mark ficha as confirmed/paid
            UPDATE public.leads
            SET 
                ficha_confirmada = true,
                data_confirmacao_ficha = COALESCE(data_confirmacao_ficha, now()),
                updated_at = now()
            WHERE id = v_lead_id;

            -- Check if update was successful
            IF NOT FOUND THEN
                v_errors := v_errors || jsonb_build_object(
                    'error', 'Lead not found',
                    'lead_id', v_lead_id
                );
                v_error_count := v_error_count + 1;
                CONTINUE;
            END IF;

            -- Insert payment record
            INSERT INTO public.payments_records (
                batch_id,
                payment_date,
                lead_id,
                scouter,
                commercial_project_id,
                num_fichas,
                valor_ficha,
                valor_fichas_total,
                dias_trabalhados,
                ajuda_custo_por_dia,
                ajuda_custo_total,
                num_faltas,
                desconto_falta_unitario,
                desconto_faltas_total,
                valor_bruto,
                valor_descontos,
                valor_liquido,
                created_by,
                observacoes,
                status
            ) VALUES (
                p_batch_id,
                now(),
                v_lead_id,
                v_payment->>'scouter',
                (v_payment->>'commercial_project_id')::uuid,
                COALESCE((v_payment->>'num_fichas')::integer, 1),
                COALESCE((v_payment->>'valor_ficha')::numeric, 0),
                COALESCE((v_payment->>'valor_fichas_total')::numeric, 0),
                COALESCE((v_payment->>'dias_trabalhados')::integer, 0),
                COALESCE((v_payment->>'ajuda_custo_por_dia')::numeric, 0),
                COALESCE((v_payment->>'ajuda_custo_total')::numeric, 0),
                COALESCE((v_payment->>'num_faltas')::integer, 0),
                COALESCE((v_payment->>'desconto_falta_unitario')::numeric, 0),
                COALESCE((v_payment->>'desconto_faltas_total')::numeric, 0),
                COALESCE((v_payment->>'valor_bruto')::numeric, 0),
                COALESCE((v_payment->>'valor_descontos')::numeric, 0),
                COALESCE((v_payment->>'valor_liquido')::numeric, 0),
                p_created_by,
                v_payment->>'observacoes',
                COALESCE(v_payment->>'status', 'paid')
            );

            v_success_count := v_success_count + 1;

        EXCEPTION
            WHEN OTHERS THEN
                -- Capture any errors that occur during processing
                v_errors := v_errors || jsonb_build_object(
                    'error', SQLERRM,
                    'lead_id', v_lead_id,
                    'payment', v_payment
                );
                v_error_count := v_error_count + 1;
                
                -- Log the error
                RAISE WARNING 'Error processing payment for lead_id %: %', v_lead_id, SQLERRM;
        END;
    END LOOP;

    -- Build result
    v_result := jsonb_build_object(
        'success', v_error_count = 0,
        'batch_id', p_batch_id,
        'total_payments', jsonb_array_length(p_payments),
        'success_count', v_success_count,
        'error_count', v_error_count,
        'errors', v_errors
    );

    -- Log the operation completion
    RAISE NOTICE 'Batch payment transaction completed. Success: %, Errors: %', 
        v_success_count, v_error_count;

    -- If there were any errors, rollback the entire transaction
    IF v_error_count > 0 THEN
        RAISE EXCEPTION 'Transaction failed with % errors. Rolling back all changes. Details: %', 
            v_error_count, v_result::text;
    END IF;

    RETURN v_result;
END;
$$;

-- ============================================
-- Grant execute permissions
-- ============================================
-- Grant execute to authenticated users (adjust based on your security requirements)
-- Note: With SECURITY DEFINER, the function runs with creator's privileges regardless of caller
GRANT EXECUTE ON FUNCTION public.pay_fichas_transaction TO authenticated;

-- Optionally grant to anon if needed (not recommended for payment operations)
-- GRANT EXECUTE ON FUNCTION public.pay_fichas_transaction TO anon;

-- ============================================
-- Add function comment
-- ============================================
COMMENT ON FUNCTION public.pay_fichas_transaction IS 
'Processes batch payment transactions atomically. Updates leads to mark fichas as paid and creates payment records. '
|| 'Uses SECURITY DEFINER to bypass RLS - ensure this is created by a privileged user. '
|| 'Returns a JSON object with transaction results including success/error counts.';

-- ============================================
-- Usage Example
-- ============================================
/*
-- Example call:
SELECT pay_fichas_transaction(
    p_batch_id := gen_random_uuid(),
    p_payments := '[
        {
            "lead_id": 12345,
            "scouter": "João Silva",
            "commercial_project_id": "550e8400-e29b-41d4-a716-446655440000",
            "num_fichas": 1,
            "valor_ficha": 50.00,
            "valor_fichas_total": 50.00,
            "dias_trabalhados": 5,
            "ajuda_custo_por_dia": 10.00,
            "ajuda_custo_total": 50.00,
            "num_faltas": 0,
            "desconto_falta_unitario": 0.00,
            "desconto_faltas_total": 0.00,
            "valor_bruto": 100.00,
            "valor_descontos": 0.00,
            "valor_liquido": 100.00,
            "observacoes": "Pagamento mensal"
        }
    ]'::jsonb,
    p_created_by := auth.uid()
);
*/

-- ============================================
-- Important Reminders
-- ============================================
-- 1. After creating this function, reload the PostgREST schema cache
-- 2. Test thoroughly in a development environment before using in production
-- 3. Monitor function execution for performance and errors
-- 4. Consider adding additional authorization checks if needed
-- 5. Review and adjust RLS policies on leads and payments_records tables
-- 6. Ensure proper error handling in the client application
