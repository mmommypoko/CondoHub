import { assertSeedAllowed, loadDotenv, parseRunId } from './seed-common';

loadDotenv('.env.local');

async function main(): Promise<void> {
  assertSeedAllowed();
  const runId = parseRunId(process.argv.slice(2));
  console.log(`E2E seed requested for run ${runId}.`);
  console.log('P1-PENDING: scenario body lands with P1 use cases (provisioning/membership).');
}

void main();
