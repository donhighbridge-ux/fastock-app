import React from 'react';

interface StatusPillProps {
  status: string;
  emoji?: string;
  onClick?: () => void;
  className?: string;
}

const StatusPill: React.FC<StatusPillProps> = ({ status, emoji, onClick, className = '' }) => {
  
  const getStatusColor = (s: string) => {
    switch (s) {
      case 'COMPLETO': return "text-green-800 bg-green-100 border border-green-200 shadow-sm";
      case 'QUEDA POCO': return "text-yellow-800 bg-yellow-100 border border-yellow-200 shadow-sm";
      case 'INCOMPLETO': return "text-red-800 bg-red-100 border border-red-200 shadow-sm";
      default: return "text-gray-600 bg-gray-100 border border-gray-200";
    }
  };

  const baseClasses = "inline-flex items-center justify-center px-3 py-1.5 rounded-full text-xs font-bold transition-transform transform hover:scale-105";
  const colorClasses = getStatusColor(status);
  const cursorClass = onClick ? "cursor-pointer" : "cursor-default";

  return (
    <span 
      onClick={onClick}
      className={`${baseClasses} ${colorClasses} ${cursorClass} ${className}`}
    >
      {emoji && <span className="mr-1">{emoji}</span>}
      {status}
    </span>
  );
};

export default StatusPill;
