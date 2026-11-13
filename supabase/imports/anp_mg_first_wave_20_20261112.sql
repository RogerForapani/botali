-- 20 ANP records selected from a dated MG snapshot; homologation only.
-- Apply migration 202611120001_anp_station_origin.sql first.
\set ON_ERROR_STOP on
begin;
set local lock_timeout = '10s';
create temp table anp_wave (id uuid, simp text, cnpj text, anp_authorization text, name text, brand text, address text, neighborhood text, city text, postal_code text, latitude double precision, longitude double precision, accuracy numeric, obtained_on date, fuel_codes text[]) on commit drop;
insert into anp_wave values
  ('ddb549f3-4700-583b-8716-a6abc92f1947'::uuid, '1016340', '17453549000134', 'PR/MG0024785', 'Sao Francisco Participacoes Transportes E Servicos', 'Raízen', 'Rua Major Delfino De Paula,  2745', 'Sao Francisco', 'Belo Horizonte', '31250690', -19.88194040, -43.96031150, 4, '2026-06-03'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada']::text[]),
  ('c1384117-6933-5fab-855b-c4914994786d'::uuid, '1313030', '61341290000121', 'PR/MG0250807', 'Posto De Combustiveis Venda Nova', 'Independente', 'Avenida Vilarinho,  5100', 'Mantiqueira', 'Belo Horizonte', '31615250', -19.80156180, -43.98096720, 4, '2026-06-02'::date, array['etanol','gasolina']::text[]),
  ('aa520c2e-8e0b-5c36-94bd-19a51b24a6e5'::uuid, '1318736', '61341987000100', 'PR/MG0252794', 'Posto De Combustiveis Itapore', 'Independente', 'Via Expressa Francisco Cleuton Lopes,  1665', 'Agua Branca', 'Contagem', '32370485', -19.93116840, -44.04030520, 4, '2026-05-27'::date, array['etanol','gasolina','gasolina_aditivada']::text[]),
  ('5ab08fb4-0276-54a6-9c67-0c2e51e3e8e8'::uuid, '1006871', '02973900000140', 'PR/MG0186051', 'Posto Tres Barras', 'Independente', 'Rua Manoel Pinheiro Diniz,  525', 'Plano Dir Contagem', 'Contagem', '32041140', -19.91323090, -44.07605050, 4, '2026-04-14'::date, array['diesel_s10','diesel_s500','etanol','etanol_aditivado','gasolina','gasolina_aditivada','gnv']::text[]),
  ('c44345bb-efc2-5edb-8244-a2103720f92e'::uuid, '1219221', '13117591000476', 'PR/MG0172176', 'Abc Distribuicao De Petroleo', 'Independente', 'Rua Espirito Santo,  173', 'Decamao', 'Betim', '32603064', -19.96779190, -44.21015580, 5, '2026-03-20'::date, array['diesel_s10','etanol','gasolina','gasolina_aditivada']::text[]),
  ('89277b92-ed61-5540-b5a3-8acad47092b1'::uuid, '1308361', '38143064000114', 'PR/MG0249233', 'Tne Combustiveis Refinaria', 'Independente', 'Estrada Contorno Da Petrobras,  1436', 'Distrito Industrial Paulo Camilo Sul', 'Betim', '32669500', -19.96930550, -44.09929430, 4, '2026-03-19'::date, array['diesel_s10','etanol','gasolina','gasolina_aditivada']::text[]),
  ('a7ff32e0-63b0-5ae2-ac2c-6b7dee400308'::uuid, '1286611', '46530195000182', 'PR/MG0228978', 'Posto Vila Economico', 'Ipiranga', 'Rua Doutor Anibal Moraes Quintao,  71', 'Centro', 'Nova Lima', '34000081', -19.98206640, -43.85326020, 3, '2026-07-24'::date, array['diesel_s10_aditivado','etanol','gasolina','gasolina_aditivada','gnv']::text[]),
  ('be664295-2d06-5e6a-a654-e6589df71cae'::uuid, '1001991', '01021870000100', 'PR/MG0024836', 'Grafer Comercial', 'Raízen', 'Area Rodovia Br 040,  Sn', 'Area Rural De Nova Lima', 'Nova Lima', '34019899', -20.04662030, -43.96315160, 4, '2026-07-24'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada','gnv']::text[]),
  ('3bf75c2f-8f56-557c-8f3a-d9d1fdb4be0f'::uuid, '1003909', '01899419000190', 'PR/MG0014446', 'Posto Luma', 'Raízen', 'Rua Lauro Sodre Nogueira,  293', 'Sao Pedro', 'Ribeirao Das Neves', '33805600', -19.76853630, -44.09198520, 4, '2026-03-31'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada']::text[]),
  ('3e3a3dc0-e0d7-5d70-9987-face07d10c81'::uuid, '1288034', '37558886000101', 'PR/MG0233476', 'Posto De Combustivel Veneza', 'Vibra', 'Rua Dionízio Gomes,  1182', 'Veneza', 'Ribeirao Das Neves', '33820540', -19.77709730, -44.13702620, 5, '2026-03-31'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada']::text[]),
  ('fabe9f68-0efc-53c0-aaa1-378f8aa84dc1'::uuid, '1017668', '24427247000157', 'PR/MG0251604', 'Posto Amanefiral', 'Independente', 'Avenida Das Industrias,  4015', 'Capitao Eduardo', 'Santa Luzia', '33040000', -19.80396600, -43.88258430, 4, '2026-03-03'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gnv']::text[]),
  ('5f079db8-4200-5997-a35f-eecb22a24cb0'::uuid, '1305103', '38660048000107', 'PR/MG0247999', 'Sao Bento Combustiveis', 'Raízen', 'Avenida Brasilia,  3200', 'Duquesa I (Sao Benedito)', 'Santa Luzia', '33170000', -19.78614100, -43.91854200, 4, '2026-03-03'::date, array['diesel_s10','etanol','gasolina','gasolina_aditivada']::text[]),
  ('5c7c854d-3997-5ac3-a2b3-336e786a1197'::uuid, '1289409', '46891002000119', 'PR/MG0237825', 'Auto Posto Duda', 'Vibra', 'Rua Do Kaquende,  20', 'Centro', 'Sabara', '34505040', -19.89382960, -43.81445720, 4, '2025-09-18'::date, array['etanol_aditivado','gasolina']::text[]),
  ('e1652277-f876-5051-93c8-4bd3049b05b4'::uuid, '1283045', '45457292000124', 'PR/MG0223777', 'Posto De Combustivel Davi', 'Ale', 'Rua Marques De Sapucai,  368', 'Centro', 'Sabara', '34505600', -19.88694550, -43.80492760, 5, '2025-09-18'::date, array['diesel_s10','etanol','gasolina','gnv']::text[]),
  ('e66d3452-e7a7-5f73-bf7a-d492f70b2ef4'::uuid, '1045399', '05956270000194', 'PR/MG0197992', 'Posto Tabooes', 'Vibra', 'Rua Freitas De Oliveira,  247', 'Alvorada', 'Ibirite', '32400001', -20.02690150, -44.05821460, 4, '2023-11-23'::date, array['diesel_s10_aditivado','etanol','gasolina','gasolina_aditivada']::text[]),
  ('2077ee28-857d-5c19-9b44-1adbec6be7cc'::uuid, '1017092', '21319801000194', 'PR/MG0002489', 'Petro Ouro', 'Ipiranga', 'Rua Noraldino De Lima,  33', 'Piratininga (Parque Durval De Barros)', 'Ibirite', '32423390', -19.99708370, -44.05302040, 4, '2023-11-23'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada']::text[]),
  ('233700b7-df82-518c-9768-65e87abc21c7'::uuid, '1038078', '06372206000200', 'PR/MG0187409', 'Posto De Combustiveis Energia', 'Independente', 'Rua Doutor Ary Teixeira,  311', 'Centro', 'Vespasiano', '33200338', -19.69216990, -43.92168190, 3, '2026-03-03'::date, array['etanol','gasolina']::text[]),
  ('a7e0659c-39d7-5b3d-8815-dfb7cd55a15d'::uuid, '1003054', '01553201000189', 'PR/MG0022864', 'Posto Sinaleiro', 'Ale', 'Rodovia Mg 010,  S/N', 'Sao Damiao', 'Vespasiano', '33200000', -19.76997410, -43.94808560, 4, '2025-06-17'::date, array['diesel_s10','etanol','gasolina','gasolina_aditivada']::text[]),
  ('48123e29-a104-59a1-b530-37f94073712c'::uuid, '1257439', '30539201000122', 'PR/MG0194657', 'Santo Posto Lagoa Santa - Comercio De Combustiveis', 'Raízen', 'Rua Pinto Alves,  1059', 'Quebra', 'Lagoa Santa', '33400000', -19.62009800, -43.89996200, 4, '2026-03-04'::date, array['diesel_s10','diesel_s500','etanol','gasolina','gasolina_aditivada']::text[]),
  ('f5ec7dd6-f72e-5739-89b1-08c6cf569ad4'::uuid, '1307546', '41966222000140', 'PR/MG0248941', 'Posto De Combustiveis Lagoa Santa', 'Independente', 'Rua Pinto Alves,  3935', 'Moradas Da Lapinha', 'Lagoa Santa', '33231530', -19.59426300, -43.90844070, 4, '2026-03-04'::date, array['diesel_s10','etanol','gasolina','gasolina_aditivada']::text[]);
do $$ begin
  if (select count(*) from anp_wave) <> 20 or (select count(distinct cnpj) from anp_wave) <> 20
    or exists (select 1 from anp_wave w join public.stations s on s.id = w.id)
    or exists (select 1 from anp_wave w join public.station_import_sources src on src.provider = 'ANP' and src.cnpj = w.cnpj)
    or exists (select 1 from anp_wave w join public.stations s on extensions.st_dwithin(s.location, extensions.st_setsrid(extensions.st_makepoint(w.longitude,w.latitude),4326)::extensions.geography, 150))
  then raise exception 'ANP first-wave inventory or distance changed'; end if;
end $$;
insert into public.stations (id,name,brand_id,latitude,longitude,address,neighborhood,city,state,postal_code,status,created_by,source_kind)
select w.id,w.name,b.id,w.latitude,w.longitude,w.address,w.neighborhood,w.city,'MG',nullif(w.postal_code,''),'verified',null,'anp'
from anp_wave w join public.station_brands b on b.name = w.brand;
insert into public.station_import_sources (station_id,provider,external_id,cnpj,anp_authorization,source_url,coordinate_accuracy_m,coordinate_obtained_on,coordinate_reviewed)
select id,'ANP',simp,cnpj,anp_authorization,'https://revendedoresapi.anp.gov.br/v1/combustivel',accuracy,obtained_on,false from anp_wave;
insert into public.station_fuels (station_id,fuel_type_id)
select w.id,f.id from anp_wave w cross join lateral unnest(w.fuel_codes) as code(name)
join public.fuel_types f on f.code = code.name;
do $$ begin
  if (select count(*) from public.station_import_sources src join anp_wave w on w.id=src.station_id) <> 20
     or exists (select 1 from public.price_submissions p join anp_wave w on w.id=p.station_id)
  then raise exception 'ANP first-wave verification failed'; end if;
end $$;
select 'imported_anp_stations' as metric,count(*) from anp_wave;
commit;
