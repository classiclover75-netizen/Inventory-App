import React, { useState, useMemo, useDeferredValue } from 'react';
import { Modal, Button, Input } from './ui';
import { Column, RowData } from '../types';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useToast } from './ToastProvider';
import { Search, ArrowLeft, FileSpreadsheet } from 'lucide-react';

interface ExcelExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBack: () => void;
  pageName: string;
  columns: Column[];
  rows: RowData[];
}

export const ExcelExportModal: React.FC<ExcelExportModalProps> = ({
  isOpen, onClose, onBack, pageName, columns, rows
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [localRows, setLocalRows] = useState<RowData[]>(rows);
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  // Sync localRows when rows prop changes
  React.useEffect(() => {
    setLocalRows(rows);
  }, [rows]);

  const exportColumns = useMemo(() => columns.filter(c => c.key !== 'sr'), [columns]);

  const highlightTextHtml = (text: string, query: string) => {
    if (!query || !text) return { __html: String(text || '') };
    const strText = String(text);
    const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return { __html: strText };

    const parser = new DOMParser();
    const doc = parser.parseFromString(strText, 'text/html');
    
    const escapedTokens = tokens.map(t => t.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
    const regex = new RegExp(`(${escapedTokens.join('|')})`, 'gi');

    const walk = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        const txt = node.textContent || '';
        if (regex.test(txt)) {
          const span = document.createElement('span');
          span.innerHTML = txt.replace(regex, '<mark class="bg-yellow-300 text-black font-bold px-0.5 rounded-sm">$1</mark>');
          node.parentNode?.replaceChild(span, node);
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        if ((node as HTMLElement).tagName !== 'MARK') {
          Array.from(node.childNodes).forEach(walk);
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(walk);
    return { __html: doc.body.innerHTML };
  };

  // Code 2 wala Advanced Tokenized Search
  const filteredRows = useMemo(() => {
    if (!deferredSearchQuery) return localRows;
    const tokens = deferredSearchQuery.toLowerCase().split(/\s+/).filter(Boolean);
    return localRows.filter(row => {
      const blob = Object.values(row).join(' ').toLowerCase();
      return tokens.every(t => blob.includes(t));
    });
  }, [localRows, deferredSearchQuery]);

  const htmlToRichText = (html: string) => {
    if (!html || !html.includes('<')) return html;
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const richText: any[] = [];

    const walk = (node: Node, currentFont: any) => {
      if (node.nodeType === Node.TEXT_NODE) {
        if (node.textContent) {
          richText.push({ text: node.textContent, font: { ...currentFont } });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;
        if (el.tagName === 'BR') {
          richText.push({ text: '\n', font: { ...currentFont } });
          return;
        }
        
        const newFont = { ...currentFont };
        if (el.style.color) {
          let color = el.style.color;
          if (color.startsWith('rgb')) {
            const rgb = color.match(/\d+/g);
            if (rgb && rgb.length >= 3) {
              color = ((1 << 24) + (parseInt(rgb[0]) << 16) + (parseInt(rgb[1]) << 8) + parseInt(rgb[2])).toString(16).slice(1).toUpperCase();
            }
          } else if (color.startsWith('#')) {
            color = color.substring(1).toUpperCase();
          }
          if (color.length === 6) color = 'FF' + color;
          newFont.color = { argb: color };
        }
        if (el.tagName === 'B' || el.tagName === 'STRONG' || el.style.fontWeight === 'bold' || el.style.fontWeight >= '700') newFont.bold = true;
        if (el.tagName === 'I' || el.tagName === 'EM' || el.style.fontStyle === 'italic') newFont.italic = true;
        if (el.tagName === 'U' || el.style.textDecoration === 'underline') newFont.underline = true;

        Array.from(node.childNodes).forEach(child => walk(child, newFont));
        
        if (['P', 'DIV', 'LI', 'TR'].includes(el.tagName)) {
          richText.push({ text: '\n', font: { ...currentFont } });
        }
      }
    };

    Array.from(doc.body.childNodes).forEach(child => walk(child, {}));
    
    while (richText.length > 0 && richText[richText.length - 1].text === '\n') {
      richText.pop();
    }

    return richText.length > 0 ? { richText } : html;
  };

  const toARGB = (color: string) => {
    if (!color) return undefined;
    let c = color.trim();
    if (c.startsWith('#')) {
      c = c.substring(1).toUpperCase();
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      if (c.length === 6) return 'FF' + c;
      if (c.length === 8) return c;
    }
    const el = document.createElement('div');
    el.style.color = c;
    document.body.appendChild(el);
    const computed = window.getComputedStyle(el).color;
    document.body.removeChild(el);
    const match = computed.match(/\d+/g);
    if (match && match.length >= 3) {
      const r = parseInt(match[0]).toString(16).padStart(2, '0');
      const g = parseInt(match[1]).toString(16).padStart(2, '0');
      const b = parseInt(match[2]).toString(16).padStart(2, '0');
      return 'FF' + (r + g + b).toUpperCase();
    }
    return undefined;
  };

  const handleExport = async () => {
    setIsProcessing(true);
    setProgress(10);

    try {
      // Agar kuch select kiya hai toh sirf wo, warna filtered sab
      const rowsToExport = selectedRowIds.size > 0 
        ? localRows.filter(r => selectedRowIds.has(r.id))
        : filteredRows; 

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(pageName || 'Inventory Data');
      
      setProgress(30);

      // Columns banayein aur Image column ki width set karein
      worksheet.columns = exportColumns.map(c => ({ 
        header: c.name, 
        key: c.key, 
        width: c.type === 'image' ? 18 : 25 
      }));

      // Code 2 wala Header Styling (Software kay color kay mutabiq)
      const headerRow = worksheet.getRow(1);
      headerRow.eachCell((cell) => {
        cell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F3F3' }
        };
        cell.font = { bold: true, color: { argb: 'FF2F3D49' } };
        cell.border = {
          top: { style: 'thin' }, left: { style: 'thin' },
          bottom: { style: 'thin' }, right: { style: 'thin' }
        };
      });

      setProgress(50);

      // Data insert karna
      for (let i = 0; i < rowsToExport.length; i++) {
        const rowData = rowsToExport[i];
        const rowValues: any = {};
        
        exportColumns.forEach(col => {
          if (col.type === 'image') {
            rowValues[col.key] = ''; // Text clear karein
          } else {
            const val = rowData[col.key];
            if (Array.isArray(val)) {
              const joined = val.join('\n');
              rowValues[col.key] = joined.includes('<') ? htmlToRichText(joined) : joined;
            } else if (typeof val === 'string' && val.includes('<')) {
              rowValues[col.key] = htmlToRichText(val);
            } else {
              rowValues[col.key] = val || '';
            }
          }
        });
        
        const excelRow = worksheet.addRow(rowValues);
        
        // Apply row color
        if (rowData._rowColor) {
          const argb = toARGB(rowData._rowColor);
          if (argb) {
            excelRow.eachCell(cell => {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
            });
          }
        }

        // Apply cell colors
        if (rowData._cellColors) {
          exportColumns.forEach((col, idx) => {
            const cellColor = rowData._cellColors[col.key];
            if (cellColor) {
              const argb = toARGB(cellColor);
              if (argb) {
                const cell = excelRow.getCell(idx + 1);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
              }
            }
          });
        }
        
        // Image kay liye row height badi ki (First code requirement)
        excelRow.height = 80; 
        
        // Image processing
        for (let j = 0; j < exportColumns.length; j++) {
          const col = exportColumns[j];
          if (col.type === 'image' && rowData[col.key]) {
            const base64Data = String(rowData[col.key]);
            
            if (base64Data.startsWith('data:image')) {
              // Code 2 wala dynamic extension detector
              const extension = base64Data.split(';')[0].split('/')[1];
              const base64 = base64Data.split(',')[1];
              
              try {
                const imageId = workbook.addImage({
                  base64,
                  extension: extension as any,
                });

                // Aapka dia gaya exact pehle code wala placement logic
                worksheet.addImage(imageId, {
                  // Left side se zyada gap (0.3) aur top se normal gap (0.1)
                  tl: { col: j + 0.5, row: excelRow.number - 1 + 0.1 }, 
                  
                  // Width ko thoda aur kam kar diya taake image right border ko touch na kare
                  ext: { width: 90, height: 80 }, 
                  
                  editAs: 'oneCell' 
                });
              } catch (e) { 
                console.error("Image export failed", e); 
              }
            }
          }
        }
      }

      setProgress(90);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${pageName || 'Inventory'}_Export_${Date.now()}.xlsx`);
      
      setProgress(100);
      toast(`Exported ${rowsToExport.length} rows successfully.`);
      onClose();
    } catch (err) {
      console.error(err);
      toast("Error exporting Excel file");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClearData = () => {
    setSelectedRowIds(new Set());
    setSearchQuery('');
    setLocalRows([]);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`📤 Excel Export Preview (${pageName})`} width="95vw" noScroll={true}>
      <div className="flex flex-col h-[85vh] p-4">
        {isProcessing ? (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Processing... {progress}%</div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div className="bg-[#2b579a] h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
            </div>
          </div>
        ) : (
          <>
            <div className="flex gap-4 mb-4 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
                <Input className="pl-8" placeholder="Filter rows..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
              </div>
            </div>

            <div className="flex-1 overflow-auto border rounded relative bg-white">
              <table className="w-full text-sm border-collapse">
                <thead className="sticky top-0 bg-gray-100 z-10 shadow-sm">
                  <tr>
                    <th className="p-2 border w-10 text-center">
                      <input type="checkbox" className="cursor-pointer" onChange={(e) => {
                        if (e.target.checked) setSelectedRowIds(new Set(filteredRows.map(r => r.id)));
                        else setSelectedRowIds(new Set());
                      }} />
                    </th>
                    {columns.map((c, i) => (
                      <th key={c.key} className="p-2 border text-left font-bold text-[14px] font-['Arial']">
                        <div className="flex items-center gap-1">
                          {i + 1}. {c.name} {c.locked && '🔒'}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row, i) => (
                    <tr key={row.id} className={selectedRowIds.has(row.id) ? 'bg-blue-50' : 'hover:bg-gray-50'}>
                      <td className="p-2 border text-center">
                        <input 
                          type="checkbox" 
                          className="cursor-pointer"
                          checked={selectedRowIds.has(row.id)} 
                          onChange={() => {
                            const next = new Set(selectedRowIds);
                            if (next.has(row.id)) next.delete(row.id);
                            else next.add(row.id);
                            setSelectedRowIds(next);
                          }} 
                        />
                      </td>
                      {columns.map(c => (
                        <td key={c.key} className="p-2 border whitespace-normal break-words min-w-[150px] text-[14px] font-['Arial'] font-normal">
                          {c.type === 'image' && row[c.key] ? 
                            <img src={String(row[c.key])} className="h-10 w-10 object-contain mx-auto rounded" alt="img" /> 
                            : <span dangerouslySetInnerHTML={highlightTextHtml(String(row[c.key] || ''), deferredSearchQuery)} />
                          }
                        </td>
                      ))}
                    </tr>
                  ))}
                  {filteredRows.length === 0 && (
                    <tr>
                      <td colSpan={columns.length + 1} className="p-4 text-center text-gray-500 font-medium">
                        No data matches your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-center mt-4 pt-4 border-t sticky bottom-0 bg-white z-10 pb-2 shrink-0">
              <span className="text-xs font-bold text-gray-500 bg-gray-100 px-3 py-1.5 rounded-md">
                {selectedRowIds.size > 0 ? `${selectedRowIds.size} rows selected` : "No selection (Will export all filtered rows)"}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onBack} className="flex items-center gap-2">
                  <ArrowLeft size={16} /> Back to Active Page
                </Button>
                <Button variant="red" onClick={handleClearData}>Clear Data</Button>
                <Button variant="dark" onClick={handleExport} className="flex items-center gap-2">
                  <FileSpreadsheet size={16} /> Download Excel
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};
