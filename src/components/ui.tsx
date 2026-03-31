import React from 'react';
import { cn } from '../lib/utils';
import { X, ArrowLeft } from 'lucide-react';

export const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'dark' | 'blue' | 'green' | 'red' | 'orange' | 'outline' }>(
  ({ className, variant = 'dark', ...props }, ref) => {
    const variants = {
      dark: 'bg-gray-800 text-white hover:bg-gray-700',
      blue: 'bg-[#2b579a] text-white hover:bg-blue-800',
      green: 'bg-[#217346] text-white hover:bg-green-800',
      red: 'bg-[#b71c1c] text-white hover:bg-red-800',
      orange: 'bg-[#e65100] text-white hover:bg-orange-800',
      outline: 'border border-gray-300 bg-gray-100 text-gray-700 hover:bg-gray-200',
    };
    return (
      <button
        ref={ref}
        className={cn(
          'inline-flex items-center justify-center gap-1.5 rounded border-0 px-2.5 py-1.5 text-xs font-bold cursor-pointer transition-opacity disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'w-full border border-[#cfd8dc] rounded px-2 py-1.5 text-[13px] focus:outline-none focus:border-[#2b579a]',
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          'w-full border border-[#cfd8dc] rounded px-2 py-1.5 text-[13px] focus:outline-none focus:border-[#2b579a]',
          className
        )}
        {...props}
      />
    );
  }
);
Select.displayName = 'Select';

export const Modal = ({ isOpen, onClose, onBack, title, children, width = 'min(900px, 96vw)', noScroll = false }: { isOpen: boolean; onClose: () => void; onBack?: () => void; title: string | React.ReactNode; children: React.ReactNode; width?: string; noScroll?: boolean }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/45 flex items-center justify-center p-3.5 z-50">
      <div 
        className="bg-white rounded-lg border border-[#cfd8dc] p-3.5 max-h-[90vh] overflow-hidden flex flex-col"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-3 shrink-0">
          <div className="flex items-center gap-2">
            {onBack && (
              <button className="bg-transparent border-0 text-[18px] cursor-pointer text-gray-600 hover:text-gray-900 flex items-center" onClick={onBack} title="Go Back">
                <ArrowLeft size={20} />
              </button>
            )}
            <h3 className="m-0 text-[#2b579a] text-lg font-bold flex items-center gap-2">{title}</h3>
          </div>
          <button className="bg-transparent border-0 text-[22px] cursor-pointer text-gray-600 hover:text-gray-900" onClick={onClose} title="Close">
            <X size={24} />
          </button>
        </div>
        <div className={`flex-1 ${noScroll ? 'flex flex-col min-h-0' : 'overflow-auto'}`}>
          {children}
        </div>
      </div>
    </div>
  );
};
