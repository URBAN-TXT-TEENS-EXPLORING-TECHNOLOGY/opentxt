import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio"
import { useCallback, useState } from "react"
import { api } from "@/lib/api"
import { useAuthToken } from "@/lib/auth"

/**
 * In-chat voice input: record with expo-audio, transcribe via the server's
 * /api/stt (Whisper), hand the text back. This is the lightweight mic button
 * flow — full voice conversations live in the two voice screens.
 */
export function useVoiceInput(onTranscript: (text: string) => void) {
  const token = useAuthToken()
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)

  const start = useCallback(async () => {
    const permission = await AudioModule.requestRecordingPermissionsAsync()
    if (!permission.granted) return
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true })
    await recorder.prepareToRecordAsync()
    recorder.record()
    setRecording(true)
  }, [recorder])

  const stop = useCallback(async () => {
    setRecording(false)
    setTranscribing(true)
    try {
      await recorder.stop()
      await setAudioModeAsync({ allowsRecording: false })
      const uri = recorder.uri
      if (uri === null) return
      const text = await api.transcribe(token, {
        uri,
        name: "recording.m4a",
        type: "audio/m4a",
      })
      if (text.trim().length > 0) onTranscript(text.trim())
    } finally {
      setTranscribing(false)
    }
  }, [recorder, token, onTranscript])

  return { recording, transcribing, start, stop }
}
