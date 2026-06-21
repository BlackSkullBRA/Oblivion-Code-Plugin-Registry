# Oblivion Code - Plugin Registry

Repositório centralizado de extensões e plugins para a IDE **Oblivion Code**.

## Como Lançar seu Plugin

Para publicar um plugin no marketplace oficial do Oblivion Code, siga o passo a passo abaixo:

1. **Faça um Fork** deste repositório.
2. Crie um arquivo JSON com o manifesto do seu plugin dentro da pasta `plugins/`. O nome do arquivo deve ser exatamente o `id` do seu plugin seguido de `.json` (ex: `plugins/meu-plugin.json`).
3. Certifique-se de que o arquivo JSON respeita o seguinte formato:

```json
{
  "id": "meu-plugin",
  "name": "Meu Plugin Incrível",
  "version": "1.0.0",
  "desc": "Uma breve descrição do que o seu plugin faz na IDE.",
  "author": "SeuNomeDeUsuario",
  "downloadUrl": "https://github.com/usuario/meu-plugin/archive/refs/tags/v1.0.0.zip",
  "permissions": ["terminal", "file-system"],
  "mcpServers": [
    {
      "name": "Meu Servidor MCP",
      "type": "stdio",
      "command": "node",
      "args": ["./dist/index.js"]
    }
  ]
}
```

### Detalhes das Permissões
Os plugins rodam com privilégios locais, portanto, você deve declarar exatamente quais recursos do sistema o seu plugin utiliza:
* `terminal`: Necessário para executar comandos do sistema operacional ou scripts via terminal.
* `file-system`: Habilita leitura/escrita e manipulação de arquivos do usuário.
* `network`: Permite fazer conexões HTTPS com servidores externos.

4. Abra um **Pull Request** para a branch `main` deste repositório.
5. Nossa esteira automatizada (GitHub Actions) irá testar a integridade do JSON e checar a consistência de segurança do código.
6. Uma vez revisado e aprovado, o Pull Request será mergeado, o arquivo consolidado `registry.json` será gerado automaticamente e o seu plugin passará a aparecer imediatamente na aba "Plugins/Extensions" de todos os usuários do Oblivion Code!
