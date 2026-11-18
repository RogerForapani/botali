# Candidato Android para teste interno — 18/11/2026

## Ambiente e primeira inspeção

O perfil `beta-hml` usa o ambiente e o canal `preview` da homologação `phsvoeljsaksglqrpstm`; não é um pacote de produção. O AAB 1.0.5 (15), build EAS `dd87bc88-3116-48e6-a58f-b39cb66550a5`, foi gerado a partir da revisão móvel `5756c47` e salvo em `C:\Users\roger\Downloads\Botali-beta\botali-beta-hml-1.0.5-15.aab` (61.002.790 bytes, SHA-256 `7F2B1B0B669AD0B5FF0B82C3ED427D9351C2FD16D9533235ED2C302D59B366A0`).

A inspeção do manifesto com `bundletool` confirmou pacote `com.botali.app`, minSdk 24, targetSdk 36, versão 1.0.5 (15), localização precisa/aproximada em primeiro plano, notificações e canal OTA `preview`. `ACCESS_BACKGROUND_LOCATION` e `FOREGROUND_SERVICE_LOCATION` estão ausentes. O JavaScript embutido aponta à homologação; o projeto Supabase antigo não foi encontrado no pacote. A assinatura do AAB foi verificada com `jarsigner`; SHA-1 do certificado de upload `A0:4E:2D:2C:79:0A:51:E7:63:B4:FC:6A:0D:64:2A:90:64:AD:F5:4E`.

O manifesto também continha `SYSTEM_ALERT_WINDOW`, sem uso conhecido no Botali. Essa permissão foi adicionada à lista de bloqueio em `app.config.js`.

## Candidato conferido

O [AAB 1.0.5 (16)](https://expo.dev/accounts/ningas/projects/botali/builds/4fdaffd0-c2a1-430e-ae8f-16e46173060e) terminou com sucesso e foi salvo em `C:\Users\roger\Downloads\Botali-beta\botali-beta-hml-1.0.5-16.aab` (61.002.752 bytes, SHA-256 `C7A6646BD148A4AB20F2161051881F71E6C40DC88D89CCADBFF3FE2BFFEEA4B2`). O manifesto compilado mostra versão 1.0.5 (16), pacote `com.botali.app`, minSdk 24, targetSdk 36 e canal OTA `preview`. A permissão `SYSTEM_ALERT_WINDOW` foi removida; localização em segundo plano e serviço de localização em primeiro plano continuam ausentes. Localização durante o uso e notificações permanecem declaradas. O pacote está assinado pelo mesmo certificado de upload, `jarsigner` confirmou a assinatura, e o JavaScript embutido aponta somente à homologação conhecida.

Na revisão do código, `npm run lint`, `npm run build`, `npm run typecheck` e todos os 81 testes móveis passaram. O lint mantém três avisos preexistentes. O AAB 16 é o candidato para a faixa interna da Play quando a conta de desenvolvedor existir; ainda não houve instalação pela loja nem teste do certificado de assinatura distribuído pelo Google Play.

## Portões restantes

- A conta Google conectada `rogerjunio333@gmail.com` abre a página de criação de conta de desenvolvedor da Play Console. Não existe ainda uma conta de desenvolvedor acessível para enviar o AAB à faixa interna. A criação envolve aceitar o contrato e pagar a taxa de cadastro; essas etapas cabem ao responsável.
- O ambiente EAS `production` ainda aponta ao Supabase antigo `nvklcukgqggndzocezjc`. O AAB `beta-hml` **não** resolve a preparação da produção nem autoriza promover a base de dados.
- Revisar juridicamente as bases legais, transferências e declarações de dados; completar a ficha da loja e testar pela faixa interna quando a conta Play existir. O teste em APK/OTA não substitui a instalação via Play.
- Observar a execução diária normal do backup após o sucesso iniciado manualmente pelo Agendador em 18/11 e manter o alerta local ativo.
