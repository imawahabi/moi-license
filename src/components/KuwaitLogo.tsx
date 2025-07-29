import React from 'react';

interface KuwaitLogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const KuwaitLogo: React.FC<KuwaitLogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-12 h-12',
    lg: 'w-16 h-16'
  };

  return (
    <div className={`${sizeClasses[size]} ${className}`}>
      <img
        src="/logo.png"
        alt="Kuwait Police Logo"
        className="w-full h-full object-contain [filter:drop-shadow(0_2px_20px_rgba(100,100,100,0.5))]"
        draggable={false}
      />
    </div>
  );
};

export default KuwaitLogo;