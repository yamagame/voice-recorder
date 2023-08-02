<script setup lang="ts">
import { Message } from "~/model/message"
import { getFormattedDate } from "~/audio/date"
defineProps<{
  messageList: Message[]
}>()
</script>

<template>
  <main>
    <div class="tbl-bdr">
      <div style="margin:10px;">
        <table style="width:100%">
          <thead>
            <tr :style="{ 'background-color': '#E0F0F0', 'text-align': 'left' }">
              <th style="width:160px;">日時</th>
              <th>テキスト</th>
            </tr>
          </thead>
          <tbody v-for="message of messageList" :key="message.id">
            <tr>
              <td>{{ getFormattedDate(message.date, "yyyy/MM/dd hh:mm:ss") }}</td>
              <td v-if="message.actor === 'you'" class="message-you">
                {{ message.text }}
              </td>
              <td v-else class="message-bot">{{ message.text }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </main>
</template>
