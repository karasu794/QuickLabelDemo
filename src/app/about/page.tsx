import { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Truck, FileText, CreditCard, ClipboardList, MapPin,
  AlertTriangle
} from 'lucide-react'

export const metadata: Metadata = {
  title: 'QuickLabel — サービス説明',
  description:
    'QuickLabel は配送見積もり・ラベル発行・決済を一体化した業務支援 Web アプリケーションです。',
}

const FEATURES = [
  {
    icon: Truck,
    title: '配送見積もり',
    description: 'FedEx API と連携し、重量・サイズ・配送先に応じたリアルタイム見積もりを取得します。',
  },
  {
    icon: FileText,
    title: 'ラベル発行',
    description: '見積結果からそのまま送り状（ラベル）を発行し、PDF として出力します。',
  },
  {
    icon: CreditCard,
    title: '決済導線',
    description: 'Square API を利用した決済リンクの生成により、配送料の回収をスムーズに行います。',
  },
  {
    icon: ClipboardList,
    title: '履歴管理',
    description: '見積・発送・決済の履歴を一元管理し、過去の取引をすばやく参照できます。',
  },
  {
    icon: MapPin,
    title: '住所補完・入力支援',
    description: 'Google Maps API を活用し、住所入力時の補完と正規化を行います。',
  },
] as const

const TECH_STACK = {
  'フロントエンド': [
    { name: 'Next.js (App Router)', required: true },
    { name: 'TypeScript', required: true },
    { name: 'Tailwind CSS', required: false },
    { name: 'shadcn/ui', required: false },
    { name: 'Zustand', required: false },
    { name: 'Zod', required: false },
  ],
  'バックエンド/インフラ': [
    { name: 'Supabase (Auth / Database / RLS)', required: true },
    { name: 'Vercel (Hosting)', required: true },
  ],
  '外部 API': [
    { name: 'FedEx API', required: true },
    { name: 'Square API', required: true },
    { name: 'Google Maps API', required: true },
  ],
  'テスト': [
    { name: 'Playwright / Jest', required: false },
  ],
} as const

export default function AboutPage() {
  return (
    <div className="container mx-auto px-3 md:p-6">
      {/* Hero Section */}
      <section className="bg-purple-900 text-white rounded-lg p-8 md:p-12 mb-10">
        <h1 className="text-3xl md:text-4xl font-bold mb-4">QuickLabel</h1>
        <p className="text-lg md:text-xl text-purple-100 mb-6">
          配送見積もり・ラベル発行・決済を一体化した業務支援Webアプリ
        </p>
        <p className="text-purple-200 mb-6">
          QuickLabel は、配送業務で発生する「見積もり」「送り状発行」「決済」といった分断された作業を、ひとつの流れとして扱えるように設計したWebシステムです。
        </p>
        <div className="bg-purple-800 border border-purple-700 rounded-md p-4 text-sm text-purple-200">
          このサイトはポートフォリオ用のデモ環境です。一部の外部連携や本番向け処理は無効化、または簡略化されています。
        </div>
      </section>

      {/* Feature Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">主な機能</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((feature) => {
            const Icon = feature.icon
            return (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6 text-purple-700" />
                    <CardTitle>{feature.title}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Challenge Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">業務フローの分断を減らし、手作業を減らす</h2>
        <Card>
          <CardContent className="p-6">
            <ul className="space-y-3 text-sm text-gray-700">
              <li>配送の見積もり、ラベル発行、決済がそれぞれ別のツールや手順に分かれており、作業が煩雑になりやすい</li>
              <li>配送料金の比較や確認に手間がかかり、ミスや見落としが発生しやすい</li>
              <li>決済状況の追跡が分散し、入金確認や履歴管理に時間を要する</li>
              <li>住所入力の手間や誤入力により、配送トラブルが起きやすい</li>
            </ul>
          </CardContent>
        </Card>
      </section>

      {/* Implementation Highlights Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">実装上のポイント</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">外部API連携</h3>
              <p className="text-sm text-gray-600">
                FedEx・Square・Google Maps の各 API をサーバーサイドで統合し、認証情報の安全な管理とエラーハンドリングを実装しています。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">データ構造設計</h3>
              <p className="text-sm text-gray-600">
                Supabase を用いたデータベース設計と Row Level Security (RLS) により、ユーザーごとのデータ分離とアクセス制御を実現しています。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">運用を見据えた設計</h3>
              <p className="text-sm text-gray-600">
                デモモードと本番モードの切り替え、環境変数による設定管理など、運用フェーズを想定した構成にしています。
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-2">管理機能を前提にした構成</h3>
              <p className="text-sm text-gray-600">
                管理者ダッシュボードやユーザー管理機能を備え、業務運用に必要な管理導線を組み込んでいます。
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* TechStack Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">使用技術</h2>
        <div className="space-y-4">
          {Object.entries(TECH_STACK).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-gray-500 mb-2">{category}</h3>
              <div className="flex flex-wrap gap-2">
                {items.map((item) => (
                  <Badge
                    key={item.name}
                    variant={item.required ? 'default' : 'secondary'}
                  >
                    {item.name}
                  </Badge>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Demo Notice Section */}
      <section className="mb-10">
        <h2 className="text-2xl font-bold mb-6">デモ環境について</h2>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm text-amber-800 mb-3">
                このアプリケーションはポートフォリオ用のデモ環境です。以下の機能は無効化または簡略化されています。
              </p>
              <ul className="text-sm text-amber-700 space-y-1">
                <li>決済処理（Square API 連携は無効）</li>
                <li>ラベル発行（FedEx API による実際の発行は停止）</li>
                <li>キャンセル操作（本番向け処理は無効化）</li>
                <li>為替レート取得（ExchangeRate API はモック）</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="mb-10 text-center">
        <h2 className="text-2xl font-bold mb-6">実際のデモ画面を見る</h2>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/">
            <Button>見積画面へ</Button>
          </Link>
          <Link href="/">
            <Button variant="outline">トップページへ戻る</Button>
          </Link>
        </div>
      </section>
    </div>
  )
}
