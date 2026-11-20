# Candidato Android para teste interno — 18/11/2026

## Ambiente e primeira inspeção

O perfil `beta-hml` usa o ambiente e o canal `preview` da homologação `phsvoeljsaksglqrpstm`; não é um pacote de produção. O AAB 1.0.5 (15), build EAS `dd87bc88-3116-48e6-a58f-b39cb66550a5`, foi gerado a partir da revisão móvel `5756c47` e salvo em `C:\Users\roger\Downloads\Botali-beta\botali-beta-hml-1.0.5-15.aab` (61.002.790 bytes, SHA-256 `7F2B1B0B669AD0B5FF0B82C3ED427D9351C2FD16D9533235ED2C302D59B366A0`).

A inspeção do manifesto com `bundletool` confirmou pacote `com.botali.app`, minSdk 24, targetSdk 36, versão 1.0.5 (15), localização precisa/aproximada em primeiro plano, notificações e canal OTA `preview`. `ACCESS_BACKGROUND_LOCATION` e `FOREGROUND_SERVICE_LOCATION` estão ausentes. O JavaScript embutido aponta à homologação; o projeto Supabase antigo não foi encontrado no pacote. A assinatura do AAB foi verificada com `jarsigner`; SHA-1 do certificado de upload `A0:4E:2D:2C:79:0A:51:E7:63:B4:FC:6A:0D:64:2A:90:64:AD:F5:4E`.

O manifesto também continha `SYSTEM_ALERT_WINDOW`, sem uso conhecido no Botali. Essa permissão foi adicionada à lista de bloqueio em `app.config.js`.

## Candidato conferido

O [AAB 1.0.5 (16)](https://expo.dev/accounts/ningas/projects/botali/builds/4fdaffd0-c2a1-430e-ae8f-16e46173060e) terminou com sucesso e foi salvo em `C:\Users\roger\Downloads\Botali-beta\botali-beta-hml-1.0.5-16.aab` (61.002.752 bytes, SHA-256 `C7A6646BD148A4AB20F2161051881F71E6C40DC88D89CCADBFF3FE2BFFEEA4B2`). O manifesto compilado mostra versão 1.0.5 (16), pacote `com.botali.app`, minSdk 24, targetSdk 36 e canal OTA `preview`. A permissão `SYSTEM_ALERT_WINDOW` foi removida; localização em segundo plano e serviço de localização em primeiro plano continuam ausentes. Localização durante o uso e notificações permanecem declaradas. O pacote está assinado pelo mesmo certificado de upload, `jarsigner` confirmou a assinatura, e o JavaScript embutido aponta somente à homologação conhecida.

Na revisão do código, `npm run lint`, `npm run build`, `npm run typecheck` e todos os 81 testes móveis passaram. O lint mantém três avisos preexistentes. O AAB 16 foi aceito pela Play e publicado somente na faixa de teste interno em 18/11/2026, como `Botali 1.0.5 (16) - teste interno`. A faixa aparece ativa e disponível para testadores internos. A lista inicial contém `rogerjunio333@gmail.com`. Ainda não houve instalação pela loja nem teste do certificado de assinatura distribuído pelo Google Play.

O certificado de assinatura da Play tem SHA-1 `EE:85:CC:29:29:3B:EC:F6:DB:A2:97:29:91:DF:64:27:C0:F1:20:D0` e SHA-256 `FF:A7:E7:FE:93:82:37:23:F6:CE:8A:B7:6A:EB:65:DE:31:4D:71:E4:68:6D:95:BC:47:CB:0E:9E:52:F1:49:EB`. Ele difere do certificado de upload dos APKs EAS. A chave `Botali Android Maps` no Google Cloud agora aceita os dois SHA-1 para `com.botali.app`, mantendo a restrição ao Maps SDK for Android; a gravação foi confirmada ao reabrir a chave. O login Google usa o cliente Web do Supabase e deve ser testado na instalação pela Play. O link de participação `https://play.google.com/apps/internaltest/4700976108644069481` já abriu o convite para `rogerjunio333@gmail.com`; o usuário ainda precisa aceitá-lo pessoalmente.

O APK instalado fora da Play tem assinatura diferente. Por isso, a instalação pela Play provavelmente exigirá remover o APK antigo. O veículo e os favoritos são armazenados localmente no aparelho e podem se perder na desinstalação; conferir e registrar esses dados antes de qualquer troca.

## Portões restantes

- Aceitar o convite de teste pessoalmente e testar a instalação pela loja, mapa, login e dados locais no aparelho. O nome temporário exibido pela Play é `com.botali.app (unreviewed)` até a configuração e revisão da ficha do app.
- O ambiente EAS `production` ainda aponta ao Supabase antigo `nvklcukgqggndzocezjc`. O AAB `beta-hml` **não** resolve a preparação da produção nem autoriza promover a base de dados.
- Revisar juridicamente as bases legais, transferências e declarações de dados; completar a ficha da loja e testar a versão já publicada na faixa interna. O teste em APK/OTA não substitui a instalação via Play.
- Observar a execução diária normal do backup após o sucesso iniciado manualmente pelo Agendador em 18/11 e manter o alerta local ativo.
