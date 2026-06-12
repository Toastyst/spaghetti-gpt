import { useState, useCallback, useEffect } from 'react';

const PREFERRED_VOICES = [
  'Samantha', 'Karen', 'Daniel', 'Alex', 'Victoria', 'Tom',
  'Google US English', 'Microsoft David', 'Microsoft Zira', 'en-US'
];

export function useTTS() {
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoice, setSelectedVoiceState] = useState<SpeechSynthesisVoice | null>(null);
  const [autoRead, setAutoRead] = useState(false);

  useEffect(() => {
    const loadVoices = () => {
      const allVoices = speechSynthesis.getVoices().filter(v => v.lang.startsWith('en'));
      setVoices(allVoices);

      // Restore saved preference
      const savedName = localStorage.getItem('tts-selected-voice');
      if (savedName) {
        const saved = allVoices.find(v => v.name === savedName);
        if (saved) {
          setSelectedVoiceState(saved);
          return;
        }
      }

      // Auto-pick a better default voice if available on this device
      const preferredMatch = PREFERRED_VOICES.find(pref => 
        allVoices.some(v => v.name === pref || v.name.includes(pref))
      );
      if (preferredMatch) {
        const best = allVoices.find(v => v.name === preferredMatch || v.name.includes(preferredMatch));
        if (best) {
          setSelectedVoiceState(best);
          return;
        }
      }

      if (allVoices.length > 0) {
        setSelectedVoiceState(allVoices[0]);
      }
    };

    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => { speechSynthesis.onvoiceschanged = null; };
  }, []);

  const setSelectedVoice = useCallback((voice: SpeechSynthesisVoice | null) => {
    setSelectedVoiceState(voice);
    if (voice) {
      localStorage.setItem('tts-selected-voice', voice.name);
    } else {
      localStorage.removeItem('tts-selected-voice');
    }
  }, []);

  const speak = useCallback((text: string) => {
    if (isSpeaking) speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = selectedVoice || voices[0] || null;
    utterance.rate = 1.0;
    utterance.pitch = 1.05;
    utterance.onend = () => setIsSpeaking(false);
    speechSynthesis.speak(utterance);
    setIsSpeaking(true);
  }, [selectedVoice, voices, isSpeaking]);

  const stop = useCallback(() => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  return { 
    speak, stop, isSpeaking, 
    voices, selectedVoice, setSelectedVoice,
    autoRead, setAutoRead 
  };
}
