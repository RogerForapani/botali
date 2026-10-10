# Checklist de lançamento

## Estado em 10/10/2026

O usuário validou Google, visitante, troca de contas, mapa, contribuição offline/online, moderação, confirmação presencial e exclusão de conta descartável com foto no APK `preview` 1.0.2. A consulta posterior no bucket privado de avatares retornou zero arquivos. A OTA de 10/10/2026 desativou os lembretes automáticos na versão instalada. O [novo APK `preview` 1.0.3](https://expo.dev/accounts/ningas/projects/botali/builds/5f09a0dc-2e06-4fc8-8b12-087c3eef7680) foi compilado; a inspeção do `AndroidManifest.xml` empacotado não encontrou `ACCESS_BACKGROUND_LOCATION` nem `FOREGROUND_SERVICE_LOCATION`, mas encontrou `ACCESS_FINE_LOCATION` e `ACCESS_COARSE_LOCATION`. Ainda falta testar esse APK no aparelho. Esses resultados autorizam continuar os testes fechados; **não equivalem à liberação do beta público ou à promoção para produção**.

Antes do beta público Android, permanecem como portões:

- [ ] Validar backup restaurável em ambiente isolado. Enquanto isso, não ativar retenção destrutiva nem limpeza automática.
- [ ] Testar o acesso legado por e-mail/senha com conta descartável, já que o método continua disponível para contas antigas.
- [x] Repetir autorização/RLS pela API com sessões reais de usuário comum e moderador. O usuário confirmou 6/6 em cada conta no APK de homologação em 10/10/2026; ver `CRITICAL_FLOWS_VALIDATION.md`.
- [ ] Revisar juridicamente a política de privacidade e identificar formalmente o responsável. O texto já está acessível por URL e o contato público é rogerforapani@gmail.com.
- [ ] Validar o canal Web/e-mail de exclusão de conta e seu atendimento antes da Play Store.
- [ ] Preparar um novo APK-base com runtime por `fingerprint` antes do beta público e validar seu canal OTA.
- [ ] Testar no aparelho o novo APK-base sem permissão de localização em segundo plano e revisar as declarações da Play Store. A compilação e a conferência do manifesto foram concluídas em 10/10/2026.

A assinatura Apple Developer e a publicação iOS continuam adiadas; não são dependências para os testes Android em homologação. A promoção de migrações, alertas e OTA ao ambiente de produção exige aprovação separada.

## Configuração técnica concluída

- Identificadores: `com.botali.app` no Android e iOS.
- Builds EAS separados em `development`, `preview` (APK) e `production` (AAB/lojas).
- Canais de atualização separados e runtime compatível derivado da versão do aplicativo.
- Google Maps configurado para receber chaves restritas específicas de Android e iOS.
- Ícones adaptativos, splash, temas claro/escuro e deep link `botali://auth/callback`.
- Exclusão de conta iniciada dentro do aplicativo.

## Antes de enviar às lojas

- Criar uma chave iOS do Google Maps restrita ao bundle `com.botali.app` e cadastrar `GOOGLE_MAPS_IOS_API_KEY` no ambiente de produção do EAS.
- Confirmar que a chave Android está restrita ao pacote `com.botali.app` e aos certificados corretos.
- Confirmar a identificação formal do responsável, revisar juridicamente a política pública e testar o e-mail de suporte.
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
