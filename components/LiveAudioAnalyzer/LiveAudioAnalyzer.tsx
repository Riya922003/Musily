'use client';
import React, { useState, useEffect, useRef } from 'react';

interface AudioContextWithWebkit extends AudioContext {
  webkitAudioContext?: typeof AudioContext;
}

declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

const LiveAudioAnalyzer = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioData, setAudioData] = useState<Uint8Array>(new Uint8Array(0));
  const [bassLevel, setBassLevel] = useState(0);
  const [pitch, setPitch] = useState(0);
  const [error, setError] = useState<string>('');
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  const cleanup = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (sourceRef.current) {
      sourceRef.current.disconnect();
    }
    if (analyserRef.current) {
      analyserRef.current.disconnect();
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
  };

  const startRecording = async () => {
    try {
      cleanup(); // Clean up any existing audio context

      console.log("Requesting microphone access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      console.log("Microphone access granted");
      
      streamRef.current = stream;
      
      const AudioContextClass = (window.AudioContext || window.webkitAudioContext) as typeof AudioContext;
      audioContextRef.current = new AudioContextClass({ sampleRate: 44100 });
      
      // Create and configure analyzer
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 2048;
      analyserRef.current.smoothingTimeConstant = 0.8;
      analyserRef.current.minDecibels = -90;
      analyserRef.current.maxDecibels = -10;

      // Create and connect source
      sourceRef.current = audioContextRef.current.createMediaStreamSource(stream);
      sourceRef.current.connect(analyserRef.current);
      
      console.log("Audio context state:", audioContextRef.current.state);
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      setIsRecording(true);
      setError('');
      draw();
    } catch (err) {
      console.error("Error in startRecording:", err);
      setError(err instanceof Error ? err.message : 'Failed to start recording');
      cleanup();
    }
  };

  const stopRecording = () => {
    cleanup();
    setIsRecording(false);
  };

  const draw = () => {
    const analyser = analyserRef.current;
    const canvas = canvasRef.current;
    if (!analyser || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const drawVisual = () => {
      if (!analyser || !ctx || !audioContextRef.current) return;

      animationFrameRef.current = requestAnimationFrame(drawVisual);
      
      // Get time domain data
      analyser.getByteTimeDomainData(dataArray);
      
      // Calculate bass level (using frequency data instead of time domain)
      const frequencyData = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(frequencyData);
      const bassArray = frequencyData.slice(0, Math.floor(frequencyData.length / 10));
      const bassAvg = bassArray.reduce((a, b) => a + b, 0) / bassArray.length;
      setBassLevel(Math.round((bassAvg / 256) * 100)); // Normalize to 0-100%
      
      // Estimate pitch using zero crossings
      let zeroCrossings = 0;
      for (let i = 1; i < bufferLength; i++) {
        if ((dataArray[i] > 128 && dataArray[i - 1] <= 128) || 
            (dataArray[i] < 128 && dataArray[i - 1] >= 128)) {
          zeroCrossings++;
        }
      }
      
      const estimatedPitch = (audioContextRef.current.sampleRate * zeroCrossings) / 
                            (2 * bufferLength);
      setPitch(Math.round(estimatedPitch));

      // Clear canvas
      ctx.fillStyle = 'rgb(200, 200, 200)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw waveform
      ctx.lineWidth = 2;
      ctx.strokeStyle = 'rgb(0, 0, 0)';
      ctx.beginPath();

      const sliceWidth = canvas.width / bufferLength;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * canvas.height) / 2;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }

        x += sliceWidth;
      }

      ctx.lineTo(canvas.width, canvas.height / 2);
      ctx.stroke();
      
      setAudioData(new Uint8Array(dataArray));
    };

    drawVisual();
  };

  return (
    <div className="bg-white rounded-lg shadow p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold">Live Audio Analysis</h2>
        <button
          onClick={isRecording ? stopRecording : startRecording}
          className={`px-4 py-2 rounded-lg flex items-center ${
            isRecording 
              ? 'bg-red-500 hover:bg-red-600 text-white' 
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {isRecording ? '⏹ Stop' : '⏺ Start'} Recording
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <canvas
          ref={canvasRef}
          className="w-full h-48 bg-gray-100 rounded-lg"
          width={800}
          height={200}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2">
              <span>🔊</span>
              <div>
                <p className="text-sm font-medium">Bass Level</p>
                <p className="text-2xl font-bold">{bassLevel}%</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center space-x-2">
              <span>🎵</span>
              <div>
                <p className="text-sm font-medium">Estimated Pitch</p>
                <p className="text-2xl font-bold">{pitch} Hz</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveAudioAnalyzer;