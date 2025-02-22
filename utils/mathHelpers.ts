import { WaveformType, WaveformData } from '@/components/AudioAnalyzer/types';

export const generateWaveform = (
  frequency: number,
  amplitude: number,
  waveform: WaveformType,
  sampleRate: number = 100,
  duration: number = 1
): WaveformData[] => {
  const data: WaveformData[] = [];
  
  for (let i = 0; i < sampleRate * duration; i++) {
    const t = i / sampleRate;
    let y = 0;
    
    switch (waveform) {
      case 'sine':
        y = amplitude * Math.sin(2 * Math.PI * frequency * t);
        break;
        // Add to generateWaveform switch statement
      case 'square':
        y = amplitude * Math.sign(Math.sin(2 * Math.PI * frequency * t));
        break;
      case 'triangle':
        y = amplitude * (2 * Math.abs(2 * ((frequency * t) % 1) - 1) - 1);
        break;
      default:
        y = 0;
    }
    
    data.push({ time: t, amplitude: y });
  }
  
  return data;
};