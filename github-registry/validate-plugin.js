/**
 * Script para validar os arquivos de manifesto JSON submetidos no Pull Request.
 * Deve ser executado em ambiente Node.js no GitHub Actions.
 */
import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = './plugins';
const ALLOWED_PERMISSIONS = ['terminal', 'file-system', 'network'];

async function run() {
  console.log('--- Iniciando validação dos Manifestos de Plugins ---');

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Erro: A pasta '${PLUGINS_DIR}' não existe no repositório.`);
    process.exit(1);
  }

  const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.json'));

  if (files.length === 0) {
    console.log('Nenhum manifesto de plugin encontrado para validar.');
    process.exit(0);
  }

  let hasErrors = false;

  for (const file of files) {
    const filePath = path.join(PLUGINS_DIR, file);
    console.log(`\nValidando: ${filePath}`);

    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const manifest = JSON.parse(content);

      // 1. Validar campos obrigatórios
      const requiredFields = ['id', 'name', 'version', 'desc', 'author', 'downloadUrl', 'permissions'];
      for (const field of requiredFields) {
        if (manifest[field] === undefined) {
          console.error(`  ❌ Campo ausente: '${field}'`);
          hasErrors = true;
        }
      }

      if (hasErrors) continue;

      // 2. Validar ID (padrão minúsculo, alfanumérico e hifens)
      const idRegex = /^[a-z0-9-]+$/;
      if (!idRegex.test(manifest.id)) {
        console.error(`  ❌ ID inválido '${manifest.id}'. Deve conter apenas letras minúsculas, números e hifens.`);
        hasErrors = true;
      }

      // O nome do arquivo deve bater com o ID do manifesto
      const expectedFileName = `${manifest.id}.json`;
      if (file !== expectedFileName) {
        console.error(`  ❌ O nome do arquivo '${file}' não corresponde ao ID do manifesto '${expectedFileName}'.`);
        hasErrors = true;
      }

      // 3. Validar URL de Download
      if (!manifest.downloadUrl.startsWith('https://')) {
        console.error(`  ❌ downloadUrl inválido: '${manifest.downloadUrl}'. Deve usar protocolo HTTPS seguro.`);
        hasErrors = true;
      }

      // 4. Validar Permissões requisitadas
      if (!Array.isArray(manifest.permissions)) {
        console.error('  ❌ O campo permissions deve ser um array.');
        hasErrors = true;
      } else {
        for (const perm of manifest.permissions) {
          if (!ALLOWED_PERMISSIONS.includes(perm)) {
            console.error(`  ❌ Permissão desconhecida/inválida: '${perm}'. Permissões válidas: ${ALLOWED_PERMISSIONS.join(', ')}`);
            hasErrors = true;
          }
        }
      }

      // 5. Validar configurações de Servidores MCP se existirem
      if (manifest.mcpServers) {
        if (!Array.isArray(manifest.mcpServers)) {
          console.error('  ❌ O campo mcpServers deve ser um array se estiver presente.');
          hasErrors = true;
        } else {
          for (const mcp of manifest.mcpServers) {
            if (!mcp.name || !mcp.type) {
              console.error('  ❌ Servidores MCP no manifesto devem conter ao menos os campos "name" e "type".');
              hasErrors = true;
            }
            if (mcp.type !== 'stdio' && mcp.type !== 'sse') {
              console.error(`  ❌ Tipo de MCP inválido: '${mcp.type}'. Tipos suportados: 'stdio', 'sse'.`);
              hasErrors = true;
            }
            if (mcp.type === 'stdio' && !mcp.command) {
              console.error('  ❌ Servidores MCP do tipo stdio devem especificar um "command".');
              hasErrors = true;
            }
            if (mcp.type === 'sse' && !mcp.url) {
              console.error('  ❌ Servidores MCP do tipo sse devem especificar um "url".');
              hasErrors = true;
            }
          }
        }
      }

      if (!hasErrors) {
        console.log(`  ✅ Manifesto do plugin '${manifest.name}' é válido!`);
      }
    } catch (err) {
      console.error(`  ❌ Erro ao ler ou parsear o JSON: ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    console.error('\n❌ Falha na validação de um ou mais manifestos. Veja os logs acima.');
    process.exit(1);
  } else {
    console.log('\n✅ Todos os manifestos foram validados com sucesso!');
    process.exit(0);
  }
}

run();
