'use client';
import React, { useState, useEffect } from 'react';
import { generateWaveform, calculatePitch, calculateIntensity } from '@/utils/mathHelpers'; // Import new functions
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { WaveformData, WaveformType } from './types'; 

export default function WaveAnalyzer() {
  const [data, setData] = useState<WaveformData[]>([]); 
  const [frequency, setFrequency] = useState(440);
  const [waveform, setWaveform] = useState<WaveformType>('sine'); 

  useEffect(() => {
    const newData = generateWaveform(frequency, 1, waveform); 
    setData(newData);
  }, [frequency, waveform]); 

  const pitch = calculatePitch(data);
  const intensity = calculateIntensity(data);

  return (
    <div className="p-4">
      <div className="mb-4">
        <input
          type="range"
          min="20"
          max="2000"
          value={frequency}
          onChange={(e) => setFrequency(Number(e.target.value))}
        />
        <span>{frequency} Hz</span>
      </div>
      <div className="mb-4">
        <select
          value={waveform}
          onChange={(e) => setWaveform(e.target.value as WaveformType)}
          className="p-2 border rounded"
        >
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="triangle">Triangle</option>
        </select>
      </div>
      <LineChart width={700} height={200} data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" />
        <YAxis />
        <Line type="monotone" dataKey="amplitude" stroke="#8884d8" dot={false} />
      </LineChart>
      {/* Add pitch and intensity display */}
      <div className="grid grid-cols-2 gap-4 mt-4">
        <div className="p-4 border rounded">
          <h3>Pitch</h3>
          <p>{pitch.toFixed(1)} Hz</p>
        </div>
        <div className="p-4 border rounded">
          <h3>Intensity</h3>
          <p>{(intensity * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}