-- Relatorio sem alteracao de dados. Execute primeiro no SQL Editor.
select private.apply_data_retention(false);

-- A aplicacao efetiva deve ocorrer somente depois de validar o relatorio,
-- restauracao de backup e homologacao. Nao descomente no banco de producao
-- sem cumprir o checklist de docs/DATA_RETENTION_POLICY.md.
-- select private.apply_data_retention(true);
