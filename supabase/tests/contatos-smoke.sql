\set ON_ERROR_STOP on
-- Ambiente de teste PostgreSQL isolado; no Supabase essas roles já existem.
do $$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;
-- A sequência de protocolos vem da migração de solicitações.
\ir ../migrations/202609260001_solicitacoes.sql
\ir ../migrations/202610160002_contatos.sql
-- A migração deve poder ser executada duas vezes sem erro.
\ir ../migrations/202610160002_contatos.sql
do $$ begin
 if has_table_privilege('anon','public.pd_contatos','select') or has_table_privilege('authenticated','public.pd_contatos','select')
    or has_table_privilege('anon','public.pd_contatos','insert') then
   raise exception 'anon/authenticated com acesso indevido a pd_contatos';
 end if;
 if has_function_privilege('anon','public.pd_criar_contato(text,text,text,text,text)','execute') then
   raise exception 'anon pode executar pd_criar_contato';
 end if;
 if not has_table_privilege('service_role','public.pd_contatos','insert') then
   raise exception 'service_role sem acesso';
 end if;
end $$;
begin;
set local request.jwt.claim.role = 'service_role';
do $$
declare r record; h text := repeat('a',64);
begin
  select * into r from public.pd_criar_contato('parceria','Ana Souza','31999991234','Empresa: X\nProposta de teste',h);
  if r.protocolo !~ '^PD-CT-[0-9]{4}-[0-9]{4,}$' then raise exception 'protocolo inesperado: %', r.protocolo; end if;
  begin
    perform public.pd_criar_contato('invalido','Ana','31999991234','texto de teste ok',h);
    raise exception 'assunto inválido foi aceito';
  exception when sqlstate '22023' then null; end;
  for i in 1..4 loop perform public.pd_criar_contato('loja-rapida','Ana Souza','31999991234','Produto: cabo hdmi',h); end loop;
  begin
    perform public.pd_criar_contato('loja-rapida','Ana Souza','31999991234','Produto: cabo hdmi',h);
    raise exception 'limite não aplicado';
  exception when sqlstate 'P0001' then null; end;
end $$;
set local request.jwt.claim.role = 'anon';
do $$ begin
  begin
    perform public.pd_criar_contato('parceria','Ana Souza','31999991234','Empresa: X proposta',repeat('b',64));
    raise exception 'anon conseguiu executar';
  exception when sqlstate '42501' then null; end;
end $$;
rollback;
select 'contatos-smoke OK' as resultado;
