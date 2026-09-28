# Ambientes do Botali

## Produção

- Supabase atual: `preco-na-bomba`.
- EAS: ambiente e canal `production`.
- Não recebe dados demonstrativos, ensaios destrutivos ou migrações sem validação prévia.
- A rotina efetiva de retenção permanece sem agendamento até a restauração de backup ser comprovada.

## Homologação

- Supabase: `botali-homologacao` (`phsvoeljsaksglqrpstm`).
- Região: São Paulo (`sa-east-1`), igual à produção.
- EAS: ambiente e canal `preview`.
- Usa URL e chave pública próprias; segredos nunca são versionados.
- Pode receber massa artificial de 10 mil postos e 80 mil relatos para testes.

### Estado em 28/09/2026

- Projeto criado e saudável no plano gratuito.
- Todas as 19 migrações aplicadas em uma única transação.
- 17 tabelas públicas com RLS habilitada.
- Busca por raio, busca pelos limites do mapa e consenso disponíveis.
- Agregados privados e rotina de retenção disponíveis; `dry-run` sem itens em banco vazio.
- Catálogo inicial com 10 combustíveis e 18 bandeiras.
- Auth configurado com URL principal e redirecionamento `botali://auth/callback`.
- Variáveis do Supabase separadas no EAS: `preview` usa homologação; `development` e `production` continuam na produção.
- Pendente: configurar o provedor Google, carregar dados sintéticos e executar testes ponta a ponta.

## Preparação do banco

1. [x] Criar o projeto com Data API habilitada, exposição automática de novas tabelas desabilitada e RLS automático habilitado.
2. [x] Aplicar todas as migrações de `supabase/migrations/` em ordem.
3. [x] Configurar autenticação e URLs de redirecionamento específicas da homologação.
4. [x] Cadastrar `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY` no ambiente `preview` do EAS.
5. Executar os testes de contratos, RLS, autenticação, moderação e exclusão de conta.
6. Carregar somente dados sintéticos identificáveis e removíveis.

## Validação antes do beta

1. Restaurar um backup em ambiente isolado e documentar o resultado.
2. Executar o teste ponta a ponta com pelo menos 10 mil postos.
3. Guardar snapshot de observabilidade antes e depois da carga.
4. Executar a retenção em modo `dry-run` e depois efetivamente somente em homologação.
5. Confirmar preços, atividade, moderação, agregados e anonimização após a retenção.
6. Gerar um build `preview` conectado exclusivamente à homologação.
7. Promover código e migrações para produção somente após aprovação do checklist.

## Regras de segurança

- Nunca copiar usuários reais, tokens, senhas ou coordenadas precisas para homologação.
- Nunca apontar um build `preview` para produção durante testes destrutivos.
- Não armazenar chaves em commits, documentação, logs ou capturas de tela.
- Tratar migração aplicada em produção como etapa separada e explicitamente aprovada.
