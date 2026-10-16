\set ON_ERROR_STOP on
-- Ambiente de teste PostgreSQL isolado; no Supabase essas roles já existem.
do $$
begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon; end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated; end if;
 if not exists(select 1 from pg_roles where rolname='service_role') then create role service_role; end if;
end $$;

\ir ../migrations/202610160001_produtos.sql
-- A migração deve poder ser executada duas vezes sem erro.
\ir ../migrations/202610160001_produtos.sql

do $$
begin
 if has_table_privilege('anon','public.pd_produtos','select') then
   raise exception 'Anon possui leitura indevida';
 end if;
 if has_table_privilege('authenticated','public.pd_produtos','select') then
   raise exception 'Usuário autenticado possui leitura indevida';
 end if;
 if has_table_privilege('anon','public.pd_produtos','insert')
    or has_table_privilege('authenticated','public.pd_produtos','update')
    or has_table_privilege('authenticated','public.pd_produtos','delete') then
   raise exception 'Escrita indevida para anon/authenticated';
 end if;
 if not has_table_privilege('service_role','public.pd_produtos','select,insert,update,delete') then
   raise exception 'service_role sem acesso';
 end if;
 if not (select relrowsecurity from pg_class where oid='public.pd_produtos'::regclass) then
   raise exception 'RLS desativada';
 end if;
end $$;

begin;
do $$
declare p public.pd_produtos; antes timestamptz; rejeitou boolean;
begin
 insert into public.pd_produtos (nome, categoria) values ('Cabo HDMI 2 m','cabos')
   returning * into p;
 if p.status<>'disponivel' or p.ativo is not true or p.quantidade<>0
    or p.preco_centavos is not null then
   raise exception 'Valores padrão incorretos';
 end if;

 antes := p.atualizado_em;
 perform pg_sleep(0.01);
 update public.pd_produtos set preco_centavos=2990, quantidade=5,
   foto_path = p.id::text || '/1760000000000.webp' where id=p.id returning * into p;
 if p.atualizado_em <= antes then raise exception 'atualizado_em não mudou'; end if;

 -- Cada regra abaixo precisa ser recusada pelo banco.
 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria) values ('x','cabos');
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Nome curto aceito'; end if;

 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria,status)
   values ('Mouse','perifericos','em_estoque');
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Status inválido aceito'; end if;

 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria,preco_centavos)
   values ('Mouse','perifericos',-1);
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Preço negativo aceito'; end if;

 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria,quantidade)
   values ('Mouse','perifericos',-3);
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Estoque negativo aceito'; end if;

 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria,foto_path)
   values ('Mouse','perifericos','../../etc/passwd');
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Caminho de foto inseguro aceito'; end if;

 rejeitou:=false; begin insert into public.pd_produtos (nome,categoria,descricao)
   values ('Mouse','perifericos',repeat('a',241));
   exception when check_violation then rejeitou:=true; end;
 if not rejeitou then raise exception 'Descrição longa aceita'; end if;
end $$;
rollback;

-- Acesso real como anon deve ser negado pelo banco.
begin;
set local role anon;
do $$
declare negado boolean:=false;
begin
 begin perform 1 from public.pd_produtos;
 exception when insufficient_privilege then negado:=true; end;
 if not negado then raise exception 'Anon conseguiu ler a tabela'; end if;
end $$;
rollback;

select 'TESTE_SQL_PRODUTOS_OK' as resultado;
