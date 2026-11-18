# Sinalização de posto inexistente

O usuário conectado pode abrir os detalhes de um posto publicado e selecionar
“Sinalizar posto que não existe”. O motivo é opcional e a sinalização fica
pendente. O posto continua visível até decisão do moderador.

No Perfil de uma conta moderadora, “Revisar postos sinalizados” agrupa os relatos
por posto, mostra motivo, endereço e acesso à posição no mapa. Aprovar oculta o
posto sem apagar histórico. Rejeitar exige motivo e mantém o posto no mapa.

A tabela `station_existence_reports` permite leitura apenas ao autor e ao
moderador; envio e decisão passam por funções protegidas. Há limite de dez
envios por usuário em 24 horas e um relato pendente por usuário e posto. Na
exclusão de conta, os relatos da pessoa são removidos; na exclusão do cadastro
do posto, os relatos vinculados também são removidos.

Em homologação, a migração foi aplicada e os privilégios verificados. Um ensaio
em transação revertida cobriu envio, aprovação, rejeição e tentativa de
moderação sem privilégio; nenhum relato do ensaio permaneceu no banco.
