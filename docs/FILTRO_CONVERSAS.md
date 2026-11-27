# Chats e filtros de conversas

A busca é executada na API sobre conversas autorizadas. Listas e históricos são
paginados por cursor, sem baixar todas as mensagens para filtrar no navegador.

Consulte [CHAT-04 — contrato, filtros, paginação, migração e testes](CHAT-04.md).
As garantias de envio idempotente e recuperação estão em [CHAT-02](CHAT-02.md).

Acesso depende de equipe ativa e participação, inclusive em páginas seguintes.
Palavra-chave ignora acentos e maiúsculas; datas seguem America/Fortaleza.
O frontend oferece carregamento de mais conversas, mensagens anteriores e busca
no histórico. Nova conversa e envio permanecem nos mesmos endpoints POST.
