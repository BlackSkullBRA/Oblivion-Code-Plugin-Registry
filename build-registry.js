/**
 * Script para compilar todos os arquivos de manifesto individuais da pasta plugins/
 * em um único arquivo registry.json consolidado na raiz do repositório.
 */
import fs from 'fs';
import path from 'path';

const PLUGINS_DIR = './plugins';
const OUTPUT_FILE = './registry.json';

async function run() {
  console.log('--- Iniciando compilação do registry.json ---');

  if (!fs.existsSync(PLUGINS_DIR)) {
    console.error(`Erro: A pasta '${PLUGINS_DIR}' não existe.`);
    process.exit(1);
  }

  const files = fs.readdirSync(PLUGINS_DIR).filter(file => file.endsWith('.json'));
  const plugins = [];

  for (const file of files) {
    const filePath = path.join(PLUGINS_DIR, file);
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const manifest = JSON.parse(content);
      
      // Adiciona metadados adicionais automáticos se desejado
      if (!manifest.downloads) manifest.downloads = '0';
      if (!manifest.rating) manifest.rating = 5.0;

      plugins.push(manifest);
      console.log(`  ➕ Adicionado ao registro: ${manifest.name} (${manifest.id})`);
    } catch (err) {
      console.error(`  ❌ Erro ao processar o arquivo ${file}: ${err.message}`);
      process.exit(1);
    }
  }

  try {
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(plugins, null, 2), 'utf8');
    console.log(`\n✅ Compilação concluída com sucesso! Novo arquivo '${OUTPUT_FILE}' gerado com ${plugins.length} plugins.`);
  } catch (err) {
    console.error(`❌ Erro ao escrever o arquivo de saída: ${err.message}`);
    process.exit(1);
  }
}

run();
