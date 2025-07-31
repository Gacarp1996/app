// components/shared/NumericInput.tsx
import React, { useRef, useState } from 'react';

interface NumericInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  size?: 'sm' | 'md' | 'lg';
  showPercentage?: boolean;
  placeholder?: string;
  className?: string;
  label?: string;
  tooltip?: string;
  disabled?: boolean;
  validationState?: 'valid' | 'warning' | 'error';
  showAnimation?: boolean; // ✅ NUEVO: tomado de PercentageInput
  autoSelect?: boolean;    // ✅ NUEVO: para comportamiento de auto-selección
}

const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  min = 0,
  max = 100,
  step = 0.1,
  size = 'md',
  showPercentage = false,
  placeholder,
  className = '',
  label,
  tooltip,
  disabled = false,
  validationState,
  showAnimation = true,  // ✅ Por defecto activo
  autoSelect = true,     // ✅ Por defecto activo
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  // ✅ MEJORADO: Mejor manejo de focus (de PercentageInput)
  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true);
    if (autoSelect) {
      e.target.select();
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
  };

  // ✅ MEJORADO: Click handler (de PercentageInput)
  const handleClick = (e: React.MouseEvent<HTMLInputElement>) => {
    if (autoSelect && !isFocused) {
      e.currentTarget.select();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    
    // Validar dentro del rango
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onChange(newValue);
      
      // ✅ MEJORADO: Animación condicional
      if (showAnimation) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Incrementar/decrementar con flechas
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

  const sizeClasses = {
    sm: 'w-14 px-1 py-1 text-xs',
    md: 'w-16 px-2 py-1.5 text-sm',
    lg: 'w-20 px-3 py-2 text-base'
  };

  const validationClasses = {
    valid: 'border-green-500/50 bg-green-500/5',
    warning: 'border-yellow-500/50 bg-yellow-500/5',
    error: 'border-red-500/50 bg-red-500/5'
  };

  // ✅ MEJORADO: Clases de animación condicionales
  const animationClass = showAnimation && isAnimating ? 'scale-105 shadow-lg shadow-green-500/20' : '';

  return (
    <div className={`planning-input-wrapper ${label ? 'space-y-1' : ''}`}>
      {label && (
        <label className="block text-xs font-medium text-gray-400">
          {label}
        </label>
      )}
      
      <div className={`percentage-input-group ${showPercentage ? 'inline-flex items-center gap-1' : 'inline-block'}`}>
        <input
          ref={inputRef}
          type="number"
          value={value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onClick={handleClick}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          placeholder={placeholder}
          disabled={disabled}
          className={`
            planning-input ${sizeClasses[size]}
            bg-gray-900/50 border rounded-lg
            text-white text-center
            transition-all duration-200
            focus:outline-none
            ${!disabled ? 'hover:bg-gray-900/70 hover:border-green-500/30' : 'opacity-50 cursor-not-allowed'}
            ${isFocused ? 'border-green-500 bg-gray-900/70 shadow-lg shadow-green-500/20' : 'border-gray-700'}
            ${animationClass}
            ${validationState ? validationClasses[validationState] : ''}
            ${className}
          `}
          style={{
            /* Eliminar spinners */
            MozAppearance: 'textfield',
            WebkitAppearance: 'none',
          }}
        />
        
        {showPercentage && (
          <span className="percentage-symbol text-gray-400 text-sm select-none">%</span>
        )}
        
        {tooltip && (
          <div className="input-tooltip">
            {tooltip}
          </div>
        )}
      </div>
    </div>
  );
};

export default NumericInput;