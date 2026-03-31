import React, { useRef, useEffect } from 'react';
import { cn } from '../lib/utils';
import { ColorPicker } from './ColorPicker';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({ value, onChange, className }) => {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const html = e.clipboardData.getData('text/html');
    if (html) {
      e.preventDefault();
      
      // Create a temporary element to parse the HTML
      const doc = new DOMParser().parseFromString(html, 'text/html');
      
      // Clean up the HTML from Excel
      // We want to keep colors. Excel uses inline styles like color: #FF0000
      // We'll use a simple approach: just insert the body content
      const body = doc.body;
      
      // Optional: sanitize or filter tags here if needed
      // For now, let's just insert it
      const cleanHtml = body.innerHTML;
      document.execCommand('insertHTML', false, cleanHtml);
    }
  };

  const applyColor = (color: string) => {
    document.execCommand('foreColor', false, color);
    handleInput();
  };

  return (
    <div className={cn("flex flex-col gap-1 w-full", className)}>
      <div className="flex items-center gap-2 mb-1">
        <label className="text-[10px] font-bold text-gray-500">Text Color:</label>
        <ColorPicker 
          color="#000000"
          onChange={applyColor}
          size="sm"
        />
        <span className="text-[9px] text-gray-400 italic">(Select text first)</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        className="w-full min-h-[60px] border border-[#cfd8dc] rounded px-2 py-1.5 text-[10px] font-normal focus:outline-none focus:border-[#2b579a] bg-white overflow-auto"
        style={{ fontFamily: 'Arial, sans-serif' }}
      />
    </div>
  );
};
