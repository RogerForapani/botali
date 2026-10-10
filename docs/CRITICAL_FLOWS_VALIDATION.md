# Validação dos fluxos críticos — homologação

Estado em 09/10/2026. A auditoria inicial foi somente de leitura no banco `botali-homologacao`. Depois, o usuário criou dados identificados com `[TESTE HML]` para validar os fluxos no APK `preview`. Nada foi promovido para produção. Os demais testes de interface marcados como pendentes ainda precisam ocorrer no aparelho.

## Confirmado nesta rodada

| Área | Resultado | Evidência |
| --- | --- | --- |
| Código mobile | Aprovado | 70 testes em 10 arquivos; checagem de tipos aprovada. |
| Código do repositório | Aprovado com avisos existentes | `npm run lint` passou com 3 avisos; `npm run build` passou. |
| Segurança das tabelas | Aprovado por inspeção de permissões | 22 tabelas públicas; 0 sem RLS. `anon` pode consultar postos, mas não tem `SELECT` sobre relatos brutos, confirmações ou perfis. |
| Funções protegidas | Aprovado por inspeção de permissões | Cadastro, correção, moderação, confirmação, exclusão de conta, perfil e registro de push exigem papel autenticado. As funções de moderação verificam `private.is_moderator()` no corpo. Isto não substitui teste de autorização com contas reais. |
| Busca e preço consolidado | Aprovado no banco | 10.000 postos sintéticos presentes; consultas por raio e área retornaram 200; pedido de 500 por raio foi limitado a 200; amostra de 200 postos retornou 800 preços consolidados. |
| Busca no mapa como visitante | Aprovado no Android pelo usuário | Ao mover o mapa e tocar em “Nesta área”, os marcadores e agrupamentos antigos saíram; o agrupamento da nova área abriu ao aproximar e a troca do filtro de combustível acompanhou a busca. |
| Login e sessão Google | Aprovado no Android pelo usuário | O usuário confirmou entrada com Google, troca entre contas e permanência da sessão após fechar e reabrir o aplicativo. Favoritos, veículo e preferência externa de alertas também permaneceram separados por conta. |
| Alertas externos | Aprovado no servidor e no Android pelo usuário | Agendamento ativo; última execução `succeeded`; 0 envios pendentes e 1 recibo conferido. O usuário confirmou recebimento, abertura do posto ao toque e preferência externa preservada após troca de contas. |
| Cadastro e moderação de postos | Aprovado no Android pelo usuário | Cadastro distante com endereço e número ficou pendente e apareceu para o moderador. Após aprovação, o posto apareceu para visitantes. Um segundo cadastro foi rejeitado com motivo, permaneceu invisível para visitantes e o autor recebeu o aviso na Atividade. Testes identificados com `[TESTE HML]` em homologação. |
| Correção de endereço e ponto | Aprovação e rejeição validadas no Android pelo usuário | A conta comum sugeriu novo endereço e ponto para o posto de teste. O marcador permaneceu na posição anterior enquanto a solicitação estava pendente; o moderador viu as posições antiga e proposta; após aprovação, endereço e marcador mudaram juntos. Em outra sugestão, a rejeição preservou endereço e ponto, e o autor recebeu o motivo na Atividade. |
| Veículo e comparação de custos | Aprovado no Android pelo usuário | Cadastro com gasolina e etanol de consumos diferentes exibiu duas linhas de custo por 100 km; sem posição, o deslocamento ficou indisponível; após a ação explícita de localização, distância e estimativa de ida e volta apareceram para ambos. O usuário confirmou que o veículo não foi compartilhado entre contas, reapareceu ao voltar para a primeira e que a posição expirou após cinco minutos sem remover o custo por 100 km. |
| Mapa e contribuição sem internet | Aprovado no Android pelo usuário | Sem internet, os postos e preços permaneceram visíveis no mapa com aviso de falta de conexão, e o botão de envio ficou indisponível com mensagem compreensível. Após reconectar, o botão foi reabilitado e o usuário conseguiu enviar valores de combustíveis no posto de teste em homologação. |
| Confirmação presencial de preço | Aprovada no Android pelo usuário | O usuário confirmou o preço estando no posto e verificou que a contagem de confirmações aumentou, a ação apareceu na Atividade e a pontuação da conta que confirmou mudou. |
| Retenção | Somente simulação aprovada | `private.apply_data_retention(false)` retornou `dry-run` com 0 itens elegíveis em todas as categorias. Nenhuma limpeza foi executada. |

## Achado de isolamento entre contas

Corrigido no código: cada conta usa uma chave local própria e o visitante tem uma lista separada. A lista antiga, sem dono identificável, permanece acessível apenas ao visitante e é mantida como backup. Testes automatizados cobrem isolamento, migração e toques rápidos. Após a OTA de identificação da conta, o usuário confirmou no Android que um favorito novo da conta A não apareceu na conta B e que o preço passou a caber no cartão de Favoritos. **Isolamento de favoritos e layout do preço aprovados no aparelho.**

## Ainda precisa ser exercitado no APK atual

O novo fluxo de entrada (Google em destaque, acesso por e-mail apenas para contas antigas e modo visitante) foi implementado na versão 1.0.2 e passou nas verificações de código. Google e visitante foram confirmados no APK Android; o acesso legado por e-mail ainda não foi testado. A entrada Apple permanece adiada e desativada no Supabase.

Em 08/10/2026, três solicitações de build Android `preview` para a versão 1.0.2 falharam antes da compilação com `CREDENTIALS_TEMPORARY_NETWORK_ERROR`/HTTP 503 no serviço da Expo, inclusive usando a versão atual do EAS CLI. Builds: `2f37e6fe-2f99-44a5-999b-c58937b51a61`, `6134ea43-c046-46c8-afc6-176316327755`, `708687bb-6aab-4e78-965e-96e3afffd993`. Na tentativa seguinte, o build `73e6a2f6-7bfc-4112-b25d-efe669cc5241` terminou com sucesso e gerou o APK Android `preview` 1.0.2 (versionCode 8). O usuário confirmou instalação, login Google e acesso como visitante no aparelho. Não reutilizar o APK 1.0.1 para esta mudança nativa.

**Exclusão de conta — teste no aparelho:** com uma conta Google descartável de homologação, o usuário cadastrou um veículo, excluiu a conta e entrou novamente com o mesmo Google. O veículo não reapareceu. Isso confirma o comportamento observado na interface e no armazenamento local; não prova, por si só, a remoção de todas as linhas pessoais no banco. O e-mail da conta de teste não é registrado neste repositório.

**Achado corrigido no código, pendente no aparelho:** o fluxo agora apaga a lista local de favoritos vinculada ao identificador da conta excluída, aguardando eventuais toques pendentes. O teste automatizado confirma que os favoritos do visitante, a lista antiga de visitante e os de outras contas permanecem intactos. A OTA Android `preview` para runtime 1.0.2 foi publicada em 09/10/2026 ([grupo `6bc1613e-7068-4bc2-bd99-feb401259038`](https://expo.dev/accounts/ningas/projects/botali/updates/6bc1613e-7068-4bc2-bd99-feb401259038), update `01a11e9a-c848-70cf-8654-b97ea1300afb`, commit `e873416`). Validar no APK 1.0.2 após receber essa OTA.

1. **Consenso após confirmação:** a contagem, a Atividade e a pontuação da conta que confirmou foram validadas. Uma verificação específica do valor consolidado e da pontuação do autor do preço permanece opcional se houver divergência futura; não usar preços inventados em posto real.
2. **Login por e-mail/senha:** o usuário usa Google e não precisa criar senha. Testar a opção por e-mail separadamente com uma conta descartável antes do beta.
3. **Exclusão de conta:** o fluxo básico foi exercitado com conta descartável e veículo local. Em 09/10/2026, uma inspeção somente de leitura na homologação encontrou zero perfis, preços, confirmações, eventos de reputação e regras de alerta sem conta/perfil correspondente. A tabela de auditoria de autenticação estava vazia e o ID antigo não foi preservado, portanto isso não prova a exclusão individual de todas as linhas daquela conta. O Storage não tinha arquivos; o fluxo foi corrigido para remover o avatar pela API antes da exclusão, com 74 testes mobile aprovados, mas ainda precisa de teste no aparelho com foto de uma conta descartável. Não repetir a exclusão na conta principal.

## Critério para avançar

Não promover alertas ou outras migrações para produção até concluir os testes manuais relevantes, registrar eventuais correções e revisar o checklist de lançamento. Backup restaurável e retenção efetiva permanecem bloqueados conforme o plano vigente.
