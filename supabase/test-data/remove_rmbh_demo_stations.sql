-- Executar somente quando os testes terminarem.
-- As tabelas dependentes são limpas por ON DELETE CASCADE.

delete from public.stations
where name like '[DEMO RMBH]%';
