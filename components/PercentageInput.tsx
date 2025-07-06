// components/shared/PercentageInput.tsx
import React, { useState, useRef, useEffect } from 'react';

interface PercentageInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  disabled?: boolean;
  showAnimation?: boolean;
}

const PercentageInput: React.FC<PercentageInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  size = 'md',
  className = '',
  disabled = false,
  showAnimation = true
}) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-selección del texto al hacer focus
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
    setIsFocused(true);
  };

  // Auto-selección al hacer clic (si no está ya en focus)
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (!isFocused) {
      e.currentTarget.select();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    
    // Validar que esté dentro del rango
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
      
      // Activar animación si está habilitada
      if (showAnimation) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    }
  };

  // Manejo de teclas para incrementar/decrementar
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const step = 0.1;
    
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(Number((value + step).toFixed(1)), max);
      onChange(newValue);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(Number((value - step).toFixed(1)), min);
      onChange(newValue);
    } else if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  };

  // Clases según el tamaño
  const sizeClasses = {
    sm: 'w-14 px-1 py-1 text-xs',
    md: 'w-16 px-2 py-1.5 text-sm',
    lg: 'w-20 px-3 py-2 text-base'
  };

  // Clases de animación
  const animationClass = isAnimating ? 'scale-105 shadow-lg shadow-green-500/20' : '';

  return (
    <div className="inline-flex items-center gap-1">
      <input
        ref={inputRef}
        type="number"
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onClick={handleClick}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        min={min}
        max={max}
        step="0.1"
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          bg-gray-900/50 border border-gray-700 rounded-lg
          text-white text-center
          transition-all duration-200
          focus:outline-none focus:border-green-500 focus:ring-2 focus:ring-green-500/20
          hover:bg-gray-900/70 hover:border-green-500/30
          disabled:opacity-50 disabled:cursor-not-allowed
          ${animationClass}
          ${className}
        `}
        style={{
          // Eliminar spinners en todos los navegadores
          MozAppearance: 'textfield',
          WebkitAppearance: 'none',
        }}
      />
      <span className="text-gray-400 text-sm select-none">%</span>
    </div>
  );
};

export default PercentageInput;