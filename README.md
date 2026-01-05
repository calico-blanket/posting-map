# Posting Map (ポスティング管理マップ)
<img src="docs/images/icon.png" align="right" width="100" alt="Posting Map Icon">


ポスティング（チラシ配布）活動支援アプリです。
地図上で配布エリアを管理し、配布状況（予定・完了・中止）を可視化します。


## 主な機能
- **現在地表示**: アプリ起動時に現在地周辺の地図を自動表示し、すぐに活動を開始できます。
- **エリア作図**: 地図上に配布するエリア（多角形）を指でなぞって描画できます。
- **ステータス管理**: 各エリアを色で直感的に管理。
  - 🔵 **予定** (Planned): <br><img src="docs/images/yotei.png" width="200" alt="Planned">
  - 🟢 **完了** (Completed): <br><img src="docs/images/kanryo.png" width="200" alt="Completed">
  - 🔘 **中止** (Cancelled): <br><img src="docs/images/chuushi.png" width="200" alt="Cancelled">
- **ゲスト利用**: Googleアカウントを持っていないユーザーも「ゲスト」として参加・編集が可能です。
- **メモ機能**: 「チラシお断りの家あり」などの注意事項を記録できます。
- **データ管理**: 設定画面からいつでも全データをJSONファイルとしてバックアップ（ダウンロード）および復元（インポート）できます。
- **写真付きスポット登録**: 撮影した写真（またはアルバムから選択）をアップロードして地図上にピンを立てられます。EXIF情報があれば自動で位置を特定します。
- **PWA対応**: スマートフォンのホーム画面に追加することで、ネイティブアプリのように全画面で動作します。

## 開発の軌跡
開発の過程、技術的な課題、デザインの変遷などは [PROGRESS.md](./PROGRESS.md) に詳しくまとめています。

## 今後の展望 (ロードマップ)
今後の機能追加や改善計画（セキュリティ強化、CSVエクスポート、デスクトップアプリ化など）については [ROADMAP.md](./ROADMAP.md) をご覧ください。

## 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Authentication (Google Login)
- **Map**: React-Leaflet / Leaflet Draw
- **Styling**: Tailwind CSS (Custom Theme: Mint/Teal)
- **Deployment**: Vercel

## アーキテクチャ選定理由 (Architecture Decision Record)

### なぜ Firebase Storage ではなく Firestore なのか？
当初は大容量のデータを扱える **Firebase Storage**（ファイルストレージ）の利用も検討されましたが、最終的に **Cloud Firestore**（NoSQLデータベース）を選定しました。理由は以下の通りです。

1.  **同時編集（コンフリクト）の防止**:
    *   File Storage は「エクセルファイルの共有」に似ており、複数人が同時に編集するとデータの上書きや消失のリスクがあります。
    *   Firestore はデータベースであり、行単位・フィールド単位での更新が可能なため、チームでの同時利用に最適です。
2.  **パフォーマンスと通信量**:
    *   Storage はデータの一部だけ欲しくてもファイル全体をダウンロードする必要があります。
    *   Firestore は画面に必要なデータだけをピンポイントで取得・更新できるため、データ量が増えても高速に動作します。
3.  **将来的な拡張性 (Hybrid構成)**:
    *   将来的に写真の容量などが増えた場合でも、現在の Firestore 構成を捨てずに、「写真は Storage へ、場所データは Firestore へ」という**ハイブリッド構成**へスムーズに移行可能です。


## 使い方（簡易）
1. Googleアカウントでログインします。
2. 画面左上の「多角形アイコン」をタップして、地図上に配るエリアを描きます。
3. エリアをタップして「完了」などのステータスを変更し、「保存」します。

## 開発者向けガイド (自分専用の環境を作る方法)
このアプリをフォークして、ご自身の環境（Firebase + Vercel）で動かすための手順です。

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fcalico-blanket%2Fposting-map)

### 前提条件
このアプリを自分で設置（デプロイ）するには、以下のサービスのアカウントが必要です（いずれも無料プランで利用可能です）。
- **GitHubアカウント**: ソースコードを管理するために必要です。
- **Vercelアカウント**: アプリをインターネット上に公開（ホスティング）するために必要です。

1. **Deployボタンをクリック**
   - 上記の「Deploy with Vercel」ボタンを押すと、自動的にGithubリポジトリの作成（クローン）とVercelへのデプロイ準備が始まります。
   - 画面の指示に従ってGitHubアカウントとの連携などを許可してください。

3. **デプロイの完了**
   - 環境変数の設定画面が表示されますが、**ここでは何も入力せずに** Deploy を続行してください。
   - デプロイが完了したら、生成されたURL（Dashboardボタンなどから移動）をクリックしてアプリを開きます。

4. **セットアップウィザードの実行**
   - アプリを開くと自動的に「初期セットアップ」画面が表示されます。
   - 画面の案内に従ってFirebaseプロジェクトを作成し、設定を入力してください。

> **Note**: 本格運用する際は、ウィザードの最後に案内される手順に従って、Vercelの管理画面（Settings > Environment Variables）に環境変数を正式に登録することを推奨します。

## ライセンス
このプロジェクトは [MIT License](./LICENSE) のもとで公開されています。
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 作者
猫柄毛布（calico-blanket）

## 使用AI
Antigravitiy
