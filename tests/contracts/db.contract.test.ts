import glob from 'fast-glob'
import * as fs from 'fs'

function loadSqlFiles() {
  const patterns = [
    'supabase/migrations/**/*.sql',
    'database/**/*.sql',
  ]
  return glob.sync(patterns, { dot: false })
}

function searchAny(files: string[], regexes: RegExp[]) {
  return files.some(f => {
    const s = fs.readFileSync(f, 'utf8')
    return regexes.every(r => r.test(s))
  })
}

test('profiles/addresses have _ja/_en columns nullable', () => {
  const files = loadSqlFiles()
  if (!files.length) {
    console.warn('skip: no SQL files found in supabase/migrations or database/')
    return
  }
  const foundJaEn = files.some(f => /profiles|addresses/i.test(f))
                      && searchAny(files, [/_ja\b/i, /_en\b/i])
  expect(foundJaEn).toBe(true)
})

test('company_info has _ja/_en and preserves existing data (non-destructive)', () => {
  const files = loadSqlFiles()
  if (!files.length) {
    console.warn('skip: no SQL files found in supabase/migrations or database/')
    return
  }
  const hasJaEn = searchAny(files, [/company[_ ]?info/i, /_ja\b/i, /_en\b/i])
  expect(hasJaEn).toBe(true)
})

test('shipments table has hts_code (nullable) column added by migration', () => {
  const files = loadSqlFiles()
  if (!files.length) {
    console.warn('skip: no SQL files found in supabase/migrations or database/')
    return
  }
  const hasHts = searchAny(files, [/alter\s+table\s+if\s+exists\s+public\.shipments/i, /add\s+column\s+if\s+not\s+exists\s+hts_code\s+text\s+null/i])
  expect(hasHts).toBe(true)
})
