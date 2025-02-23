'use client';
import WaveAnalyzer from '@/components/AudioAnalyzer/WaveAnalyzer';
import LiveAudioAnalyzer from '@/components/LiveAudioAnalyzer/LiveAudioAnalyzer';
import WaveGenerator from '@/components/AudioAnalyzer/WaveGenerator';
import WaveVisualizer from '@/components/AudioAnalyzer/WaveVisualizer';
import Spectrogram3D from "@/components/LiveAudioAnalyzer/Spectrogram3D";
import AudioEffectsChain from "@/components/LiveAudioAnalyzer/AudioEffectsChain";

export default function Home() {
  return (
      <main className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          <h1 className="text-3xl font-bold text-center mb-8">
            Sound Wave Analysis Lab
          </h1>
          <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold mb-4">Mathematical Wave Analysis</h2>
              <WaveAnalyzer />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Live Audio Analysis</h2>
              <LiveAudioAnalyzer />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Wave Generator</h2>
              <WaveGenerator />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Wave Visualizer</h2>
              <WaveVisualizer />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3D Spectogram waterfall visualisation </h2>
            <Spectrogram3D  />
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">Audio effect chain</h2>
             <AudioEffectsChain />
            </section>
          </div>
        </div>
      </main>
  );
}
