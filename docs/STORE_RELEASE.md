# Checklist de lançamento

## Estado em 10/10/2026

O usuário validou Google, visitante, troca de contas, mapa, contribuição offline/online, moderação, confirmação presencial e exclusão de conta descartável com foto no APK `preview` 1.0.2. A consulta posterior no bucket privado de avatares retornou zero arquivos. A OTA de 10/10/2026 desativou os lembretes automáticos na versão instalada. O [novo APK `preview` 1.0.3](https://expo.dev/accounts/ningas/projects/botali/builds/5f09a0dc-2e06-4fc8-8b12-087c3eef7680) foi compilado; a inspeção do `AndroidManifest.xml` empacotado não encontrou `ACCESS_BACKGROUND_LOCATION` nem `FOREGROUND_SERVICE_LOCATION`, mas encontrou `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`. Ainda falta testar esse APK no aparelho. Esses resultados autorizam continuar os testes fechados; **não equivalem à liberação do beta público ou à promoção para produção**.

## Validação do APK 1.0.4 em 27/10/2026

O [APK `preview` 1.0.4 (11)](https://expo.dev/accounts/ningas/projects/botali/builds/36676d9a-b74a-42c9-b4e0-9e6c6a8fff40) foi instalado no Android do responsável. A [OTA de teste](https://expo.dev/accounts/ningas/projects/botali/updates/684e5116-d79d-4797-918b-4f46b869b0c4) foi confirmada pelo diagnóstico enviado do aparelho: `01a18009-59a8-7ea4-b4d6-8aa3e478bf49 | runtime 1.0.4 | OTA`. O manifesto empacotado no APK 1.0.4 contém `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`, sem `ACCESS_BACKGROUND_LOCATION` ou `FOREGROUND_SERVICE_LOCATION`. O primeiro build por `fingerprint` falhou porque o EAS calculou hashes diferentes antes e depois do prebuild Android; esta base usa `appVersion`. O canal OTA funciona nesta base, mas a migração para `fingerprint` continua pendente para o beta público.

## Ensaio de fingerprint no APK 1.0.5 em 27/10/2026

O diff do build com falha mostrou apenas `expoConfig.platforms` como diferença efetiva: antes do prebuild, `android,ios,web`; depois, `android,ios`. A entrada `bareNativeDir` adicionada tinha hash nulo. Fixamos `platforms: ['android', 'ios']` no `app.config.js` e mudamos o runtime para `fingerprint`. O hash local ficou igual antes e depois de `expo prebuild --platform android`.

O [APK `preview` 1.0.5 (12)](https://expo.dev/accounts/ningas/projects/botali/builds/3e1fe37f-7332-4e85-8547-bef265075231) terminou com runtime `424585fc47a5de21ca3c31c17a46d41b1d343867`. A [OTA de teste](https://expo.dev/accounts/ningas/projects/botali/updates/cc648025-5acb-4d15-8321-71eed3ed6b9c) foi publicada com o mesmo runtime; uma consulta ao servidor do canal `preview` retornou HTTP 200 e o ID correto da atualização (`01a18021-371e-7521-ac77-38ab82c6939c`). O manifesto empacotado no APK contém localização em primeiro plano e não contém `ACCESS_BACKGROUND_LOCATION` nem `FOREGROUND_SERVICE_LOCATION`. Falta instalar o APK 1.0.5 no aparelho e confirmar a OTA pelo diagnóstico do Botali antes de considerar o ensaio completo no dispositivo.

Antes do beta público Android, permanecem como portões:

- [ ] Validar backup restaurável em ambiente isolado. Enquanto isso, não ativar retenção destrutiva nem limpeza automática.
- [x] Aplicar e validar em homologação a migração da progressão comunitária; conferir pontos, níveis e badges antes e depois de uma retenção simulada com `ROLLBACK`. A retenção permanente continua pendente do backup recente.
- [ ] Testar o acesso legado por e-mail/senha com conta descartável, já que o método continua disponível para contas antigas.
- [x] Repetir autorização/RLS pela API com sessões reais de usuário comum e moderador. O usuário confirmou 6/6 em cada conta no APK de homologação em 10/10/2026; ver `CRITICAL_FLOWS_VALIDATION.md`.
- [x] Identificar o responsável na política de privacidade: Roger Junio Marques Forapani, pessoa física; contato público rogerforapani@gmail.com.
- [ ] Concluir as pendências da revisão de privacidade em `PRIVACY_REVIEW.md` e obter avaliação jurídica profissional antes da publicação. A análise preliminar e correções de transparência foram feitas em 10/10/2026.
- [ ] Validar o canal Web/e-mail de exclusão de conta e seu atendimento antes da Play Store.
- [x] Gerar o APK-base 1.0.4 e validar no aparelho a OTA do canal `preview` com runtime compatível.
- [x] Resolver a divergência do runtime por `fingerprint` no EAS e gerar uma base compatível no canal `preview`; resta confirmar a OTA no aparelho com o APK 1.0.5.
- [x] Conferir no APK 1.0.4 a ausência de permissão de localização em segundo plano.
- [ ] Revisar as declarações da Play Store e repetir a inspeção do manifesto no APK-base final antes da publicação.

A assinatura Apple Developer e a publicação iOS continuam adiadas; não são dependências para os testes Android em homologação. A promoção de migrações, alertas e OTA ao ambiente de produção exige aprovação separada.

## Configuração técnica concluída

- Identificadores: `com.botali.app` no Android e iOS.
- Builds EAS separados em `development`, `preview` (APK) e `production` (AAB/lojas).
- Canais de atualização separados. APKs até 1.0.4 usam runtime derivado da versão do aplicativo; o APK de ensaio 1.0.5 usa fingerprint das dependências e da configuração nativa.
- Google Maps configurado para receber chaves restritas específicas de Android e iOS.
- Ícones adaptativos, splash, temas claro/escuro e deep link `botali://auth/callback`.
- Exclusão de conta iniciada dentro do aplicativo.

## Antes de enviar às lojas

- Criar uma chave iOS do Google Maps restrita ao bundle `com.botali.app` e cadastrar `GOOGLE_MAPS_IOS_API_KEY` no ambiente de produção do EAS.
- Confirmar que a chave Android está restrita ao pacote `com.botali.app` e aos certificados corretos.
- Revisar juridicamente a política pública e testar o e-mail de suporte. A identificação do responsável como pessoa física já foi informada pelo titular do projeto.
- Preencher as declarações de privacidade considerando e-mail/nome, localização precisa usada em primeiro plano sob ação do usuário e conteúdo enviado pelo usuário; não declarar localização em segundo plano no novo APK-base.
- No primeiro beta Android, não declarar localização em segundo plano: os lembretes automáticos foram adiados. Verificar que a permissão não aparece no APK final. Se o recurso voltar, preparar declaração, divulgação destacada e vídeo antes da publicação.
- Criar screenshots reais em aparelhos representativos e revisar textos da página da loja.
- Gerar e testar um build `preview`; somente depois gerar o build `production`.
- Publicar atualizações OTA primeiro no canal `preview` e promover para `production` após validação.

Referências oficiais:

- [EAS Update](https://docs.expo.dev/eas-update/getting-started/)
- [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Localização em segundo plano no Google Play](https://support.google.com/googleplay/android-developer/answer/9799150)
- [Data safety do Google Play](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Privacidade na App Store](https://developer.apple.com/app-store/app-privacy-details/)
