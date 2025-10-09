import fs from 'fs'
import path from 'path'

const MIG = 'database/migrations/20251007_stage1_integrated.sql'
const sql = fs.readFileSync(path.join(process.cwd(), MIG), 'utf8')
const has = (re: RegExp) => re.test(sql)

describe('Stage1 DB Contract', () => {
  test('shipments: admin FULL dropped & owner CRUD/admin SELECT only', () => {
    // admin FULL 名称の揺れを許容（引用符/接頭辞/接尾辞含む）
    expect(has(/drop\s+policy[\s\S]*on\s+public\.shipments/i)).toBe(true)
    expect(has(/create\s+policy[\s\S]+on\s+public\.shipments[\s\S]+for\s+select[\s\S]+(user_id\s*=\s*auth\.uid\(\)|v_is_admin)/i)).toBe(true)
    expect(has(/create\s+policy[\s\S]+on\s+public\.shipments[\s\S]+for\s+(insert|update|delete)[\s\S]+with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)).toBe(true)
  })

  test('open_shipments: anonymous removed; admin SELECT; owner IUD', () => {
    const noComments = sql.replace(/^\s*--.*$/gm, '')
    expect(/drop\s+policy\s+if\s+exists[\s\S]+on\s+public\.open_shipments/i.test(noComments)).toBe(true)
    expect(/create\s+policy[\s\S]+on\s+public\.open_shipments[\s\S]+(for\s+select|for\s+(insert|update|delete))[\s\S]+(user_id\s*=\s*auth\.uid\(\)|v_is_admin)/i.test(noComments)).toBe(true)
    expect(/create\s+policy[\s\S]+Admin\s+select\s+open_shipments/i.test(noComments)).toBe(true)
  })

  test('address_book: SELECT(owner|admin), I/U(owner), DELETE csv+not referenced', () => {
    expect(has(/create\s+policy[\s\S]+on\s+public\.address_book[\s\S]+for\s+select[\s\S]+(user_id\s*=\s*auth\.uid\(\)|v_is_admin)/i)).toBe(true)
    expect(has(/create\s+policy[\s\S]+on\s+public\.address_book[\s\S]+for\s+(insert|update)[\s\S]+with\s+check\s*\(\s*auth\.uid\(\)\s*=\s*user_id\s*\)/i)).toBe(true)
    expect(has(/create\s+policy[\s\S]+for\s+delete[\s\S]+source\s*=\s*'csv'[\s\S]+not\s+public\.fn_address_in_use\(id\)/i)).toBe(true)
    expect(has(/create\s+or\s+replace\s+function\s+public\.fn_address_in_use/i)).toBe(true)
    expect(has(/(sender_|from_)address_id/i)).toBe(true)
    expect(has(/(recipient_|to_)address_id/i)).toBe(true)
    expect(has(/create\s+trigger\s+trg_block_delete_address[\s\S]+before\s+delete[\s\S]+raise\s+exception/i)).toBe(true)
  })

  test('cancel_shipment RPC: SECDEF + search_path + status updates + grants', () => {
    expect(has(/create\s+or\s+replace\s+function\s+public\.cancel_shipment\s*\(/i)).toBe(true)
    expect(has(/security\s+definer/i)).toBe(true)
    expect(has(/set\s+local\s+search_path\s+to\s+public/i)).toBe(true)
    expect(has(/update\s+public\.shipments[\s\S]+status\s*=\s*'cancelling'[\s\S]+cancelled_at\s*=\s*now\(\)/i)).toBe(true)
    expect(has(/revoke\s+all[\s\S]+grant\s+execute[\s\S]+authenticated/i)).toBe(true)
  })

  test('org cleanup: drop org policies & allow null org_id (if exists)', () => {
    expect(has(/drop\s+policy\s+if\s+exists[\s\S]+org/i)).toBe(true)
    expect(has(/alter\s+table[\s\S]+alter\s+column\s+org_id\s+drop\s+not\s+null/i)).toBe(true)
  })
})


