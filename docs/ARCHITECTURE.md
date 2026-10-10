# Arquitetura

## Aplicativo principal

- React Native + Expo + TypeScript para Android e iOS.
- Localização em primeiro plano com `expo-location`; a localização em segundo plano e as geofences ficam adiadas no primeiro beta Android. O aplicativo apenas remove registros legados de geofences.
- Mapa nativo; evitar dependência estrutural de um único provedor.
- A camada de mapas deve permanecer desacoplada para permitir troca futura de provedor sem reescrever regras de negócio.

## Protótipo web

- O código React + Vite atual permanece como referência executável durante a migração.
- Leaflet e OpenStreetMap continuam no protótipo, mas não definem a implementação nativa final.
- Novas funcionalidades de produto devem priorizar o aplicativo mobile.

## Backend e dados

- Supabase para autenticação e acesso à Data API.
- O aplicativo usa OAuth Google e, no iOS, autenticação nativa Apple com token de identidade e nonce validado pelo Supabase. O provedor de e-mail não é desativado no backend enquanto houver contas antigas dependentes dele.
- PostgreSQL + PostGIS para persistência e consultas geoespaciais.
- RLS habilitado e validado antes de exposição em produção.
- Busca por proximidade, raio e duplicidade pertence ao PostGIS, não ao componente de mapa.
- A busca do mapa retorna no máximo 200 postos por página. “Nesta área” consulta o retângulo visível do mapa e substitui os marcadores anteriores; a busca da lista continua usando o raio escolhido. Somente páginas adicionais da mesma consulta são combinadas por identificador. Os resultados são apresentados com agrupamento visual conforme o nível de zoom.
- Correções de coordenadas passam pelo mesmo fluxo protegido de moderação; clientes não atualizam latitude e longitude diretamente.
- Filtros e cadastro consomem o mesmo catálogo ativo de `fuel_types` e `services`; novos tipos não devem exigir listas duplicadas no aplicativo.
- O preço comunitário é calculado por `community_prices_for_stations`; aplicativos recebem somente preço consolidado, confiança e contagens agregadas.
- Tabelas brutas de preços, confirmações e perfis não são legíveis por visitantes anônimos.
- Fotos de perfil ficam em um bucket privado, limitadas a JPEG de 2 MB e acessíveis somente pela pasta do próprio usuário; o banco guarda apenas o caminho do arquivo.
- Antes de excluir a conta, o aplicativo confere a sessão ativa e remove a foto da pasta dessa conta pela Storage API. Se a consulta ou remoção falhar, a exclusão é interrompida para evitar um arquivo pessoal remanescente ou um bloqueio do Supabase; arquivos não devem ser apagados diretamente por SQL.
- Níveis são calculados no PostgreSQL com preços confirmados por terceiros, confirmações limitadas, postos verificados e correções aprovadas. Badges permanentes têm concessão, data, motivo e origem no servidor e não influenciam o consenso.
- A aprovação e rejeição de postos ocorre por função protegida e gera registro em `station_moderation_actions`.
- O aplicativo consulta `user_roles` ao abrir o perfil e apresenta a fila de moderação somente a `moderator` e `admin`; a autorização definitiva continua no PostgreSQL.
- O mobile mantém somente o último resultado agregado de postos em cache local por até sete dias; ao reconectar, o Supabase volta a ser a fonte de verdade e atualiza o cache.
- Ao restaurar o cache, o aplicativo recalcula a idade dos preços; dados offline nunca permanecem com aparência de recentes apenas porque foram salvos anteriormente.
- A última região do mapa é persistida apenas no aparelho, com latitude e longitude arredondadas para três casas decimais.
- O veículo fica no armazenamento local, separado por identificador de conta; não é enviado ao Supabase. Cada combustível do veículo possui consumo próprio. O registro local de combustível único `v1` é migrado para `v2` sem perder o consumo. A posição precisa do motorista usada para distância e estimativa fica somente em memória por até cinco minutos, obtida após ação explícita. O centro do mapa continua definindo a área de consulta, mas não a distância exibida ao usuário.
- Os favoritos ficam no armazenamento local do aparelho, em lista separada por identificador de conta. O visitante tem sua própria lista. A chave antiga, que não identificava o dono, é copiada somente para a lista do visitante e preservada como backup; não é atribuída automaticamente a nenhuma conta. Não há sincronização de favoritos entre aparelhos.
- Alertas de preço usam uma regra por conta em PostgreSQL, com centro da área arredondado a duas casas decimais. Triggers geram avisos internos somente para preço recente e confiável; RLS limita a leitura aos próprios avisos. Um Edge Function server-side opcional envia push via Expo e verifica recibos, com token em `private.price_alert_devices` e segredo de agendamento no Vault, verificado por RPC restrita a `service_role`. Não há consulta de rotas nem GPS de fundo para esses alertas.
- A aba Atividade consulta os avisos da conta e os apresenta acima das contribuições. O push inclui o identificador do evento e do posto; ao tocá-lo, o aplicativo consulta a posição do posto quando necessário, busca a região correspondente e abre seu detalhe. A consulta direta pelo identificador cobre postos além da primeira página geográfica.
- Enquanto o aplicativo está em alpha, builds e atualizações EAS usam a versão do aplicativo como runtime. Antes do beta público, a migração para runtime por `fingerprint` deve ocorrer junto de um novo APK-base, impedindo atualizações nativas incompatíveis.

## Organização evolutiva

```text
src/
├── components/
│   ├── ui/
│   └── botali/
├── features/
├── services/
├── styles/
├── types/
└── utils/
```

O MVP atual ainda é compacto. A migração para essa estrutura deve ocorrer incrementalmente, preservando comportamento e testes de build.

## Segurança

- Somente chaves públicas do Supabase podem chegar ao navegador.
- Nunca versionar `.env.local` nem `service_role`.
- Operações privilegiadas devem ser executadas no backend ou por funções protegidas.
- Geolocalização é dado pessoal: capture somente com ação clara, valide proximidade no banco e retenha o mínimo necessário.
- No beta inicial, solicite somente localização em primeiro plano após ação do usuário. Se geofencing voltar no futuro, exija divulgação destacada antes da permissão de segundo plano e mantenha o processamento local.
- Android suporta até 100 geofences ativas por app; iOS, até 20 regiões. Registre dinamicamente apenas os postos mais próximos.
