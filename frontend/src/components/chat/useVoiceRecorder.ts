/**
 * useVoiceRecorder — manages the MediaRecorder lifecycle and calls the
 * backend Whisper transcription endpoint when the user stops recording.
 */

import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";

interface UseVoiceRecorderArgs {
  onTranscript: (text: string) => void;
  onWarning: (msg: string) => void;
  currentInput: string;
}

export function useVoiceRecorder({ onTranscript, onWarning, currentInput }: UseVoiceRecorderArgs) {
  const [transcriptionAvailable, setTranscriptionAvailable] = useState<boolean | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  // Capture currentInput in a ref so the onstop closure doesn't go stale.
  const currentInputRef = useRef(currentInput);
  useEffect(() => { currentInputRef.current = currentInput; }, [currentInput]);

  useEffect(() => {
    api.transcriptionStatus()
      .then((s) => setTranscriptionAvailable(s.available))
      .catch(() => setTranscriptionAvailable(false));
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setIsRecording(false);
        setIsTranscribing(true);
        try {
          const { text } = await api.transcribeAudio(blob);
          if (text) {
            const prev = currentInputRef.current;
            onTranscript(prev ? prev + " " + text : text);
          } else {
            onWarning("No speech detected — try again.");
          }
        } catch {
          onWarning("Transcription failed. Is Whisper running?");
        } finally {
          setIsTranscribing(false);
        }
      };

      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
    } catch {
      onWarning("Microphone access denied. Check your browser permissions.");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
  };

  return { transcriptionAvailable, isRecording, isTranscribing, startRecording, stopRecording };
}
