-- 1. Criar tabela de produtos (se não existir)
CREATE TABLE IF NOT EXISTS public.produtos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL DEFAULT 'uniforme',
  valor NUMERIC(10,2) NOT NULL DEFAULT 0,
  estoque INTEGER,
  foto_url TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;

-- RLS policies para produtos
CREATE POLICY "Escola pode gerenciar seus produtos"
ON public.produtos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = produtos.escolinha_id
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = produtos.escolinha_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Responsáveis podem ver produtos das suas escolinhas"
ON public.produtos FOR SELECT
USING (
  ativo = true
  AND EXISTS (
    SELECT 1 FROM public.crianca_escolinha ce
    JOIN public.crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE ce.escolinha_id = produtos.escolinha_id
    AND r.user_id = auth.uid()
    AND ce.ativo = true
  )
);

-- 2. Criar tabela de pedidos
CREATE TABLE IF NOT EXISTS public.pedidos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  escolinha_id UUID NOT NULL REFERENCES public.escolinhas(id) ON DELETE CASCADE,
  responsavel_id UUID NOT NULL REFERENCES public.responsaveis(id) ON DELETE CASCADE,
  crianca_id UUID REFERENCES public.criancas(id),
  valor_total NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pendente',
  asaas_payment_id TEXT,
  pix_payload TEXT,
  pix_qrcode_url TEXT,
  pix_expires_at TIMESTAMP WITH TIME ZONE,
  data_pagamento TIMESTAMP WITH TIME ZONE,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

-- RLS policies para pedidos
CREATE POLICY "Escola pode gerenciar pedidos"
ON public.pedidos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = pedidos.escolinha_id
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.id = pedidos.escolinha_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Responsável pode ver e criar seus pedidos"
ON public.pedidos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.responsaveis r
    WHERE r.id = pedidos.responsavel_id
    AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.responsaveis r
    WHERE r.id = pedidos.responsavel_id
    AND r.user_id = auth.uid()
  )
);

-- 3. Criar tabela de itens do pedido
CREATE TABLE IF NOT EXISTS public.pedido_itens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  pedido_id UUID NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  quantidade INTEGER NOT NULL DEFAULT 1,
  tamanho VARCHAR(20),
  valor_unitario NUMERIC(10,2) NOT NULL,
  valor_total NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pedido_itens ENABLE ROW LEVEL SECURITY;

-- RLS policies para pedido_itens
CREATE POLICY "Escola pode gerenciar itens dos pedidos"
ON public.pedido_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.escolinhas e ON e.id = p.escolinha_id
    WHERE p.id = pedido_itens.pedido_id
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.escolinhas e ON e.id = p.escolinha_id
    WHERE p.id = pedido_itens.pedido_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Responsável pode ver e criar itens dos seus pedidos"
ON public.pedido_itens FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.responsaveis r ON r.id = p.responsavel_id
    WHERE p.id = pedido_itens.pedido_id
    AND r.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.pedidos p
    JOIN public.responsaveis r ON r.id = p.responsavel_id
    WHERE p.id = pedido_itens.pedido_id
    AND r.user_id = auth.uid()
  )
);

-- 4. Criar tabela de tamanhos por produto (estoque por tamanho)
CREATE TABLE IF NOT EXISTS public.produto_tamanhos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID NOT NULL REFERENCES public.produtos(id) ON DELETE CASCADE,
  tamanho VARCHAR(20) NOT NULL,
  estoque INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(produto_id, tamanho)
);

-- Enable RLS
ALTER TABLE public.produto_tamanhos ENABLE ROW LEVEL SECURITY;

-- RLS policies para produto_tamanhos
CREATE POLICY "Escola pode gerenciar tamanhos"
ON public.produto_tamanhos FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.escolinhas e ON p.escolinha_id = e.id
    WHERE p.id = produto_tamanhos.produto_id
    AND e.admin_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.escolinhas e ON p.escolinha_id = e.id
    WHERE p.id = produto_tamanhos.produto_id
    AND e.admin_user_id = auth.uid()
  )
);

CREATE POLICY "Responsáveis podem ver tamanhos"
ON public.produto_tamanhos FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.produtos p
    JOIN public.crianca_escolinha ce ON ce.escolinha_id = p.escolinha_id
    JOIN public.crianca_responsavel cr ON cr.crianca_id = ce.crianca_id
    JOIN public.responsaveis r ON r.id = cr.responsavel_id
    WHERE p.id = produto_tamanhos.produto_id
    AND r.user_id = auth.uid()
    AND ce.ativo = true
  )
);

-- 5. Criar bucket para fotos de produtos
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-photos', 'product-photos', true)
ON CONFLICT (id) DO NOTHING;

-- 6. Políticas de storage
CREATE POLICY "School can upload product photos"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-photos' 
  AND EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.admin_user_id = auth.uid()
    AND e.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "School can update product photos"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'product-photos'
  AND EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.admin_user_id = auth.uid()
    AND e.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "School can delete product photos"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'product-photos'
  AND EXISTS (
    SELECT 1 FROM public.escolinhas e
    WHERE e.admin_user_id = auth.uid()
    AND e.id::text = (storage.foldername(name))[1]
  )
);

CREATE POLICY "Anyone can view product photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-photos');

-- 7. Triggers para updated_at
CREATE TRIGGER update_produtos_updated_at
BEFORE UPDATE ON public.produtos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pedidos_updated_at
BEFORE UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_produto_tamanhos_updated_at
BEFORE UPDATE ON public.produto_tamanhos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();