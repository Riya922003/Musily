import React, { useEffect, useRef, useState } from 'react';

interface Visualization {
    type: '3d-bars' | '3d-wave' | 'circular';
    params: {
        rotation: number;
        perspective: number;
        colorScheme: 'rainbow' | 'gradient' | 'monochrome';
    };
}

const Enhanced3DVisualizer = () => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [visualization, setVisualization] = useState<Visualization>({
        type: '3d-bars',
        params: {
            rotation: 0,
            perspective: 1000,
            colorScheme: 'rainbow'
        }
    });

    const canvasRef = useRef<HTMLCanvasElement>(null);
    const sourceRef = useRef<AudioBufferSourceNode | null>(null);
    const animationRef = useRef<number>();
    const timeDataRef = useRef<number[]>([]);

    useEffect(() => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyserNode = ctx.createAnalyser();
        analyserNode.fftSize = 2048;

        setAudioContext(ctx);
        setAnalyser(analyserNode);

        return () => {
            ctx.close();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []);

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

    const playAudio = () => {
        if (!audioContext || !audioBuffer || !analyser) return;

        if (sourceRef.current) {
            sourceRef.current.stop();
        }

        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        sourceRef.current = source;

        source.connect(analyser);
        analyser.connect(audioContext.destination);

        source.start(0);
        setIsPlaying(true);
        requestAnimationFrame(draw);
    };

    const stopAudio = () => {
        if (sourceRef.current) {
            sourceRef.current.stop();
            sourceRef.current = null;
        }
        setIsPlaying(false);
    };

    const getColor = (value: number, index: number, total: number) => {
        const { colorScheme } = visualization.params;
        switch (colorScheme) {
            case 'rainbow':
                const hue = (index / total) * 360;
                return `hsl(${hue}, 100%, ${50 + value * 20}%)`;
            case 'gradient':
                const intensity = value * 100;
                return `rgb(${intensity}, ${intensity * 0.5}, ${intensity * 2})`;
            case 'monochrome':
                return `rgb(${value * 255}, ${value * 255}, ${value * 255})`;
            default:
                return `rgb(0, 0, 0)`;
        }
    };

    const draw3DBars = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
        const { rotation, perspective } = visualization.params;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const barWidth = (width / dataArray.length) * 2;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i] / 255;
            const barHeight = value * height * 0.5;
            const x = (i - dataArray.length / 2) * barWidth;
            const z = (i / dataArray.length) * perspective;

            const scale = perspective / (perspective + z);
            const xPos = x * scale;
            const yPos = -barHeight / 2;

            ctx.fillStyle = getColor(value, i, dataArray.length);
            ctx.fillRect(xPos, yPos, barWidth * scale, barHeight);
        }

        ctx.restore();
    };

    const draw3DWave = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
        const { rotation, perspective } = visualization.params;
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;

        ctx.clearRect(0, 0, width, height);
        ctx.save();
        ctx.translate(width / 2, height / 2);
        ctx.rotate((rotation * Math.PI) / 180);

        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i] / 255;
            const x = (i - dataArray.length / 2) * (width / dataArray.length);
            const y = value * height * 0.5;
            const z = (i / dataArray.length) * perspective;

            const scale = perspective / (perspective + z);
            const xPos = x * scale;
            const yPos = y * scale;

            if (i === 0) {
                ctx.moveTo(xPos, yPos);
            } else {
                ctx.lineTo(xPos, yPos);
            }

            ctx.strokeStyle = getColor(value, i, dataArray.length);
            ctx.lineWidth = 2;
        }
        ctx.stroke();
        ctx.restore();
    };

    const drawCircular = (ctx: CanvasRenderingContext2D, dataArray: Uint8Array) => {
        const width = ctx.canvas.width;
        const height = ctx.canvas.height;
        const centerX = width / 2;
        const centerY = height / 2;
        const radius = Math.min(width, height) * 0.4;

        ctx.clearRect(0, 0, width, height);

        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i] / 255;
            const angle = (i / dataArray.length) * Math.PI * 2;
            const barHeight = value * radius;

            const x1 = centerX + Math.cos(angle) * radius;
            const y1 = centerY + Math.sin(angle) * radius;
            const x2 = centerX + Math.cos(angle) * (radius + barHeight);
            const y2 = centerY + Math.sin(angle) * (radius + barHeight);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = getColor(value, i, dataArray.length);
            ctx.lineWidth = 2;
            ctx.stroke();
        }
    };

    const draw = () => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        switch (visualization.type) {
            case '3d-bars':
                draw3DBars(ctx, dataArray);
                break;
            case '3d-wave':
                draw3DWave(ctx, dataArray);
                break;
            case 'circular':
                drawCircular(ctx, dataArray);
                break;
        }

        animationRef.current = requestAnimationFrame(draw);
    };

    const updateVisualization = (type: Visualization['type']) => {
        setVisualization(prev => ({
            ...prev,
            type
        }));
    };

    const updateParams = (param: keyof Visualization['params'], value: number | string) => {
        setVisualization(prev => ({
            ...prev,
            params: {
                ...prev.params,
                [param]: value
            }
        }));
    };

    return (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">Enhanced 3D Audio Visualizer</h2>
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

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <button
                        onClick={() => updateVisualization('3d-bars')}
                        className={`px-4 py-2 rounded-lg ${
                            visualization.type === '3d-bars'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                    >
                        3D Bars
                    </button>
                    <button
                        onClick={() => updateVisualization('3d-wave')}
                        className={`px-4 py-2 rounded-lg ${
                            visualization.type === '3d-wave'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                    >
                        3D Wave
                    </button>
                    <button
                        onClick={() => updateVisualization('circular')}
                        className={`px-4 py-2 rounded-lg ${
                            visualization.type === 'circular'
                                ? 'bg-blue-500 text-white'
                                : 'bg-gray-200'
                        }`}
                    >
                        Circular
                    </button>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-2">Rotation</label>
                        <input
                            type="range"
                            min="0"
                            max="360"
                            value={visualization.params.rotation}
                            onChange={(e) => updateParams('rotation', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Perspective</label>
                        <input
                            type="range"
                            min="100"
                            max="2000"
                            value={visualization.params.perspective}
                            onChange={(e) => updateParams('perspective', parseInt(e.target.value))}
                            className="w-full"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-2">Color Scheme</label>
                        <select
                            value={visualization.params.colorScheme}
                            onChange={(e) => updateParams('colorScheme', e.target.value)}
                            className="w-full p-2 border rounded"
                        >
                            <option value="rainbow">Rainbow</option>
                            <option value="gradient">Gradient</option>
                            <option value="monochrome">Monochrome</option>
                        </select>
                    </div>
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

export default Enhanced3DVisualizer;
