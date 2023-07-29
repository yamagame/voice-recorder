type ChatInput = {
  endpoint: string
}

export class ChatResponse {
  text: string = ''
  content: string = ''
}

export function ChatClinet(props: ChatInput) {
  return new Chat(props)
}

export class Chat {
  url: string = ''
  constructor(props: ChatInput) {
    this.url = props.endpoint
  }

  request(text: string, mode: 'echo' | 'chat'): Promise<ChatResponse> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', this.url, true)
      xhr.setRequestHeader('Content-Type', 'application/json')
      xhr.onreadystatechange = () => {
        if (xhr.readyState == XMLHttpRequest.DONE) {
          if (xhr.status == 200) {
            const resp = JSON.parse(xhr.response)
            resolve(resp as ChatResponse)
          }
        }
      }
      xhr.send(JSON.stringify({ text, mode }))
    })
  }
}
