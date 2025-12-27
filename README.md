# Posting Map (ポスティング管理マップ)
<img src="docs/images/icon.png" align="right" width="100" alt="Posting Map Icon">


ポスティング（チラシ配布）活動支援アプリです。
地図上で配布エリアを管理し、配布状況（予定・完了・中止）を可視化します。

<video src="docs/images/posting-map.mp4" controls width="100%"></video>

## 主な機能
- **現在地表示**: アプリ起動時に現在地周辺の地図を自動表示し、すぐに活動を開始できます。
- **エリア作図**: 地図上に配布するエリア（多角形）を指でなぞって描画できます。
- **ステータス管理**: 各エリアを色で直感的に管理。
  - 🔵 **予定** (Planned): <br><img src="docs/images/yotei.png" width="200" alt="Planned">
  - 🟢 **完了** (Completed): <br><img src="docs/images/kanryo.png" width="200" alt="Completed">
  - 🔘 **中止** (Cancelled): <br><img src="docs/images/chuushi.png" width="200" alt="Cancelled">
- **メモ機能**: 「チラシお断りの家あり」などの注意事項を記録できます。
- **PWA対応**: スマートフォンのホーム画面に追加することで、ネイティブアプリのように全画面で動作します。

## 開発の軌跡
開発の過程、技術的な課題、デザインの変遷などは [PROGRESS.md](./PROGRESS.md) に詳しくまとめています。

## 技術スタック
- **Framework**: Next.js 16 (App Router)
- **Database**: Firebase Firestore (NoSQL)
- **Auth**: Firebase Authentication (Google Login)
- **Map**: React-Leaflet / Leaflet Draw
- **Styling**: Tailwind CSS (Custom Theme: Mint/Teal)
- **Deployment**: Vercel

## 使い方（簡易）
1. Googleアカウントでログインします。
2. 画面左上の「多角形アイコン」をタップして、地図上に配るエリアを描きます。
3. エリアをタップして「完了」などのステータスを変更し、「保存」します。

## 開発者向けガイド (自分専用の環境を作る方法)
このアプリをフォークして、ご自身の環境（Firebase + Vercel）で動かすための手順です。

1. **Fork & Clone**
   - GitHub画面右上の「Fork」ボタンを押し、自分のアカウントにコピーします。
   - `git clone` でローカルにダウンロードします。

2. **Firebase プロジェクトの作成**
   - [Firebase Console](https://console.firebase.google.com/) で新規プロジェクトを作成します。
   - **Authentication**: 「Google」ログインを有効にします。
   - **Firestore Database**: データベースを作成します。

3. **環境変数の設定**
   - プロジェクト直下に `.env.local` ファイルを作成し、以下のFirebase設定値を記述します。
     ```env
     NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key
     NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
     NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
     NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.firebasestorage.app
     NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
     NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
     # ログイン制限を行う場合のみ設定 (カンマ区切り)
     # NEXT_PUBLIC_ALLOWED_EMAILS=user1@example.com,user2@example.com
     ```

4. **Vercelへのデプロイ**
   - Vercelで「Add New Project」から、Forkしたリポジトリを選択。
   - `Environment Variables` に、上記と同じFirebaseの環境変数を設定してデプロイします。

## ライセンス
このプロジェクトは [MIT License](./LICENSE) のもとで公開されています。
This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.
