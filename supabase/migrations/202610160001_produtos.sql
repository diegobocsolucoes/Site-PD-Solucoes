-- Loja Rápida dinâmica: catálogo administrável pelo Painel PD.
-- Execute no SQL Editor do Supabase (primeiro em homologação).
-- O público NUNCA acessa a tabela diretamente: só a API servidor, com service_role,
-- e devolvendo apenas os campos públicos de produtos ativos.
create table if not exists public.pd_produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null check (char_length(btrim(nome)) between 2 and 80),
  categoria text not null check (char_length(btrim(categoria)) between 2 and 40),
  descricao text not null default '' check (char_length(descricao) <= 240),
  -- Preço em centavos; nulo = "A CONFIRMAR" na loja pública.
  preco_centavos integer check (preco_centavos is null or preco_centavos between 0 and 100000000),
  -- Estoque exato é interno: a loja pública mostra só o status.
  quantidade integer not null default 0 check (quantidade between 0 and 100000),
  status text not null default 'disponivel'
    check (status in ('disponivel','poucas_unidades','indisponivel')),
  ativo boolean not null default true,
  destaque boolean not null default false,
  ordem integer not null default 0 check (ordem between 0 and 100000),
  -- Caminho do arquivo dentro do bucket "produtos": <id-do-produto>/<timestamp>.<ext>
  foto_path text check (foto_path is null or foto_path ~
    '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{10,16}\.(webp|jpg|png)$'),
  observacao_interna text check (observacao_interna is null or char_length(observacao_interna) <= 500),
  atualizado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pd_produtos_vitrine_idx
  on public.pd_produtos (ativo, destaque desc, ordem, nome);

create or replace function public.pd_produtos_timestamp()
returns trigger language plpgsql set search_path = ''
as $$
begin new.atualizado_em = clock_timestamp(); return new; end;
$$;
drop trigger if exists pd_produtos_timestamp on public.pd_produtos;
create trigger pd_produtos_timestamp before update on public.pd_produtos
  for each row execute function public.pd_produtos_timestamp();

-- Mesmo padrão das solicitações: nada para anon/authenticated, só service_role.
revoke all on public.pd_produtos from public, anon, authenticated;
revoke all on function public.pd_produtos_timestamp() from public, anon, authenticated;
alter table public.pd_produtos enable row level security;
grant select, insert, update, delete on public.pd_produtos to service_role;
-- Nenhuma policy anon/authenticated.

-- Pasta de fotos (Supabase Storage). Leitura pública pelos links das imagens;
-- gravação e remoção somente pela API servidor (service_role ignora RLS).
-- Em PostgreSQL comum (testes) o schema "storage" não existe e o bloco é ignorado.
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('produtos', 'produtos', true, 2097152,
            array['image/webp','image/jpeg','image/png'])
    on conflict (id) do update
      set public = true, file_size_limit = 2097152,
          allowed_mime_types = array['image/webp','image/jpeg','image/png'];
  end if;
end $$;
