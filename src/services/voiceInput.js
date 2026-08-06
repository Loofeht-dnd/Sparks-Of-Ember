// Browser-native speech-to-text for the action input, via the Web Speech
// API's SpeechRecognition. No server, no library — support varies by
// browser (strong in Chrome/Edge, absent in Firefox and some others), so
// callers should check isVoiceInputSupported() before showing the mic button.

export function isVoiceInputSupported() {
  return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
}

/**
 * Starts a single voice-input session. Calls onResult(transcript) once
 * speech is recognized, and onEnd() when the session closes (success,
 * silence timeout, or error) so the caller can reset its "listening" UI.
 * Returns a stop() function to cancel early, or null if unsupported.
 */
export function startVoiceInput({ onResult, onError, onEnd }) {
  const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.lang = "en-US";

  recognition.onresult = (e) => {
    const transcript = Array.from(e.results).map((r) => r[0].transcript).join(" ").trim();
    if (transcript) onResult?.(transcript);
  };
  recognition.onerror = (e) => onError?.(e.error);
  recognition.onend = () => onEnd?.();

  try {
    recognition.start();
  } catch {
    onError?.("start-failed");
    return null;
  }
  return () => {
    try {
      recognition.stop();
    } catch {
      // already stopped
    }
  };
}
