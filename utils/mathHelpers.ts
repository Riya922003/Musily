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

export const calculatePitch = (data: WaveformData[]): number => {
  if (data.length < 2) return 0;
  
  let zeroCrossings = 0;
  for (let i = 1; i < data.length; i++) {
    if (data[i-1].amplitude * data[i].amplitude < 0) {
      zeroCrossings++;
    }
  }
  
  const duration = data[data.length - 1].time - data[0].time;
  return (zeroCrossings / 2) / duration;
};

export const calculateIntensity = (data: WaveformData[]): number => {
  if (data.length === 0) return 0;
  
  const sumSquares = data.reduce((sum, point) => sum + point.amplitude * point.amplitude, 0);
  const rms = Math.sqrt(sumSquares / data.length);
  
  return Math.min(1, Math.max(0, rms));
};