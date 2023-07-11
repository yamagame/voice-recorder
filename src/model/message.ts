export class Message {
  id: number
  date: Date
  text: string
  constructor(props: Message) {
    this.id = props.id
    this.date = props.date
    this.text = props.text
  }
}
