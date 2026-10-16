-- Contatos dos formulários do site (orçamento empresarial, chamado, parceria, loja).
-- Gravados pelo servidor com a chave service_role; o público nunca acessa a tabela.
create table if not exists public.pd_contatos (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  assunto text not null check (assunto in (
    'orcamento-empresarial','chamado-empresarial','parceria','loja-rapida')),
  status text not null default 'novo' check (status in (
    'novo','contatado','em_andamento','concluido','cancelado')),
  nome text not null check (char_length(nome) between 2 and 100),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  resumo text not null check (char_length(resumo) between 10 and 2500),
  aviso_enviado boolean not null default false,
  origem_hash text not null check (origem_hash ~ '^[a-f0-9]{64}$'),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create index if not exists pd_contatos_recentes_idx on public.pd_contatos (criado_em desc);
create index if not exists pd_contatos_limite_idx on public.pd_contatos (origem_hash, criado_em desc);

create or replace function public.pd_criar_contato(
  p_assunto text, p_nome text, p_whatsapp text, p_resumo text, p_origem_hash text
)
returns table (id uuid, protocolo text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_num bigint; v_protocolo text; v_id uuid; v_total integer;
begin
  if coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' then
    raise exception 'NAO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_assunto not in ('orcamento-empresarial','chamado-empresarial','parceria','loja-rapida')
     or char_length(btrim(p_nome)) not between 2 and 100
     or p_whatsapp !~ '^[0-9]{10,13}$'
     or char_length(btrim(p_resumo)) not between 10 and 2500
     or p_origem_hash !~ '^[a-f0-9]{64}$'
  then raise exception 'DADOS_INVALIDOS' using errcode = '22023'; end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_origem_hash,1));
  select count(*) into v_total from public.pd_contatos
    where origem_hash = p_origem_hash and criado_em > now() - interval '30 minutes';
  if v_total >= 5 then
    raise exception 'LIMITE_DE_SOLICITACOES' using errcode = 'P0001';
  end if;

  v_num := nextval('public.pd_sequencia_protocolos'::regclass);
  v_protocolo := 'PD-CT-' ||
    to_char(current_timestamp at time zone 'America/Sao_Paulo','YYYY') || '-' ||
    case when v_num < 10000 then lpad(v_num::text,4,'0') else v_num::text end;
  insert into public.pd_contatos (protocolo,assunto,nome,whatsapp,resumo,origem_hash)
  values (v_protocolo,p_assunto,btrim(p_nome),p_whatsapp,btrim(p_resumo),p_origem_hash)
  returning public.pd_contatos.id into v_id;
  return query select v_id,v_protocolo;
end;
$$;

revoke all on public.pd_contatos from public, anon, authenticated;
revoke all on function public.pd_criar_contato(text,text,text,text,text) from public, anon, authenticated;
alter table public.pd_contatos enable row level security;
grant select, insert, update on public.pd_contatos to service_role;
grant execute on function public.pd_criar_contato(text,text,text,text,text) to service_role;
