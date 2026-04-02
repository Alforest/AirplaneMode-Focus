import React from 'react';

interface CloudBackgroundProps {
  className?: string;
}

const CloudBackground: React.FC<CloudBackgroundProps> = ({ className = '' }) => {
  return (
    <div className={`cloud-container absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      <div className="cloud cloud-1" />
      <div className="cloud cloud-2" />
      <div className="cloud cloud-3" />
      <div className="cloud cloud-4" />
      <div className="cloud cloud-5" />
      <div className="cloud cloud-6" />
    </div>
  );
};

export default CloudBackground;
