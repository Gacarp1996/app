// hooks/useNumericInput.ts
import { useRef, useState, useCallback } from 'react';

interface UseNumericInputOptions {
  min?: number;
  max?: number;
  step?: number;
  autoSelect?: boolean;
  animateOnChange?: boolean;
}

export const useNumericInput = (
  initialValue: number,
  onChange: (value: number) => void,
  options: UseNumericInputOptions = {}
) => {
  const {
    min = 0,
    max = 100,
    step = 0.1,
    autoSelect = true,
    animateOnChange = true
  } = options;

  const inputRef = useRef<HTMLInputElement>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [value, setValue] = useState(initialValue);

  // Auto-selección del texto
  const handleFocus = useCallback((e: React.FocusEvent<HTMLInputElement>) => {
    if (autoSelect) {
      e.target.select();
    }
    setIsFocused(true);
  }, [autoSelect]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLInputElement>) => {
    if (autoSelect && !isFocused) {
      e.currentTarget.select();
    }
  }, [autoSelect, isFocused]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Manejo del cambio de valor
  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(e.target.value);
    
    // Validar dentro del rango
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      setValue(newValue);
      onChange(newValue);
      
      // Trigger animation
      if (animateOnChange) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    }
  }, [min, max, onChange, animateOnChange]);

  // Incrementar/decrementar con teclado
  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newValue = Math.min(value + step, max);
      setValue(newValue);
      onChange(newValue);
      
      if (animateOnChange) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newValue = Math.max(value - step, min);
      setValue(newValue);
      onChange(newValue);
      
      if (animateOnChange) {
        setIsAnimating(true);
        setTimeout(() => setIsAnimating(false), 300);
      }
    } else if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  }, [value, step, min, max, onChange, animateOnChange]);

  // Incrementar/decrementar programáticamente
  const increment = useCallback(() => {
    const newValue = Math.min(value + step, max);
    setValue(newValue);
    onChange(newValue);
  }, [value, step, max, onChange]);

  const decrement = useCallback(() => {
    const newValue = Math.max(value - step, min);
    setValue(newValue);
    onChange(newValue);
  }, [value, step, min, onChange]);

  const reset = useCallback(() => {
    setValue(initialValue);
    onChange(initialValue);
  }, [initialValue, onChange]);

  return {
    // Props para el input
    inputProps: {
      ref: inputRef,
      type: 'number' as const,
      value,
      onChange: handleChange,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onClick: handleClick,
      onKeyDown: handleKeyDown,
      min,
      max,
      step,
    },
    // Estados
    isAnimating,
    isFocused,
    // Métodos
    increment,
    decrement,
    reset,
    // Ref
    inputRef
  };
};