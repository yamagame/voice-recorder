<script setup lang="ts">
import { RouterView } from 'vue-router'
import { StartVoiceRecorder } from "./app/voice"
import { ref, onMounted } from 'vue'
import { Message } from "./model/message"
const startButton = ref<string>("start")
const messageList = ref<Message[]>([]);
async function onClick() {
  if (startButton.value === "start") {
    await StartVoiceRecorder('http://0.0.0.0:9002/transcribe', (text: string) => {
      console.log(text)
      messageList.value.unshift({ date: new Date(), text })
    })
    startButton.value = "recording..."
  }
}
onMounted(async () => {
  //
});
</script>

<template>
  <div class="mark-top-header" @click.stop>
    <div class="mark-container" @click.stop>
      <button @click="onClick">{{ startButton }}</button>
    </div>
  </div>
  <div class="mark-body-container">
    <RouterView :messageList="messageList" />
  </div>
</template>

<style scoped></style>
