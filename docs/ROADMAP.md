# Roadmap do Botali

O roadmap preserva o foco do Botali em preços confiáveis e contribuições rápidas. Funcionalidades sociais entram de forma gradual, depois que segurança, moderação e operação estiverem prontas.

## Sequência aprovada

1. **Homologação, backup e estabilidade**
   - Manter um projeto Supabase separado da produção.
   - Validar restauração de backup, migrações, retenção e carga em homologação.
   - Concluir os testes presenciais de confirmação de preço e os fluxos críticos do aplicativo.
   - Decisão de 30/09/2026: o backup restaurável automático fica adiado enquanto o Supabase permanecer no plano gratuito. A retenção destrutiva continua desabilitada e esta pendência deve ser concluída antes do beta público.
2. **Perfil comunitário**
   - Exibir nome público, avatar, nível, progresso e resumo de contribuições validadas.
   - Conceder níveis por qualidade e confirmação, não apenas por volume.
   - Permitir que o usuário controle a visibilidade do perfil.
3. **Níveis e badges**
   - Criar níveis graduais e recompensas visuais sem vantagens que afetem o consenso de preços.
   - Conceder o badge permanente de participante do beta pelo servidor, com data e trilha de auditoria.
   - Recarregar o resumo comunitário ao reabrir o Perfil após uma contribuição: hoje o cartão consulta o banco apenas quando `user.id` muda, então a pontuação exibida pode ficar desatualizada.
   - Antes de ativar a retenção, decidir se níveis e conquistas comuns são históricos ou recalculados: a função atual conta registros vivos, e a remoção futura de confirmações antigas pode reduzir pontos.
4. **Veículo e custo de deslocamento**
   - Guardar inicialmente no aparelho combustível, consumo médio e dados opcionais do veículo.
   - Mostrar custo estimado de ida e volta e economia líquida ao escolher um posto.
   - Identificar o resultado como estimativa e não como garantia de consumo.
5. **Beta e aprendizado**
   - Medir retenção, qualidade das contribuições, abuso e utilidade dos níveis.
   - Ajustar incentivos antes de ampliar funcionalidades sociais.
6. **Mural da Comunidade**
   - Pilotar depois do lançamento estável, inicialmente em Belo Horizonte e região metropolitana.
   - Usar publicações estruturadas por cidade, posto, categoria e validade, em vez de chat livre.
   - Exigir termos, denúncia, bloqueio, limitação de frequência, moderação e expiração automática.
7. **Seguidores e mensagens privadas**
   - Avaliar seguidores somente após validar o mural e os controles de privacidade.
   - Mensagens privadas dependem de demanda comprovada, opção explícita, bloqueio, denúncia e capacidade operacional de moderação.

## Fora do escopo inicial

- Chat anônimo ou aleatório.
- Mensagens privadas abertas por padrão.
- Pontos concedidos apenas pela quantidade de envios.
- Ranking que revele localização, rotina ou histórico detalhado do usuário.
- Uso de alertas comunitários enquanto o usuário dirige.

## Critérios de passagem

Uma etapa só avança quando a anterior estiver testada, documentada e sem regressões críticas. Recursos sociais não devem ser ativados publicamente antes de existir política de conteúdo, termos de uso, denúncia, bloqueio, moderação e retenção específica para conteúdo comunitário.
