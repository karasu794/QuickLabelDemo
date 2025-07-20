import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Papa from 'papaparse'

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
    const supabase = createClient()
    
    // ユーザー認証チェック
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json(
        { error: 'ログインが必要です' },
        { status: 401 }
      )
    }

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
    const validRows: ParsedRow[] = []

    rows.forEach((row, index) => {
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
        validRows.push({
          contact_name: row.contact_name.trim(),
          company_name: row.company_name?.trim() || null,
          phone_number: row.phone_number?.trim() || null,
          address1: row.address1?.trim() || null,
          address2: null, // CSVには含めない、拡張用
          city: row.city?.trim() || null,
          state_code: row.state_code?.trim() || null,
          postal_code: row.postal_code?.trim() || null,
          country_code: row.country_code.trim().toUpperCase()
        })
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
    const insertData = validRows.map(row => ({
      user_id: user.id,
      contact_name: row.contact_name,
      company_name: row.company_name,
      phone_number: row.phone_number,
      address1: row.address1,
      address2: row.address2,
      city: row.city,
      state_code: row.state_code,
      postal_code: row.postal_code,
      country_code: row.country_code
    }))

    const { error: insertError } = await supabase
      .from('address_book')
      .insert(insertData)

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