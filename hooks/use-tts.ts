import { useState, useCallback, useEffect } from 'react';

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [autoRead, setAutoRead] = useState(false);

  useEffect(() => {
    const loadVoices = () => setVoices(speechSynthesis.getVoices().filter(v => v.lang.startsWith('en')));
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string) => {
    if (isSpeaking) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voices[0] || null;
    utterance.rate = 1.0;
    utterance.pitch = 1.1;
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [voices, isSpeaking]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { speak, stop, isSpeaking, voices, autoRead, setAutoRead };
}
