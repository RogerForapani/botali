# Atendimento de exclusão por e-mail — Botali

Este procedimento valida o caminho externo descrito em [Solicitar exclusão da conta](ACCOUNT_DELETION.md). Começar em `botali-homologacao`; não usar a conta principal do responsável nem uma conta de moderador. O ensaio só termina quando recebimento, titularidade, exclusão e resposta forem conferidos. Não registrar neste repositório e-mails de teste, identificadores de usuários ou conteúdo de mensagens.

## Pedido e verificação

1. O titular envia de seu próprio e-mail associado à conta um pedido para `rogerforapani@gmail.com`, com o assunto **Exclusão da minha conta Botali**. Não solicitar senha, código nem documento no primeiro contato.
2. Conferir a chegada à caixa de suporte. Comparar o endereço do remetente com **um único** registro em Authentication → Users da homologação. Se não houver correspondência inequívoca, interromper e pedir confirmação por outro caminho proporcional; não excluir uma conta encontrada apenas por nome público.
3. Antes de remover, registrar fora do Git a data do pedido, o projeto, o identificador interno da conta e contagens de dados associados. Conferir se a conta não possui papel de moderador ou administrador e se pertence ao ensaio. Não exportar dados pessoais para o repositório.

## Exclusão pelo responsável

1. Localizar arquivos da conta no bucket privado `profile-avatars`. Excluir os arquivos pelo **Storage do Supabase**, não por `DELETE` SQL em `storage.objects`; conferir que nenhum arquivo da conta restou. A remoção do objeto antes do usuário é necessária quando ele é seu proprietário.
2. Excluir o usuário correto em Authentication → Users. A exclusão de `auth.users` aciona as relações do banco; não apagar tabelas do aplicativo manualmente sem conferir as regras de cascata e anonimização.
3. Em leitura restrita, confirmar ausência da conta em Auth, perfil, preços, correções, confirmações, alertas e eventos vinculados; conferir que postos públicos aprovados permaneceram sem autor pessoal. Verificar o bucket novamente.
4. Responder ao remetente que o pedido foi concluído, informando com precisão o que pode permanecer anonimizado e o ciclo de vida das cópias de backup. Não afirmar exclusão imediata dos arquivos de backup ou do armazenamento local do aparelho.

## Registro do ensaio

Anotar apenas resultado e horários: pedido recebido, correspondência única, avatar removido ou ausente, usuário excluído, verificações posteriores, resposta enviada e qualquer falha. Não marcar o fluxo como aprovado com base somente na exclusão dentro do aplicativo. Se uma etapa falhar, conservar a evidência fora do Git e corrigir o procedimento antes de repetir.

Referências: [Supabase — gestão e exclusão de usuários](https://supabase.com/docs/guides/auth/managing-user-data) e [Supabase — exclusão de arquivos do Storage](https://supabase.com/docs/guides/storage/management/delete-objects).
