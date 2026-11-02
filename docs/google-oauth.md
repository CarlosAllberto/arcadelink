# Google OAuth para uso pessoal

Com o app do Google Cloud em modo de teste, o refresh token expira em 7 dias. Quando isso acontece, o painel mostra "Reconectar ao Google": basta entrar de novo, e a pasta escolhida continua guardada.

Para não repetir isso toda semana:

1. No Google Cloud, abra a tela de consentimento (Google Auth Platform, Público-alvo).
2. Clique em **Publicar aplicativo** para passar de Teste para Em produção.
3. Saia e entre de novo no ArcadeLink. Tokens emitidos em modo de teste continuam com a expiração antiga.

O escopo `drive.file` não exige verificação do Google. Se o app passar a usar `drive.readonly`, a tela de consentimento mostra um aviso de app não verificado, que você pode aceitar por ser o dono. Confira os limites atuais na documentação do Google antes de publicar.
