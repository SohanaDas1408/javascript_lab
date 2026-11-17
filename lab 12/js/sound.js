/**
 * CryptoPulse - Web Audio API Synthesizer
 * Provides crisp audio feedback for ticks, transactions, alerts, and clicks
 * without relying on external mp3/wav audio files.
 */
const SoundManager = (function() {
  'use strict';

  let audioCtx = null;
  let isMuted = false;

  function initAudio() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
  }

  // Ensure AudioContext unlocks upon the very first user interaction
  function unlockOnUserGesture() {
    const unlock = () => {
      initAudio();
      document.removeEventListener('click', unlock);
      document.removeEventListener('keydown', unlock);
      document.removeEventListener('touchstart', unlock);
    };
    document.addEventListener('click', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    document.addEventListener('touchstart', unlock, { once: true });
  }

  if (typeof document !== 'undefined') {
    unlockOnUserGesture();
  }

  return {
    init: function(initialMute = false) {
      isMuted = initialMute;
    },

    setMuted: function(muted) {
      isMuted = !!muted;
    },

    isMuted: function() {
      return isMuted;
    },

    play: function(type) {
      if (isMuted) return;
      initAudio();
      if (!audioCtx) return;

      const now = audioCtx.currentTime;

      try {
        switch (type) {
          case 'tickUp': {
            // Subtle high tick (positive price movement)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, now); // A5
            osc.frequency.exponentialRampToValueAtTime(1200, now + 0.06);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
            break;
          }

          case 'tickDown': {
            // Subtle lower click (negative price movement)
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(440, now); // A4
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
            gain.gain.setValueAtTime(0.04, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.06);
            break;
          }

          case 'trade': {
            // Cheerful two-tone cash register chime
            const osc1 = audioCtx.createOscillator();
            const osc2 = audioCtx.createOscillator();
            const gain1 = audioCtx.createGain();
            const gain2 = audioCtx.createGain();

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(523.25, now); // C5
            gain1.gain.setValueAtTime(0.09, now);
            gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5
            gain2.gain.setValueAtTime(0.12, now + 0.08);
            gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.28);

            osc1.connect(gain1);
            gain1.connect(audioCtx.destination);
            osc2.connect(gain2);
            gain2.connect(audioCtx.destination);

            osc1.start(now);
            osc1.stop(now + 0.15);
            osc2.start(now + 0.08);
            osc2.stop(now + 0.28);
            break;
          }

          case 'alert': {
            // 3-tone alert notification chime
            const tones = [587.33, 739.99, 880]; // D5, F#5, A5
            tones.forEach((freq, idx) => {
              const osc = audioCtx.createOscillator();
              const gain = audioCtx.createGain();
              const startTime = now + (idx * 0.09);

              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, startTime);
              gain.gain.setValueAtTime(0.08, startTime);
              gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.18);

              osc.connect(gain);
              gain.connect(audioCtx.destination);

              osc.start(startTime);
              osc.stop(startTime + 0.18);
            });
            break;
          }

          case 'click': {
            // Subtle button tap
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(600, now);
            gain.gain.setValueAtTime(0.02, now);
            gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.03);

            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start(now);
            osc.stop(now + 0.03);
            break;
          }
        }
      } catch (err) {
        console.warn('[SoundManager] Audio play error:', err);
      }
    }
  };
})();
