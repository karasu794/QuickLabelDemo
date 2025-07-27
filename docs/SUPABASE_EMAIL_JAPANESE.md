# Supabase 認証メール日本語化ガイド

## 📧 認証メールテンプレートの日本語化

現在、Supabaseから送信される認証メールが英語で表示されているため、日本語テンプレートに変更します。

## 🔧 設定方法

### **1. Supabaseダッシュボードにアクセス**

1. **Supabaseダッシュボード**にログイン
2. プロジェクトを選択
3. 左側メニューから **「Authentication」** → **「Email Templates」** を選択

### **2. Confirm signupテンプレートの編集**

「**Confirm signup**」テンプレートを選択し、以下の内容に変更してください：

#### **Subject（件名）**:
```
アカウント確認のお願い - QuickLabel
```

#### **Body（HTML）**:
```html
<h2>アカウント確認のお願い</h2>

<p>こんにちは、</p>

<p>QuickLabelにご登録いただき、ありがとうございます。</p>

<p>アカウントを有効化するために、下記のリンクをクリックしてください：</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
    アカウントを確認する
  </a>
</p>

<p>または、以下のURLをブラウザにコピーして貼り付けてください：</p>
<p>{{ .ConfirmationURL }}</p>

<p>このリンクは24時間有効です。</p>

<hr>

<p><small>
このメールに心当たりがない場合は、このメールを無視してください。<br>
お問い合わせ：support@quicklabel.example.com
</small></p>
```

### **3. その他のテンプレートも日本語化（任意）**

#### **Magic Link テンプレート**

**Subject**:
```
ログインリンク - QuickLabel
```

**Body**:
```html
<h2>ログインリンク</h2>

<p>こんにちは、</p>

<p>QuickLabelへのログインリンクをお送りします。</p>

<p>下記のリンクをクリックしてログインしてください：</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
    ログインする
  </a>
</p>

<p>このリンクは1時間有効です。</p>

<hr>

<p><small>
このメールに心当たりがない場合は、このメールを無視してください。
</small></p>
```

#### **Change Email Address テンプレート**

**Subject**:
```
メールアドレス変更の確認 - QuickLabel
```

**Body**:
```html
<h2>メールアドレス変更の確認</h2>

<p>こんにちは、</p>

<p>メールアドレスの変更リクエストを受け付けました。</p>

<p>変更を確定するために、下記のリンクをクリックしてください：</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 24px; background-color: #0070f3; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
    メールアドレス変更を確認する
  </a>
</p>

<p>このリンクは24時間有効です。</p>

<hr>

<p><small>
このメールに心当たりがない場合は、このメールを無視してください。
</small></p>
```

#### **Reset Password テンプレート**

**Subject**:
```
パスワードリセット - QuickLabel
```

**Body**:
```html
<h2>パスワードリセット</h2>

<p>こんにちは、</p>

<p>パスワードのリセットリクエストを受け付けました。</p>

<p>新しいパスワードを設定するために、下記のリンクをクリックしてください：</p>

<p>
  <a href="{{ .ConfirmationURL }}" 
     style="display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 4px; font-weight: bold;">
    パスワードをリセットする
  </a>
</p>

<p>このリンクは1時間有効です。</p>

<hr>

<p><small>
このメールに心当たりがない場合は、このメールを無視してください。<br>
パスワードリセットを要求していない場合は、アカウントのセキュリティを確認してください。
</small></p>
```

## 🎨 カスタマイズのポイント

### **1. ブランドカラーの統一**
- リンクボタンの色：`#0070f3`（Next.jsブルー）
- エラーアクション：`#dc3545`（Bootstrap危険色）

### **2. 日本語フォントの指定**
CSSでフォントファミリーを指定する場合：

```html
<style>
  body {
    font-family: "ヒラギノ角ゴ Pro", "Hiragino Kaku Gothic Pro", "メイリオ", Meiryo, sans-serif;
    line-height: 1.6;
    color: #333;
  }
</style>
```

### **3. 企業情報のカスタマイズ**
- 会社名：QuickLabel → 実際のサービス名
- サポートメール：support@quicklabel.example.com → 実際のメールアドレス

## ✅ 設定完了後のテスト

1. **新規ユーザー登録**を実行
2. **受信メールの確認**
   - 件名が日本語になっている
   - 本文が日本語で表示される
   - リンクボタンのデザインが適用される

## 📝 注意事項

- **テンプレート変更は即座に反映**されます
- **既存のメール送信待ちには影響しません**
- **本番環境**では会社の正式な情報に変更してください
- **プライバシーポリシー**や**利用規約**へのリンクを追加することを推奨します

## 🔄 元に戻す方法

デフォルトテンプレートに戻したい場合は、Email Templates画面で「**Reset to default**」ボタンをクリックしてください。 