import * as Speech from 'expo-speech';

export function speak(text: string, onDone?: () => void) {
  Speech.stop();
  Speech.speak(text, {
    language: 'ko-KR',
    rate: 0.95,
    onDone,
    onStopped: onDone,
    onError: onDone,
  });
}

export function stop() {
  Speech.stop();
}
