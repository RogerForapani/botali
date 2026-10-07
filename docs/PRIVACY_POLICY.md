# Política de Privacidade do Botali

Última atualização: 7 de outubro de 2026.

## Dados utilizados

O Botali permite consultar postos sem criar conta. Ao criar uma conta, usamos nome e e-mail para autenticação, identificação das próprias contribuições, prevenção de abuso e moderação.

A localização precisa é acessada somente após uma ação do usuário. Ela é usada em tempo real para centralizar o mapa, preencher o endereço de um novo posto e validar presença em um posto. A coordenada precisa enviada para validação não é gravada no histórico: armazenamos apenas o posto, o dia e a distância aproximada.

Os lembretes inteligentes de visita são opcionais e ficam desligados por padrão. Quando ativados, usam geofences e localização em segundo plano para reconhecer uma permanência provável próxima a um posto. O aplicativo limita a frequência das sugestões e não mantém um histórico de deslocamentos.

Alertas de preço também são opcionais e desligados por padrão. Para criá-los, você escolhe um combustível, preço máximo, raio e área exibida no mapa; o centro dessa área é arredondado a duas casas decimais antes de ser guardado no Supabase. Não usamos localização em segundo plano para esses alertas. Os avisos aparecem no Perfil. Somente com uma segunda escolha sua registramos um token de notificação do aparelho para avisos externos via Expo; esse token é removido ao desativar o envio externo, desativar o alerta ou sair da conta. Os avisos guardam o posto, combustível, preço, confiança, data e estado de leitura/entrega e são removidos com a conta.

Se você cadastrar um veículo no Perfil, tipo, marca, modelo, ano, combustível e consumo médio ficam somente no armazenamento local deste aparelho, separados por conta; não são enviados ao Supabase. Esse armazenamento local não é criptografado pelo Botali. A posição precisa obtida por sua ação para calcular distância e custo estimado fica apenas na memória do aplicativo por até cinco minutos, sem ser salva no cadastro do veículo. A estimativa usa distância em linha reta, que pode ser menor que a rota real.

Contribuições podem incluir preços, cadastros e correções de postos. Esses dados podem permanecer públicos ou auditáveis para preservar a qualidade do serviço, sem exibir o e-mail do autor.

## Compartilhamento e segurança

Não vendemos dados pessoais e não usamos localização para publicidade. O Botali usa Supabase para autenticação e banco de dados, Google Maps para o mapa e Expo para distribuição e atualizações do aplicativo. Cada fornecedor pode processar os dados técnicos necessários para operar seu serviço.

O acesso ao banco aplica regras por usuário. Resultados públicos de preço e visita são agregados; contribuições brutas e identificadores individuais não são expostos ao público.

Para diagnóstico técnico, o aplicativo pode manter no próprio aparelho uma lista curta de falhas sanitizadas e métricas agregadas de duração e sucesso das buscas. Esse diagnóstico não inclui coordenadas, e-mail, token, termo pesquisado ou posto selecionado e somente sai do aparelho quando o usuário escolhe compartilhá-lo manualmente.

## Retenção

A coordenada precisa usada para validar presença é processada somente para calcular a distância até o posto e é descartada imediatamente. Visitas identificáveis permanecem por até 90 dias; confirmações de preço, por até 180 dias; relatos de preço e trilhas pessoais de correção, por até 24 meses. Depois desses prazos, os vínculos pessoais são removidos ou os registros são consolidados em estatísticas sem identificação, mantidas por até 36 meses. O último preço conhecido de cada posto e combustível pode permanecer para evitar que o mapa perca a referência histórica, sempre marcado como desatualizado quando aplicável.

Comentários livres de avaliações são removidos após 12 meses sem edição. Dados públicos do estabelecimento e decisões essenciais de moderação podem permanecer anonimizados para preservar a integridade do mapa e da auditoria. A política operacional completa está em `docs/DATA_RETENTION_POLICY.md`.

## Controle do usuário

Você pode desligar os lembretes inteligentes e remover os dados do veículo a qualquer momento no Perfil. Também pode excluir sua conta dentro do aplicativo. A exclusão remove autenticação, perfil, preços enviados e solicitações pessoais, além do veículo salvo neste aparelho; postos já publicados e registros de moderação podem permanecer de forma anônima para manter a integridade do mapa e da auditoria.

Para dúvidas ou solicitações de privacidade, use o contato do responsável pelo aplicativo informado na página do Botali na loja.
