# Aplicativo mobile

Aplicativo principal do botali para Android e iOS, construído com React Native, Expo e TypeScript.

## Estado atual

- mapa nativo com filtros de gasolina, etanol, diesel e recarga
- comparação flex nos marcadores
- postos, serviços e consenso de preços carregados do Supabase
- fallback demonstrativo quando o backend não estiver configurado
- cadastro e entrada por e-mail com sessão persistente
- atualização rápida de preço para usuários autenticados
- rota externa até o posto
- lembretes inteligentes opcionais com geofencing, permanência mínima e limite de frequência
- navegação inferior entre Explorar, Favoritos, Contribuir, Atividade e Perfil
- favoritos persistidos localmente
- componentes reutilizáveis alinhados ao Design System oficial

## Executar

```powershell
npm install
npm run android
```

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

## Localização

O app solicita localização em primeiro plano somente quando o usuário toca no botão de localização. Usuários autenticados podem ativar separadamente os lembretes inteligentes no perfil. Somente essa ação inicia o pedido de localização em segundo plano, notificações e geofences.

Os lembretes exigem permanência mínima de três minutos, têm limite global de um por dia e não repetem a mesma sugestão para um posto durante sete dias.
