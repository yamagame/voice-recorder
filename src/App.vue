<script setup lang="ts">
import { RouterView } from 'vue-router'
import { VoiceRecorder } from "~/audio/voice/recorder"
import { ref, onMounted } from 'vue'
import { Message } from "~/model/message"
import { ChatClinet } from "~/chat"
const startButton = ref<string>("start")
const recorderStateText = ref<string>("")
const messageList = ref<Message[]>([]);
const chatMode = ref<"echo" | "chat">("echo")

const recorder = VoiceRecorder('http://localhost:9002/transcribe')
const chatClinet = ChatClinet('http://localhost:9002/api/chat')

async function onClick() {
  if (startButton.value === "start") {
    if (!recorder.initialized) {
      recorder.initialized = true
      recorder.on("start", () => {
        startButton.value = "recording..."
        recorderStateText.value = ""
      })
      recorder.on("close", () => {
        startButton.value = "start"
        recorderStateText.value = ""
      })
      recorder.on("recognize-start", () => {
        recorderStateText.value = "認識開始"
      })
      recorder.on("recognize-stop", () => {
        recorderStateText.value = "認識停止"
      })
      recorder.on("synthesize-start", () => {
        recorderStateText.value = "発話中"
      })
      recorder.on("synthesize-end", () => {
        recorderStateText.value = "発話終了"
      })
      recorder.on("transcribe-start", () => {
        recorderStateText.value = "認識中..."
      })
      recorder.on("transcribe-end", async (res: { text: string }) => {
        let text = res.text
        // 音声認識テキスト受信、リストに追加
        messageList.value.unshift(new Message({
          actor: "you",
          id: messageList.value.length,
          date: new Date(),
          text,
        }))
        // ChatAPI にリクエスト
        if (!recorder.isSpeaking()) {
          if (["あっ", "はい", "うん", "はあ", "フフフフ", "えっ"].indexOf(text) < 0) {
            const mode = chatMode.value
            const res = await chatClinet.request(text, mode)
            text = res.content
            if (mode === "chat") {
              // チャットテキスト受信、リストに追加
              messageList.value.unshift(new Message({
                actor: "bot",
                id: messageList.value.length,
                date: new Date(),
                text,
              }))
            }
            // 発話
            recorder.speech(text)
          }
          recorderStateText.value = ""
        }
      })
      await recorder.start()
    } else {
      recorder.resume()
      startButton.value = "recording..."
    }
  } else {
    // await recorder.stop()
    recorder.pause()
    startButton.value = "start"
    recorderStateText.value = ""
  }
}

onMounted(async () => {
});
</script>

<template>
  <div class="mark-top-header" @click.stop>
    <div class="mark-container" @click.stop>
      <select v-model="chatMode">
        <option value="echo">echo mode</option>
        <option value="chat">chat mode</option>
      </select>
      <button @click="onClick">{{ startButton }}</button>
      {{ recorderStateText }}
    </div>
  </div>
  <div class="mark-body-container">
    <RouterView :messageList="messageList" />
  </div>
</template>

<style scoped></style>
