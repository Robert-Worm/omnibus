// CLI bridge for a Codex session whose tool list predates MCP registration.
// Uses this checkout's real MCP server, without reading or changing global
// client registration. Write requests must carry explicit consent after approval.
import {readFileSync, writeFileSync, mkdirSync} from 'node:fs';
import {resolve, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {Client} from '@modelcontextprotocol/sdk/client/index.js';
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js';

const [requestFile, outputFile] = process.argv.slice(2);
if (!requestFile) throw Error('Supply a JSON array of {name, arguments} MCP requests.');
const client = new Client({name: 'codex-omnibus-workflow', version: '1.0.0'});
const transport = new StdioClientTransport({command: process.execPath,
  args: [fileURLToPath(new URL('../agent-tools/server.mjs', import.meta.url))], stderr: 'pipe'});
try {
  await client.connect(transport);
  const available = await client.listTools();
  const results = [];
  for (const request of JSON.parse(readFileSync(requestFile, 'utf8'))) {
    const result = await client.callTool(request);
    if (result.isError) throw Error(`${request.name}: ${result.content[0].text}`);
    results.push({name: request.name, arguments: request.arguments, result: JSON.parse(result.content[0].text)});
  }
  const output = {client: 'codex-omnibus-workflow', transport: 'stdio', tools: available.tools.map(t => ({name:t.name, annotations:t.annotations})), results};
  if (outputFile) { mkdirSync(dirname(resolve(outputFile)), {recursive:true}); writeFileSync(outputFile, JSON.stringify(output, null, 2)); }
  console.log(JSON.stringify(output));
} finally { await client.close(); }
