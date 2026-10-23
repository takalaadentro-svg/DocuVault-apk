/**
 * Unified Speech-to-Text Recognition Service for DocuVault
 * Supports Web Speech API (Chrome / Android WebView / iOS Safari)
 * with automatic microphone permission negotiation and state callbacks.
 */

export interface SpeechRecognitionCallbacks {
  onStart?: () => void;
  onTranscript: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

class SpeechService {
  private recognition: any = null;
  private isListening = false;

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 
      (Boolean((window as any).SpeechRecognition) || Boolean((window as any).webkitSpeechRecognition));
  }

  public async requestMicrophonePermission(): Promise<boolean> {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      return false;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      console.warn('Microphone permission not granted:', err);
      return false;
    }
  }

  public async startListening(callbacks: SpeechRecognitionCallbacks, lang: string = 'en-IN'): Promise<boolean> {
    if (this.isListening) {
      this.stopListening();
    }

    const SpeechRecognitionClass = 
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionClass) {
      callbacks.onError?.('Speech recognition is not supported on this browser/device. Please type your query.');
      return false;
    }

    // Attempt to acquire microphone permission first to prevent silent WebView rejection
    try {
      await this.requestMicrophonePermission();
    } catch (e) {
      // Continue anyway as recognition might still work
    }

    try {
      const recognition = new SpeechRecognitionClass();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = lang;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        this.isListening = true;
        callbacks.onStart?.();
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const item = event.results[i];
          if (item.isFinal) {
            finalTranscript += item[0].transcript;
          } else {
            interimTranscript += item[0].transcript;
          }
        }

        const text = finalTranscript || interimTranscript;
        if (text) {
          callbacks.onTranscript(text.trim(), Boolean(finalTranscript));
        }
      };

      recognition.onerror = (event: any) => {
        this.isListening = false;
        let message = 'Speech recognition error';
        if (event.error === 'not-allowed') {
          message = 'Microphone access denied. Please enable Microphone in app permissions.';
        } else if (event.error === 'no-speech') {
          message = 'No speech detected. Please speak closer to the microphone.';
        } else if (event.error === 'network') {
          message = 'Voice recognition network service unavailable. Try speaking again or type.';
        } else if (event.error) {
          message = `Voice error: ${event.error}`;
        }
        callbacks.onError?.(message);
      };

      recognition.onend = () => {
        this.isListening = false;
        callbacks.onEnd?.();
      };

      this.recognition = recognition;
      recognition.start();
      return true;
    } catch (err: any) {
      this.isListening = false;
      callbacks.onError?.(err?.message || 'Could not start speech recognition.');
      return false;
    }
  }

  public stopListening(): void {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {}
      this.recognition = null;
    }
    this.isListening = false;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }
}

export const speechService = new SpeechService();
