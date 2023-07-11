<script setup lang="ts">
import { RouterView } from 'vue-router'
import { StartVoiceRecorder } from "./app/voice"
import { ref, onMounted } from 'vue'
const message = ref(``);
async function onClick() {
  await StartVoiceRecorder('http://0.0.0.0:9002/transcribe', (text: string) => {
    console.log(text)
    message.value = text
  })
}
onMounted(async () => {
  //
});
</script>

<template>
  <header>
    <div class="wrapper">
      <button @click="onClick">start</button>
      {{ message }}
    </div>
  </header>
  <RouterView />
</template>

<style scoped></style>
