#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { spawn } from 'child_process'
import dotenv from 'dotenv'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load .env.local from project root
const envPath = path.resolve(__dirname, '..', '.env.local')
dotenv.config({ path: envPath })

const ref = process.env.SUPABASE_PROJECT_REF || process.env.NEXT_PUBLIC_SUPABASE_PROJECT_REF
if (!ref) {
  console.error('SUPABASE_PROJECT_REF が見つかりません。.env.local に SUPABASE_PROJECT_REF を設定してください。')
  process.exit(1)
}

console.log(`[typegen] Generating types for project: ${ref}`)

const args = ['supabase@latest', 'gen', 'types', 'typescript', '--project-id', ref, '--schema', 'public']
const child = spawn('npx', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' })

let stdout = ''
let stderr = ''

child.stdout.on('data', (chunk) => { stdout += chunk.toString() })
child.stderr.on('data', (chunk) => { stderr += chunk.toString() })

child.on('close', (code) => {
  if (code !== 0) {
    console.error('[typegen] Supabase CLI failed with code', code)
    if (stderr) console.error(stderr)
    process.exit(code || 1)
  }

  const targetPath = path.resolve(__dirname, '..', 'src', 'types', 'supabase.ts')
  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true })
    fs.writeFileSync(targetPath, stdout, 'utf8')
    console.log(`[typegen] Wrote types to ${targetPath}`)
  } catch (err) {
    console.error('[typegen] Failed to write types:', err)
    process.exit(1)
  }
})


