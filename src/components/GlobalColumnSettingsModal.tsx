import React, { useState, useEffect } from 'react';
import { Modal, Button, Input } from './ui';
import { AppState } from '../types';

interface GlobalColumnSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: AppState;
  onChange: (settings: { rowNoWidth: number; actWidth: number }) => void;
}

export function GlobalColumnSettingsModal({ isOpen, onClose, state, onChange }: GlobalColumnSettingsModalProps) {
  const rowNoWidth = state.globalSettings?.rowNoWidth || 100;
  const actWidth = state.globalSettings?.actWidth || 100;

  const handleUpdate = (key: 'rowNoWidth' | 'actWidth', val: number) => {
    const clamped = Math.max(50, Math.min(500, val));
    onChange({
      rowNoWidth: key === 'rowNoWidth' ? clamped : rowNoWidth,
      actWidth: key === 'actWidth' ? clamped : actWidth
    });
  };

  const handleReset = () => {
    onChange({ rowNoWidth: 100, actWidth: 100 });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Global Column Settings">
      <div className="flex flex-col gap-6 py-2">
        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Row No. Column Width (50 - 500 px)</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="50" 
              max="500" 
              value={rowNoWidth}
              onChange={(e) => handleUpdate('rowNoWidth', Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2b579a]"
            />
            <Input 
              type="number" 
              min="50"
              max="500"
              value={rowNoWidth} 
              onChange={(e) => handleUpdate('rowNoWidth', Number(e.target.value))}
              className="w-20 text-center font-mono"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wider">Action Column Width (50 - 500 px)</label>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="50" 
              max="500" 
              value={actWidth}
              onChange={(e) => handleUpdate('actWidth', Number(e.target.value))}
              className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#2b579a]"
            />
            <Input 
              type="number" 
              min="50"
              max="500"
              value={actWidth} 
              onChange={(e) => handleUpdate('actWidth', Number(e.target.value))}
              className="w-20 text-center font-mono"
            />
          </div>
        </div>
        
        <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-100">
          <Button variant="secondary" onClick={handleReset}>Reset to Default</Button>
          <Button variant="dark" onClick={onClose}>Done</Button>
        </div>
      </div>
    </Modal>
  );
}
