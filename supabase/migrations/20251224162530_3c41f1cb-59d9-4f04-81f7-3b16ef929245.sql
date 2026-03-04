-- Add financial fields to criancas table
ALTER TABLE public.criancas 
ADD COLUMN IF NOT EXISTS valor_mensalidade numeric DEFAULT 180.00,
ADD COLUMN IF NOT EXISTS dia_vencimento integer DEFAULT 10 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 28),
ADD COLUMN IF NOT EXISTS forma_cobranca text DEFAULT 'mensal' CHECK (forma_cobranca IN ('mensal', 'isento')),
ADD COLUMN IF NOT EXISTS data_inicio_cobranca date DEFAULT CURRENT_DATE,
ADD COLUMN IF NOT EXISTS status_financeiro text DEFAULT 'ativo' CHECK (status_financeiro IN ('ativo', 'suspenso', 'isento'));

-- Add forma_pagamento to mensalidades table
ALTER TABLE public.mensalidades
ADD COLUMN IF NOT EXISTS forma_pagamento text DEFAULT 'manual';

-- Update the status column to support all required values
-- First drop the existing check if any and add new one
DO $$ 
BEGIN
    -- Update existing status values to match new enum
    UPDATE public.mensalidades SET status = 'pendente' WHERE status NOT IN ('pendente', 'pago', 'atrasado', 'isento');
    
    -- Add check constraint for status
    ALTER TABLE public.mensalidades DROP CONSTRAINT IF EXISTS mensalidades_status_check;
    ALTER TABLE public.mensalidades ADD CONSTRAINT mensalidades_status_check 
        CHECK (status IN ('pendente', 'pago', 'atrasado', 'isento'));
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_mensalidades_status ON public.mensalidades(status);
CREATE INDEX IF NOT EXISTS idx_mensalidades_mes_referencia ON public.mensalidades(mes_referencia);
CREATE INDEX IF NOT EXISTS idx_criancas_status_financeiro ON public.criancas(status_financeiro);