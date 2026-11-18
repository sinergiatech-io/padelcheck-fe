const fs = require('node:fs'), os = require('node:os'), path = require('node:path')
const { spawnSync } = require('node:child_process')
const esbuild = require('esbuild')

// The wizard logic (model, API client, flow controller) is plain TypeScript: bundle it once and run node:test against the bundle.
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'padelcheck-club-onboarding-'))
try {
  const src = path.join(__dirname, '../src/features/club-onboarding').replace(/\\/g, '/')
  esbuild.buildSync({
    stdin: { contents: `export * from '${src}/model'; export * from '${src}/api'; export * from '${src}/flow'`, resolveDir: __dirname, loader: 'ts' },
    bundle: true, format: 'cjs', platform: 'node', target: 'node20', outfile: path.join(directory, 'club-onboarding.cjs'),
  })
  const result = spawnSync(process.execPath, ['--test', path.join(__dirname, '../tests/club-onboarding.test.cjs')], {
    stdio: 'inherit', env: { ...process.env, CLUB_ONBOARDING_BUNDLE: path.join(directory, 'club-onboarding.cjs') },
  })
  process.exitCode = result.status ?? 1
} finally { fs.rmSync(directory, { recursive: true, force: true }) }
