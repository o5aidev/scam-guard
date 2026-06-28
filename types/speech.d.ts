// Web Speech API（音声入力）の最小型。ブラウザ実装は webkit 接頭辞のことがある。
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
  length: number;
}

interface SpeechRecognitionEventLike extends Event {
  resultIndex: number;
  results: {
    length: number;
    item(i: number): SpeechRecognitionResultLike;
    [i: number]: SpeechRecognitionResultLike;
  };
}

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: Event) => void) | null;
  onend: ((e: Event) => void) | null;
}

interface SpeechRecognitionCtor {
  new (): SpeechRecognitionLike;
}

interface Window {
  SpeechRecognition?: SpeechRecognitionCtor;
  webkitSpeechRecognition?: SpeechRecognitionCtor;
}
