# Checklist de lançamento

## Estado em 09/10/2026

O APK Android `preview` 1.0.2 permanece em homologação. O usuário validou Google, visitante, troca de contas, mapa, contribuição offline/online, moderação, confirmação presencial e exclusão de conta descartável com foto. A consulta posterior no bucket privado de avatares retornou zero arquivos. Esses resultados autorizam continuar os testes fechados; **não equivalem à liberação do beta público ou à promoção para produção**.

Antes do beta público Android, permanecem como portões:

- [ ] Validar backup restaurável em ambiente isolado. Enquanto isso, não ativar retenção destrutiva nem limpeza automática.
- [ ] Testar o acesso legado por e-mail/senha com conta descartável, já que o método continua disponível para contas antigas.
- [ ] Repetir autorização/RLS pela API com sessões reais de usuário comum e moderador, incluindo tentativas de escrita indevida. A simulação `READ ONLY` dos papéis no PostgreSQL passou em 09/10/2026; ver `CRITICAL_FLOWS_VALIDATION.md`.
- [ ] Revisar a política de privacidade, publicá-la em URL acessível e definir o contato de suporte.
- [ ] Preparar um novo APK-base com runtime por `fingerprint` antes do beta público e validar seu canal OTA.
- [ ] Revisar as declarações da Play Store, sobretudo localização opcional em segundo plano, e testar o build candidato em aparelho.

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
- Publicar a política de privacidade em URL pública e adicionar o contato de suporte.
- Preencher as declarações de privacidade considerando e-mail/nome, localização precisa usada em tempo real, localização em segundo plano opcional e conteúdo enviado pelo usuário.
- Para o Google Play, preparar a declaração, a divulgação destacada dentro do app e o vídeo demonstrando por que o lembrete de visita usa localização em segundo plano.
- Criar screenshots reais em aparelhos representativos e revisar textos da página da loja.
- Gerar e testar um build `preview`; somente depois gerar o build `production`.
- Publicar atualizações OTA primeiro no canal `preview` e promover para `production` após validação.

Referências oficiais:

- [EAS Update](https://docs.expo.dev/eas-update/getting-started/)
- [Runtime versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [Localização em segundo plano no Google Play](https://support.google.com/googleplay/android-developer/answer/9799150)
- [Data safety do Google Play](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Privacidade na App Store](https://developer.apple.com/app-store/app-privacy-details/)
