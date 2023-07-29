export class Message {
  actor: 'you' | 'bot'
  id: number
  date: Date
  text: string
  constructor(props: Message) {
    this.actor = props.actor
    this.id = props.id
    this.date = props.date
    this.text = props.text
  }
}
