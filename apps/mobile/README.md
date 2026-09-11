# Aplicativo mobile

Aplicativo principal do botali para Android e iOS, construído com React Native, Expo e TypeScript.

## Estado atual

- mapa nativo com filtros de gasolina, etanol, diesel e recarga
- comparação flex nos marcadores
- postos, serviços e consenso de preços carregados do Supabase
- mapa e lista alimentados exclusivamente pelos dados reais do Supabase
- tela inicial de autenticação com Google, e-mail e acesso sem conta
- sessão autenticada persistente e consulta pública preservada para visitantes
- atualização rápida de preço para usuários autenticados
- rota externa até o posto
- lembretes inteligentes opcionais com geofencing, permanência mínima, precisão mínima e limite de frequência
- abertura do posto correto ao tocar na notificação de uma visita
- navegação inferior entre Explorar, Favoritos, Contribuir, Atividade e Perfil
- favoritos persistidos localmente
- histórico real dos preços enviados pelo usuário autenticado
- cache local dos postos para consulta temporária sem internet
- restauração da última região e do raio, armazenados somente no aparelho com coordenadas arredondadas
- reconexão com atualização automática e estados claros de carregamento, erro e dados salvos
- testes automatizados das regras de filtro e seleção do menor preço
- componentes reutilizáveis alinhados ao Design System oficial
- perfis EAS para builds de desenvolvimento, preview e produção

## Executar

```powershell
npm install
npm run android
```

Para iniciar o bundler de um development build já instalado:

```powershell
npm run dev-client
```

A primeira compilação nativa exige login em uma conta Expo e associação do projeto no EAS. Depois disso, use `eas build --profile development --platform android` ou `--platform ios`.

Para verificar os tipos:

```powershell
npm run typecheck
```

## Supabase

Copie `.env.example` para `.env.local` e configure somente as chaves públicas:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

### Login com Google

No Supabase, habilite o provedor Google em **Authentication → Providers → Google** usando um Client ID e Client Secret OAuth do Google Cloud. No Google Cloud, cadastre como URI autorizada de redirecionamento a URL de callback exibida pelo próprio Supabase.

Em **Authentication → URL Configuration → Redirect URLs**, adicione:

```text
botali://auth/callback
```

O Client Secret do Google deve permanecer somente no Supabase/Google Cloud e nunca ser incluído no aplicativo ou no repositório.

## Localização

O app solicita localização em primeiro plano somente quando o usuário toca no botão de localização. Usuários autenticados podem ativar separadamente os lembretes inteligentes no perfil. Somente essa ação inicia o pedido de localização em segundo plano, notificações e geofences.

Os lembretes exigem permanência mínima de três minutos e uma posição recente com precisão de até 100 metros. O check-in é validado novamente pelo PostGIS a até 200 metros, tem limite global de um lembrete por dia e não repete a mesma sugestão para um posto durante sete dias. Ao tocar na notificação, o aplicativo abre diretamente o posto correspondente no mapa.
