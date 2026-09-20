import { useRef, useState } from "react";
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
  onerror: (() => void) | null;
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

  const toggle = () => {
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

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = Array.from(
        { length: event.results.length },
        (_, index) => event.results[index][0].transcript,
      ).join(" ");
      onChange(`${value}${value ? " " : ""}${transcript}`.trim());
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
      onError?.("We could not hear that. Check microphone permission and try again.");
    };
    recognitionRef.current = recognition;
    setIsListening(true);
    onError?.("");
    recognition.start();
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