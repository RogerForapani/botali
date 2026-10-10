# Política de retenção de dados do botali

Última atualização: 10 de outubro de 2026.

## Princípios

O botali mantém somente o necessário para mostrar preços, proteger a comunidade, atender solicitações do usuário e medir o produto. A política reduz vínculos pessoais com o tempo e preserva estatísticas agregadas e a trilha essencial de moderação.

Os prazos abaixo são metas iniciais de produto para alpha e beta, **não prazos efetivamente executados hoje**. A limpeza e anonimização automáticas continuam desativadas porque ainda não foi validado um backup restaurável. Até lá, dados identificáveis podem permanecer além dos períodos indicados. Os prazos e suas bases devem ser revisados antes do lançamento público e sempre que surgir nova finalidade de tratamento.

## Prazos

| Dado | Retenção identificável | Destino ao vencer |
| --- | --- | --- |
| Coordenada usada para confirmar presença | Transitória | Calcula a distância e é descartada imediatamente |
| Visita ao posto (usuário, dia e distância) | 90 dias | Consolida contagem diária sem usuário; agregado permanece por 36 meses |
| Confirmação ou divergência de preço | 180 dias | Consolida totais mensais sem usuário; agregado permanece por 36 meses |
| Relato de preço | 24 meses | Consolida estatística mensal e remove o relato, mantendo sempre o último preço conhecido de cada posto/combustível |
| Comentário livre de avaliação | 12 meses desde a última edição | Remove o texto; notas estruturadas permanecem enquanto a conta existir |
| Voto de correção e evento de reputação | 24 meses | Exclui o evento individual |
| Correção de posto resolvida | 24 meses | Remove autor e conteúdo anterior/proposto; preserva posto, decisão e datas |
| Autor de posto rejeitado | 12 meses | Remove o vínculo com a conta; o registro evita perder contexto operacional |
| Autor de posto publicado ou serviço | 24 meses | Remove o vínculo com a conta; o dado público do posto permanece |
| Identidade e motivo do moderador | 24 meses | Anonimiza ator e texto; preserva decisão e data |
| Estatísticas agregadas arquivadas | 36 meses | Exclui o agregado vencido |
| Diagnóstico no aparelho | 20 falhas e 20 grupos de métricas | Substituição automática pelos registros mais recentes |
| Conta, perfil e dados ativos | Enquanto a conta existir | Exclusão ou anonimização conforme a função “Excluir minha conta” |

Dados cadastrais públicos do posto são informações do estabelecimento e permanecem enquanto ele existir no mapa. Correções continuam passando por moderação.

## Garantias técnicas

- A coordenada precisa nunca permanece em `price_submissions`; somente a distância aproximada calculada pode ser gravada.
- A rotina não remove o último preço conhecido de um posto/combustível, mesmo após 24 meses, para preservar o aviso de preço desatualizado.
- Tabelas agregadas ficam no schema `private`, sem acesso de visitantes ou usuários autenticados.
- A função de retenção fica no schema `private` e não pode ser chamada pelo aplicativo.
- Cada execução efetiva gera um resumo em `private.data_retention_runs` por até 12 meses.
- A exclusão de conta remove a autenticação e rompe vínculos pessoais conforme as chaves estrangeiras; decisões de moderação e dados públicos podem permanecer anonimizados.

## Operação segura

1. Executar `supabase/retention/retention_dry_run.sql` e guardar as contagens.
2. Validar a restauração de um backup recente em homologação.
3. Aplicar a retenção em homologação e conferir preços antigos, atividade, moderação e contagens agregadas.
4. Repetir o teste de carga e o snapshot de observabilidade.
5. Somente então executar `select private.apply_data_retention(true);` em produção.
6. Conferir `private.data_retention_runs`, volume das tabelas e erros do Postgres.

Não há agendamento automático nesta etapa. O projeto gratuito atual não oferece backup restaurável incluído; a rotina efetiva será agendada com `pg_cron` apenas depois do checklist acima e da definição de backup do beta.

## Validação inicial em produção

Em 28/09/2026, a estrutura desta política foi aplicada no projeto Supabase e validada sem executar a limpeza efetiva. O `dry-run` encontrou zero registros vencidos em todas as categorias. A auditoria anterior confirmou 1.230 relatos de preço e nenhuma coordenada exata armazenada em `price_submissions`.

Também foram confirmados: tabelas privadas de agregação e auditoria disponíveis, descarte imediato da localização precisa, bloqueio da rotina para `anon` e `authenticated` e suporte à anonimização do autor de correções. A execução efetiva e o agendamento continuam desabilitados até a validação de restauração de backup e o ensaio em homologação.

## Revisão

Revisar esta política a cada seis meses, antes de mudanças no algoritmo de confiança e sempre que forem adicionados novos dados, integrações ou finalidades. Incidentes, obrigações legais e solicitações válidas podem exigir preservação temporária; a exceção deve ser documentada, limitada e aprovada pelo responsável do produto.
