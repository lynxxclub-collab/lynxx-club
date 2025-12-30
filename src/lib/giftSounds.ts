/**
 * Gift sound effects using Web Audio API
 * Standard: Chime - single pleasant ding
 * Premium: Sparkle - ascending arpeggio with shimmer
 * Ultra: Celebration - triumphant chord fanfare
 */

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Standard gift: Simple chime sound (pleasant ding)
 */
function playChimeSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Create oscillator for C5 note (523 Hz)
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(523.25, now);
  
  // Add slight vibrato for warmth
  const vibrato = ctx.createOscillator();
  vibrato.frequency.setValueAtTime(5, now);
  const vibratoGain = ctx.createGain();
  vibratoGain.gain.setValueAtTime(3, now);
  vibrato.connect(vibratoGain);
  vibratoGain.connect(osc.frequency);
  
  // Envelope for gentle decay
  const gainNode = ctx.createGain();
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
  
  osc.connect(gainNode);
  gainNode.connect(ctx.destination);
  
  vibrato.start(now);
  osc.start(now);
  osc.stop(now + 0.5);
  vibrato.stop(now + 0.5);
}

/**
 * Premium gift: Sparkle sound (ascending arpeggio with shimmer)
 */
function playSparkleSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
  
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    // Add harmonics for sparkle
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(freq * 2, now);
    
    const gainNode = ctx.createGain();
    const delay = i * 0.08;
    gainNode.gain.setValueAtTime(0, now + delay);
    gainNode.gain.linearRampToValueAtTime(0.2, now + delay + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + delay + 0.4);
    
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(0.05, now + delay);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.3);
    
    osc.connect(gainNode);
    osc2.connect(gain2);
    gainNode.connect(ctx.destination);
    gain2.connect(ctx.destination);
    
    osc.start(now + delay);
    osc.stop(now + delay + 0.5);
    osc2.start(now + delay);
    osc2.stop(now + delay + 0.4);
  });
}

/**
 * Ultra gift: Celebration fanfare (triumphant chord)
 */
function playCelebrationSound() {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  
  // Major chord: C5, E5, G5 with harmonics
  const frequencies = [
    { freq: 523.25, vol: 0.25 },  // C5
    { freq: 659.25, vol: 0.2 },   // E5
    { freq: 783.99, vol: 0.2 },   // G5
    { freq: 1046.50, vol: 0.15 }, // C6 (octave)
  ];
  
  // Create master gain
  const masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, now);
  masterGain.gain.linearRampToValueAtTime(1, now + 0.05);
  masterGain.gain.setValueAtTime(1, now + 0.6);
  masterGain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);
  masterGain.connect(ctx.destination);
  
  frequencies.forEach(({ freq, vol }) => {
    // Main tone
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);
    
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(vol, now);
    
    osc.connect(gainNode);
    gainNode.connect(masterGain);
    
    osc.start(now);
    osc.stop(now + 1.3);
    
    // Add shimmer/bell overtone
    const bell = ctx.createOscillator();
    bell.type = 'triangle';
    bell.frequency.setValueAtTime(freq * 2.5, now);
    
    const bellGain = ctx.createGain();
    bellGain.gain.setValueAtTime(vol * 0.1, now);
    bellGain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    
    bell.connect(bellGain);
    bellGain.connect(masterGain);
    
    bell.start(now);
    bell.stop(now + 0.9);
  });
  
  // Add a triumphant "rise" effect
  const riseOsc = ctx.createOscillator();
  riseOsc.type = 'sine';
  riseOsc.frequency.setValueAtTime(400, now);
  riseOsc.frequency.exponentialRampToValueAtTime(800, now + 0.15);
  
  const riseGain = ctx.createGain();
  riseGain.gain.setValueAtTime(0.1, now);
  riseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
  
  riseOsc.connect(riseGain);
  riseGain.connect(ctx.destination);
  
  riseOsc.start(now);
  riseOsc.stop(now + 0.25);
}

/**
 * Play the appropriate sound effect for a gift animation type
 */
export function playGiftSound(type: 'standard' | 'premium' | 'ultra') {
  try {
    switch (type) {
      case 'standard':
        playChimeSound();
        break;
      case 'premium':
        playSparkleSound();
        break;
      case 'ultra':
        playCelebrationSound();
        break;
    }
  } catch (error) {
    console.error('Error playing gift sound:', error);
  }
}
