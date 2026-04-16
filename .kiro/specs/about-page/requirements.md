# Requirements Document

## Introduction

QuickLabel（FQL — FedEx Quick Label）は、配送見積もり・ラベル発行・決済を一体化した業務支援 Web アプリケーションである。Next.js / TypeScript / Tailwind CSS / shadcn-ui で構築されている。

本要件は、ポートフォリオ閲覧者向けの「サービス説明ページ」を `/about` パスに追加し、初見のユーザーがシステムの目的・機能・技術スタックを短時間で把握できるようにすることを目的とする。既存のトップページ（見積開始フォーム）の主導線は維持しつつ、トップページからサービス説明ページへの自然な導線を設ける。

## Glossary

- **About_Page**: `/about` パスに配置されるサービス説明ページ
- **Top_Page**: `/` パスに配置される既存のトップページ（見積開始フォーム）
- **Header_Navigation**: `src/components/header/HeaderClient.tsx` で実装されるグローバルナビゲーション
- **Hero_Section**: About_Page の最上部に配置されるサービス名・一文説明・デモ注意書きを含むセクション
- **Feature_Section**: About_Page 内の主な機能一覧セクション
- **Challenge_Section**: About_Page 内の「解決する課題」セクション
- **Implementation_Section**: About_Page 内の「実装上のポイント」セクション
- **TechStack_Section**: About_Page 内の技術スタック一覧セクション
- **Demo_Notice_Section**: About_Page 内のデモ環境補足セクション
- **CTA_Section**: About_Page 内の行動喚起セクション（見積画面へ、トップへ戻る）
- **About_Link**: Top_Page およびヘッダーに配置される About_Page への遷移リンク
- **Portfolio_Viewer**: ポートフォリオとして本アプリを閲覧する外部ユーザー
- **Existing_CTA**: Top_Page の既存の主要行動喚起要素（見積開始フォーム等）

## Requirements

### Requirement 1: About ページのルーティングとページ構成

**User Story:** As a Portfolio_Viewer, I want to access a service description page at `/about`, so that I can understand what QuickLabel does and how it is built.

#### Acceptance Criteria

1. THE About_Page SHALL be accessible at the `/about` URL path via Next.js App Router (`src/app/about/page.tsx`)
2. THE About_Page SHALL be a static page that does not require authentication to view
3. THE About_Page SHALL render as a Server Component (no `"use client"` directive) to optimize initial load performance
4. THE About_Page SHALL set appropriate `metadata` (title: "QuickLabel — サービス説明", description) for SEO and browser tab display

### Requirement 2: ヒーローセクション

**User Story:** As a Portfolio_Viewer, I want to see a clear hero section at the top of the about page, so that I can understand the service purpose within 10 seconds.

#### Acceptance Criteria

1. THE Hero_Section SHALL display the service name "QuickLabel" as a prominent heading
2. THE Hero_Section SHALL display a one-line description that conveys the core value proposition (配送見積もり・ラベル発行・決済を一体化した業務支援 Web アプリ)
3. THE Hero_Section SHALL display a demo environment notice that clearly communicates the page is a portfolio demo and external integrations are disabled
4. THE Hero_Section SHALL use the existing design system (Tailwind CSS utility classes, `bg-purple-900` header color palette for accent consistency)

### Requirement 3: 主な機能セクション

**User Story:** As a Portfolio_Viewer, I want to see a list of key features, so that I can understand the application's capabilities at a glance.

#### Acceptance Criteria

1. THE Feature_Section SHALL display the following features with icon and short description: 配送見積もり（FedEx API 連携）, ラベル発行, 決済導線（Square API 連携）, 履歴管理, 住所補完（Google Maps API 連携）
2. THE Feature_Section SHALL present each feature as a card using the existing `Card`, `CardHeader`, `CardContent` components from `src/components/ui/card.tsx`
3. THE Feature_Section SHALL use icons from the `lucide-react` library that is already installed in the project
4. THE Feature_Section SHALL arrange feature cards in a responsive grid layout (1 column on mobile, 2 columns on tablet, 3 columns on desktop)

### Requirement 4: 解決する課題セクション

**User Story:** As a Portfolio_Viewer, I want to understand what business problems QuickLabel solves, so that I can appreciate the practical value of the implementation.

#### Acceptance Criteria

1. THE Challenge_Section SHALL describe the business challenges that QuickLabel addresses (e.g., manual shipping workflow inefficiency, rate comparison complexity, payment tracking fragmentation)
2. THE Challenge_Section SHALL present challenges in a concise list or card format
3. THE Challenge_Section SHALL use calm, factual language without exaggeration (no superlatives or hyperbole)

### Requirement 5: 実装上のポイントセクション

**User Story:** As a Portfolio_Viewer, I want to see the implementation highlights, so that I can evaluate the technical depth of the project.

#### Acceptance Criteria

1. THE Implementation_Section SHALL describe the following implementation aspects: 外部 API 連携（FedEx / Square / Google Maps）, データ構造設計（Supabase / RLS）, 運用設計（デモモード切り替え、環境変数管理）, 管理機能（管理者ダッシュボード、ユーザー管理）
2. THE Implementation_Section SHALL present each aspect with a brief explanation of the technical approach
3. THE Implementation_Section SHALL not disclose any confidential information from real client projects

### Requirement 6: 技術スタックセクション

**User Story:** As a Portfolio_Viewer, I want to see the technology stack used, so that I can understand the technical foundation of the project.

#### Acceptance Criteria

1. THE TechStack_Section SHALL list the following required technologies with their roles: Next.js (App Router), TypeScript, Supabase (Auth / Database / RLS), Vercel (Hosting), FedEx API, Square API, Google Maps API
2. THE TechStack_Section MAY additionally list the following optional technologies if space permits without causing information overload: Tailwind CSS, shadcn/ui, Zustand, Zod, Playwright / Jest
3. THE TechStack_Section SHALL display technologies using `Badge` components from `src/components/ui/badge.tsx` or a similar compact visual format
4. THE TechStack_Section SHALL group technologies by category (フロントエンド, バックエンド/インフラ, 外部 API)

### Requirement 7: デモ環境補足セクション

**User Story:** As a Portfolio_Viewer, I want to clearly understand the demo limitations, so that I do not confuse the demo with a production system.

#### Acceptance Criteria

1. THE Demo_Notice_Section SHALL explicitly state that the application is a portfolio demonstration
2. THE Demo_Notice_Section SHALL list which features are disabled in demo mode (決済処理, ラベル発行, キャンセル操作)
3. THE Demo_Notice_Section SHALL explain that external API calls (FedEx, Square, ExchangeRate) are mocked or disabled
4. THE Demo_Notice_Section SHALL use a visually distinct but non-alarming style (e.g., `bg-amber-50 border-amber-200` consistent with the existing DemoBanner color scheme)

### Requirement 8: CTA セクション

**User Story:** As a Portfolio_Viewer, I want clear navigation options at the bottom of the about page, so that I can proceed to try the demo or return to the top page.

#### Acceptance Criteria

1. THE CTA_Section SHALL include a primary link labeled "見積画面へ" pointing to the Top_Page (`/`), which serves as the entry point to the existing quote workflow
2. THE CTA_Section SHALL include a secondary link labeled "トップページへ戻る" pointing to `/` with `variant="outline"` styling
3. THE CTA_Section SHALL use the existing `Button` component from `src/components/ui/button.tsx` with appropriate variant styling (default for primary CTA, `outline` for secondary)
4. THE CTA_Section SHALL use Next.js `Link` component for client-side navigation
5. THE CTA_Section SHALL use `/` as the canonical destination for both CTAs; no other paths (e.g., `/shipping/new/shipper`) shall be hardcoded in the CTA

### Requirement 9: トップページからの導線追加

**User Story:** As a Portfolio_Viewer, I want a visible link on the top page to the about page, so that I can discover the service description without searching.

#### Acceptance Criteria

1. WHEN the Top_Page is rendered, THE Top_Page SHALL display an About_Link in the area near the top of the page (above or below the main heading, before the quote form)
2. THE About_Link SHALL use text such as "このシステムについて" or "サービス説明"
3. THE About_Link SHALL not obscure, overlap, or visually compete with the Existing_CTA (quote form and its submit button)
4. THE About_Link SHALL use a subtle styling (e.g., text link with `text-gray-600 hover:text-gray-900` or `variant="ghost"` button) to maintain visual hierarchy with the Existing_CTA as the primary action

### Requirement 10: ヘッダーナビゲーションへの導線追加

**User Story:** As a Portfolio_Viewer, I want an about link in the global header, so that I can access the service description from any page.

#### Acceptance Criteria

1. THE Header_Navigation SHALL include an About_Link visible to all users (authenticated and unauthenticated)
2. THE About_Link in Header_Navigation SHALL be positioned before the authentication-related links (login/signup or mypage/logout)
3. THE About_Link in Header_Navigation SHALL use the same styling as other header navigation links (`text-white hover:opacity-80 transition-opacity`)
4. THE About_Link in Header_Navigation SHALL use Next.js `Link` component pointing to `/about`
5. THE About_Link SHALL also be displayed in the mobile navigation menu (e.g., hamburger menu or mobile drawer) following the same placement rules as the desktop header

### Requirement 11: トップページの補足文追加

**User Story:** As a Portfolio_Viewer, I want a brief description on the top page, so that I can immediately understand the context of the application.

#### Acceptance Criteria

1. THE Top_Page SHALL display a short supplementary text near the top (e.g., "FedEx API を用いた配送業務自動化 Web アプリのデモです")
2. THE supplementary text SHALL be styled subtly (e.g., `text-sm text-gray-500`) to avoid competing with the main heading and Existing_CTA
3. THE supplementary text SHALL be placed directly below the main page heading (`<h1>` or equivalent) and before the quote form, with no other elements inserted between the heading and the supplementary text

### Requirement 12: レスポンシブデザインとデザイン整合性

**User Story:** As a Portfolio_Viewer, I want the about page to look consistent with the rest of the application on any device, so that the experience feels cohesive and professional.

#### Acceptance Criteria

1. THE About_Page SHALL render without layout breakage on viewport widths from 320px to 1920px
2. THE About_Page SHALL use the same font family (`Inter` via `next/font/google`) as the rest of the application
3. THE About_Page SHALL use the existing Tailwind CSS responsive breakpoints (`md:`, `lg:`) consistent with other pages
4. THE About_Page SHALL not include any CSS animations or transitions beyond the standard hover effects already used in the application (`hover:opacity-80`, `transition-colors`)
5. THE About_Page SHALL use the existing `container mx-auto px-3 md:p-6` layout wrapper consistent with the root layout's `<main>` element

### Requirement 13: 既存機能への非影響

**User Story:** As a developer, I want the about page addition to have zero impact on existing functionality, so that the quote form, authentication, and other features continue to work correctly.

#### Acceptance Criteria

1. THE About_Page implementation SHALL not modify any existing API routes in `src/app/api/`
2. THE About_Page implementation SHALL not modify the `src/app/page.tsx` file beyond adding the About_Link and supplementary text
3. THE About_Page implementation SHALL not modify the `src/components/header/HeaderClient.tsx` file beyond adding the About_Link
4. THE About_Page implementation SHALL pass `pnpm run build` (Next.js production build) without errors
5. THE About_Page implementation SHALL pass TypeScript type checking without errors

### Requirement 14: 文言トーンとコンテンツガイドライン

**User Story:** As a developer, I want clear content guidelines for the about page, so that the tone is consistent and appropriate for a portfolio demo.

#### Acceptance Criteria

1. THE About_Page SHALL use calm, professional language appropriate for a business application (業務システム向け文体)
2. THE About_Page SHALL not use exaggerated expressions, superlatives, or marketing hyperbole
3. THE About_Page SHALL clearly state that the application is a portfolio demonstration ("ポートフォリオ用デモ")
4. THE About_Page SHALL not reference any real client names, project names, or confidential business information
