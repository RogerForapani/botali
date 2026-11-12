# Preparação do AAB Android do beta Botali

Verificação de 11/11/2026. Este registro prepara o build de loja; **ainda não é o AAB final**.

## Conferido

- Conta EAS conectada: `ningas`, projeto `@ningas/botali` e identificador de projeto compatível com `app.config.js`.
- Configuração do aplicativo: nome Botali, pacote Android `com.botali.app`, versão 1.0.5, canal de atualização de produção separado e runtime por fingerprint.
- Perfil `production` em `eas.json`: Android `app-bundle`, incremento de versão remoto, ambiente `production`.
- Nomes das variáveis exigidas presentes no ambiente EAS de produção: `EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY` e `GOOGLE_MAPS_ANDROID_API_KEY`. **Valores e destino ainda precisam de conferência protegida**; nenhum segredo foi impresso ou incluído aqui.
- Configuração bloqueia `ACCESS_BACKGROUND_LOCATION` e `FOREGROUND_SERVICE_LOCATION`. Confirmar o manifesto efetivo do AAB, pois a configuração não prova sozinha o resultado compilado.

## Antes de iniciar o build candidato

1. Integrar a branch de preparação revisada à base escolhida para a loja. Há uma PR de trabalho com documentos e ensaio de restauro; não compilar uma branch antiga nem carregar variáveis do projeto de restauro isolado.
2. Confirmar que as variáveis de produção apontam ao projeto Supabase pretendido para o beta e que a chave Google Maps está restrita ao pacote e certificado de assinatura da loja.
3. Conferir o estado das migrações, regras RLS, função de alertas, política e URLs públicas no ambiente que o AAB usará. Não promover dados ou migrações da homologação de forma implícita.
4. Executar `npm run lint`, `npm run build` e os testes relevantes na revisão final da branch integrada.
5. Gerar AAB pelo perfil `production`, registrar ID do build, versão, canal e fingerprint. Inspecionar manifesto, permissões, identificador do pacote, assinatura, SDKs e variáveis públicas incorporadas.
6. Testar a instalação por faixa interna do Google Play, com visitante, login, mapa, preço, moderação, foto, alerta, exclusão e OTA. Comparar os resultados à [declaração de dados provisória](PLAY_DATA_SAFETY_DRAFT.md) e à [política](PRIVACY_POLICY.md) antes da faixa fechada ou pública.

O [checklist de loja](STORE_RELEASE.md) e a [revisão jurídica preliminar](LEGAL_REVIEW_BETA_20261111.md) concentram os demais portões do beta.
