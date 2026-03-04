-- Add WhatsApp field for referrals contact on escolinhas table
ALTER TABLE public.escolinhas 
ADD COLUMN IF NOT EXISTS whatsapp_indicacoes TEXT;