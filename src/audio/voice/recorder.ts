import { VAD, VADProps } from '../vad/vad'
import { sampleToWavAudio, audioSettings } from '../wav/genwav'

type RecorderState = 'idle' | 'recording' | 'speaking' | 'delay' | 'transcribe'

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
  audioRecorder?: AudioWorkletNode
  sourceNode?: MediaStreamAudioSourceNode
  analyserNode?: AnalyserNode
  audioContext?: AudioContext
  settings: audioSettings
  counter: number
  vad?: VAD
  transcribeEndpoint: string // 認識エンジンのエンドポイント
  initialized: boolean = false
  voice?: SpeechSynthesisVoice
  utterances: SpeechSynthesisUtterance[] = []
  intervalTimer: number = 0
  delay: number = 0
  state: RecorderState = 'idle'
  _recording: boolean = false
  _speaking: boolean = false

  constructor() {
    super()
    this.buffer = []
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
    this.sourceNode = context.createMediaStreamSource(stream)

    // VAD のオプション設定 (詳細後述)
    const VadOptions = new VADProps()
    // 音声区間検出開始時ハンドラ
    VadOptions.voice_stop = () => {
      if (this.state === 'recording') {
        this.state = 'delay'
        this.delay = 100
        this.emit('recognize-stop', {})
      }
    }
    // 音声区間検出終了時ハンドラ
    VadOptions.voice_start = () => {
      if (this.startVoiceRecording()) {
        this.emit('recognize-start', {})
      }
    }

    // 音声データ録音ノードを作成
    await context.audioWorklet.addModule('static/audio-recorder.js')
    const audioRecorder = new AudioWorkletNode(context, 'audio-recorder')

    this.buffer = []
    audioRecorder.port.addEventListener('message', (event) => {
      // 発話中は録音停止
      if (this._speaking || !this._recording) return
      // 録音データを確保
      this.buffer.push(event.data.buffer)
      if (this.state === 'idle') {
        // 音声区間検出していなければ直近のデータのみにスライス
        const bufferSize = event.data.buffer.length
        const preRecordingSize = ((this.settings.sampleRate / bufferSize) * 10) / 5
        this.buffer = this.buffer.slice(-preRecordingSize)
      }
    })

    // Create analyser
    const analyserNode = context.createAnalyser()
    analyserNode.smoothingTimeConstant = VadOptions.smoothingTimeConstant
    analyserNode.fftSize = VadOptions.fftSize

    // 音声区間検出
    const vad = new VAD({ ...VadOptions, frequencyBinCount: analyserNode.frequencyBinCount })

    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
    }
    this.intervalTimer = window.setInterval(() => {
      // 発話中は録音停止
      if (this._speaking || !this._recording) return
      analyserNode.getFloatFrequencyData(vad.floatFrequencyData)
      vad.update()
      vad.monitor()
      if (this.delay > 0) {
        this.delay--
        if (this.delay == 0) {
          this.stopVoiceRecording()
        }
      }
    }, 10)

    this.vad = vad
    this.analyserNode = analyserNode

    // souceノードにAnalyzerノードを連結
    this.sourceNode.connect(this.analyserNode)

    // VADのアナライザーノードに録音ノードを連結
    this.analyserNode.connect(audioRecorder)

    // 録音ノードを出力先に連結
    audioRecorder.connect(context.destination)

    this.audioRecorder = audioRecorder
    this.audioContext = context

    // 録音スタート
    audioRecorder.port.start()

    this.startRecording()

    this.emit('start', {})

    this._recording = true
  }

  async stop() {
    this.stopRecording()
    this.audioContext?.close()
    this.buffer = []
    this.state = 'idle'
    this.delay = 0
    this.counter = 0
    this.close()
    delete this.vad
    this.emit('close', {})
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
    if (this.state === 'idle') {
      this.state = 'recording'
      return true
    }
    return false
  }

  close() {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer)
    }
    this.intervalTimer = 0
  }

  stopVoiceRecording() {
    if (this.state === 'delay') {
      this.state = 'transcribe'
      this.transcribe()
      this.state = 'idle'
      return true
    }
    return false
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

  pause() {
    this._recording = false
  }

  resume() {
    this._recording = true
  }

  recording(state: boolean) {
    this._recording = state
  }

  isRecording() {
    return this._recording
  }

  speech(text: string) {
    if (typeof speechSynthesis === 'undefined') {
      return
    }
    if (text == '') {
      return
    }
    const uttr = new SpeechSynthesisUtterance(text)
    if (this.voice) {
      uttr.voice = this.voice
    }
    this._speaking = true
    this.emit('synthesize-start', {})
    uttr.onend = () => {
      this.utterances = []
      this.emit('synthesize-end', {})
      this._speaking = false
    }
    this.utterances.push(uttr)
    speechSynthesis.speak(uttr)
  }

  transcribe() {
    if (this.buffer.length <= 0) return
    if (this.transcribeEndpoint === '') return
    const filename = `audio-${this.timeform(this.counter)}.wav`
    this.counter++
    this.emit('transcribe-start', { filename })
    const formData = new FormData()
    const blob = sampleToWavAudio(this.buffer, this.settings)
    formData.append('audio', blob, filename)
    const xhr = new XMLHttpRequest()
    xhr.open('POST', this.transcribeEndpoint, true)
    xhr.onreadystatechange = () => {
      if (xhr.readyState == XMLHttpRequest.DONE) {
        if (xhr.status == 200) {
          const resp = JSON.parse(xhr.response)
          resp.filename = filename
          this.emit('transcribe-end', resp)
        }
      }
    }
    xhr.send(formData)
  }
}
