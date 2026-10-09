# Entrada com Apple — pendências de ativação

Decisão atual: adiar a assinatura Apple Developer e a ativação do provedor Apple no Supabase. O beta Android continua com Google e modo visitante. Não publicar iOS enquanto os itens abaixo não estiverem concluídos.

O cliente iOS usa `expo-apple-authentication` e entrega ao Supabase um ID token com nonce. O botão nativo só aparece quando o dispositivo oferece esse recurso. O Android continua com Google e modo visitante. Contas antigas de e-mail/senha ainda conseguem entrar pelo acesso discreto, mas o aplicativo não oferece mais cadastro novo por senha.

Antes de publicar um build iOS:

1. No Apple Developer, habilitar Sign in with Apple para o App ID `com.botali.app` e configurar a assinatura do aplicativo.
2. No projeto Supabase usado pelo build, habilitar o provedor Apple e incluir `com.botali.app` entre os Client IDs aceitos para ID tokens nativos. Conferir as exigências atuais do painel antes de salvar. Não guardar chaves ou secrets neste repositório.
3. Gerar **novo build iOS** após ativar `ios.usesAppleSignIn` e o plugin Expo. A versão instalada anteriormente não recebe essa capacidade via OTA.
4. Testar em iPhone real: primeiro acesso, retorno à sessão, cancelamento, e-mail privado da Apple, troca entre Google e Apple, modo visitante, contribuição, saída e exclusão de conta.
5. Conferir se uma pessoa que já usa Google não cria um segundo perfil comunitário ao escolher ocultar o e-mail na Apple. Vinculação de identidades requer fluxo explícito e não deve ser presumida.

Não desativar o provedor de e-mail no Supabase enquanto houver contas antigas que dependam dele. A interface foi simplificada, mas o acesso legado permanece.
