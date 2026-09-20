import { useEffect, useRef, useState } from "react";
import { Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
};

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

type VoiceInputButtonProps = {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  className?: string;
  onError?: (message: string) => void;
};

export function VoiceInputButton({
  value,
  onChange,
  label = "Speak",
  className,
  onError,
}: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => {
    recognitionRef.current?.stop();
  }, []);

  const toggle = async () => {
    const browserWindow = window as Window & {
      SpeechRecognition?: SpeechRecognitionConstructor;
      webkitSpeechRecognition?: SpeechRecognitionConstructor;
    };
    const SpeechRecognition =
      browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      onError?.("Voice input is not supported in this browser. You can still type your answer.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      return;
    }

    if (!window.isSecureContext && window.location.hostname !== "localhost") {
      onError?.("Microphone access needs a secure browser connection. Reload the HTTPS preview and try again.");
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      onError?.("This browser does not expose microphone access. You can still type your answer.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      onError?.(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? "Microphone access is blocked. Use the lock icon in the address bar to allow the microphone, then try again."
          : "The microphone could not be opened. Check that another app is not using it, then try again.",
      );
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index][0].transcript,
      ).join(" ");
      const current = valueRef.current;
      const next = `${current}${current ? " " : ""}${transcript}`.trim();
      valueRef.current = next;
      onChange(next);
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = (event) => {
      recognitionRef.current = null;
      setIsListening(false);
      const message =
        event.error === "not-allowed" || event.error === "service-not-allowed"
          ? "Microphone access is blocked. Use the lock icon in the address bar to allow it, then try again."
          : event.error === "network"
            ? "Your microphone is available, but the browser speech service is unavailable. Try Chrome or type your answer."
            : event.error === "audio-capture"
              ? "The browser could not capture microphone audio. Check the selected input device."
              : event.error === "no-speech"
                ? "No speech was detected. Try again and speak closer to the microphone."
                : "Voice input stopped unexpectedly. You can still type your answer.";
      onError?.(message);
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    onError?.("");
    try {
      recognition.start();
    } catch {
      recognitionRef.current = null;
      setIsListening(false);
      onError?.("Voice input could not start. Check microphone permission and try again.");
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex min-h-9 items-center gap-2 rounded-lg border px-3 text-xs font-semibold transition",
        isListening
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border bg-card text-muted-foreground hover:border-secondary/60 hover:text-foreground",
        className,
      )}
      aria-label={isListening ? "Stop listening" : label}
      data-testid="button-voice-input"
    >
      {isListening ? <MicOff className="size-4" /> : <Mic className="size-4" />}
      {isListening ? "Stop listening" : label}
    </button>
  );
}