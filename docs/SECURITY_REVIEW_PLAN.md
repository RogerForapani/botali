# Revisão de segurança antes do beta fechado

Solicitada pelo responsável em 18/11/2026. Esta é uma etapa futura, após a preparação e o teste interno do AAB e antes de ampliar o acesso a participantes do beta fechado. O roteiro não representa uma auditoria concluída nem promete ausência de vulnerabilidades.

## Escopo

1. **Contas e sessão:** login Google, retorno de autenticação, troca e exclusão de contas, persistência de sessão e separação de dados entre usuários.
2. **Banco e Storage:** políticas RLS e permissões de funções com contas de visitante, usuário e moderador; avatares e arquivos privados; acesso a dados pessoais e ações de moderação.
3. **Contribuições e abuso:** envio de preços, confirmação presencial, cadastro/correção/sinalização de postos, limites por usuário, duplicidade, manipulação de pontuação e alertas.
4. **Chaves e serviços externos:** inventário das credenciais Supabase, Google Maps, Expo/FCM e backup; restrições, rotação e ausência de segredos privilegiados no aplicativo, no repositório e nos artefatos publicados.
5. **Aplicativo e distribuição:** permissões efetivas do AAB, links recebidos, arquivos enviados, bibliotecas, atualizações OTA, separação de homologação e produção e certificado de assinatura distribuído pela Play.
6. **Operação:** registros de erro sem dados sensíveis, recuperação de conta, restauração de backup, capacidade de revogar acessos e resposta a incidentes.

## Forma de validação

- Começar por inventário e modelo de ameaças dos fluxos críticos.
- Executar verificações automatizadas e testes manuais autorizados somente no ambiente de homologação ou em projeto isolado, sem varredura invasiva de serviços externos.
- Para cada achado, registrar evidência reproduzível, impacto, correção e reteste; priorizar exposição de dados, acesso de moderador e alterações indevidas.
- Encerrar o portão apenas após corrigir achados críticos e altos, documentar riscos residuais e validar novamente os fluxos afetados no AAB candidato.
