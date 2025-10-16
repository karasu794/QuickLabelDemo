import glob from 'fast-glob'
import * as fs from 'fs'

function loadSqlFiles() {
  const patterns = [
    'supabase/migrations/**/*.sql',
    'database/**/*.sql',
  ]
  return glob.sync(patterns, { dot: false })
}

function includesAll(text: string, regexes: RegExp[]) {
  return regexes.every(r => r.test(text))
}

test('drafts has disclaimer_agreed, disclaimer_agreed_at, terms_version added non-destructively', () => {
  const files = loadSqlFiles()
  if (!files.length) {
    console.warn('skip: no SQL files found')
    return
  }
  const s = files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
  expect(includesAll(s, [
    /alter\s+table[^\n]*public\.drafts/i,
    /add\s+column[^\n]*disclaimer_agreed\s+boolean/i,
    /add\s+column[^\n]*disclaimer_agreed_at\s+timestamptz/i,
    /add\s+column[^\n]*terms_version\s+text/i,
  ])).toBe(true)
})

test('shipments has terms_accepted_at, terms_version, payment_tx_id added', () => {
  const files = loadSqlFiles()
  if (!files.length) {
    console.warn('skip: no SQL files found')
    return
  }
  const s = files.map(f => fs.readFileSync(f, 'utf8')).join('\n')
  expect(includesAll(s, [
    /alter\s+table[^\n]*public\.shipments/i,
    /add\s+column[^\n]*terms_accepted_at\s+timestamptz/i,
    /add\s+column[^\n]*terms_version\s+text/i,
    /add\s+column[^\n]*payment_tx_id\s+text/i,
  ])).toBe(true)
})


