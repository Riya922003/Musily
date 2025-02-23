import React, { useEffect, useRef, useState } from 'react';
// import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';

const Spectrogram3D = () => {
    const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const spectrogramData = useRef<number[][]>([]);
    const animationRef = useRef<number>();

    const startVisualization = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const analyserNode = ctx.createAnalyser();
            analyserNode.fftSize = 2048;

            const source = ctx.createMediaStreamSource(stream);
            source.connect(analyserNode);

            setAudioContext(ctx);
            setAnalyser(analyserNode);
            setIsRecording(true);

            draw();
        } catch (err) {
            console.error("Error accessing microphone:", err);
        }
    };

    const stopVisualization = () => {
        if (audioContext) {
            audioContext.close();
            setAudioContext(null);
        }
        if (animationRef.current) {
            cancelAnimationFrame(animationRef.current);
        }
        setIsRecording(false);
        spectrogramData.current = [];
    };

    const draw = () => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        analyser.getByteFrequencyData(dataArray);

        // Add new data to spectrogram
        spectrogramData.current.unshift(Array.from(dataArray));
        if (spectrogramData.current.length > 100) {
            spectrogramData.current.pop();
        }

        // Clear canvas
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Draw spectrogram
        const sliceWidth = canvas.width / bufferLength;
        const sliceHeight = canvas.height / spectrogramData.current.length;

        spectrogramData.current.forEach((slice, i) => {
            slice.forEach((value, j) => {
                const intensity = value / 255;
                ctx.fillStyle = `hsl(${240 - intensity * 240}, 100%, ${intensity * 50}%)`;
                ctx.fillRect(j * sliceWidth, i * sliceHeight, sliceWidth, sliceHeight);
            });
        });

        animationRef.current = requestAnimationFrame(draw);
    };

    useEffect(() => {
        return () => {
            stopVisualization();
        };
    }, []);

    return (
        <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold">3D Spectrogram</h2>
            </div>

            <div className="space-y-6">
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

export default Spectrogram3D;
