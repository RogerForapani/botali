# Plano de troca e retorno após restauração

Estado em 08/11/2026: **procedimento preparado, sem troca real do aplicativo principal**. Este documento usa a homologação `phsvoeljsaksglqrpstm` como origem e o ensaio no projeto isolado `madrjvnuycxvrahqhizg` como evidência. A produção `preco-na-bomba` e o canal EAS `production` não participaram do ensaio. Consulte [o registro da restauração](BACKUP_RESTORE_RUNBOOK.md) antes de executar qualquer passo.

## O que foi medido

| Etapa | Resultado observado | Limite da evidência |
| --- | --- | --- |
| Baixar, abrir e restaurar a cópia externa em PostgreSQL local | 46,651 s no total | Não inclui Supabase Auth, Storage como serviço nem aplicativo. |
| Restaurar e conferir o banco em projeto Supabase vazio | 710 s (11 min 50 s) | Não inclui criação do projeto, envio dos arquivos do Storage e configuração dos serviços. |
| Conferir Storage e leitura pública | Imagem sintética com hash igual; consultas de postos e preços passaram | O APK separado foi validado apenas como visitante. |
| Idade do snapshot no início da importação remota | Cerca de 42 min 38 s | É uma medição daquele ensaio, não um objetivo garantido de perda de dados. |
| Trocar o aplicativo principal e voltar à origem | Não medido | Nenhuma atualização do canal `preview` ou `production` apontou para o restauro. |

Portanto, **não há RTO nem RPO garantidos**. O tempo de 710 s descreve somente a importação e a conferência do banco. O acesso por login e as ações autenticadas foram retirados do escopo deste ensaio por decisão do responsável.

## Preparação necessária antes de uma troca real

1. Identificar a origem, o destino, o canal EAS e o runtime exatos do APK instalado. O aplicativo usa URL e chave pública do Supabase incorporadas ao código JavaScript; mudar o destino exige uma atualização compatível ou um novo APK. O perfil `restore-drill-20261108` foi feito somente para o APK separado e **não deve ser promovido** ao aplicativo principal.
2. Definir e ensaiar um modo de impedir novas contribuições durante a troca. O projeto ainda não tem um bloqueio de escritas validado para essa operação; sem ele, podem surgir registros novos em bancos diferentes enquanto alguns aparelhos usam uma atualização antiga.
3. Guardar um backup recente verificado da origem e registrar o instante do último dado aceito. Conferir hash, manifesto, histórico de migrações e versão do código antes de escolher o ponto de recuperação. Preservar a origem e o arquivo externo até a decisão final.
4. Criar um destino **novo e vazio** na região adequada. Restaurar com `prepare_isolated_restore.py` e `restore_isolated_drill.sh`, que verificam o destino e o inventário. Repor separadamente os arquivos binários do Storage e conferir seus hashes. O dump do banco, sozinho, não recupera os bytes dos arquivos.
5. Configurar no destino, sob revisão, as partes que não vêm do banco: Auth/Google, URLs de retorno, Data API, funções, segredos, agendamentos, push e limites de faturamento. Não copiar o token de push de um aparelho para um projeto de teste nem iniciar disparos antes de validar os destinatários.
6. Com a API desligada inicialmente, comparar origem e destino: tabelas, contagens, RLS, permissões, funções, PostGIS, migrações, preços, perfis e Storage. Liberar leitura pública só após esse portão. Para um corte real, validar também login, sessão e contribuição no destino; a decisão de pular esses testes vale apenas para o ensaio de 08/11.

## Troca controlada do aplicativo

1. Registrar uma decisão de seguir ou cancelar: snapshot escolhido, diferença de dados estimada, verificações aprovadas, pessoa responsável e plano de retorno. Sem bloqueio de escritas, teste autenticado e estratégia de conciliação aprovados, **não trocar o aplicativo principal**.
2. Preparar uma atualização do aplicativo principal com a URL e a chave pública do destino, mantendo o mesmo pacote Android e conferindo a compatibilidade do runtime instalado. Publicar primeiro no canal `preview` e testar em aparelho. Uma alteração nativa exige novo APK; a atualização remota só atende builds compatíveis. A troca não é instantânea: aparelhos offline ou que ainda não receberam a atualização podem continuar apontando para a origem.
3. Só depois da validação em `preview`, publicar no canal destinado aos usuários afetados e acompanhar abertura do app, consulta como visitante, login, envios, erros, latência e notificações. Medir o horário da decisão, publicação, primeiro acesso correto e estabilização. Não tratar o horário da publicação como recuperação concluída.
4. Manter origem e destino disponíveis e preservados durante a observação. Não executar retenção destrutiva, limpar filas ou excluir o banco antigo nessa janela.

## Retorno à origem

- **Antes de qualquer escrita aceita no destino:** interromper a distribuição da atualização de troca e republicar a atualização anterior compatível no canal afetado. Conferir no aparelho a versão realmente ativa e consultar a origem. Registrar quanto tempo cada etapa levou. A reversão de uma atualização não força um aparelho offline a baixar a versão anterior imediatamente.
- **Depois de escritas no destino:** bloquear novas escritas nos dois lados, fazer backup do destino e comparar as alterações recebidas desde o corte. Planejar e conferir a importação ou conciliação dessas alterações antes de apontar o aplicativo de volta. Uma simples reversão de OTA não leva os novos preços, cadastros ou moderações de volta ao banco antigo.
- Se a origem não estiver íntegra, manter o destino estável e tratar o incidente como recuperação, não como retorno. Não apagar nenhum dos projetos até validar dados, acesso, Storage e a versão ativa no aparelho.

## Próximo ensaio seguro

Realizar uma simulação de mesa dos passos acima, atribuindo responsáveis e tempos a criação do projeto, envio de Storage, configuração de Auth, preparação da atualização, propagação ao aparelho e retorno. Esse exercício não altera canais EAS nem bancos em uso. Antes de qualquer corte real, implementar e testar o bloqueio de escritas e a conciliação pós-corte; repetir em ambiente isolado a autenticação e uma contribuição, que foram deliberadamente omitidas neste ensaio.

### Decisão com a evidência disponível

| Verificação | Situação em 08/11 |
| --- | --- |
| Banco restaurado, Storage sintético e consulta como visitante | Aprovados no projeto isolado. |
| Login e contribuição no projeto deste ensaio | Não testados, conforme decisão do responsável. |
| Bloqueio de novas escritas, troca do app principal e retorno | Sem ensaio completo. |
| Troca real ou retenção destrutiva | Ainda sem aprovação técnica. O desenvolvimento que não depende dessas operações pode continuar. |

Fontes: [Expo: implantação de atualizações](https://docs.expo.dev/eas-update/deployment/), [compatibilidade de runtime](https://docs.expo.dev/eas-update/runtime-versions/), [reversão de atualizações](https://docs.expo.dev/eas-update/rollbacks/) e [Supabase: restauração para novo projeto](https://supabase.com/docs/guides/platform/clone-project).
