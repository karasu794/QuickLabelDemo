const fs = require('fs');
const phase = process.argv[2] || 'staging';
const out = [];
function read(p){try{return fs.readFileSync(p,'utf8')}catch{ return ''}}
out.push('# Go/No-Go Report\n');
out.push(`## Phase: ${phase}\n`);
out.push('### Idempotency\n````\n'+read('artifacts/go_nogo/idempotency.log')+'\n````\n');
out.push('### Consistency\n````\n'+read('artifacts/go_nogo/consistency.log')+'\n````\n');
out.push('### E2E Success Page\n````\n'+read('artifacts/go_nogo/e2e_success_page.log')+'\n````\n');
out.push('### RLS Visibility\n````\n'+read('artifacts/go_nogo/rls_visibility.log')+'\n````\n');
out.push('### Observability Notes\n````\n'+read('artifacts/go_nogo/observability.log')+'\n````\n');
fs.mkdirSync('docs/GoNoGo', { recursive: true });
fs.writeFileSync(`docs/GoNoGo/REPORT_${phase}.md`, out.join('\n'));
console.log('[OK] docs/GoNoGo/REPORT_'+phase+'.md written');
// JSON (machine-readable)
const json = {
  phase,
  idempotency: !read('artifacts/go_nogo/idempotency.log').match(/FAIL/),
  e2e: !read('artifacts/go_nogo/e2e_success_page.log').match(/failed/i),
  rls: !read('artifacts/go_nogo/rls_visibility.log').match(/FAIL|error/i)
};
fs.writeFileSync(`docs/GoNoGo/REPORT_${phase}.json`, JSON.stringify(json, null, 2));
console.log('[OK] docs/GoNoGo/REPORT_'+phase+'.json written');
