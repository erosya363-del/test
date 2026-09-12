// Простые звуковые эффекты через Web Audio API
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

function playTone(frequency: number, duration: number, type: OscillatorType = 'sine', volume = 0.3) {
  if (!audioCtx) return;
  
  try {
    const oscillator = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
    
    oscillator.start(audioCtx.currentTime);
    oscillator.stop(audioCtx.currentTime + duration);
  } catch (e) {
    // ignore audio errors
  }
}

export function playCorrectSound() {
  playTone(523, 0.15, 'sine', 0.2);
  setTimeout(() => playTone(659, 0.15, 'sine', 0.2), 100);
  setTimeout(() => playTone(784, 0.3, 'sine', 0.2), 200);
}

export function playWrongSound() {
  playTone(200, 0.3, 'sawtooth', 0.15);
  setTimeout(() => playTone(150, 0.4, 'sawtooth', 0.15), 150);
}

export function playCoinSound() {
  playTone(1200, 0.1, 'sine', 0.15);
  setTimeout(() => playTone(1600, 0.15, 'sine', 0.15), 80);
}

export function playClickSound() {
  playTone(800, 0.05, 'sine', 0.1);
}

export function playShowSound() {
  playTone(440, 0.1, 'sine', 0.1);
  setTimeout(() => playTone(550, 0.1, 'sine', 0.1), 100);
}

export function resumeAudio() {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}
