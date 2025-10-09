import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
// TODO(org-removed): deprecated. single-user tenancy; will be removed in Stage2.
// import { requireOrg } from '@/lib/org'
import { getUserOrThrow } from '@/lib/auth/getUserOrThrow'
import type { Database } from '@/types/supabase'

interface CSVRow {
  contact_name: string
  company_name?: string
  phone_number?: string
  address1?: string
  city?: string
  state_code?: string
  postal_code?: string
  country_code: string
}

interface ParsedRow extends CSVRow {
  address2?: string
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user } = await getUserOrThrow()
    const userId = user.id
    const orgId = null // TODO(org-removed)

    // FormDataからファイルを取得
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'ファイルが選択されていません' },
        { status: 400 }
      )
    }

    // ファイル形式チェック
    if (!file.name.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'CSVファイルのみアップロード可能です' },
        { status: 400 }
      )
    }

    // ファイルサイズチェック（5MB制限）
    if (file.size > 5 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'ファイルサイズは5MB以下にしてください' },
        { status: 400 }
      )
    }

    // CSVファイルを文字列として読み込み
    const csvText = await file.text()
    
    // CSV解析
    const parseResult = Papa.parse<CSVRow>(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim()
    })

    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: 'CSVファイルの解析に失敗しました', details: parseResult.errors },
        { status: 400 }
      )
    }

    const rows = parseResult.data

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'CSVファイルにデータが含まれていません' },
        { status: 400 }
      )
    }

    // データバリデーション
    const validationErrors: string[] = []
    type AddressInsert = Database['public']['Tables']['address_book']['Insert']
    const validRows: AddressInsert[] = []

    rows.forEach((row: CSVRow, index: number) => {
      const rowNumber = index + 2 // ヘッダー行を除くため+2
      const errors: string[] = []

      // 必須フィールドのチェック
      if (!row.contact_name?.trim()) {
        errors.push(`${rowNumber}行目: 宛先名が空です`)
      }
      
      if (!row.country_code?.trim()) {
        errors.push(`${rowNumber}行目: 国コードが空です`)
      }

      // 国コードフォーマットチェック
      if (row.country_code && !/^[A-Z]{2}$/.test(row.country_code.trim().toUpperCase())) {
        errors.push(`${rowNumber}行目: 国コードは2文字のアルファベットで入力してください（例: JP, US）`)
      }

      // 電話番号フォーマットチェック（任意フィールドだが、入力されている場合はチェック）
      if (row.phone_number && row.phone_number.trim() && !/^[\d\-\+\(\)\s]+$/.test(row.phone_number.trim())) {
        errors.push(`${rowNumber}行目: 電話番号の形式が正しくありません`)
      }

      if (errors.length > 0) {
        validationErrors.push(...errors)
      } else {
        const addressBookEntry: AddressInsert = {
          // TODO(org-removed): org_id deprecated
          created_by: userId,
          contact_name: row.contact_name.trim(),
          company_name: row.company_name?.trim() || null,
          phone_number: row.phone_number?.trim() || null,
          address1: row.address1?.trim() || null,
          address2: null,
          city: row.city?.trim() || null,
          state_code: row.state_code?.trim() || null,
          postal_code: row.postal_code?.trim() || null,
          country_code: row.country_code.trim().toUpperCase(),
        }
        validRows.push(addressBookEntry)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { 
          error: 'データに不備があります',
          details: validationErrors
        },
        { status: 400 }
      )
    }

    // データベースへの一括挿入
    const { error: insertError } = await (supabase
      .from('address_book') as any)
      .insert(validRows as any)

    if (insertError) {
      console.error('データベース挿入エラー:', insertError)
      return NextResponse.json(
        { error: 'データベースへの保存に失敗しました' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: `${validRows.length}件の宛先を登録しました`,
      count: validRows.length
    })

  } catch (error) {
    console.error('CSV処理エラー:', error)
    return NextResponse.json(
      { error: 'サーバーエラーが発生しました' },
      { status: 500 }
    )
  }
} 