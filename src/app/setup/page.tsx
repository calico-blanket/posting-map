"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Settings, Check, Copy, ExternalLink, AlertTriangle, Play } from "lucide-react";
import Link from "next/link";

export default function SetupPage() {
    const router = useRouter();
    const [step, setStep] = useState(1);
    const [configInput, setConfigInput] = useState("");
    const [error, setError] = useState<string | null>(null);

    const handleNext = () => setStep(s => s + 1);
    const handlePrev = () => setStep(s => s - 1);

    const parseConfig = (input: string) => {
        try {
            // Try parsing as JSON first
            if (input.trim().startsWith("{")) {
                return JSON.parse(input);
            }
            // Try parsing as const firebaseConfig = { ... }
            const match = input.match(/firebaseConfig\s*=\s*({[\s\S]*?});/);
            if (match && match[1]) {
                // Dangerous eval? JSON.parse usually fails on JS object literals (keys without quotes).
                // Let's rely on JSON input primarily or ask user to provide JSON.
                // Simple regex parser for keys
                const obj: any = {};
                const lines = match[1].split("\n");
                lines.forEach(line => {
                    const kv = line.match(/^\s*(\w+):\s*["'](.*)["'],?/);
                    if (kv) {
                        obj[kv[1]] = kv[2];
                    }
                });
                if (obj.apiKey) return obj;
            }
            throw new Error("Invalid format");
        } catch (e) {
            return null;
        }
    };

    const handleSave = () => {
        try {
            let config = parseConfig(configInput);

            // If parsing failed, maybe it's just raw Env Vars? or User pasted just the object content?
            if (!config) {
                // Try relaxed JSON parsing (adding quotes to keys)
                try {
                    // eslint-disable-next-line
                    const relaxed = configInput.replace(/(\w+):/g, '"$1":').replace(/'/g, '"');
                    config = JSON.parse(relaxed);
                } catch (e) {
                    setError("設定の解析に失敗しました。JSON形式またはfirebaseConfigオブジェクト全体を貼り付けてください。");
                    return;
                }
            }

            if (!config || !config.apiKey) {
                setError("有効なAPI Keyが見つかりません。");
                return;
            }

            // Save to LocalStorage
            localStorage.setItem("firebase_config", JSON.stringify(config));

            // Reload to apply
            window.location.href = "/";

        } catch (e) {
            setError("保存に失敗しました。");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-3xl w-full space-y-8">
                <div className="text-center">
                    <Settings className="mx-auto h-12 w-12 text-teal-600" />
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">初期セットアップ</h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Posting Mapを利用するために、Firebaseの設定が必要です。
                    </p>
                </div>

                <div className="bg-white shadow overflow-hidden sm:rounded-lg">
                    {/* Progress Bar */}
                    <div className="bg-gray-100 h-2 w-full">
                        <div
                            className="bg-teal-500 h-2 transition-all duration-300"
                            style={{ width: `${(step / 4) * 100}%` }}
                        ></div>
                    </div>

                    <div className="p-6 sm:p-10">
                        {step === 1 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">1. はじめに</h3>
                                <p className="text-gray-600">
                                    このウィザードでは、Google Firebaseプロジェクトを作成し、必要なAPIキーを設定する手順を案内します。
                                    <br /><br />
                                    <strong>所要時間: 約5分</strong>
                                </p>
                                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                    <div className="flex">
                                        <div className="flex-shrink-0">
                                            <AlertTriangle className="h-5 w-5 text-blue-400" />
                                        </div>
                                        <div className="ml-3">
                                            <p className="text-sm text-blue-700">
                                                ここで設定した内容はブラウザに一時保存されます。本番環境（Vercelなど）にデプロイする際は、環境変数への設定が必要になります（最後に案内します）。
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end">
                                    <button onClick={handleNext} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none ring-2 ring-offset-2 ring-teal-500">
                                        次へ <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">2. Firebaseプロジェクトの作成</h3>
                                <ol className="list-decimal list-inside space-y-3 text-gray-600">
                                    <li>
                                        <a href="https://console.firebase.google.com/" target="_blank" rel="noopener noreferrer" className="text-teal-600 hover:underline inline-flex items-center">
                                            Firebase Console <ExternalLink className="ml-1 h-3 w-3" />
                                        </a>
                                        を開き、Googleアカウントでログインします。
                                    </li>
                                    <li>画面中央の<strong>「Firebaseプロジェクトを設定して開始」</strong>をクリックします（または「プロジェクトを追加」）。</li>
                                    <li>
                                        適当な名前（例: <code>posting-map</code>）を入力し、「続行」で進みます。
                                        <ul className="list-disc list-inside ml-6 mt-1 text-sm text-gray-500">
                                            <li>Googleデベロッパープログラムへの参加は「無効」で構いません。</li>
                                            <li>Geminiは「無効」で構いません。</li>
                                            <li>Googleアナリティクスは「無効」で構いません。</li>
                                        </ul>
                                    </li>
                                    <li>「プロジェクトを作成」を押し、処理完了後に「続行」を押します。</li>
                                    <li>
                                        プロジェクトのダッシュボードで、<strong>「+ アプリを追加」</strong>をクリックし、<strong>ウェブ</strong>（<code>&lt;/&gt;</code> アイコン）を選択します。
                                        <ul className="list-disc list-inside ml-6 mt-1 text-sm text-gray-500">
                                            <li>アプリのニックネーム: プロジェクト名と同じで構いません（例: <code>posting-map</code>）。</li>
                                            <li>Firebase Hosting: <strong>チェックは外したまま</strong>で大丈夫です（Vercelを利用するため）。</li>
                                            <li>「アプリを登録」ボタンをクリックしてください。</li>
                                        </ul>
                                    </li>
                                    <li>
                                        <code>const firebaseConfig = ...</code> から始まるコードが表示されます。
                                        <br />
                                        コード枠内の<strong>右下にあるコピーボタン</strong>（四角が重なったアイコン）を押して、コード全体をコピーしてください。
                                    </li>
                                    <li>コピーしたら、Firebaseコンソール画面で「コンソールに進む」をクリックします。</li>
                                </ol>
                                <div className="flex justify-between">
                                    <button onClick={handlePrev} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                        戻る
                                    </button>
                                    <button onClick={handleNext} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                                        次へ <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">3. 機能の有効化</h3>
                                <div className="space-y-4 text-gray-600">
                                    <p>Firebaseコンソールに戻り、以下の2つの機能を有効にしてください。</p>

                                    <div className="border border-gray-200 rounded-md p-4">
                                        <h4 className="font-bold text-gray-800 mb-2">Authentication (認証)</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            <li>左側のメニューから<strong>構築＞Authentication</strong>を選択し、「始める」をクリック。</li>
                                            <li>
                                                「ログイン方法」タブで<strong>「Google」</strong>を選択し、有効にします。
                                                <br />
                                                <span className="text-xs text-gray-500">（他のログイン方法は現在利用できません）</span>
                                            </li>
                                            <li>「保存」を押します。</li>
                                        </ul>
                                    </div>

                                    <div className="border border-gray-200 rounded-md p-4">
                                        <h4 className="font-bold text-gray-800 mb-2">Cloud Firestore (データベース)</h4>
                                        <ul className="list-disc list-inside text-sm">
                                            <li>左メニューの<strong>「構築」</strong>から「Firestore Database」を選択します。</li>
                                            <li>「データベースの作成」をクリックします。</li>
                                            <li>場所（ロケーション）は <code>asia-northeast1</code> (Tokyo) などを推奨します。</li>
                                            <li>セキュリティルールは<strong>「本番環境モード」</strong>を選択して作成してください。</li>
                                        </ul>
                                    </div>
                                </div>
                                <div className="flex justify-between">
                                    <button onClick={handlePrev} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                        戻る
                                    </button>
                                    <button onClick={handleNext} className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700">
                                        次へ <ChevronRight className="ml-2 h-4 w-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 4 && (
                            <div className="space-y-6">
                                <h3 className="text-xl font-bold text-gray-800">4. 設定の入力</h3>
                                <p className="text-gray-600">
                                    ステップ2でコピーした <code>firebaseConfig</code> の内容を以下に貼り付けてください。
                                </p>

                                <textarea
                                    className="w-full h-48 p-3 border border-gray-300 rounded-md font-mono text-sm focus:ring-teal-500 focus:border-teal-500"
                                    placeholder={'const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  ...\n};'}
                                    value={configInput}
                                    onChange={(e) => setConfigInput(e.target.value)}
                                ></textarea>

                                {error && (
                                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded text-sm flex items-center gap-2">
                                        <AlertTriangle size={16} />
                                        {error}
                                    </div>
                                )}

                                <div className="flex justify-between items-center">
                                    <button onClick={handlePrev} className="inline-flex justify-center py-2 px-4 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50">
                                        戻る
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        className="inline-flex items-center justify-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-md text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                                    >
                                        <Play className="mr-2 h-5 w-5" />
                                        設定を保存して開始
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="text-center text-sm text-gray-500">
                    <Link href="/" className="underline hover:text-gray-700">
                        トップページへ戻る（再試行）
                    </Link>
                </div>
            </div>
        </div>
    );
}
