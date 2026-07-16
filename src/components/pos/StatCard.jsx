import React from 'react';

const StatCard = ({ title, value, subtitle, icon: Icon, colorClass }) => {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-center gap-4">
      <div className={`p-4 rounded-xl ${colorClass}`}>
        <Icon className="w-8 h-8" />
      </div>
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      </div>
    </div>
  );
};

export default StatCard;
