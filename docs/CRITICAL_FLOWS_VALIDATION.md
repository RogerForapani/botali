# Validação dos fluxos críticos — homologação

Estado em 08/10/2026. A auditoria inicial foi somente de leitura no banco `botali-homologacao`. Depois, o usuário criou dados identificados com `[TESTE HML]` para validar os fluxos no APK `preview`. Nada foi promovido para produção. Os demais testes de interface marcados como pendentes ainda precisam ocorrer no aparelho.

## Confirmado nesta rodada

| Área | Resultado | Evidência |
| --- | --- | --- |
| Código mobile | Aprovado | 69 testes em 10 arquivos; checagem de tipos aprovada. |
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

O novo fluxo de entrada (Google em destaque, acesso por e-mail apenas para contas antigas e modo visitante) foi implementado na versão 1.0.2 e passou nas verificações de código. Ainda precisa ser conferido no novo APK Android; a entrada Apple permanece adiada e desativada no Supabase.

1. **Consenso após confirmação:** a contagem, a Atividade e a pontuação da conta que confirmou foram validadas. Uma verificação específica do valor consolidado e da pontuação do autor do preço permanece opcional se houver divergência futura; não usar preços inventados em posto real.
2. **Login por e-mail/senha:** o usuário usa Google e não precisa criar senha. Testar a opção por e-mail separadamente com uma conta descartável antes do beta.
3. **Exclusão de conta:** testar somente com uma conta descartável de homologação, depois de verificar a exportação de dados necessária. A exclusão é irreversível e não foi executada nesta rodada.

## Critério para avançar

Não promover alertas ou outras migrações para produção até concluir os testes manuais relevantes, registrar eventuais correções e revisar o checklist de lançamento. Backup restaurável e retenção efetiva permanecem bloqueados conforme o plano vigente.
