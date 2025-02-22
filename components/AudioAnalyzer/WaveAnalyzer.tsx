'use client';
import React, { useState, useEffect } from 'react';
import { generateWaveform } from '@/utils/mathHelpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid } from 'recharts';
import { WaveformData, WaveformType } from './types'; // Import types

export default function WaveAnalyzer() {
  const [data, setData] = useState<WaveformData[]>([]); // Specify type for data
  const [frequency, setFrequency] = useState(440);
  const [waveform, setWaveform] = useState<WaveformType>('sine'); // Add waveform state

  useEffect(() => {
    const newData = generateWaveform(frequency, 1, waveform); // Use waveform state
    setData(newData);
  }, [frequency, waveform]); // Add waveform to dependency array

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
    </div>
  );
}