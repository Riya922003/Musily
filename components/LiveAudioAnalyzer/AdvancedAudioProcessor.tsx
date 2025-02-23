import React, { useEffect, useRef, useState } from 'react';

interface Effect {
    id: string;
    type: 'reverb' | 'distortion' | 'compressor' | 'equalizer';
    node: AudioNode;
    active: boolean;
    params: Record<string, number>;
}

const AdvancedAudioProcessor = () => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [effects, setEffects] = useState<Effect[]>([]);

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const animationRef = useRef<number>();

    // Initialize Audio Context and Effects
    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 2048;

        // Create effects
        const compressor = ctx.createDynamicsCompressor();
        const distortion = ctx.createWaveShaper();
        const equalizer = ctx.createBiquadFilter();

        // Create reverb
        const createReverb = async () => {
            const convolver = ctx.createConvolver();
            const impulseLength = 2;
            const impulse = ctx.createBuffer(2, ctx.sampleRate * impulseLength, ctx.sampleRate);

            for (let channel = 0; channel < impulse.numberOfChannels; channel++) {
                const impulseData = impulse.getChannelData(channel);
                for (let i = 0; i < impulseData.length; i++) {
                    impulseData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * impulseLength));
                }
            }
            convolver.buffer = impulse;
            return convolver;
        };

        createReverb().then(reverb => {
            const initialEffects: Effect[] = [
                {
                    id: 'reverb',
                    type: 'reverb',
                    node: reverb,
                    active: false,
                    params: { mix: 0.5 }
                },
                {
                    id: 'distortion',
                    type: 'distortion',
                    node: distortion,
                    active: false,
                    params: { amount: 50 }
                },
                {
                    id: 'compressor',
                    type: 'compressor',
                    node: compressor,
                    active: false,
                    params: { threshold: -24, ratio: 12 }
                },
                {
                    id: 'equalizer',
                    type: 'equalizer',
                    node: equalizer,
                    active: false,
                    params: { frequency: 1000, Q: 1, gain: 0 }
                }
            ];

            setEffects(initialEffects);
        });

        setAudioContext(ctx);
        setAnalyser(analyserNode);

        return () => {
            ctx.close();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

    // Handle file upload
    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !audioContext) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const buffer = await audioContext.decodeAudioData(arrayBuffer);
            setAudioBuffer(buffer);
            setIsPlaying(false);
            if (sourceRef.current) {
                sourceRef.current.stop();
                sourceRef.current = null;
            }
        } catch (error) {
            console.error('Error loading audio file:', error);
        }
    };

    // Toggle effect
    const toggleEffect = (effectId: string) => {
        setEffects(prevEffects =>
            prevEffects.map(effect =>
                effect.id === effectId
                    ? { ...effect, active: !effect.active }
                    : effect
            )
        );
    };

    // Update effect parameters
    const updateEffectParam = (effectId: string, param: string, value: number) => {
        const effect = effects.find(e => e.id === effectId);
        if (!effect) return;

        switch (effect.type) {
            case 'reverb':
                // Update reverb mix
                break;
            case 'distortion':
                const curve = new Float32Array(44100);
                for (let i = 0; i < 44100; i++) {
                    const x = (i * 2) / 44100 - 1;
                    curve[i] = (Math.PI + value) * x / (Math.PI + value * Math.abs(x));
                }
                (effect.node as WaveShaperNode).curve = curve;
                break;
            case 'compressor':
                const comp = effect.node as DynamicsCompressorNode;
                if (param === 'threshold') comp.threshold.value = value;
                if (param === 'ratio') comp.ratio.value = value;
                break;
            case 'equalizer':
                const eq = effect.node as BiquadFilterNode;
                if (param === 'frequency') eq.frequency.value = value;
                if (param === 'Q') eq.Q.value = value;
                if (param === 'gain') eq.gain.value = value;
                break;
        }

        setEffects(prevEffects =>
            prevEffects.map(e =>
                e.id === effectId
                    ? { ...e, params: { ...e.params, [param]: value } }
                    : e
            )
        );
    };

    // Play audio
    const playAudio = () => {
        if (!audioContext || !audioBuffer || !analyser) return;

        if (sourceRef.current) {
            sourceRef.current.stop();
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        sourceRef.current = source;

        // Create effect chain
        let currentNode: AudioNode = source;
        effects.filter(e => e.active).forEach(effect => {
            currentNode.connect(effect.node);
            currentNode = effect.node;
        });

        // Connect to analyzer and destination
        currentNode.connect(analyser);
        analyser.connect(audioContext.destination);

        source.start(0);
        setIsPlaying(true);
        requestAnimationFrame(draw);
    };

    // Stop audio
    const stopAudio = () => {
        if (sourceRef.current) {
            sourceRef.current.stop();
            sourceRef.current = null;
        }
        setIsPlaying(false);
    };

    // Draw visualization
    const draw = (timestamp: number) => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / bufferLength) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            barHeight = dataArray[i] * 2;
            const hue = (i / bufferLength) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
            x += barWidth + 1;
        }

        animationRef.current = requestAnimationFrame(draw);
    };

    return (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Advanced Audio Effects Processor</h2>
            </div>

            <div className="space-y-6">
                <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />

                <div className="flex gap-4">
                    <button
                        onClick={isPlaying ? stopAudio : playAudio}
                        disabled={!audioBuffer}
                        className={`px-4 py-2 rounded-lg ${
                            !audioBuffer
                                ? 'bg-gray-300 cursor-not-allowed'
                                : isPlaying
                                    ? 'bg-red-500 hover:bg-red-600 text-white'
                                    : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        {isPlaying ? 'Stop' : 'Play'}
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    {effects.map(effect => (
                        <div key={effect.id} className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold">{effect.type}</h3>
                                <button
                                    onClick={() => toggleEffect(effect.id)}
                                    className={`px-3 py-1 rounded ${
                                        effect.active
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-200'
                                    }`}
                                >
                                    {effect.active ? 'On' : 'Off'}
                                </button>
                            </div>
                            {Object.entries(effect.params).map(([param, value]) => (
                                <div key={param} className="space-y-2">
                                    <label className="block text-sm">
                                        {param}: {value}
                                    </label>
                                    <input
                                        type="range"
                                        min={param === 'frequency' ? 20 : -60}
                                        max={param === 'frequency' ? 20000 : 60}
                                        step={param === 'frequency' ? 100 : 1}
                                        value={value}
                                        onChange={(e) => updateEffectParam(effect.id, param, parseFloat(e.target.value))}
                                        className="w-full"
                                    />
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <canvas
                    ref={canvasRef}
                    className="w-full h-64 bg-black rounded-lg"
                    width={800}
                    height={400}
                />
            </div>
        </div>
    );
};

export default AdvancedAudioProcessor;
