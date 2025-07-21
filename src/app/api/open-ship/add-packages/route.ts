import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { addPackagesToOpenShipment } from '@/lib/fedex/open-ship'
import type { PackageData } from '@/lib/fedex/open-ship'

// リクエストの型定義
interface AddPackagesRequest {
  masterTrackingNumber?: string
  index?: string // masterTrackingNumberまたはindexのいずれかが必要
  accountNumber?: string // 指定されない場合は環境変数から取得
  packages: Array<{
    weight: string
    type: string
    length?: string
    width?: string
    height?: string
    declaredValue?: string
  }>
}

/**
 * 入力パッケージデータをFedEx形式に変換
 */
function convertToFedExPackages(packages: AddPackagesRequest['packages'], startSequence: number): PackageData[] {
  return packages.map((pkg, index) => {
    const packageData: PackageData = {
      sequenceNumber: startSequence + index,
      weight: {
        units: 'KG',
        value: parseFloat(pkg.weight)
      }
    }

    // カスタム梱包材の場合は寸法を追加
    if (pkg.type === 'YOUR_PACKAGING' && pkg.length && pkg.width && pkg.height) {
      packageData.dimensions = {
        length: parseInt(pkg.length),
        width: parseInt(pkg.width),
        height: parseInt(pkg.height),
        units: 'CM'
      }
    }

    // 申告価額が設定されている場合（JPYからUSDに変換）
    if (pkg.declaredValue && Number(pkg.declaredValue) > 0) {
      const JPY_TO_USD_RATE = 0.0067
      const declaredValueJPY = Number(pkg.declaredValue)
      const declaredValueUSD = Math.max(declaredValueJPY * JPY_TO_USD_RATE, 1.00)
      
      packageData.declaredValue = {
        amount: parseFloat(declaredValueUSD.toFixed(2)),
        currency: 'USD'
      }
      
      console.log(`📦 パッケージ${packageData.sequenceNumber}の申告価額: ${declaredValueJPY}円 → $${declaredValueUSD.toFixed(2)}`)
    }

    return packageData
  })
}

/**
 * POST /api/open-ship/add-packages
 * Open Shipmentにパッケージを追加（段階的追加対応）
 */
export async function POST(request: NextRequest) {
  try {
    const data: AddPackagesRequest = await request.json()

    console.log('🚀 === パッケージ追加処理開始 ===')
    console.log('リクエストデータ:', { 
      masterTrackingNumber: data.masterTrackingNumber,
      index: data.index,
      packageCount: data.packages.length
    })

    // 入力データのバリデーション
    if (!data.packages?.length) {
      return NextResponse.json(
        { error: '追加するパッケージが指定されていません' },
        { status: 400 }
      )
    }

    if (!data.masterTrackingNumber && !data.index) {
      return NextResponse.json(
        { error: 'masterTrackingNumberまたはindexのいずれかが必要です' },
        { status: 400 }
      )
    }

    // Supabaseクライアント初期化
    const supabase = createClient()

    // ユーザー認証状態を確認
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      console.error('ユーザー認証エラー:', userError)
      return NextResponse.json(
        { error: 'ユーザー認証に失敗しました' },
        { status: 401 }
      )
    }

    // データベースからOpen Shipment情報を取得
    let openShipmentQuery = supabase
      .from('open_shipments')
      .select('*')

    if (data.masterTrackingNumber) {
      openShipmentQuery = openShipmentQuery.eq('master_tracking_number', data.masterTrackingNumber)
    } else if (data.index) {
      openShipmentQuery = openShipmentQuery.eq('fedex_index', data.index)
    }

    // ユーザー権限チェック
    if (user) {
      openShipmentQuery = openShipmentQuery.eq('user_id', user.id)
    }

    const { data: openShipment, error: queryError } = await openShipmentQuery.single()

    if (queryError || !openShipment) {
      console.error('Open Shipment検索エラー:', queryError)
      return NextResponse.json(
        { error: 'Open Shipmentが見つかりません' },
        { status: 404 }
      )
    }

    // ステータスチェック
    if (openShipment.status === 'confirmed') {
      return NextResponse.json(
        { error: 'このOpen Shipmentは既に確定済みです' },
        { status: 400 }
      )
    }

    if (openShipment.status === 'cancelled') {
      return NextResponse.json(
        { error: 'このOpen Shipmentはキャンセル済みです' },
        { status: 400 }
      )
    }

    // アカウント番号を決定
    const accountNumber = data.accountNumber || process.env.FEDEX_ACCOUNT_NUMBER!

    // 現在のパッケージ数を取得して、新しいsequenceNumberを決定
    const nextSequenceNumber = openShipment.packages_added + 1

    // FedEx形式にパッケージデータを変換
    const fedexPackages = convertToFedExPackages(data.packages, nextSequenceNumber)

    console.log(`📦 ${fedexPackages.length}個のパッケージを追加中...`)
    console.log('パッケージ詳細:', fedexPackages.map(p => ({
      seq: p.sequenceNumber,
      weight: `${p.weight.value}${p.weight.units}`,
      dimensions: p.dimensions ? `${p.dimensions.length}x${p.dimensions.width}x${p.dimensions.height}${p.dimensions.units}` : 'なし'
    })))

    // FedEx Open Ship APIでパッケージ追加
    const addResult = await addPackagesToOpenShipment(
      accountNumber,
      data.index || data.masterTrackingNumber!,
      fedexPackages
    )

    console.log('✅ パッケージ追加完了:', {
      addedCount: addResult.addedPackages.length,
      trackingNumbers: addResult.addedPackages.map(p => p.trackingNumber)
    })

    // データベースを更新
    const newTotalPackages = openShipment.total_packages + fedexPackages.length
    const newPackagesAdded = openShipment.packages_added + fedexPackages.length

    const { error: updateError } = await supabase
      .from('open_shipments')
      .update({
        total_packages: newTotalPackages,
        packages_added: newPackagesAdded,
        status: 'in_progress',
        updated_at: new Date().toISOString()
      })
      .eq('id', openShipment.id)

    if (updateError) {
      console.error('データベース更新エラー:', updateError)
      console.warn('⚠️ パッケージは追加済みですが、DBの更新に失敗しました')
    }

    return NextResponse.json({
      success: true,
      data: {
        masterTrackingNumber: openShipment.master_tracking_number,
        index: openShipment.fedex_index,
        addedPackages: addResult.addedPackages,
        totalPackages: newTotalPackages,
        packagesAdded: newPackagesAdded,
        status: 'in_progress',
        alerts: addResult.alerts
      }
    })

  } catch (error) {
    console.error('❌ パッケージ追加エラー:', error)
    
    return NextResponse.json(
      {
        error: 'パッケージ追加に失敗しました',
        details: error instanceof Error ? error.message : '不明なエラー'
      },
      { status: 500 }
    )
  }
} 