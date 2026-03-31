import React, { useRef, useEffect, useState } from 'react';
import { Bold, Italic, Underline, Palette } from 'lucide-react';

interface RichTextInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  multiline?: boolean;
  className?: string;
}

export const RichTextInput: React.FC<RichTextInputProps> = ({
  value,
  onChange,
  placeholder,
  multiline = false,
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [colorCode, setColorCode] = useState('');
  const [savedRange, setSavedRange] = useState<Range | null>(null);

  useEffect(() => {
    const handleFocusIn = () => setIsFocused(true);
    const handleFocusOut = (e: FocusEvent) => {
      if (!containerRef.current?.contains(e.relatedTarget as Node)) {
        setIsFocused(false);
      }
    };
    const el = containerRef.current;
    el?.addEventListener('focusin', handleFocusIn);
    el?.addEventListener('focusout', handleFocusOut);
    return () => {
      el?.removeEventListener('focusin', handleFocusIn);
      el?.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Update internal HTML only when not focused to avoid cursor jumping
  useEffect(() => {
    if (divRef.current && !isFocused && divRef.current.innerHTML !== value) {
      divRef.current.innerHTML = value || '';
    }
  }, [value, isFocused]);

  const saveSelection = () => {
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0) {
      setSavedRange(sel.getRangeAt(0));
    }
  };

  const restoreSelection = () => {
    if (savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(savedRange);
    }
  };

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };

  const applyCommand = (cmd: string, val?: string) => {
    document.execCommand('styleWithCSS', false, 'true');
    document.execCommand(cmd, false, val);
    divRef.current?.focus();
    if (divRef.current) {
      onChange(divRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData('text/html');
    const text = e.clipboardData.getData('text/plain');

    if (html) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      const cleanNode = (node: Node): string => {
        if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent || '';
        }
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as HTMLElement;
          let inner = '';
          for (let i = 0; i < el.childNodes.length; i++) {
            inner += cleanNode(el.childNodes[i]);
          }
          
          if (['STYLE', 'SCRIPT', 'META', 'LINK', 'TITLE'].includes(el.tagName)) return '';

          let color = el.style.color;
          if (!color && el.tagName === 'FONT') {
            color = el.getAttribute('color') || '';
          }
          
          let bgColor = el.style.backgroundColor;
          let fontWeight = el.style.fontWeight;
          let fontStyle = el.style.fontStyle;
          let textDecoration = el.style.textDecoration;

          if (el.tagName === 'B' || el.tagName === 'STRONG') fontWeight = 'bold';
          if (el.tagName === 'I' || el.tagName === 'EM') fontStyle = 'italic';
          if (el.tagName === 'U') textDecoration = 'underline';

          let styleStr = '';
          if (color) styleStr += `color: ${color};`;
          if (bgColor) styleStr += `background-color: ${bgColor};`;
          if (fontWeight) styleStr += `font-weight: ${fontWeight};`;
          if (fontStyle) styleStr += `font-style: ${fontStyle};`;
          if (textDecoration) styleStr += `text-decoration: ${textDecoration};`;

          const isBlock = ['P', 'DIV', 'TR', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'].includes(el.tagName);
          
          let result = inner;
          if (styleStr && result.trim()) {
            result = `<span style="${styleStr}">${result}</span>`;
          }
          
          if (isBlock && result.trim() && multiline) {
            result += '<br/>';
          }
          
          return result;
        }
        return '';
      };

      let cleanedHtml = cleanNode(doc.body);
      cleanedHtml = cleanedHtml.replace(/(<br\/>)+$/, ''); // Remove trailing breaks

      document.execCommand('insertHTML', false, cleanedHtml);
    } else {
      // Fallback to plain text
      const formattedText = multiline ? text.replace(/\n/g, '<br/>') : text.replace(/\n/g, ' ');
      document.execCommand('insertHTML', false, formattedText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col border border-[#cfd8dc] rounded bg-white focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 ${className}`}
    >
      {isFocused && (
        <div className="flex items-center gap-1 border-b border-[#cfd8dc] p-1 bg-gray-50 text-gray-600">
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyCommand('bold'); }} className="p-1 hover:bg-gray-200 rounded"><Bold size={14}/></button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyCommand('italic'); }} className="p-1 hover:bg-gray-200 rounded"><Italic size={14}/></button>
          <button type="button" onMouseDown={(e) => { e.preventDefault(); applyCommand('underline'); }} className="p-1 hover:bg-gray-200 rounded"><Underline size={14}/></button>
          <div className="w-px h-4 bg-gray-300 mx-1" />
          <input
            type="text"
            placeholder="#HEX, rgb()"
            className="text-xs border rounded px-1 w-24 h-6"
            value={colorCode}
            onChange={e => setColorCode(e.target.value)}
            onFocus={saveSelection}
          />
          <button
            type="button"
            onMouseDown={(e) => {
              e.preventDefault();
              if (colorCode) {
                restoreSelection();
                applyCommand('foreColor', colorCode);
              }
            }}
            className="p-1 hover:bg-gray-200 rounded text-xs flex items-center gap-1"
            title="Apply Color"
          >
            <Palette size={14}/>
          </button>
        </div>
      )}
      <div
        ref={divRef}
        contentEditable
        onInput={handleInput}
        onPaste={handlePaste}
        onKeyDown={handleKeyDown}
        onMouseUp={saveSelection}
        onKeyUp={saveSelection}
        className={`p-1.5 focus:outline-none overflow-y-auto ${
          multiline ? 'min-h-[90px]' : 'min-h-[36px] flex items-center'
        }`}
        data-placeholder={placeholder}
        style={{
          emptyCells: 'show'
        }}
      />
    </div>
  );
};
