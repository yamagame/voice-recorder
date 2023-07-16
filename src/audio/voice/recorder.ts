import { VAD, VADProps } from '../vad/vad'
import { sampleToWavAudio, audioSettings } from '../wav/genwav'

let recorder: Recoreder

// 音声処理初期設定関数（下記getUserMediaのコールバックとして、マイクとの接続開始時に実行）
export function VoiceRecorder() {
  if (recorder) {
    return recorder
  }
  recorder = new Recoreder()
  return recorder
}

class EventEmitter {
  events: { [index: string]: { call: (event: any) => void }[] } = {}
  constructor() {}
  emit(name: string, event: any) {
    if (this.events[name]) {
      this.events[name].forEach((v) => {
        if (v.call) v.call(event)
      })
    }
  }
  removeAll(name: string) {
    this.events[name] = []
  }
  on(name: string, call: (event: any) => void) {
    this.events[name] = [{ call }]
  }
}

class Recoreder extends EventEmitter {
  buffer: Float32Array[]
  recording: boolean
  audioRecorder?: AudioWorkletNode
  audioContext?: AudioContext
  settings: audioSettings
  speaking: boolean // 発話中フラッグ
  counter: number
  vad?: VAD
  transcribeEndpoint: string // 認識エンジンのエンドポイント
  initialized: boolean = false
  voice?: SpeechSynthesisVoice

  constructor() {
    super()
    this.buffer = []
    this.recording = false
    this.speaking = false
    this.counter = 0
    this.transcribeEndpoint = ''
    this.settings = new audioSettings({})
    this.selectVoice('ja-JP')
  }

  setEndpoint(endpoint: string) {
    this.transcribeEndpoint = endpoint
  }

  async start() {
    // getUserMediaを起動し、マイクアクセスを開始する
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const [track] = stream.getAudioTracks()
    const settings = track.getSettings()
    this.settings = new audioSettings(settings)

    const context = new AudioContext()

    if (this.settings.channelCount === 0) this.settings.channelCount = 1
    if (this.settings.sampleRate === 0) this.settings.sampleRate = context.sampleRate
    if (this.settings.sampleSize === 0) this.settings.sampleSize = 16

    console.log('channelCount', this.settings.channelCount)
    console.log('sampleRate', this.settings.sampleRate)
    console.log('sampleSize', this.settings.sampleSize)

    // 音声ストリーム音源オブジェクトの作成
    const sourceNode = context.createMediaStreamSource(stream)

    // VAD のオプション設定 (詳細後述)
    const options = new VADProps(sourceNode)
    // 音声区間検出開始時ハンドラ
    options.voice_stop = () => {
      this.stopVoiceRecording()
      this.emit('stop', {})
    }
    // 音声区間検出終了時ハンドラ
    options.voice_start = () => {
      if (this.startVoiceRecording()) {
        this.emit('start', {})
      }
    }
    this.vad = new VAD(options)

    // 音声データ録音ノードを作成
    await context.audioWorklet.addModule('static/audio-recorder.js')
    const audioRecorder = new AudioWorkletNode(context, 'audio-recorder')

    this.buffer = []
    audioRecorder.port.addEventListener('message', (event) => {
      // 録音データを確保
      this.buffer.push(event.data.buffer)
      if (!this.recording) {
        // 音声区間検出していなければ直近のデータのみにスライス
        const bufferSize = event.data.buffer.length
        const preRecordingSize = ((this.settings.sampleRate / bufferSize) * 2) / 5 // 0.4秒前から録音
        this.buffer = this.buffer.slice(-preRecordingSize)
      }
    })

    // VADのアナライザーノードに録音ノードを連結
    this.vad.analyser.connect(audioRecorder)
    // 録音ノードを出力先に連結
    audioRecorder.connect(context.destination)

    this.audioRecorder = audioRecorder
    this.audioContext = context

    // 録音スタート
    audioRecorder.port.start()

    this.startRecording()
  }

  async stop() {
    this.stopRecording()
    this.audioContext?.close()
    this.buffer = []
    this.recording = false
    this.speaking = false
    this.counter = 0
    this.vad?.close()
    delete this.vad
  }

  startRecording() {
    if (this.audioRecorder == null || this.audioContext == null) return
    const parameter = this.audioRecorder.parameters.get('isRecording')
    if (parameter) parameter.setValueAtTime(1, this.audioContext.currentTime)
  }

  stopRecording() {
    if (this.audioRecorder == null || this.audioContext == null) return
    const parameter = this.audioRecorder.parameters.get('isRecording')
    if (parameter) parameter.setValueAtTime(0, this.audioContext.currentTime)
    this.buffer = []
  }

  startVoiceRecording() {
    if (!this.speaking) {
      this.recording = true
      return true
    }
    return false
  }

  stopVoiceRecording() {
    if (!this.speaking && this.recording) {
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

  selectVoice(lang: string) {
    const populateVoiceList = () => {
      if (typeof speechSynthesis === 'undefined') {
        return
      }
      const voices = speechSynthesis.getVoices()
      this.voice = voices.find((voice) => voice.lang === lang)
    }
    populateVoiceList()
    if (typeof speechSynthesis !== 'undefined' && speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = populateVoiceList
    }
  }

  speech(text: string) {
    this.speaking = true
    this.recording = false
    const uttr = new SpeechSynthesisUtterance(text)
    if (this.voice) {
      uttr.voice = this.voice
    }
    uttr.onend = () => {
      this.recording = false
      this.speaking = false
      this.buffer = []
    }
    speechSynthesis.speak(uttr)
  }

  request() {
    if (this.buffer.length <= 0) return
    if (this.transcribeEndpoint === '') return
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
          this.emit('recognize', resp)
        }
      }
    }
    xhr.send(formData)
  }
}
