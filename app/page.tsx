'use client';
import WaveAnalyzer from '@/components/AudioAnalyzer/WaveAnalyzer';
import LiveAudioAnalyzer from '@/components/LiveAudioAnalyzer/LiveAudioAnalyzer';

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
        </div>
      </div>
    </main>
  );
}