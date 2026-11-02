# Google OAuth para uso pessoal

Com o app do Google Cloud em modo de teste, o refresh token expira em 7 dias. Quando isso acontece, o menu do avatar mostra "Reconectar ao Google": basta entrar de novo.

Para não repetir isso toda semana:

1. No Google Cloud, abra a tela de consentimento (Google Auth Platform, Público-alvo).
2. Clique em **Publicar aplicativo** para passar de Teste para Em produção.
3. Saia e entre de novo no ArcadeLink. Tokens emitidos em modo de teste continuam com a expiração antiga.

O app usa dois escopos: `drive.file` para gravar na pasta `ArcadeLink/` e `drive.readonly` para ler as ROMs que você envia pelo Drive. O `drive.file` sozinho não enxerga esses arquivos, mesmo dentro de uma pasta criada pelo app.

O `drive.readonly` é um escopo restrito, então a tela de consentimento mostra um aviso de app não verificado, que você pode aceitar por ser o dono. Confira os limites atuais na documentação do Google antes de publicar.
