import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
import './sites-env.mjs';
// All current migrations create tables/indexes. Idempotent forms also support
// older local checkouts whose migrations were applied manually.
const journal=JSON.parse(readFileSync('drizzle/meta/_journal.json','utf8'));
const sql=journal.entries.map(e=>readFileSync('drizzle/'+e.tag+'.sql','utf8').replace(/CREATE TABLE\s+/g,'CREATE TABLE IF NOT EXISTS ').replace(/CREATE UNIQUE INDEX\s+/g,'CREATE UNIQUE INDEX IF NOT EXISTS ')).join('\n');
mkdirSync('.sites-runtime',{recursive:true});const file=path.resolve('.sites-runtime/local-schema.sql');writeFileSync(file,sql);
const result=spawnSync(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','d1','execute','DB','--local','--config','dist/server/wrangler.json','--persist-to','.wrangler/state','--file',file],{stdio:'inherit'});process.exit(result.status??1);
