import { VAD, VADProps } from './vad'
import { sampleToWavAudio, audioSettings } from './audio'

let recorder: VoiceRecoreder

// 音声処理初期設定関数（下記getUserMediaのコールバックとして、マイクとの接続開始時に実行）
export async function StartVoiceRecorder(
  transcribeEndpoint: string,
  callback: (val: string) => void,
) {
  if (recorder) return
  recorder = new VoiceRecoreder(transcribeEndpoint)
  recorder.callback = callback
  recorder.startVad()
  recorder.start()
}

export class VoiceRecoreder {
  buffer: Float32Array[]
  recording: boolean
  audioRecorder?: AudioWorkletNode
  audioContext?: AudioContext
  settings: audioSettings
  listening: boolean
  counter: number
  vad?: VAD
  transcribeEndpoint: string
  callback: (val: string) => void

  constructor(transcribeEndpoint: string) {
    this.buffer = []
    this.recording = false
    this.listening = true
    this.counter = 0
    this.transcribeEndpoint = transcribeEndpoint
    this.settings = new audioSettings({})
    this.callback = () => {}
  }

  async startVad() {
    const context = new AudioContext()

    // getUserMediaを起動し、マイクアクセスを開始する
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    // 音声ストリーム音源オブジェクトの作成
    const sourceNode = context.createMediaStreamSource(stream)

    // VAD のオプション設定 (詳細後述)
    const options = new VADProps(sourceNode)
    // 音声区間検出開始時ハンドラ
    options.voice_stop = () => {
      this.stopRecording()
    }
    // 音声区間検出終了時ハンドラ
    options.voice_start = () => {
      this.startRecording()
    }

    // VADオブジェクト作成 (なお、本オブジェクトは以降使用する必要はない)
    this.vad = new VAD(options)
  }

  async start() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const [track] = stream.getAudioTracks()
    const settings = track.getSettings()
    this.settings = new audioSettings(settings)

    console.log('channelCount', this.settings.channelCount)
    console.log('sampleRate', this.settings.sampleRate)
    console.log('sampleSize', this.settings.sampleSize)

    const audioContext = new AudioContext()
    await audioContext.audioWorklet.addModule('static/audio-recorder.js') // <3>

    const mediaStreamSource = audioContext.createMediaStreamSource(stream) // <4>
    const audioRecorder = new AudioWorkletNode(audioContext, 'audio-recorder') // <5>
    // const buffers = []
    this.buffer = []

    audioRecorder.port.addEventListener('message', (event) => {
      const bufferSize = event.data.buffer.length
      const preRecordingSize = ((this.settings.sampleRate / bufferSize) * 2) / 5 // 0.4秒前から録音
      this.buffer.push(event.data.buffer)
      if (!this.recording) {
        this.buffer = this.buffer.slice(-preRecordingSize)
      }
    })
    audioRecorder.port.start()

    mediaStreamSource.connect(audioRecorder) // <8>
    audioRecorder.connect(audioContext.destination)

    this.audioRecorder = audioRecorder
    this.audioContext = audioContext

    const parameter = this.audioRecorder.parameters.get('isRecording')
    if (parameter) parameter.setValueAtTime(1, this.audioContext.currentTime)
  }

  stop() {
    if (this.audioRecorder == null || this.audioContext == null) return
    const parameter = this.audioRecorder.parameters.get('isRecording')
    if (parameter) parameter.setValueAtTime(0, this.audioContext.currentTime)
  }

  startRecording() {
    if (this.listening) {
      console.log('voice_start')
      this.recording = true
    }
  }

  stopRecording() {
    if (this.listening && this.recording) {
      console.log('voice_stop')
      this.request()
    }
    this.recording = false
  }

  timeform(index: number) {
    const now = new Date()
    return `${
      now.getFullYear() +
      (now.getMonth() + 1).toString().padStart(2, '0') +
      now.getDate().toString().padStart(2, '0')
    }-${
      now.getHours().toString().padStart(2, '0') +
      now.getMinutes().toString().padStart(2, '0') +
      now.getSeconds().toString().padStart(2, '0')
    }-${(index % 100).toString().padStart(2, '0')}`
  }

  speech(text: string) {
    this.listening = false
    this.recording = false
    const uttr = new SpeechSynthesisUtterance(text)
    uttr.onend = () => {
      this.recording = false
      this.listening = true
      this.buffer = []
    }
    speechSynthesis.speak(uttr)
  }

  request() {
    if (this.buffer.length <= 0) return
    const formData = new FormData()
    const blob = sampleToWavAudio(this.buffer, this.settings)
    formData.append('audio', blob, `audio-${this.timeform(this.counter)}.wav`)
    this.counter++
    const xhr = new XMLHttpRequest()
    xhr.open('POST', this.transcribeEndpoint, true)
    xhr.onreadystatechange = () => {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) {
          const resp = JSON.parse(xhr.response)
          if (resp.text) {
            // console.log(resp.text)
            this.speech(resp.text)
            this.callback(resp.text)
          }
        }
      }
    }
    xhr.send(formData)
  }
}
