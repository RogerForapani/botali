# Política de Privacidade do Botali

Última atualização: 10 de outubro de 2026.

O Botali é o aplicativo responsável pelas práticas descritas nesta política. Para dúvidas, solicitações sobre seus dados ou exclusão de conta, escreva para **rogerforapani@gmail.com**. A identificação formal do responsável pelo tratamento será concluída antes da publicação na loja.

## Dados utilizados

O Botali permite consultar postos sem criar conta. Ao entrar com Google ou criar uma conta, usamos nome e e-mail para autenticação, identificação das próprias contribuições, prevenção de abuso e moderação. O e-mail não é exibido no mapa. O perfil comunitário pode guardar um nome de exibição, uma foto escolhida da galeria, a preferência de visibilidade e o resumo das contribuições; a visibilidade é privada por padrão.

A localização precisa é acessada somente após uma ação do usuário. Ela é usada em tempo real para centralizar o mapa, preencher o endereço de um novo posto e validar presença em um posto. A coordenada precisa enviada para validação não é gravada no histórico: armazenamos apenas o posto, o dia e a distância aproximada.

Os lembretes automáticos de visita, que usavam geofences e localização em segundo plano, foram adiados e não estão disponíveis no APK-base 1.0.3. O aplicativo desativa os registros antigos de geofences ao abrir. Uma versão de teste anterior pode continuar com a permissão concedida no aparelho até ser substituída pelo novo APK; ela pode ser revogada nas configurações do Android. O Botali não mantém um histórico de deslocamentos.

Alertas de preço também são opcionais e desligados por padrão. Para criá-los, você escolhe um combustível, preço máximo, raio e área exibida no mapa; o centro dessa área é arredondado a duas casas decimais antes de ser guardado no Supabase. Não usamos localização em segundo plano para esses alertas. Os avisos aparecem na Atividade, enquanto a configuração fica no Perfil. Somente com uma segunda escolha sua registramos um token de notificação do aparelho para avisos externos via Expo; esse token é desvinculado ao desativar o envio externo, desativar o alerta ou sair da conta. Os avisos guardam o posto, combustível, preço, confiança, data e estado de leitura/entrega e são removidos com a conta.

Se você cadastrar um veículo no Perfil, tipo, marca, modelo, ano, combustível e consumo médio ficam somente no armazenamento local deste aparelho, separados por conta; não são enviados ao Supabase. Esse armazenamento local não é criptografado pelo Botali. A posição precisa obtida por sua ação para calcular distância e custo estimado fica apenas na memória do aplicativo por até cinco minutos, sem ser salva no cadastro do veículo. A estimativa usa distância em linha reta, que pode ser menor que a rota real.

Contribuições podem incluir preços, cadastros e correções de postos. O mapa exibe dados de postos aprovados e preços consolidados, sem o e-mail do autor. Relatos individuais e solicitações de correção são acessíveis somente ao autor e à moderação, conforme as regras de acesso do banco.

## Compartilhamento e segurança

Não vendemos dados pessoais e não usamos localização para publicidade. O Botali usa Google para entrada na conta e mapas, Supabase para autenticação, banco e armazenamento privado de fotos, e Expo para distribuição, atualizações e notificações externas opcionais. Esses fornecedores podem processar os dados necessários para cada serviço, conforme suas próprias políticas.

O acesso ao banco aplica regras por usuário. Resultados públicos de preço e visita são agregados; contribuições brutas e identificadores individuais não são expostos ao público.

Para diagnóstico técnico, o aplicativo pode manter no próprio aparelho uma lista curta de falhas sanitizadas e métricas agregadas de duração e sucesso das buscas. Esse diagnóstico não inclui coordenadas, e-mail, token, termo pesquisado ou posto selecionado e somente sai do aparelho quando o usuário escolhe compartilhá-lo manualmente.

## Retenção

A coordenada precisa usada para validar presença é processada somente para calcular a distância até o posto e é descartada imediatamente. O último preço conhecido de cada posto e combustível pode permanecer para evitar que o mapa perca a referência histórica, sempre marcado como desatualizado quando aplicável.

Os prazos de 90 dias para visitas, 180 dias para confirmações e 24 meses para relatos e correções são **metas da política de retenção**, não uma limpeza automática já em execução. A rotina de remoção e anonimização efetiva permanece desativada até que um backup restaurável seja validado. Enquanto isso, os registros identificáveis podem permanecer além desses prazos, salvo exclusão de conta ou solicitação atendida pelo canal de privacidade. Essa pendência precisa ser resolvida antes do beta público.

O prazo planejado para remover comentários livres de avaliações é de 12 meses sem edição; essa remoção automática também está desativada. Dados públicos do estabelecimento e decisões essenciais de moderação podem permanecer anonimizados para preservar a integridade do mapa e da auditoria. Consulte a [política operacional de retenção](https://github.com/RogerForapani/botali/blob/main/docs/DATA_RETENTION_POLICY.md).

## Controle do usuário

Você pode remover os dados do veículo a qualquer momento no Perfil. Também pode excluir sua conta dentro do aplicativo. Essa exclusão remove autenticação, perfil, foto enviada ao armazenamento do Botali, preços enviados e solicitações pessoais, além do veículo e dos favoritos dessa conta salvos neste aparelho. No pedido por e-mail, os dados locais precisam ser removidos no próprio aparelho ou com a desinstalação do aplicativo. Postos já publicados e registros de moderação podem permanecer de forma anônima para manter a integridade do mapa e da auditoria.

Para pedir acesso, correção, informações sobre compartilhamento ou exclusão dos seus dados, escreva para **rogerforapani@gmail.com**. Se não tiver mais o aplicativo, veja [como pedir a exclusão da conta pela Web](https://github.com/RogerForapani/botali/blob/main/docs/ACCOUNT_DELETION.md). Não envie senha ou código de autenticação por e-mail.
