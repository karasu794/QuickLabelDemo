import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // CSVヘッダー（address_bookテーブルの構造に合わせる）
    const headers = [
      'contact_name',
      'company_name', 
      'phone_number',
      'address1',
      'city',
      'state_code',
      'postal_code',
      'country_code'
    ]

    // サンプルデータ
    const sampleData = [
      [
        '山田太郎',
        '株式会社サンプル',
        '090-1234-5678',
        '新宿区西新宿1-1-1',
        '新宿区',
        '13',
        '160-0023',
        'JP'
      ],
      [
        '田中花子',
        'テスト商事株式会社',
        '080-9876-5432',
        '千代田区丸の内1-1-1',
        '千代田区',
        '13',
        '100-0005',
        'JP'
      ],
      [
        '佐藤次郎',
        '',
        '070-1111-2222',
        '渋谷区渋谷1-1-1',
        '渋谷区',
        '13',
        '150-0002',
        'JP'
      ]
    ]

    // CSV形式に変換
    const csvContent = [
      headers.join(','),
      ...sampleData.map(row => 
        row.map(cell => 
          // セルに日本語や特殊文字が含まれる場合はダブルクォートで囲む
          /[,"\r\n\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell
        ).join(',')
      )
    ].join('\r\n')

    // BOM付きUTF-8として出力
    const bom = '\uFEFF'
    const csvWithBom = bom + csvContent

    // レスポンスヘッダーを設定
    const response = new NextResponse(csvWithBom, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="address_template.csv"',
        'Cache-Control': 'no-cache'
      }
    })

    return response

  } catch (error) {
    console.error('CSVテンプレート生成エラー:', error)
    return NextResponse.json(
      { error: 'CSVテンプレートの生成に失敗しました' },
      { status: 500 }
    )
  }
} 