const { mkdtempSync, writeFileSync, readFileSync, rmSync } = require('node:fs')
const { tmpdir } = require('node:os')
const path = require('node:path')
const { spawnSync } = require('node:child_process')
const ts = require('typescript')

function compile(name, sourcePath) {
  const source = readFileSync(sourcePath, 'utf8')
  const output = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } })
  const compiled = path.join(directory, name)
  writeFileSync(compiled, output.outputText)
  return compiled
}

const directory = mkdtempSync(path.join(tmpdir(), 'padelcheck-plan-'))
try {
  const model = compile('plan-model.cjs', path.join(__dirname, '../src/features/club/plan/plan-model.ts'))
  const billing = compile('billing-session.cjs', path.join(__dirname, '../src/features/club/plan/billing-session.ts'))
  const generation = compile('session-generation.cjs', path.join(__dirname, '../src/features/auth/session-generation.ts'))
  const env = { ...process.env, PLAN_MODEL_MODULE: model, BILLING_SESSION_MODULE: billing, SESSION_GENERATION_MODULE: generation }
  const first = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/plan-model.test.cjs')], { stdio: 'inherit', env })
  const second = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/billing-auth.test.cjs')], { stdio: 'inherit', env })
  if (first.error) throw first.error
  if (second.error) throw second.error
  process.exitCode = first.status || second.status ? (first.status || second.status) : 0
} finally {
  rmSync(directory, { recursive: true, force: true })
}
