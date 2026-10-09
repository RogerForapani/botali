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
| Alertas externos | Aprovado no servidor e no Android pelo usuário | Agendamento ativo; última execução `succeeded`; 0 envios pendentes e 1 recibo conferido. O usuário confirmou recebimento, abertura do posto ao toque e preferência externa preservada após troca de contas. |
| Cadastro e moderação de postos | Aprovado no Android pelo usuário | Cadastro distante com endereço e número ficou pendente e apareceu para o moderador. Após aprovação, o posto apareceu para visitantes. Um segundo cadastro foi rejeitado com motivo, permaneceu invisível para visitantes e o autor recebeu o aviso na Atividade. Testes identificados com `[TESTE HML]` em homologação. |
| Correção de endereço e ponto | Aprovação e rejeição validadas no Android pelo usuário | A conta comum sugeriu novo endereço e ponto para o posto de teste. O marcador permaneceu na posição anterior enquanto a solicitação estava pendente; o moderador viu as posições antiga e proposta; após aprovação, endereço e marcador mudaram juntos. Em outra sugestão, a rejeição preservou endereço e ponto, e o autor recebeu o motivo na Atividade. |
| Veículo e comparação de custos | Aprovado no Android pelo usuário | Cadastro com gasolina e etanol de consumos diferentes exibiu duas linhas de custo por 100 km; sem posição, o deslocamento ficou indisponível; após a ação explícita de localização, distância e estimativa de ida e volta apareceram para ambos. O usuário confirmou que o veículo não foi compartilhado entre contas, reapareceu ao voltar para a primeira e que a posição expirou após cinco minutos sem remover o custo por 100 km. |
| Contribuição sem internet | Bloqueio e recuperação aprovados no Android pelo usuário | Sem internet, o botão de envio de preço ficou indisponível com uma mensagem compreensível; após reconectar, foi reabilitado. A resposta não confirmou explicitamente um envio posterior nem a inspeção do cache nesta rodada. |
| Retenção | Somente simulação aprovada | `private.apply_data_retention(false)` retornou `dry-run` com 0 itens elegíveis em todas as categorias. Nenhuma limpeza foi executada. |

## Achado de isolamento entre contas

Corrigido no código: cada conta usa uma chave local própria e o visitante tem uma lista separada. A lista antiga, sem dono identificável, permanece acessível apenas ao visitante e é mantida como backup. Testes automatizados cobrem isolamento, migração e toques rápidos. Após a OTA de identificação da conta, o usuário confirmou no Android que um favorito novo da conta A não apareceu na conta B e que o preço passou a caber no cartão de Favoritos. **Isolamento de favoritos e layout do preço aprovados no aparelho.**

## Ainda precisa ser exercitado no APK atual

1. **Consulta sem conta:** o usuário confirmou que o teste como visitante funcionou. Permanecem para conferência separada a troca de combustível/filtros, “Nesta área” e o comportamento dos agrupamentos.
2. **Login e sessão:** entrar pelo Google e por e-mail, fechar/reabrir o app, sair e trocar entre duas contas. Cada conta deve manter apenas seus próprios alertas, atividade e veículo. A preferência de push e a separação dos favoritos após troca de contas já foram confirmadas pelo usuário no Android.
3. **Preço e confirmação presencial:** em um posto real, enviar gasolina e etanol com valores distintos; verificar ambos no detalhe. Outra conta, dentro do limite de 200 m, confirma um preço. Conferir contagem, consenso, atividade e pontos de cada participante. Não usar preços inventados em posto real.
4. **Offline:** confirmar nesta versão que o mapa mantém os postos em cache, mostra aviso de falta de conexão e atualiza os dados após reconectar. O bloqueio e a reabilitação do envio de preço já foram confirmados; um envio posterior não foi explicitamente informado.
5. **Exclusão de conta:** testar somente com uma conta descartável de homologação, depois de verificar a exportação de dados necessária. A exclusão é irreversível e não foi executada nesta rodada.

## Critério para avançar

Não promover alertas ou outras migrações para produção até concluir os testes manuais relevantes, registrar eventuais correções e revisar o checklist de lançamento. Backup restaurável e retenção efetiva permanecem bloqueados conforme o plano vigente.
