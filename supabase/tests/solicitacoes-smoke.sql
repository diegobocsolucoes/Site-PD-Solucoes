\set ON_ERROR_STOP on
-- Ambiente de teste PostgreSQL isolado; no Supabase essas roles já existem.
do $$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;

\ir ../migrations/202609260001_solicitacoes.sql

do $$
begin
 if has_table_privilege('anon','public.pd_solicitacoes','select') then
   raise exception 'Anon possui leitura indevida';
 end if;
 if has_table_privilege('authenticated','public.pd_solicitacoes','select') then
   raise exception 'Usuário autenticado possui leitura indevida';
 end if;
 if has_function_privilege('anon',
   'public.pd_criar_solicitacao(text,text,text,text,text,text,text,text,text)',
   'execute') then raise exception 'Anon pode executar RPC indevidamente'; end if;
end $$;

begin;
-- Simula PostgREST somente em transação isolada de teste.
select set_config('request.jwt.claim.role','service_role',true);

do $$
declare p record; total integer; limitado boolean:=false; i integer;
begin
 for i in 1..3 loop
   select * into p from public.pd_criar_solicitacao(
     'servico','Cliente de Teste','31912345678','notebook','lento',
     'presencial','32000000','Problema técnico de teste detalhado.',
     repeat('a',64)
   );
   if p.protocolo not like 'PD-SV-%' then
     raise exception 'Formato de protocolo incorreto';
   end if;
 end loop;
 select count(*) into total from public.pd_historico_status
   where status_novo='novo';
 if total<>3 then raise exception 'Histórico inicial não gerado'; end if;

 begin
   perform public.pd_criar_solicitacao(
     'servico','Cliente de Teste','31912345678','desktop','lento',
     'entrega',null,'Quarta tentativa deve ser bloqueada.',
     repeat('a',64)
   );
 exception when sqlstate 'P0001' then limitado:=true;
 end;
 if not limitado then raise exception 'Limite por IP hash não funcionou'; end if;

 update public.pd_solicitacoes set status='aguardando_contato'
   where origem_hash=repeat('a',64);
 select count(*) into total from public.pd_historico_status
   where status_novo='aguardando_contato';
 if total<>3 then raise exception 'Histórico de mudanças não gerado'; end if;
end $$;
rollback;
select 'TESTE_SQL_OK' as resultado;
