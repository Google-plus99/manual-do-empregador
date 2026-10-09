-- supabase/schema.sql
-- Rode este arquivo uma única vez no Supabase: SQL Editor > New query > colar > Run.
-- Cria as tabelas de pedidos e contatos e o armazenamento privado dos produtos.
-- O acesso é feito só pelo servidor (chave service_role), nunca pelo navegador.

-- ============ PEDIDOS (um por cobrança Pix) ============
create table if not exists public.pedidos (
  id                bigint generated always as identity primary key,
  pagamento_id      text not null unique,            -- id do pagamento no Mercado Pago
  plano             text not null,                   -- id da oferta no catálogo (assets/catalogo.js)
  valor             numeric(10,2) not null,
  status            text not null default 'pending', -- pending, approved, cancelled, expired...
  nome              text not null,
  email             text not null,
  criado_em         timestamptz not null default now(),
  aprovado_em       timestamptz,
  -- licença do simulador (planos simulador e kit)
  licenca_numero    text,
  licenca_chave     text,
  licenca_vencimento date
);
create index if not exists pedidos_email_idx  on public.pedidos (lower(email));
create index if not exists pedidos_status_idx on public.pedidos (status);

-- ============ CONTATOS (formulário "Fale com um especialista") ============
create table if not exists public.contatos (
  id         bigint generated always as identity primary key,
  nome       text not null,
  email      text not null,
  whatsapp   text not null,
  mensagem   text,
  origem     text default 'site',                   -- 'site' ou 'cursos' (lista de espera)
  criado_em  timestamptz not null default now()
);

-- Segurança: RLS ligado e nenhuma política pública.
-- Assim, ninguém lê nem grava pela internet; só o servidor com a service_role.
alter table public.pedidos  enable row level security;
alter table public.contatos enable row level security;

-- Se a versão anterior deste arquivo já foi rodada, libera o campo plano para os novos produtos
alter table public.pedidos drop constraint if exists pedidos_plano_check;

-- ============ ARMAZENAMENTO PRIVADO DOS PRODUTOS ============
-- Bucket privado "produtos". Depois de rodar, envie os PDFs em Storage > produtos
-- com os nomes definidos em assets/catalogo.js:
--   manual-do-empregador.pdf
--   cartilha-do-bom-fornecedor.pdf
insert into storage.buckets (id, name, public)
values ('produtos', 'produtos', false)
on conflict (id) do nothing;

-- ============ VISÃO PARA CONSULTA RÁPIDA NO PAINEL ============
create or replace view public.vendas_aprovadas
with (security_invoker = true) as
select aprovado_em, plano, valor, nome, email, licenca_numero, licenca_vencimento
from public.pedidos
where status = 'approved'
order by aprovado_em desc;
