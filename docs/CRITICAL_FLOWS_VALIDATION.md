# Validação dos fluxos críticos — homologação

Estado em 07/10/2026. Esta rodada é somente de leitura no banco `botali-homologacao`; nenhum dado foi criado, removido ou promovido para produção. Testes de interface marcados como pendentes precisam ocorrer no APK `preview` atual.

## Confirmado nesta rodada

| Área | Resultado | Evidência |
| --- | --- | --- |
| Código mobile | Aprovado | 69 testes em 10 arquivos; checagem de tipos aprovada. |
| Código do repositório | Aprovado com avisos existentes | `npm run lint` passou com 3 avisos; `npm run build` passou. |
| Segurança das tabelas | Aprovado por inspeção de permissões | 22 tabelas públicas; 0 sem RLS. `anon` pode consultar postos, mas não tem `SELECT` sobre relatos brutos, confirmações ou perfis. |
| Funções protegidas | Aprovado por inspeção de permissões | Cadastro, correção, moderação, confirmação, exclusão de conta, perfil e registro de push exigem papel autenticado. As funções de moderação verificam `private.is_moderator()` no corpo. Isto não substitui teste de autorização com contas reais. |
| Busca e preço consolidado | Aprovado no banco | 10.000 postos sintéticos presentes; consultas por raio e área retornaram 200; pedido de 500 por raio foi limitado a 200; amostra de 200 postos retornou 800 preços consolidados. |
| Alertas externos | Aprovado no servidor e no Android pelo usuário | Agendamento ativo; última execução `succeeded`; 0 envios pendentes e 1 recibo conferido. O usuário confirmou recebimento, abertura do posto ao toque e preferência externa preservada após troca de contas. |
| Retenção | Somente simulação aprovada | `private.apply_data_retention(false)` retornou `dry-run` com 0 itens elegíveis em todas as categorias. Nenhuma limpeza foi executada. |

## Achado de isolamento entre contas

Corrigido no código: cada conta usa uma chave local própria e o visitante tem uma lista separada. A lista antiga, sem dono identificável, permanece acessível apenas ao visitante e é mantida como backup. Testes automatizados cobrem isolamento, migração e toques rápidos. Após a OTA de identificação da conta, o usuário confirmou no Android que um favorito novo da conta A não apareceu na conta B e que o preço passou a caber no cartão de Favoritos. **Isolamento de favoritos e layout do preço aprovados no aparelho.**

## Ainda precisa ser exercitado no APK atual

1. **Consulta sem conta:** o usuário confirmou que o teste como visitante funcionou. Permanecem para conferência separada a troca de combustível/filtros, “Nesta área” e o comportamento dos agrupamentos.
2. **Login e sessão:** entrar pelo Google e por e-mail, fechar/reabrir o app, sair e trocar entre duas contas. Cada conta deve manter apenas seus próprios alertas, atividade e veículo. A preferência de push e a separação dos favoritos após troca de contas já foram confirmadas pelo usuário no Android.
3. **Preço e confirmação presencial:** em um posto real, enviar gasolina e etanol com valores distintos; verificar ambos no detalhe. Outra conta, dentro do limite de 200 m, confirma um preço. Conferir contagem, consenso, atividade e pontos de cada participante. Não usar preços inventados em posto real.
4. **Cadastro e moderação:** cadastrar um posto distante com endereço manual e número; ele deve ficar pendente e visível apenas ao autor/moderação. Aprovar ou rejeitar com motivo e conferir o aviso na Atividade. Não há posto ou correção pendente no banco neste momento.
5. **Correção de posto:** sugerir endereço e ponto no mapa; antes da aprovação, o marcador permanece no lugar antigo. Após aprovar, endereço e posição mudam juntos. Rejeição deve preservar os dados e avisar o autor.
6. **Veículo e cálculo:** cadastrar dois combustíveis com consumos diferentes; conferir custo por 100 km e ida/volta em linha reta no mesmo posto. Sem posição recente, a distância deve ficar indisponível; após solicitar GPS, deve aparecer. A posição expira da memória em 5 minutos.
7. **Offline:** com o mapa já carregado, desligar a internet e confirmar cache/aviso; tentar contribuir deve mostrar erro compreensível sem envio. Ao reconectar, atualizar dados e enviar normalmente.
8. **Exclusão de conta:** testar somente com uma conta descartável de homologação, depois de verificar a exportação de dados necessária. A exclusão é irreversível e não foi executada nesta rodada.

## Critério para avançar

Não promover alertas ou outras migrações para produção até concluir os testes manuais relevantes, registrar eventuais correções e revisar o checklist de lançamento. Backup restaurável e retenção efetiva permanecem bloqueados conforme o plano vigente.
