import React, { useRef, useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

type VisualizationType = 'waveform' | 'frequency' | 'spectrogram';

const WaveVisualizer = () => {
    const [isRecording, setIsRecording] = useState(false);
    const [visualizationType, setVisualizationType] = useState<VisualizationType>('waveform');
    const [audioData, setAudioData] = useState<number[]>([]);
    const [frequencyData, setFrequencyData] = useState<number[]>([]);

    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number>();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const mediaStreamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            stopVisualization();
        };
    }, []);

    const startVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });

            mediaStreamRef.current = stream;

            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContextRef.current = new AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();

            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            analyserRef.current.fftSize = 2048;

            setIsRecording(true);
            draw();

        } catch (err) {
            console.error('Error accessing microphone:', err);
        }
    };

    const stopVisualization = () => {
        if (mediaStreamRef.current) {
            mediaStreamRef.current.getTracks().forEach(track => track.stop());
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
        }
        setIsRecording(false);
        setAudioData([]);
        setFrequencyData([]);
    };

    const draw = () => {
        if (!analyserRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const analyser = analyserRef.current;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const frequencyArray = new Uint8Array(bufferLength);

        const drawVisual = () => {
            animationFrameRef.current = requestAnimationFrame(drawVisual);

            switch (visualizationType) {
                case 'waveform':
                    drawWaveform(analyser, ctx, canvas, dataArray);
                    break;
                case 'frequency':
                    drawFrequencySpectrum(analyser, ctx, canvas, frequencyArray);
                    break;
                case 'spectrogram':
                    drawSpectrogram(analyser, ctx, canvas, frequencyArray);
                    break;
            }
        };

        drawVisual();
    };

    const drawWaveform = (
        analyser: AnalyserNode,
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        dataArray: Uint8Array
    ) => {
        analyser.getByteTimeDomainData(dataArray);

        ctx.fillStyle = 'rgb(200, 200, 200)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgb(0, 0, 0)';
        ctx.beginPath();

        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            const v = dataArray[i] / 128.0;
            const y = v * (canvas.height / 2);

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();

        setAudioData(Array.from(dataArray));
    };

    const drawFrequencySpectrum = (
        analyser: AnalyserNode,
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        dataArray: Uint8Array
    ) => {
        analyser.getByteFrequencyData(dataArray);

        ctx.fillStyle = 'rgb(200, 200, 200)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const barWidth = (canvas.width / dataArray.length) * 2.5;
        let barHeight;
        let x = 0;

        for (let i = 0; i < dataArray.length; i++) {
            barHeight = dataArray[i] / 2;

            const hue = (i / dataArray.length) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);

            x += barWidth + 1;
        }

        setFrequencyData(Array.from(dataArray));
    };

    const drawSpectrogram = (
        analyser: AnalyserNode,
        ctx: CanvasRenderingContext2D,
        canvas: HTMLCanvasElement,
        dataArray: Uint8Array
    ) => {
        analyser.getByteFrequencyData(dataArray);

        const imageData = ctx.getImageData(1, 0, canvas.width - 1, canvas.height);
        ctx.putImageData(imageData, 0, 0);

        for (let i = 0; i < dataArray.length; i++) {
            const value = dataArray[i];
            const hue = (value / 255) * 360;
            ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
            ctx.fillRect(canvas.width - 1, canvas.height - i, 1, 1);
        }
    };

    return (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold">Wave Visualizer</h2>
                <div className="space-x-4">
                    <select
                        value={visualizationType}
                        onChange={(e) => setVisualizationType(e.target.value as VisualizationType)}
                        className="px-3 py-2 border rounded-lg"
                    >
                        <option value="waveform">Waveform</option>
                        <option value="frequency">Frequency Spectrum</option>
                        <option value="spectrogram">Spectrogram</option>
                    </select>
                    <button
                        onClick={isRecording ? stopVisualization : startVisualization}
                        className={`px-4 py-2 rounded-lg ${
                            isRecording
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                        }`}
                    >
                        {isRecording ? 'Stop' : 'Start'} Visualization
                    </button>
                </div>
            </div>

            <div className="space-y-6">
                <canvas
                    ref={canvasRef}
                    className="w-full h-64 bg-gray-100 rounded-lg"
                    width={800}
                    height={256}
                />

                {visualizationType === 'waveform' && audioData.length > 0 && (
                    <div className="bg-white rounded-lg p-4">
                        <LineChart width={700} height={200} data={audioData.map((value, index) => ({
                            index,
                            value: value / 128.0 - 1
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="index" />
                            <YAxis domain={[-1, 1]} />
                            <Line type="monotone" dataKey="value" stroke="#8884d8" dot={false} />
                        </LineChart>
                    </div>
                )}

                {visualizationType === 'frequency' && frequencyData.length > 0 && (
                    <div className="bg-white rounded-lg p-4">
                        <LineChart width={700} height={200} data={frequencyData.map((value, index) => ({
                            frequency: (index * audioContextRef.current!.sampleRate / analyserRef.current!.fftSize),
                            magnitude: value / 255.0
                        }))}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                                dataKey="frequency"
                                label={{ value: 'Frequency (Hz)', position: 'bottom' }}
                            />
                            <YAxis
                                domain={[0, 1]}
                                label={{ value: 'Magnitude', angle: -90, position: 'left' }}
                            />
                            <Line type="monotone" dataKey="magnitude" stroke="#8884d8" dot={false} />
                        </LineChart>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WaveVisualizer;
