<script setup lang="ts">
import { RouterView } from 'vue-router'
import { VoiceRecorder } from "./audio/voice/recorder"
import { ref, onMounted } from 'vue'
import { Message } from "./model/message"
const startButton = ref<string>("start")
const recorderStateText = ref<string>("")
const messageList = ref<Message[]>([]);

const recorder = VoiceRecorder()
recorder.setEndpoint('http://localhost:9002/transcribe')

async function onClick() {
  if (startButton.value === "start") {
    if (!recorder.initialized) {
      recorder.initialized = true
      recorder.on("start", () => {
        // 認識開始
        recorderStateText.value = "認識中..."
      })
      recorder.on("stop", () => {
        // 認識停止
        recorderStateText.value = ""
      })
      recorder.on("recognize", (res: { text: string }) => {
        // 音声認識テキスト受信、リストに追加
        messageList.value.unshift(new Message({
          id: messageList.value.length,
          date: new Date(),
          text: res.text,
        }))
        // 発話
        recorder.speech(res.text)
      })
    }
    await recorder.start()
    startButton.value = "recording..."
  } else {
    await recorder.stop()
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
      <button @click="onClick">{{ startButton }}</button>
      {{ recorderStateText }}
    </div>
  </div>
  <div class="mark-body-container">
    <RouterView :messageList="messageList" />
  </div>
</template>

<style scoped></style>
