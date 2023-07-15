# VoiceRecorder

音声認識を行うモジュールです。サブモジュールとしてvadを使用します。

以下にサンプルコードを示します。

```typescript
import { VoiceRecorder } from "./audio/voice/recorder"

async function start() {
  const recorder = VoiceRecorder()
  // ReazonSpeechサーバーのAPIエンドポイントを設定
  recorder.setEndpoint('http://0.0.0.0:9002/transcribe')
  recorder.on("start", () => {
    // 認識開始
    console.log("認識中...")
  })
  recorder.on("stop", () => {
    // 認識停止
    console.log("認識停止中")
  })
  recorder.on("recognize", (res: { text: string }) => {
    // 音声認識テキスト受信
    console.log(res.text)
    // 発話
    recorder.speech(res.text)
  })
  // onClickイベントから呼び出す
  await recorder.start()
}

```

マイクを使用するにはボタン押下などのユーザーインタラクションが必要です。
サンプルの start() 関数は onClick イベントの中で実行しなければマイクが有効になりません。
