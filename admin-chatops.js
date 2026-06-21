import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// O GitHub Actions passa o payload do evento através do arquivo no caminho de GITHUB_EVENT_PATH
const eventPath = process.env.GITHUB_EVENT_PATH;
if (!eventPath) {
  console.error('Este script deve ser executado em um ambiente de GitHub Actions.');
  process.exit(1);
}

const event = JSON.parse(fs.readFileSync(eventPath, 'utf8'));

// Pegar o corpo do comentário, o autor e os metadados do PR
const commentBody = event.comment.body.trim();
const commenter = event.comment.user.login;
const prNumber = event.issue.number;

// O dono do repositório/administrador oficial
const OWNER = 'BlackSkullBRA';

console.log(`Comentário recebido no PR #${prNumber} por @${commenter}: "${commentBody}"`);

// Apenas o OWNER pode executar comandos ChatOps
if (commenter !== OWNER) {
  console.error(`Acesso negado: Apenas o administrador @${OWNER} pode usar comandos de moderação.`);
  process.exit(0);
}

// Inicializar a API do GitHub via curl/fetch simples
const githubToken = process.env.GITHUB_TOKEN;
if (!githubToken) {
  console.error('A variável de ambiente GITHUB_TOKEN não está definida.');
  process.exit(1);
}

const apiCall = async (url, options = {}) => {
  const headers = {
    'Authorization': `token ${githubToken}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Oblivion-Registry-ChatOps'
  };

  const response = await fetch(`https://api.github.com/repos/BlackSkullBRA/Oblivion-Code-Plugin-Registry${url}`, {
    ...options,
    headers: { ...headers, ...options.headers }
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Chamada de API falhou para ${url}: ${response.status} - ${errorBody}`);
  }
  return response.json();
};

async function handleApprove(shouldVerify) {
  console.log(`Iniciando fluxo de aprovação para o PR #${prNumber}...`);

  // 1. Obter a lista de arquivos alterados no PR
  const files = await apiCall(`/pulls/${prNumber}/files`);
  const jsonFile = files.find(f => f.filename.startsWith('plugins/') && f.filename.endsWith('.json'));

  if (!jsonFile) {
    throw new Error('Nenhum manifesto de plugin JSON encontrado no Pull Request para aprovar.');
  }

  // 2. Mesclar o Pull Request
  console.log(`Realizando o merge do PR #${prNumber}...`);
  await apiCall(`/pulls/${prNumber}/merge`, {
    method: 'PUT',
    body: JSON.stringify({
      commit_title: `Merge pull request #${prNumber} de ${commenter}`,
      commit_message: `Aprovado via ChatOps com comando por @${OWNER}.`
    })
  });

  console.log('PR mergeado com sucesso.');

  // Se o comando pediu verificação, atualizamos o manifesto diretamente na main
  if (shouldVerify) {
    console.log('Concedendo selo verificado ao plugin...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Aguarda o merge propagar

    // Buscar o arquivo na main
    const fileInfo = await apiCall(`/contents/${jsonFile.filename}`);
    const currentContent = JSON.parse(Buffer.from(fileInfo.content, 'base64').toString('utf8'));

    // Setar verificado como verdadeiro
    currentContent.verified = true;
    const updatedBase64 = Buffer.from(JSON.stringify(currentContent, null, 2), 'utf8').toString('base64');

    console.log(`Salvando atualização de verificação em ${jsonFile.filename}...`);
    await apiCall(`/contents/${jsonFile.filename}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `chore: verify plugin ${currentContent.id} via ChatOps [skip ci]`,
        content: updatedBase64,
        sha: fileInfo.sha
      })
    });
    console.log('Plugin verificado com sucesso.');
  }

  // Adicionar comentário de sucesso
  await apiCall(`/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: `🚀 **Pull Request aprovado e mergeado com sucesso!**${shouldVerify ? '\n✓ O criador foi adicionado ao selo de Verificados Azul!' : ''}`
    })
  });
}

async function handleDeny(reason) {
  console.log(`Rejeitando o PR #${prNumber} com o motivo: ${reason}`);

  // 1. Postar comentário explicando a rejeição
  await apiCall(`/issues/${prNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({
      body: `❌ **Solicitação de Plugin Recusada**\n\nMotivo da rejeição: ${reason}`
    })
  });

  // 2. Fechar o Pull Request
  await apiCall(`/pulls/${prNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({
      state: 'closed'
    })
  });

  console.log('PR fechado com sucesso.');
}

async function main() {
  try {
    if (commentBody.startsWith('/approve')) {
      const shouldVerify = commentBody.includes('--verified') || commentBody.includes('-v');
      await handleApprove(shouldVerify);
    } else if (commentBody.startsWith('/deny') || commentBody.startsWith('/reject')) {
      const reason = commentBody.replace(/^\/(deny|reject)\s*/i, '').trim() || 'Não especificado pelo administrador.';
      await handleDeny(reason);
    } else {
      console.log('Comentário não corresponde a nenhum comando ChatOps conhecido.');
    }
  } catch (err) {
    console.error('Erro na execução do ChatOps:', err.message);
    try {
      await apiCall(`/issues/${prNumber}/comments`, {
        method: 'POST',
        body: JSON.stringify({
          body: `⚠️ **Falha na execução do ChatOps:**\n\`\`\`\n${err.message}\n\`\`\``
        })
      });
    } catch (e) {
      console.error('Não foi possível enviar comentário de erro:', e.message);
    }
    process.exit(1);
  }
}

main();
