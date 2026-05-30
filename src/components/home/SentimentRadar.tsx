'use client';

import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';

const sentimentData = [
  { subject: '宏观', value: 72 },
  { subject: '科技', value: 85 },
  { subject: '消费', value: 60 },
  { subject: '能源', value: 45 },
  { subject: '金融', value: 68 },
  { subject: '医疗', value: 55 },
];

export function SentimentRadar() {
  return (
    <div className="h-48 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart cx="50%" cy="50%" outerRadius="70%" data={sentimentData}>
          <PolarGrid stroke="rgba(255,255,255,0.08)" />
          <PolarAngleAxis
            dataKey="subject"
            tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'monospace' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={false}
            axisLine={false}
          />
          <Radar
            name="情绪"
            dataKey="value"
            stroke="#a78bfa"
            fill="#a78bfa"
            fillOpacity={0.15}
            strokeWidth={1.5}
          />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
