import { spawnSync } from 'node:child_process';

for (const f of ['flow-a1', 'flow-a2', 'flow-b1', 'flow-b2']) {
  console.log(`\n=== ${f} ===`);
  const r = spawnSync('node', [`scripts/${f}.js`], { stdio: 'inherit' });
  if (r.status !== 0) {
    console.log(`\nSTOPPED at ${f}. Fix this one first.`);
    process.exit(1);
  }
}
console.log('\nALL FLOW SCRIPTS PASSED');