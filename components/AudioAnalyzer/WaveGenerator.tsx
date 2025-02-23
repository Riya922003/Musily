import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
// import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Types
type WaveformType = 'sine' | 'square' | 'triangle' | 'sawtooth';

interface WaveformData {
    time: number;
    amplitude: number;
}

// Helper functions
const generateWaveform = (
    frequency: number,
    duration: number,
    type: WaveformType,
    sampleRate: number = 44100
): WaveformData[] => {
    const samples = Math.floor(duration * sampleRate);
    const data: WaveformData[] = [];
    const angularFrequency = 2 * Math.PI * frequency;

    for (let i = 0; i < samples; i++) {
        const time = i / sampleRate;
        let amplitude = 0;

        switch (type) {
            case 'sine':
                amplitude = Math.sin(angularFrequency * time);
                break;
            case 'square':
                amplitude = Math.sin(angularFrequency * time) >= 0 ? 1 : -1;
                break;
            case 'triangle':
                amplitude = Math.asin(Math.sin(angularFrequency * time)) * (2 / Math.PI);
                break;
            case 'sawtooth':
                amplitude = 2 * ((frequency * time) % 1) - 1;
                break;
        }

        data.push({ time, amplitude });
    }

    return data;
};

const calculatePitch = (data: WaveformData[]): number => {
    if (data.length < 2) return 0;

    let zeroCrossings = 0;
    for (let i = 1; i < data.length; i++) {
        if ((data[i].amplitude >= 0 && data[i-1].amplitude < 0) ||
            (data[i].amplitude <= 0 && data[i-1].amplitude > 0)) {
            zeroCrossings++;
        }
    }

    const duration = data[data.length - 1].time - data[0].time;
    return (zeroCrossings / 2) / duration;
};

const calculateIntensity = (data: WaveformData[]): number => {
    if (data.length === 0) return 0;

    const sumSquares = data.reduce((sum, point) => sum + point.amplitude ** 2, 0);
    const rms = Math.sqrt(sumSquares / data.length);

    return rms;
};

const WaveGenerator = () => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [frequency, setFrequency] = useState(440);
    const [waveform, setWaveform] = useState<WaveformType>('sine');
    const [data, setData] = useState<WaveformData[]>([]);

    useEffect(() => {
        const newData = generateWaveform(frequency, 0.02, waveform);
        setData(newData);
    }, [frequency, waveform]);

    const startSound = useCallback(() => {
        if (!audioContext) {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            setAudioContext(ctx);
        }

        const ctx = audioContext || new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc.type = waveform;
        osc.frequency.value = frequency;
        gainNode.gain.value = 0.1;

        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.start();

        setOscillator(osc);
        setIsPlaying(true);
    }, [audioContext, frequency, waveform]);

    const stopSound = useCallback(() => {
        if (oscillator) {
            oscillator.stop();
            oscillator.disconnect();
            setOscillator(null);
        }
        setIsPlaying(false);
    }, [oscillator]);

    const handleFrequencyChange = (value: number) => {
        setFrequency(value);
        if (oscillator) {
            oscillator.frequency.value = value;
        }
    };

    const handleWaveformChange = (value: WaveformType) => {
        setWaveform(value);
        if (oscillator) {
            oscillator.type = value;
        }
    };

    return (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold mb-2">Wave Generator</h2>
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium">Frequency: {frequency} Hz</label>
                    <input
                        type="range"
                        min={20}
                        max={2000}
                        value={frequency}
                        onChange={(e) => handleFrequencyChange(Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium">Waveform Type</label>
                    <select
                        value={waveform}
                        onChange={(e) => handleWaveformChange(e.target.value as WaveformType)}
                        className="w-full p-2 border rounded-lg"
                    >
                        <option value="sine">Sine</option>
                        <option value="square">Square</option>
                        <option value="triangle">Triangle</option>
                        <option value="sawtooth">Sawtooth</option>
                    </select>
                </div>

                <button
                    onClick={isPlaying ? stopSound : startSound}
                    className={`px-4 py-2 rounded-lg ${
                        isPlaying
                            ? 'bg-red-500 hover:bg-red-600 text-white'
                            : 'bg-blue-500 hover:bg-blue-600 text-white'
                    }`}
                >
                    {isPlaying ? 'Stop' : 'Play'} Sound
                </button>

                <div className="bg-white rounded-lg p-4">
                    <LineChart width={700} height={200} data={data}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                            dataKey="time"
                            tickFormatter={(value) => (value * 1000).toFixed(1)}
                            label={{ value: 'Time (ms)', position: 'bottom' }}
                        />
                        <YAxis
                            domain={[-1.2, 1.2]}
                            label={{ value: 'Amplitude', angle: -90, position: 'left' }}
                        />
                        <Tooltip
                            formatter={(value: number) => [value.toFixed(3), 'Amplitude']}
                            labelFormatter={(label: number) => `Time: ${(label * 1000).toFixed(1)}ms`}
                        />
                        <Line
                            type="monotone"
                            dataKey="amplitude"
                            stroke="#8884d8"
                            dot={false}
                            strokeWidth={2}
                        />
                    </LineChart>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Pitch</h3>
                        <p className="text-2xl font-bold">{calculatePitch(data).toFixed(1)} Hz</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-lg">
                        <h3 className="font-medium mb-2">Intensity</h3>
                        <p className="text-2xl font-bold">
                            {(calculateIntensity(data) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WaveGenerator;
