import React, { useState, useEffect, useRef } from 'react';
import { HexColorPicker } from 'react-colorful';
import { colord, extend } from 'colord';
import namesPlugin from 'colord/plugins/names';
import { cn } from '../lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

extend([namesPlugin]);

interface ColorPickerProps {
  color: string;
  onChange: (color: string) => void;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

type ColorFormat = 'hex' | 'rgb' | 'hsl';

export const ColorPicker: React.FC<ColorPickerProps> = ({ color, onChange, className, size = 'md' }) => {
  const [showPicker, setShowPicker] = useState(false);
  const [format, setFormat] = useState<ColorFormat>('hex');
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const sizeClass = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8'
  }[size];

  const currentColor = colord(color || '#ffffff');
  
  const getDisplayValue = () => {
    switch (format) {
      case 'hex': return currentColor.toHex();
      case 'rgb': return currentColor.toRgbString();
      case 'hsl': return currentColor.toHslString();
      default: return currentColor.toHex();
    }
  };

  const handleInputChange = (val: string) => {
    const c = colord(val);
    if (c.isValid()) {
      onChange(c.toHex());
    }
  };

  const cycleFormat = () => {
    const formats: ColorFormat[] = ['hex', 'rgb', 'hsl'];
    const nextIdx = (formats.indexOf(format) + 1) % formats.length;
    setFormat(formats[nextIdx]);
  };

  return (
    <div className={cn("relative inline-block", className)} ref={pickerRef}>
      <div 
        className={cn(sizeClass, "rounded border border-gray-300 cursor-pointer shadow-sm")}
        style={{ backgroundColor: color || '#ffffff' }}
        onClick={() => setShowPicker(!showPicker)}
      />
      {showPicker && (
        <div className="absolute z-[100] mt-2 left-0 shadow-xl border border-gray-200 rounded-lg bg-white p-3 flex flex-col gap-3 min-w-[220px]">
          <HexColorPicker color={color || '#ffffff'} onChange={onChange} className="!w-full" />
          
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 uppercase">{format}</span>
              <button 
                type="button"
                className="text-[9px] text-[#2b579a] hover:underline font-bold"
                onClick={cycleFormat}
              >
                Switch Format
              </button>
            </div>
            <input 
              type="text"
              className="w-full border border-gray-200 rounded px-2 py-1 text-[10px] font-mono focus:outline-none focus:border-[#2b579a]"
              value={getDisplayValue()}
              onChange={(e) => handleInputChange(e.target.value)}
            />
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <div className="flex gap-1">
              {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'].map(c => (
                <div 
                  key={c}
                  className="w-4 h-4 rounded-full border border-gray-200 cursor-pointer"
                  style={{ backgroundColor: c }}
                  onClick={() => onChange(c)}
                />
              ))}
            </div>
            <button 
              type="button"
              className="text-[10px] font-bold text-[#2b579a] hover:underline"
              onClick={() => setShowPicker(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
