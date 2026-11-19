# Revisão de segurança do beta — início em 18/11/2026

Esta revisão está em andamento. Os resultados abaixo não liberam o beta fechado e não indicam exploração no aplicativo instalado.

## Distribuição Android verificada

- Botali 1.0.5 (16) foi instalado pela Play (`installerPackageName=com.android.vending`).
- Localização precisa e aproximada aparecem como permissões de primeiro plano concedidas. `ACCESS_BACKGROUND_LOCATION` e `SYSTEM_ALERT_WINDOW` não aparecem no pacote instalado.
- O mapa inicialmente ficou em branco por falha de autorização da chave Android. O log do SDK informou a assinatura efetiva `EF:B7:39:B1:F2:51:7E:C0:C9:A9:45:58:39:20:0F:57:4F:11:EC:E8` para `com.botali.app`. Após acrescentá-la à chave restrita ao pacote e ao Maps SDK for Android, o mapa exibiu ruas e postos no mesmo aparelho, sem novo APK ou OTA.
- A Play Console lista a assinatura observada no aparelho como chave de assinatura anterior, com primeiro uso em 18/11/2026 às 16:22. A chave atual da Play tem SHA-1 `EE:85:CC:29:29:3B:EC:F6:DB:A2:97:29:91:DF:64:27:C0:F1:20:D0`. Manter ambos permitidos para `com.botali.app` enquanto a Play puder distribuir versões com qualquer um dos certificados.

## Dependências: triagem inicial

`npm audit --omit=dev --json` em `apps/mobile` encontrou 15 avisos: 1 crítico, 5 altos e 9 moderados. Isto conta pacotes da árvore de dependências usada pelo projeto; não prova que cada pacote ou caminho vulnerável entre no AAB ou seja alcançável no aparelho.

- `shell-quote@1.10.0`: aviso crítico [GHSA-pqg4-j6r4-53mv](https://github.com/advisories/GHSA-pqg4-j6r4-53mv), introduzido pela cadeia `react-native → react-devtools-core → shell-quote`; a versão corrigida indicada é 1.11.0. O cenário descrito exige uma sequência específica de tokens não confiáveis passada a um shell. Verificar se esse caminho é usado somente em desenvolvimento antes de classificar o risco do AAB.
- `source-map-js@1.2.1`: aviso alto [GHSA-68fv-2mgg-jv7q](https://github.com/advisories/GHSA-68fv-2mgg-jv7q), na cadeia `expo → @expo/metro-config → postcss → source-map-js`; a versão corrigida indicada é 1.2.2. Verificar se essa cadeia é apenas de build.
- `node-forge@1.4.0` aparece nas cadeias `expo-updates → @expo/code-signing-certificates` e `expo → @expo/cli`. Também há avisos transitivos em `glob`, `minimatch`, `brace-expansion`, `uuid` e `zod`. Triage por caminho de uso, versão corrigida compatível e presença no pacote final antes de qualquer atualização.

Não aplicar `npm audit fix` automaticamente: uma mudança de dependências pode alterar o fingerprint nativo, exigir novo AAB e invalidar a comparação com o build 16 testado.

Em 19/11/2026, a triagem repetiu `npm audit --omit=dev --json`: os totais continuaram em 15 (1 crítico, 5 altos, 9 moderados), todos transitivos exceto `expo-updates`. A cadeia do aviso crítico passa por `react-devtools-core`; a referência a esse pacote em `react-native/Libraries/Core/setUpReactDevTools.js` está dentro de `if (__DEV__)`. `node-forge` foi encontrado nos módulos de geração/configuração de certificados da CLI do `expo-updates`; `source-map-js` aparece via PostCSS no transformador do Metro. Essas observações sugerem caminhos de desenvolvimento/build para os três casos, mas não comprovam ausência dos pacotes no AAB nem encerram os demais avisos. O AAB contém `base/assets/index.android.bundle`; falta conferir a alcançabilidade no pacote final antes de reclassificar o risco.

Uma leitura de strings do `base/assets/index.android.bundle` do AAB 16 não encontrou os literais `react-devtools-core`, `shell-quote`, `node-forge`, `source-map-js`, `service_role` nem `BEGIN PRIVATE KEY`. Essa verificação é uma triagem de superfície e não prova ausência de código minificado ou de segredos em outros arquivos nativos. Não houve atualização automática de dependências.

## Achados confirmados em 19/11/2026

### 1. Combustíveis de postos pendentes tinham leitura pública (alto)

Na homologação, a política `station_fuels_public_read` permitia `SELECT` a visitantes e usuários autenticados sem verificar o estado do posto. A tabela `stations` restringe a leitura dos postos pendentes, mas uma consulta direta a `station_fuels` podia revelar o identificador do posto e os combustíveis cadastrados. A consulta pontual encontrou **zero linhas pendentes** naquele momento; portanto, não há evidência de dados pendentes efetivamente expostos nessa verificação. O risco surgiria no próximo cadastro pendente.

Correção em `202611190001_security_scope_station_contributions.sql`: visitante lê somente combustíveis de postos verificados; usuário autenticado também lê os seus próprios postos pendentes; moderador pode ler os pendentes para revisão. Teste local de isolamento passou para visitante, autor, outro usuário e moderador. **Aplicada na homologação em 19/11/2026; versão registrada como `202611190001`.**

### 2. Escritas diretas contornavam validação de contribuição (alto para integridade)

O papel `authenticated` tinha `INSERT` direto em `station_edit_requests` e `station_edit_votes`. A política de edição verificava autoria e estado `pending`, mas não as validações de campos e frequência do RPC `create_station_edit_suggestion_v3`. Também era possível submeter preço para posto rejeitado ou pendente de outro usuário porque `private.prepare_price_submission()` não consultava o estado do posto. Na consulta pontual, havia zero edições pendentes; não foi demonstrada manipulação de registros existentes.

A migração revoga os dois `INSERT` diretos, preserva o RPC validado, limita a uma edição de perfil pendente por usuário e posto e bloqueia preço para postos rejeitados ou pendentes de outro autor. Preserva envio ao próprio posto pendente e a regra de cinco minutos para preço repetido. O replay isolado de **35 migrações** e o teste de visitante, autor, outro usuário e moderador passaram, inclusive a chamada de edição pelo RPC. **Aplicada na homologação em 19/11/2026.**

### 3. Retorno de login aceita tokens em link do aplicativo (alto para sessão; exploração não demonstrada)

O cliente Supabase usa o fluxo OAuth implícito padrão. `finishAuthRedirect()` aceita `access_token` e `refresh_token` no link `botali://auth/callback`, usa comparação por prefixo (`startsWith`) e chama `setSession()`. Assim, um link recebido com tokens válidos pode substituir a sessão sem iniciar o login pelo botão; o esquema de URL próprio também transporta tokens no retorno. Não há evidência de que isso tenha ocorrido, mas o fluxo merece correção antes de ampliar o beta.

Foi preparada uma mudança local para PKCE com troca de código, validação exata do destino, rejeição de tokens no link e prevenção de processamento duplo do mesmo retorno. Quatro testes de unidade do retorno passaram; a biblioteca Supabase instalada gerou desafio PKCE `s256` e guardou o verificador em um ensaio local sem rede. A suíte móvel completa passou com 85 testes em 14 arquivos, além de `typecheck`, lint e build. Ainda é necessário testar login Google, cancelamento, retorno após fechar o aplicativo e troca de contas no Android distribuído antes de publicar OTA. A sessão atual é persistida em `AsyncStorage`; avaliar armazenamento protegido do sistema e migração segura da sessão, o que pode exigir novo AAB. **Nenhuma mudança no login foi publicada nesta revisão.**

### 4. Dependências sinalizadas exigem triagem por alcançabilidade (em aberto)

O `npm audit` continua com 15 avisos. Os caminhos inspecionados para `shell-quote`, `source-map-js` e `node-forge` apontam para desenvolvimento, build ou certificados, e a busca de strings no bundle do AAB não os encontrou. Isso não cobre todas as formas de empacotamento nem os demais avisos. Atualizar versões compatíveis em branch isolada, repetir auditoria e os testes do AAB; não tratar a contagem bruta como 15 falhas exploráveis no aplicativo.

## Verificações concluídas e limites

- O AAB 16 instalado pela Play não declara localização em segundo plano nem permissão para sobreposição de tela. A chave Maps está restrita ao SDK Android e aos certificados observados da distribuição Play.
- Uma busca focada no Git rastreado não encontrou marcadores de chave privada, `sb_secret_` nem atribuição literal de `service_role` com valor longo. A chave privilegiada da função de alertas é lida de variável de ambiente do servidor. Essa busca não é uma inspeção de todos os binários, histórico Git ou serviços externos.
- As políticas privadas do bucket `profile-avatars` exigem pasta com o identificador da conta para escrita. Não foi executado teste autenticado de exfiltração de arquivos nesta rodada.
- `npm run lint`, `npm run build` e `apps/mobile` `npm run typecheck` passaram após preparar a migração; o lint exibiu três avisos já existentes. O teste SQL passou no banco isolado e terminou com `ROLLBACK`.
- Antes da aplicação, o backup automático de 19/11 às 10h terminou às 10:00:55, com comprovante SHA-256 e verificação de saúde às 11h (`healthy: true`). O pré-teste encontrou zero combustíveis de postos pendentes, zero edições pendentes, zero grupos duplicados de edição e a versão ainda ausente. A execução no SQL Editor terminou com `Success. No rows returned`. O pós-teste confirmou a versão uma vez, duas políticas de leitura restritas, os dois privilégios de `INSERT` diretos removidos, índice único presente e guarda de estado do posto no gatilho. Não houve teste de envio real pelo aplicativo nesta rodada.
- Após a migração, o responsável testou no aplicativo Play o redirecionamento do visitante ao login Google e, em conta autenticada, confirmou o envio de preço e a sugestão de alteração de posto. Os detalhes das contas e dos postos não foram solicitados nesta rodada.

## Próximas verificações

1. O smoke test da instalação Play passou em login Google, sessão ao reabrir, perfil, histórico, busca, detalhes, contribuição, abertura do posto por notificação externa, bloqueio do envio sem internet e reconexão. Isso valida esses fluxos no aparelho testado; a revisão de segurança ainda depende dos itens seguintes.
2. Confirmar no aplicativo Play o carregamento de postos e preços como visitante, o envio de preço e a sugestão de alteração pelo RPC; testar cadastro pendente e fila de moderação com contas de teste. O banco isolado já passou; a validação de ponta a ponta depois da migração ainda falta.
3. Migrar o login para PKCE e validar o retorno do Google no Android distribuído, inclusive links malformados e sessão persistida; tratar o armazenamento de sessão em etapa compatível com novo AAB.
4. Verificar políticas do Storage com duas contas reais de teste, inventário de credenciais e escopo de cada serviço; seguir com revisão de abuso de confirmação, pontuação e alertas.
5. Atualizar dependências de forma controlada e repetir build, teste interno e `npm audit`.
