import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

interface RiskGaugeProps {
  score: number; // 0-100
}

const RiskGauge: React.FC<RiskGaugeProps> = ({ score }) => {
  const data = [
    { name: 'Score', value: score },
    { name: 'Remaining', value: 100 - score },
  ];

  let color = '#10b981'; // Green
  if (score > 40) color = '#f59e0b'; // Orange
  if (score > 70) color = '#ef4444'; // Red

  return (
    <div className="relative h-40 w-full flex flex-col items-center justify-center">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="70%"
            startAngle={180}
            endAngle={0}
            innerRadius={60}
            outerRadius={80}
            paddingAngle={0}
            dataKey="value"
            stroke="none"
          >
            <Cell key="score" fill={color} />
            <Cell key="remaining" fill="#e2e8f0" />
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute top-[60%] left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
        <div className="text-3xl font-bold text-slate-800">{score}</div>
        <div className="text-xs text-slate-400 uppercase tracking-wider font-medium">Risk Score</div>
      </div>
    </div>
  );
};

export default RiskGauge;