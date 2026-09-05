# Aplicativo mobile

Aplicativo principal do botali para Android e iOS, construído com React Native, Expo e TypeScript.

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

Nesta primeira etapa, o app solicita apenas localização em primeiro plano e somente quando o usuário toca no botão de localização. Geofencing e localização em segundo plano serão habilitados posteriormente, depois do onboarding específico e da adesão explícita aos lembretes inteligentes.
