-- Fase 3: atendimento e orçamento particular. Execute no SQL Editor do seu Supabase.
-- O público NUNCA recebe acesso direto à tabela; somente a API servidor, com service_role.
create sequence if not exists public.pd_sequencia_protocolos;

create table if not exists public.pd_solicitacoes (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null unique,
  tipo text not null check (tipo in ('servico','orcamento')),
  status text not null default 'novo' check (status in (
    'novo','aguardando_contato','cliente_contatado','orcamento_enviado',
    'aguardando_cliente','agendado','em_atendimento','aguardando_peca_cliente',
    'concluido','cancelado','nao_convertido'
  )),
  nome text not null check (char_length(nome) between 2 and 100),
  whatsapp text not null check (whatsapp ~ '^[0-9]{10,13}$'),
  equipamento text not null check (equipamento in ('desktop','notebook')),
  servico text not null check (char_length(servico) between 2 and 50),
  modalidade text not null check (modalidade in ('presencial','entrega')),
  cep text check (cep is null or cep ~ '^[0-9]{8}$'),
  descricao text not null check (char_length(descricao) between 10 and 500),
  -- Hash HMAC do IP apenas para limitar abuso. Não armazenar IP bruto.
  origem_hash text not null check (origem_hash ~ '^[a-f0-9]{64}$'),
  atualizado_por uuid,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint cep_presencial check (modalidade <> 'presencial' or cep is not null)
);
create index if not exists pd_solicitacoes_recentes_idx
  on public.pd_solicitacoes (criado_em desc);
create index if not exists pd_solicitacoes_status_idx
  on public.pd_solicitacoes (status, criado_em desc);
create index if not exists pd_solicitacoes_limite_idx
  on public.pd_solicitacoes (origem_hash, criado_em desc);

create table if not exists public.pd_historico_status (
  id bigint generated always as identity primary key,
  solicitacao_id uuid not null references public.pd_solicitacoes(id) on delete cascade,
  status_anterior text,
  status_novo text not null,
  alterado_por uuid,
  criado_em timestamptz not null default now()
);
create index if not exists pd_historico_status_pedido_idx
  on public.pd_historico_status (solicitacao_id, criado_em desc);

create or replace function public.pd_registrar_status()
returns trigger language plpgsql set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.status is distinct from old.status then
    insert into public.pd_historico_status
      (solicitacao_id, status_anterior, status_novo, alterado_por)
    values (new.id, case when tg_op = 'INSERT' then null else old.status end,
            new.status, new.atualizado_por);
  end if;
  if tg_op = 'UPDATE' then new.atualizado_em = now(); end if;
  return new;
end;
$$;
-- BEFORE: carimbo atualizado_em; AFTER: historico sem duplicar INSERT.
create or replace function public.pd_atualizacao_timestamp()
returns trigger language plpgsql set search_path = ''
as $$
begin new.atualizado_em = now(); return new; end;
$$;
drop trigger if exists pd_atualizacao_timestamp on public.pd_solicitacoes;
create trigger pd_atualizacao_timestamp before update on public.pd_solicitacoes
  for each row execute function public.pd_atualizacao_timestamp();
drop trigger if exists pd_registrar_status on public.pd_solicitacoes;
create trigger pd_registrar_status after insert or update of status on public.pd_solicitacoes
  for each row execute function public.pd_registrar_status();

create or replace function public.pd_criar_solicitacao(
  p_tipo text, p_nome text, p_whatsapp text, p_equipamento text,
  p_servico text, p_modalidade text, p_cep text, p_descricao text,
  p_origem_hash text
)
returns table (id uuid, protocolo text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_num bigint;
  v_prefixo text;
  v_protocolo text;
  v_id uuid;
  v_total integer;
begin
  -- Defense-in-depth: só chamadas com JWT da service_role podem executar.
  if coalesce(current_setting('request.jwt.claim.role', true),'') <> 'service_role' then
    raise exception 'NAO_AUTORIZADO' using errcode = '42501';
  end if;
  if p_tipo not in ('servico','orcamento') or p_equipamento not in ('desktop','notebook')
     or p_modalidade not in ('presencial','entrega')
     or char_length(btrim(p_nome)) not between 2 and 100
     or p_whatsapp !~ '^[0-9]{10,13}$'
     or char_length(p_servico) not between 2 and 50
     or char_length(btrim(p_descricao)) not between 10 and 500
     or p_origem_hash !~ '^[a-f0-9]{64}$'
     or (p_modalidade='presencial' and coalesce(p_cep,'') !~ '^[0-9]{8}$')
     or (p_cep is not null and p_cep !~ '^[0-9]{8}$')
  then raise exception 'DADOS_INVALIDOS' using errcode = '22023'; end if;

  -- Serializa chamadas do mesmo IP hash, limitando 3 pedidos por 30 min.
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_origem_hash,0));
  select count(*) into v_total from public.pd_solicitacoes
    where origem_hash = p_origem_hash and criado_em > now() - interval '30 minutes';
  if v_total >= 3 then
    raise exception 'LIMITE_DE_SOLICITACOES' using errcode = 'P0001';
  end if;

  v_num := nextval('public.pd_sequencia_protocolos'::regclass);
  v_prefixo := case when p_tipo='servico' then 'PD-SV' else 'PD-OR' end;
  v_protocolo := v_prefixo || '-' ||
    to_char(current_timestamp at time zone 'America/Sao_Paulo','YYYY') || '-' ||
    case when v_num < 10000 then lpad(v_num::text,4,'0') else v_num::text end;
  insert into public.pd_solicitacoes
    (protocolo,tipo,nome,whatsapp,equipamento,servico,modalidade,cep,descricao,origem_hash)
  values (v_protocolo,p_tipo,btrim(p_nome),p_whatsapp,p_equipamento,
          p_servico,p_modalidade,p_cep,btrim(p_descricao),p_origem_hash)
  returning public.pd_solicitacoes.id into v_id;
  return query select v_id,v_protocolo;
end;
$$;

-- Revogar grants padrão do schema público, inclusive EXECUTE de funções.
revoke all on public.pd_solicitacoes from public, anon, authenticated;
revoke all on public.pd_historico_status from public, anon, authenticated;
revoke all on sequence public.pd_sequencia_protocolos from public, anon, authenticated;
revoke all on function public.pd_criar_solicitacao(
  text,text,text,text,text,text,text,text,text
) from public, anon, authenticated;
revoke all on function public.pd_registrar_status() from public, anon, authenticated;
revoke all on function public.pd_atualizacao_timestamp() from public, anon, authenticated;
alter table public.pd_solicitacoes enable row level security;
alter table public.pd_historico_status enable row level security;
grant select, insert, update on public.pd_solicitacoes to service_role;
grant select, insert on public.pd_historico_status to service_role;
grant usage, select on sequence public.pd_sequencia_protocolos to service_role;
grant usage, select on sequence public.pd_historico_status_id_seq to service_role;
grant execute on function public.pd_criar_solicitacao(
  text,text,text,text,text,text,text,text,text
) to service_role;
-- Nenhuma policy anon/authenticated: só a API de backend usa a chave service_role.
