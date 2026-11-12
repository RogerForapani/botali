# Preparação do AAB Android do beta Botali

Verificação de 11/11/2026. O AAB de homologação foi compilado; **ainda não é o AAB final de produção**.

## Candidato gerado

- Build EAS: `fad6789d-3161-4b0e-9c9e-bb9b4feac9c0` (`FINISHED`), perfil `beta-hml`, distribuição de loja.
- App `com.botali.app`, versão `1.0.5`, versionCode `13`; ambiente e canal `preview` apontados à homologação testada.
- Código do build: commit `01ee409` da branch de preparação; assinatura com as credenciais Android remotas já existentes no EAS.
- Arquivo local: `C:\Users\roger\Downloads\Botali-beta\botali-beta-hml-1.0.5-13.aab` (60.994.778 bytes).
- SHA-256: `DECE96D509C6B34477C14ECF55828C7BF5D10F4EF3C87AEBCA880FC35C1B078B`.
- O arquivo abre como pacote ZIP e contém `base/manifest/AndroidManifest.xml`, `BundleConfig.pb` e assinatura em `META-INF`. O manifesto compilado e o certificado da loja ainda precisam de inspeção com ferramentas Android ou pelo Play Console.

## Conferido

- Conta EAS conectada: `ningas`, projeto `@ningas/botali` e identificador de projeto compatível com `app.config.js`.
- Configuração do aplicativo: nome Botali, pacote Android `com.botali.app`, versão 1.0.5, canal de atualização de produção separado e runtime por fingerprint.
- Perfil `production` em `eas.json`: Android `app-bundle`, incremento de versão remoto, ambiente `production`.
- Nomes das variáveis exigidas presentes no ambiente EAS de produção: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `GOOGLE_MAPS_ANDROID_API_KEY`. **Valores e destino ainda precisam de conferência protegida**; nenhum segredo foi impresso ou incluído aqui.
- Conferência posterior: a URL pública do ambiente EAS `production` aponta para `nvklcukgqggndzocezjc`, projeto antigo; o ambiente `preview` aponta para a homologação testada `phsvoeljsaksglqrpstm`. Foi criado o perfil `beta-hml` de AAB, com ambiente e canal `preview`, para evitar um pacote candidato ligado ao projeto antigo. As chaves sensíveis não foram exibidas.
- Configuração bloqueia `ACCESS_BACKGROUND_LOCATION` e `FOREGROUND_SERVICE_LOCATION`. Confirmar o manifesto efetivo do AAB, pois a configuração não prova sozinha o resultado compilado.

## Antes de iniciar o build candidato

1. Integrar a branch de preparação revisada à base escolhida para a loja. Há uma PR de trabalho com documentos e ensaio de restauro; o primeiro AAB `beta-hml` é candidato de teste, não pacote final de produção.
2. Confirmar que as variáveis de produção apontam ao projeto Supabase pretendido para o beta e que a chave Google Maps está restrita ao pacote e certificado de assinatura da loja.
3. Conferir o estado das migrações, regras RLS, função de alertas, política e URLs públicas no ambiente que o AAB usará. Não promover dados ou migrações da homologação de forma implícita.
4. Executar `npm run lint`, `npm run build` e os testes relevantes na revisão final da branch integrada.
5. Gerar AAB pelo perfil `production`, registrar ID do build, versão, canal e fingerprint. Inspecionar manifesto, permissões, identificador do pacote, assinatura, SDKs e variáveis públicas incorporadas.
6. Testar a instalação por faixa interna do Google Play, com visitante, login, mapa, preço, moderação, foto, alerta, exclusão e OTA. Comparar os resultados à [declaração de dados provisória](PLAY_DATA_SAFETY_DRAFT.md) e à [política](PRIVACY_POLICY.md) antes da faixa fechada ou pública.

O [checklist de loja](STORE_RELEASE.md) e a [revisão jurídica preliminar](LEGAL_REVIEW_BETA_20261111.md) concentram os demais portões do beta.
