import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Settings, Plus, X, Edit, Trash2, Copy, Image as ImageIcon, RefreshCw, GripVertical, ArrowUp, ArrowDown, Lock, Unlock } from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Button, Input, Modal } from './components/ui';
import { ToastProvider, useToast } from './components/ToastProvider';
import { CopyPopupNotification } from './components/CopyPopupNotification';
import { CreatePageModal } from './components/CreatePageModal';
import { AddRowModal } from './components/AddRowModal';
import { ActivePageSettingsModal } from './components/ActivePageSettingsModal';
import { RenamePageModal } from './components/RenamePageModal';
import { CreateColumnModal } from './components/CreateColumnModal';
import { EditColumnModal } from './components/EditColumnModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { ImagePreviewModal } from './components/ImagePreviewModal';
import { ReorderPagesModal } from './components/ReorderPagesModal';
import { ReorderSearchBarsModal } from './components/ReorderSearchBarsModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { ExcelExportModal } from './components/ExcelExportModal';
import { DuplicateFinderModal } from './components/DuplicateFinderModal';
import { GlobalCombinationCopyBoxes } from './components/GlobalCombinationCopyBoxes';
import { GlobalCopyBoxesSettingsModal } from './components/GlobalCopyBoxesSettingsModal';
import { AppState, Column, PageConfig, RowData, GlobalCopyBoxesSettings } from './types';

const initialConfig: PageConfig = {
  rowReorderEnabled: false,
  hoverPreviewEnabled: false,
  columns: [
    { key: 'sr', name: 'Row No.', type: 'system_serial', locked: true, movable: false }
  ]
};

function AppContent() {
  const [state, setState] = useState<AppState>({
    pages: [],
    activePage: '',
    pageConfigs: {},
    pageRows: {}
  });

  const hoveredCellRef = useRef<HTMLTableCellElement | null>(null);

  const applyHover = (td: HTMLTableCellElement) => {
    const tr = td.parentElement as HTMLTableRowElement;
    if (!tr) return;
    const table = tr.closest('table');
    if (!table) return;

    const cellIndex = td.cellIndex;
    
    td.dataset.hoveredExact = 'true';
    
    const cellsInRow = tr.children;
    for (let i = 0; i < cellsInRow.length; i++) {
      const cell = cellsInRow[i] as HTMLTableCellElement;
      cell.dataset.hoveredRow = 'true';
    }
    
    const rows = table.rows;
    for (let i = 0; i < rows.length; i++) {
      const cellInCol = rows[i].children[cellIndex] as HTMLTableCellElement;
      if (cellInCol) {
        cellInCol.dataset.hoveredCol = 'true';
      }
    }
  };

  const cleanupHover = (td: HTMLTableCellElement) => {
    const root = td.closest('table') || document;
    
    const exacts = root.querySelectorAll('[data-hovered-exact]');
    for (let i = 0; i < exacts.length; i++) {
      delete (exacts[i] as HTMLElement).dataset.hoveredExact;
    }
    
    const rows = root.querySelectorAll('[data-hovered-row]');
    for (let i = 0; i < rows.length; i++) {
      delete (rows[i] as HTMLElement).dataset.hoveredRow;
    }
    
    const cols = root.querySelectorAll('[data-hovered-col]');
    for (let i = 0; i < cols.length; i++) {
      delete (cols[i] as HTMLElement).dataset.hoveredCol;
    }
  };

  const handleTableMouseOver = (e: React.MouseEvent<HTMLTableElement>) => {
    const td = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement;
    if (!td) return;
    
    if (hoveredCellRef.current === td) return;
    
    if (hoveredCellRef.current) {
      cleanupHover(hoveredCellRef.current);
    }
    
    hoveredCellRef.current = td;
    applyHover(td);
  };

  const handleTableMouseOut = (e: React.MouseEvent<HTMLTableElement>) => {
    const td = (e.target as HTMLElement).closest('td, th') as HTMLTableCellElement;
    if (!td) return;
    
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (td.contains(relatedTarget)) return;
    
    if (hoveredCellRef.current === td) {
      cleanupHover(td);
      hoveredCellRef.current = null;
    }
  };
  const [activePopupId, setActivePopupId] = useState<string | null>(null);
  const [activeAnchor, setActiveAnchor] = useState<HTMLElement | null>(null);

  const [pageSearchQueries, setPageSearchQueries] = useState<Record<string, string>>({});
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState<string>('');
  const [lastSecondarySearchQuery, setLastSecondarySearchQuery] = useState<string>('');
  const currentSearch = pageSearchQueries[state.activePage] || '';
  const [secondarySearchQuery, setSecondarySearchQuery] = useState('');
  const [activeSearchView, setActiveSearchView] = useState<'primary' | 'secondary'>('primary');
  const [showTopSettings, setShowTopSettings] = useState(false);
  const [isDupModalOpen, setIsDupModalOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const primaryInputRef = useRef<HTMLInputElement>(null);
  const secondaryInputRef = useRef<HTMLInputElement>(null);

  const [primarySearchInput, setPrimarySearchInput] = useState('');
  const [secondarySearchInput, setSecondarySearchInput] = useState('');

  useEffect(() => {
    setPrimarySearchInput(pageSearchQueries[state.activePage] || '');
  }, [state.activePage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPageSearchQueries(prev => {
        if (prev[state.activePage] === primarySearchInput) return prev;
        return { ...prev, [state.activePage]: primarySearchInput };
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [primarySearchInput, state.activePage]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSecondarySearchQuery(secondarySearchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [secondarySearchInput]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPrimarySearchInput(e.target.value);
    setShowUndoToast(false);
    if (e.target.value && (activeConfig.independentSearchBars === false)) {
      setSecondarySearchInput('');
    }
  };

  const handleClosePopup = React.useCallback(() => {
    setActivePopupId(null);
  }, []);

  const handleClearSearch = () => {
    if (primarySearchInput) {
      setLastSearchQuery(primarySearchInput);
      setPrimarySearchInput('');
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 1500);
    }
  };

  const handleClearSecondarySearch = () => {
    if (secondarySearchInput) {
      setLastSecondarySearchQuery(secondarySearchInput);
      setSecondarySearchInput('');
      setShowUndoToast(true);
      setTimeout(() => setShowUndoToast(false), 1500);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && showUndoToast) {
        if (lastSearchQuery && !primarySearchInput) {
          setPrimarySearchInput(lastSearchQuery);
          setLastSearchQuery('');
        } else if (lastSecondarySearchQuery && !secondarySearchInput) {
          setSecondarySearchInput(lastSecondarySearchQuery);
          setLastSecondarySearchQuery('');
        }
        setShowUndoToast(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showUndoToast, lastSearchQuery, lastSecondarySearchQuery, primarySearchInput, secondarySearchInput, state.activePage]);

  const handleExportData = () => {
    try {
      const jsonString = JSON.stringify(state, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const downloadAnchorNode = document.createElement('a');
      
      const date = new Date();
      const day = String(date.getDate()).padStart(2, '0');
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const month = monthNames[date.getMonth()];
      const year = date.getFullYear();
      const formattedDate = `${day}-${month}-${year}`;

      downloadAnchorNode.setAttribute("href", url);
      downloadAnchorNode.setAttribute("download", `inventory_backup_${formattedDate}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      document.body.removeChild(downloadAnchorNode);
      URL.revokeObjectURL(url);
      toast('Data exported successfully');
    } catch (error) {
      console.error("Export error:", error);
      toast('Error exporting data');
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        if (parsed && typeof parsed === 'object' && Array.isArray(parsed.pages)) {
          // Ensure activePage is set if pages exist
          if (parsed.pages.length > 0 && !parsed.activePage) {
            parsed.activePage = parsed.pages[0];
          }
          setState(parsed);
          toast('Data imported successfully');
        } else {
          toast('Invalid backup file format');
        }
      } catch (error) {
        console.error("Import error:", error);
        toast('Error reading backup file');
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowTopSettings(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Modals state
  const [modals, setModals] = useState({
    createPage: false,
    addRow: false,
    activePageSettings: false,
    renamePage: false,
    createColumn: false,
    imagePreview: false,
    editColumn: false,
    reorderPages: false,
    reorderSearchBars: false,
    excelImport: false,
    excelExport: false,
    globalCopyBoxesSettings: false
  });

  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [editingPageName, setEditingPageName] = useState<string | null>(null);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);
  const [confirmationModal, setConfirmationModal] = useState<{ isOpen: boolean, title?: string, message?: string, confirmLabel?: string, onConfirm: () => void } | null>(null);
  const [rowToDelete, setRowToDelete] = useState<string | null>(null);
  const [previewContext, setPreviewContext] = useState<{ rowId: string; imageKey: string; pageName: string } | null>(null);
  const [returnToSettings, setReturnToSettings] = useState(false);
  const [returnToImagePreview, setReturnToImagePreview] = useState(false);
  const [hoveredImage, setHoveredImage] = useState<{ url: string; x: number; y: number } | null>(null);

  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [excelImportData, setExcelImportData] = useState<{ rows: any[], headers: string[] }>({ rows: [], headers: [] });
  const [box1Value, setBox1Value] = useState('');
  const [box2Value, setBox2Value] = useState('');

  useEffect(() => {
    setSelectedRowIds(new Set());
  }, [state.activePage]);

  const handleToggleMagicPasteColumn = (colKey: string) => {
    setState(prev => {
      const pageConfig = prev.pageConfigs[prev.activePage];
      if (!pageConfig) return prev;
      
      const updatedColumns = pageConfig.columns.map(col => 
        col.key === colKey ? { ...col, magicPasteDisabled: !col.magicPasteDisabled } : col
      );
      
      return {
        ...prev,
        pageConfigs: {
          ...prev.pageConfigs,
          [prev.activePage]: {
            ...pageConfig,
            columns: updatedColumns
          }
        }
      };
    });
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const sourceIdx = result.source.index;
    const destIdx = result.destination.index;
    if (sourceIdx === destIdx) return;

    const draggedRowId = result.draggableId;

    setState(prev => {
      const rows = [...prev.pageRows[prev.activePage]];
      const isMultiDrag = selectedRowIds.has(draggedRowId) && selectedRowIds.size > 1;

      if (isMultiDrag) {
        const selectedRows = rows.filter(r => selectedRowIds.has(r.id));
        const remainingRows = rows.filter(r => !selectedRowIds.has(r.id));
        
        let insertIdx = destIdx;
        // Adjust insert index if the destination is after the dragged item
        if (sourceIdx < destIdx) {
           insertIdx = destIdx - selectedRows.length + 1;
        }
        
        remainingRows.splice(insertIdx, 0, ...selectedRows);

        return {
          ...prev,
          pageRows: {
            ...prev.pageRows,
            [prev.activePage]: remainingRows
          }
        };
      } else {
        const draggedIdx = rows.findIndex(r => r.id === draggedRowId);
        if (draggedIdx === -1) return prev;

        const [draggedRow] = rows.splice(draggedIdx, 1);
        rows.splice(destIdx, 0, draggedRow);

        return {
          ...prev,
          pageRows: {
            ...prev.pageRows,
            [prev.activePage]: rows
          }
        };
      }
    });
  };

  const toggleModal = (modal: keyof typeof modals, value: boolean) => {
    setModals(prev => ({ ...prev, [modal]: value }));
  };

  const closeAllModals = () => {
    setModals({
      createPage: false,
      addRow: false,
      activePageSettings: false,
      renamePage: false,
      createColumn: false,
      editColumn: false,
      imagePreview: false,
      reorderPages: false,
      reorderSearchBars: false,
      excelImport: false,
      excelExport: false
    });
    setEditingRowId(null);
    setEditingPageName(null);
    setEditingColumn(null);
    setPreviewContext(null);
    setReturnToSettings(false);
    setReturnToImagePreview(false);
  };

  const activeConfig = state.pageConfigs[state.activePage] || initialConfig;
  const activeRows = state.pageRows[state.activePage] || [];

  const handleCreatePage = (name: string, columns: Column[]) => {
    setState(prev => ({
      ...prev,
      pages: [...prev.pages, name],
      activePage: name,
      pageConfigs: {
        ...prev.pageConfigs,
        [name]: {
          rowReorderEnabled: false,
          hoverPreviewEnabled: false,
          columns: [
            { key: 'sr', name: 'Row No.', type: 'system_serial', locked: true, movable: false },
            ...columns
          ]
        }
      },
      pageRows: {
        ...prev.pageRows,
        [name]: []
      }
    }));
    toggleModal('createPage', false);
    toast(`Page "${name}" created. Added: Row No. + ${columns.length} custom column(s).`);
  };

  const handleRenamePage = (newName: string) => {
    const oldName = state.activePage;
    setState(prev => {
      const newPages = prev.pages.map(p => p === oldName ? newName : p);
      const newConfigs = { ...prev.pageConfigs };
      const newRows = { ...prev.pageRows };
      
      newConfigs[newName] = newConfigs[oldName];
      delete newConfigs[oldName];
      
      newRows[newName] = newRows[oldName];
      delete newRows[oldName];

      return {
        ...prev,
        pages: newPages,
        activePage: newName,
        pageConfigs: newConfigs,
        pageRows: newRows
      };
    });
    closeAllModals();
    setReturnToSettings(false);
    toast(`Page renamed to: ${newName}`);
  };

  const handleDeletePage = () => {
    const pageToDelete = state.activePage;
    setState(prev => {
      const newPages = prev.pages.filter(p => p !== pageToDelete);
      const newConfigs = { ...prev.pageConfigs };
      const newRows = { ...prev.pageRows };
      
      delete newConfigs[pageToDelete];
      delete newRows[pageToDelete];

      return {
        ...prev,
        pages: newPages,
        activePage: newPages.length > 0 ? newPages[0] : '',
        pageConfigs: newConfigs,
        pageRows: newRows
      };
    });
    closeAllModals();
    toast(`Page "${pageToDelete}" deleted`);
  };

  const handleSaveActivePageSettings = (config: PageConfig, closeModal: boolean = true) => {
    setState(prev => ({
      ...prev,
      pageConfigs: {
        ...prev.pageConfigs,
        [state.activePage]: config
      }
    }));
    if (closeModal) {
      toggleModal('activePageSettings', false);
      toast(`Page settings updated for ${state.activePage}`);
    }
  };

  const handleCreateColumns = (newColumns: Column[]) => {
    setState(prev => ({
      ...prev,
      pageConfigs: {
        ...prev.pageConfigs,
        [state.activePage]: {
          ...prev.pageConfigs[state.activePage],
          columns: [...prev.pageConfigs[state.activePage].columns, ...newColumns]
        }
      }
    }));

    closeAllModals();
    setReturnToSettings(false);
    toast(`${newColumns.length} column(s) added to ${state.activePage}`);
  };

  const handleEditColumnClick = (col: Column) => {
    setEditingColumn(col);
    setReturnToSettings(true);
    toggleModal('activePageSettings', false);
    toggleModal('editColumn', true);
  };

  const handleSaveEditedColumn = (updatedCol: Column) => {
    setState(prev => {
      const currentCols = prev.pageConfigs[state.activePage].columns;
      const newCols = currentCols.map(c => c.key === updatedCol.key ? updatedCol : c);
      return {
        ...prev,
        pageConfigs: {
          ...prev.pageConfigs,
          [state.activePage]: {
            ...prev.pageConfigs[state.activePage],
            columns: newCols
          }
        }
      };
    });

    closeAllModals();
    setEditingColumn(null);
    setReturnToSettings(false);
    toast(`Column "${updatedCol.name}" updated successfully`);
  };

  const handleUpdateColumnPreview = (updatedCol: Column) => {
    setState(prev => {
      const currentCols = prev.pageConfigs[state.activePage].columns;
      const newCols = currentCols.map(c => c.key === updatedCol.key ? updatedCol : c);
      return {
        ...prev,
        pageConfigs: {
          ...prev.pageConfigs,
          [state.activePage]: {
            ...prev.pageConfigs[state.activePage],
            columns: newCols
          }
        }
      };
    });
  };

  const handleSaveRows = (newRows: RowData[], pageName?: string) => {
    const targetPage = pageName || state.activePage;
    setState(prev => {
      const currentRows = [...(prev.pageRows[targetPage] || [])];
      
      if (editingRowId) {
        const idx = currentRows.findIndex(r => r.id === editingRowId);
        if (idx >= 0) currentRows[idx] = newRows[0];
        else currentRows.push(newRows[0]);
      } else {
        currentRows.push(...newRows);
      }

      return {
        ...prev,
        pageRows: {
          ...prev.pageRows,
          [targetPage]: currentRows
        }
      };
    });
    toggleModal('addRow', false);
    setEditingRowId(null);
    if (returnToImagePreview) {
      toggleModal('imagePreview', true);
      setReturnToImagePreview(false);
    } else if (returnToSettings) {
      toggleModal('activePageSettings', true);
      setReturnToSettings(false);
    }
    toast(editingRowId ? 'Row updated successfully' : `${newRows.length} row(s) added successfully`);
  };

  const handleDeleteRow = (rowId: string, pageName?: string) => {
    const targetPage = pageName || state.activePage;
    setState(prev => ({
      ...prev,
      pageRows: {
        ...prev.pageRows,
        [targetPage]: prev.pageRows[targetPage].filter(r => r.id !== rowId)
      }
    }));
    setSelectedRowIds(prev => {
      const next = new Set(prev);
      next.delete(rowId);
      return next;
    });
    if (previewContext?.rowId === rowId) {
      setPreviewContext(null);
    }
    if (editingRowId === rowId) {
      setEditingRowId(null);
    }
    setHoveredImage(null);
    toast('Row deleted');
  };

  const handleReplaceImage = (newImage: any, pageName?: string) => {
    if (!previewContext) return;
    const targetPage = pageName || previewContext.sourcePage;
    setState(prev => {
      const currentRows = [...(prev.pageRows[targetPage] || [])];
      const idx = currentRows.findIndex(r => r.id === previewContext.rowId);
      if (idx >= 0) {
        currentRows[idx] = { ...currentRows[idx], [previewContext.imageKey]: newImage.data || newImage };
      }
      return {
        ...prev,
        pageRows: {
          ...prev.pageRows,
          [targetPage]: currentRows
        }
      };
    });
    toast('Image replaced successfully');
  };

  const handleDeleteImage = (rowId: string, imageKey: string, pageName?: string) => {
    const targetPage = pageName || previewContext?.sourcePage || state.activePage;
    setState(prev => {
      const currentRows = [...(prev.pageRows[targetPage] || [])];
      const idx = currentRows.findIndex(r => r.id === rowId);
      if (idx >= 0) {
        currentRows[idx] = { ...currentRows[idx], [imageKey]: '' };
      }
      return {
        ...prev,
        pageRows: {
          ...prev.pageRows,
          [targetPage]: currentRows
        }
      };
    });
    setPreviewContext(null);
    setHoveredImage(null);
    toast('Image deleted');
  };

  const sortRows = (rows: RowData[], columns: Column[]) => {
    const sortableColumns = columns
      .filter(c => c.sortEnabled && c.key !== 'sr')
      .sort((a, b) => (a.sortPriority || 0) - (b.sortPriority || 0));

    if (sortableColumns.length === 0) return rows;

    return [...rows].sort((a, b) => {
      for (const col of sortableColumns) {
        const key = col.key;
        let valA = a[key];
        let valB = b[key];

        if (valA === null || valA === undefined) valA = '';
        if (valB === null || valB === undefined) valB = '';

        let comparison = 0;
        if (col.type === 'number') {
          const numA = parseFloat(valA);
          const numB = parseFloat(valB);
          if (!isNaN(numA) && !isNaN(numB)) comparison = numA - numB;
          else if (isNaN(numA) && !isNaN(numB)) comparison = 1;
          else if (!isNaN(numA) && isNaN(numB)) comparison = -1;
          else comparison = 0;
        } else if (col.type === 'date') {
          const dateA = new Date(valA).getTime();
          const dateB = new Date(valB).getTime();
          if (!isNaN(dateA) && !isNaN(dateB)) comparison = dateA - dateB;
          else if (isNaN(dateA) && !isNaN(dateB)) comparison = 1;
          else if (!isNaN(dateA) && isNaN(dateB)) comparison = -1;
          else comparison = 0;
        } else {
          // Added .trim() to fix hidden spacing issues in sorting
          comparison = String(valA).trim().toLowerCase().localeCompare(String(valB).trim().toLowerCase());
        }

        if (comparison !== 0) {
          return col.sortDirection === 'asc' ? comparison : -comparison;
        }
      }
      return 0;
    });
  };

  const filteredRows = useMemo(() => {
    let rows = activeRows;
    if (currentSearch.trim()) {
      const tokens = currentSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
      rows = rows.filter(row => {
        const searchableValues = activeConfig.columns.map(col => {
          if (col.key === 'sr' || col.type === 'image' || col.type === 'file') return '';
          const val = row[col.key];
          if (Array.isArray(val)) return val.join(' ');
          if (val !== null && val !== undefined) return String(val);
          return '';
        });
        const blob = searchableValues.join(' ').toLowerCase();
        return tokens.every(t => blob.includes(t));
      });
    }
    return sortRows(rows, activeConfig.columns);
  }, [activeRows, currentSearch, activeConfig.columns]);

  const secondaryFilteredRows = useMemo(() => {
    if (!activeConfig.secondarySearchPage) return [];
    const secRows = state.pageRows[activeConfig.secondarySearchPage] || [];
    const secConfig = state.pageConfigs[activeConfig.secondarySearchPage];
    if (!secConfig) return [];
    
    let rows = secRows;
    if (secondarySearchQuery.trim()) {
      const tokens = secondarySearchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);
      rows = rows.filter(row => {
        const searchableValues = secConfig.columns.map(col => {
          if (col.key === 'sr' || col.type === 'image' || col.type === 'file') return '';
          const val = row[col.key];
          if (Array.isArray(val)) return val.join(' ');
          if (val !== null && val !== undefined) return String(val);
          return '';
        });
        const blob = searchableValues.join(' ').toLowerCase();
        return tokens.every(t => blob.includes(t));
      });
    }
    return sortRows(rows, secConfig.columns);
  }, [state.pageRows, state.pageConfigs, activeConfig.secondarySearchPage, secondarySearchQuery]);

  const highlightText = (txt: any, tokens: string[]) => {
    if (!tokens.length || !txt) return String(txt || '');
    const safe = String(txt);
    const escaped = tokens.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    const regex = new RegExp('(' + escaped.join('|') + ')', 'gi');
    const parts = safe.split(regex);
    return parts.map((part, i) => 
      regex.test(part) ? <span key={i} className="bg-yellow-300 text-black font-bold rounded-sm px-[1px]">{part}</span> : part
    );
  };

  const searchTokens = currentSearch.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const secondarySearchTokens = secondarySearchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

  const renderTable = (config: PageConfig, rows: RowData[], tokens: string[], isSecondary: boolean) => (
    <div className="flex-1 min-h-0 overflow-auto border-none rounded-none m-0 p-0">
      <DragDropContext onDragEnd={isSecondary ? () => {} : handleDragEnd}>
        <table 
          className="w-full border-collapse table-fixed text-[13px]"
          onMouseOver={handleTableMouseOver}
          onMouseOut={handleTableMouseOut}
        >
          <thead>
            <tr>
              {!isSecondary && config.rowReorderEnabled && (
                <th className={`sticky top-0 z-10 text-center p-1.5 border-r border-b border-[#e0e0e0] w-[60px] bg-[#f3f3f3] data-[hovered-col=true]:bg-[#fce7f3]`}>
                  <input 
                    type="checkbox" 
                    className="cursor-pointer"
                    checked={rows.length > 0 && selectedRowIds.size === rows.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedRowIds(new Set(rows.map(r => r.id)));
                      } else {
                        setSelectedRowIds(new Set());
                      }
                    }}
                  />
                </th>
              )}
              {config.columns.map((col, i) => {
                const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                const defaultWidthClass = col.key === 'sr' ? 'w-[100px] text-center' : col.type === 'image' ? 'w-[137px] text-center' : 'min-w-[130px] text-left';
                
                return (
                  <th 
                    key={col.key} 
                    className={`sticky top-0 z-10 text-[14px] font-['Arial'] font-bold text-[#2f3d49] p-1.5 border-r border-b border-[#e0e0e0] ${!col.width ? defaultWidthClass : (col.key === 'sr' || col.type === 'image' ? 'text-center' : 'text-left')} bg-[#f3f3f3] data-[hovered-col=true]:bg-[#fce7f3]`}
                    style={widthStyle}
                  >
                    <div className="flex items-center gap-1">
                      {i + 1}. {col.name} {col.sortPriority ? <span className="text-[10px] font-bold text-gray-500">(P{col.sortPriority})</span> : ''} {col.locked && '🔒'}
                      {col.sortEnabled && col.key !== 'sr' && (
                        <div className="flex items-center gap-0.5">
                          {col.sortDirection === 'desc' ? <ArrowDown size={12} className={col.sortLocked ? 'text-gray-400' : ''} /> : <ArrowUp size={12} className={col.sortLocked ? 'text-gray-400' : ''} />}
                          {col.sortLocked && <Lock size={12} className="text-gray-500" />}
                        </div>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <Droppable droppableId={`droppable-tbody-${isSecondary ? 'secondary' : 'primary'}`}>
            {(provided) => (
              <tbody ref={provided.innerRef} {...provided.droppableProps}>
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={config.columns.length + (!isSecondary && config.rowReorderEnabled ? 1 : 0)} className="text-center text-[#90a4ae] font-bold p-1.5 border-r border-b border-[#e0e0e0]">
                      {tokens.length > 0 ? 'No rows match your search.' : 'No row data yet.'}
                    </td>
                  </tr>
                ) : (
                  rows.map((row, rowIndex) => (
                    // @ts-ignore
                    <Draggable key={row.id} draggableId={`${isSecondary ? 'sec-' : ''}${row.id}`} index={rowIndex} isDragDisabled={isSecondary || !config.rowReorderEnabled || tokens.length > 0}>
                      {(provided, snapshot) => (
                        <tr 
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          className={`${!isSecondary && selectedRowIds.has(row.id) ? 'bg-[#e8f0fe]' : ''} ${snapshot.isDragging ? 'bg-[#e8f0fe] shadow-xl table' : ''}`}
                          style={{
                            ...provided.draggableProps.style,
                            ...(snapshot.isDragging && { display: 'table', tableLayout: 'fixed' }),
                            height: `${config.rowHeight || 100}px`
                          }}
                        >
                          {!isSecondary && config.rowReorderEnabled && (
                            <td 
                              className={`text-center p-1.5 border-r border-b border-[#e0e0e0] data-[hovered-col=true]:bg-[#f0f7ff] data-[hovered-row=true]:bg-[#e8f0fe] data-[hovered-exact=true]:!bg-[#d2e3fc] data-[hovered-exact=true]:outline data-[hovered-exact=true]:outline-[3px] data-[hovered-exact=true]:outline-[#2b579a] data-[hovered-exact=true]:relative data-[hovered-exact=true]:z-10 data-[hovered-exact=true]:shadow-inner`}
                            >
                              <div className="flex items-center justify-center gap-2">
                                <div {...provided.dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-700">
                                  <GripVertical size={16} />
                                </div>
                                <input 
                                  type="checkbox" 
                                  className="cursor-pointer"
                                  checked={selectedRowIds.has(row.id)}
                                  onChange={(e) => {
                                    const newSet = new Set(selectedRowIds);
                                    if (e.target.checked) newSet.add(row.id);
                                    else newSet.delete(row.id);
                                    setSelectedRowIds(newSet);
                                  }}
                                />
                              </div>
                            </td>
                          )}
                          {config.columns.map((col, colIndex) => {
                            const widthStyle = col.width ? { width: `${col.width}px`, minWidth: `${col.width}px` } : {};
                            const hoverClass = 'data-[hovered-col=true]:bg-[#f0f7ff] data-[hovered-row=true]:bg-[#e8f0fe] data-[hovered-exact=true]:!bg-[#d2e3fc] data-[hovered-exact=true]:outline data-[hovered-exact=true]:outline-[3px] data-[hovered-exact=true]:outline-[#2b579a] data-[hovered-exact=true]:relative data-[hovered-exact=true]:z-10 data-[hovered-exact=true]:shadow-inner';
                            
                            const commonProps = {
                              style: widthStyle
                            };

                            if (col.key === 'sr') {
                              const srWidthStyle = col.width ? widthStyle : { width: '100px', minWidth: '100px' };
                              return (
                                <td key={col.key} {...commonProps} style={{...commonProps.style, ...srWidthStyle}} className={`text-[14px] font-['Arial'] font-normal text-center p-1.5 border-r border-b border-[#e0e0e0] bg-[#f3f3f3] data-[hovered-row=true]:bg-[#fce7f3] overflow-hidden`}>
                                  <div className="flex items-center justify-center gap-2">
                                    <span>{rowIndex + 1}</span>
                                    <button className="border-0 bg-transparent cursor-pointer text-[13px] hover:scale-110 transition-transform" onClick={(e) => { 
                                      e.stopPropagation();
                                      setEditingRowId(row.id); 
                                      setEditingPageName(isSecondary ? activeConfig.secondarySearchPage! : state.activePage);
                                      toggleModal('addRow', true); 
                                    }}>✏️</button>
                                  </div>
                                </td>
                              );
                            }
                            
                            const rawVal = row[col.key];
                            
                            if (col.type === 'image') {
                              const imgData = typeof rawVal === 'object' && rawVal !== null ? rawVal.data : rawVal;
                              const isImg = typeof imgData === 'string' && (imgData.startsWith('data:image') || /^https?:\/\//i.test(imgData));
                              return (
                                <td 
                                  key={col.key} 
                                  {...commonProps} 
                                  className={`text-center p-0 border-r border-b border-[#e0e0e0] ${hoverClass} bg-white overflow-hidden text-[14px] font-['Arial'] font-normal`}
                                  style={{...commonProps.style, height: `${config.rowHeight || 100}px`}}
                                  onMouseMove={(e) => {
                                    if (isImg && config.hoverPreviewEnabled) {
                                      setHoveredImage({ url: imgData, x: e.clientX, y: e.clientY });
                                    }
                                  }}
                                  onMouseLeave={() => {
                                    setHoveredImage(null);
                                  }}
                                >
                                  {isImg ? (
                                    <img 
                                      src={imgData} 
                                      alt="img" 
                                      loading="lazy"
                                      className="w-full h-full object-contain cursor-pointer block"
                                      onClick={() => {
                                        setPreviewContext({ 
                                          rowId: row.id, 
                                          imageKey: col.key, 
                                          pageName: isSecondary ? activeConfig.secondarySearchPage! : state.activePage 
                                        });
                                        toggleModal('imagePreview', true);
                                      }}
                                    />
                                  ) : (
                                    <span className="w-full h-full inline-flex items-center justify-center text-[#9e9e9e] text-2xl bg-[#fafafa]">📷</span>
                                  )}
                                </td>
                              );
                            }

                            if (col.type === 'text_with_copy_button') {
                              const items = Array.isArray(rawVal) ? rawVal.map(v => String(v || '').trim()).filter(Boolean) : (String(rawVal || '').trim() ? [String(rawVal).trim()] : []);
                              const isCellActive = activePopupId?.startsWith(`${row.id}-${col.key}`);
                              const cellClass = isCellActive 
                                ? 'bg-[#fff3cd] shadow-[inset_0_0_0_2px_#fac800] relative z-10 transition-all'
                                : hoverClass;
                              
                              return (
                                <td key={col.key} {...commonProps} className={`p-1.5 border-r border-b border-[#e0e0e0] ${cellClass} overflow-hidden text-[14px] font-['Arial'] font-normal`}>
                                  {items.length > 0 && (
                                    <div className="flex flex-col gap-1">
                                      {items.map((item, i) => {
                                        const itemId = `${row.id}-${col.key}-${i}`;
                                        return (
                                          <div key={i} className="flex items-center justify-between gap-1.5 border border-[#d7e3f6] bg-[#f9fcff] rounded px-1.5 py-0.5 min-h-[25px]">
                                            <span>{highlightText(item, tokens)}</span>
                                            <button 
                                              className="border-0 rounded bg-[#2b579a] text-white px-1.5 py-0.5 text-[11px] font-bold cursor-pointer shrink-0"
                                              onClick={(e) => {
                                                const target = e.currentTarget;
                                                navigator.clipboard.writeText(item).then(() => {
                                                  setActivePopupId(itemId);
                                                  setActiveAnchor(target);
                                                  
                                                  if (state.globalCopyBoxes) {
                                                    const currentPage = isSecondary ? activeConfig.secondarySearchPage! : state.activePage;
                                                    if (state.globalCopyBoxes.box1.sourcePage === currentPage && state.globalCopyBoxes.box1.sourceColumn === col.key) {
                                                      setBox1Value(item);
                                                    }
                                                    if (state.globalCopyBoxes.box2.sourcePage === currentPage && state.globalCopyBoxes.box2.sourceColumn === col.key) {
                                                      setBox2Value(item);
                                                    }
                                                  }
                                                });
                                              }}
                                            >
                                              Copy
                                            </button>
                                            <CopyPopupNotification 
                                              text={item} 
                                              columnName={col.name} 
                                              columnNumber={colIndex + 1} 
                                              isActive={activePopupId === itemId}
                                              anchorElement={activeAnchor}
                                              onClose={handleClosePopup}
                                            />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </td>
                              );
                            }

                            if (Array.isArray(rawVal)) {
                              return (
                                <td key={col.key} {...commonProps} className={`p-1.5 border-r border-b border-[#e0e0e0] ${hoverClass} overflow-hidden text-[14px] font-['Arial'] font-normal`}>
                                  {rawVal.map((v, i) => <React.Fragment key={i}>{highlightText(v, tokens)}<br/></React.Fragment>)}
                                </td>
                              );
                            }

                            return (
                              <td key={col.key} {...commonProps} className={`p-1.5 border-r border-b border-[#e0e0e0] ${hoverClass} overflow-hidden text-[14px] font-['Arial'] font-normal`}>
                                {highlightText(rawVal, tokens)}
                              </td>
                            );
                          })}
                        </tr>
                      )}
                    </Draggable>
                  ))
                )}
                {provided.placeholder}
              </tbody>
            )}
          </Droppable>
        </table>
      </DragDropContext>
    </div>
  );

  const memoizedTableContent = useMemo(() => {
    const isSecondaryActive = activeSearchView === 'secondary' && !!(activeConfig.secondarySearchPage && state.pageConfigs[activeConfig.secondarySearchPage]);
    const displayConfig = isSecondaryActive ? state.pageConfigs[activeConfig.secondarySearchPage!] : activeConfig;
    const displayRows = isSecondaryActive ? secondaryFilteredRows : filteredRows;
    const displayTokens = isSecondaryActive ? secondarySearchTokens : searchTokens;
    
    return (
      <div className="w-full h-full flex flex-col text-[#333] text-left m-0 p-0">
        {isSecondaryActive && (
          <div className="bg-[#e8edf2] px-3 py-1.5 text-sm font-bold text-[#2b579a] border-y border-[#d8d8d8]">
            Viewing Secondary Data: {activeConfig.secondarySearchPage}
          </div>
        )}
        {renderTable(displayConfig, displayRows, displayTokens, isSecondaryActive)}
      </div>
    );
  }, [
    activeSearchView,
    activeConfig,
    state.pageConfigs,
    secondaryFilteredRows,
    filteredRows,
    secondarySearchTokens,
    searchTokens,
    selectedRowIds,
    activePopupId,
    activeAnchor,
    state.activePage
  ]);

  return (
    <div className="flex flex-col h-screen max-w-full mx-auto gap-2 p-2 bg-[#f4f7f6] text-[#333] font-sans box-border">
      <div className="flex justify-between items-center bg-white border border-[#d8d8d8] rounded-md p-2 px-2.5">
        <div className="text-[19px] font-bold text-[#2c3e50]">
          📦 Dynamic Inventory Platform <span className="text-[#217346] text-sm">(Pro Classic Visual)</span>
        </div>
        <div className="flex gap-1.5 flex-wrap items-center relative">
          <Button variant="dark" onClick={() => toggleModal('createPage', true)}><Plus size={14} /> Add Page</Button>
          <div className="relative inline-block" ref={settingsRef}>
            <Button variant="dark" onClick={() => setShowTopSettings(!showTopSettings)}><Settings size={14} /> Settings</Button>
            {showTopSettings && (
              <div className="absolute right-0 top-[calc(100%+6px)] w-[260px] bg-white border border-[#d7dde1] rounded-md shadow-xl p-2 z-15">
                <div className="text-[11px] font-bold text-[#607d8b] border-b border-[#eceff1] mb-2 pb-1.5 uppercase tracking-wide">Settings</div>
                <div className="text-xs text-[#607d8b] px-1 pb-2 font-bold">
                  Active Page: <span className="text-gray-800">{state.activePage || 'No page selected'}</span>
                </div>
                <button 
                  className="w-full text-left border-0 rounded bg-[#f4f6f8] text-[#263238] text-xs font-bold p-2 cursor-pointer hover:bg-[#e8edf2] disabled:opacity-55 disabled:cursor-not-allowed"
                  disabled={!state.activePage}
                  onClick={() => {
                    setShowTopSettings(false);
                    toggleModal('activePageSettings', true);
                  }}
                >
                  ⚙️ Active Page Settings {state.activePage ? `(${state.activePage})` : ''}
                </button>
                
                <div className="text-[11px] font-bold text-[#607d8b] border-b border-[#eceff1] mb-2 mt-3 pb-1.5 uppercase tracking-wide">Global Settings</div>
                <button 
                  className="w-full text-left border-0 rounded bg-[#f4f6f8] text-[#263238] text-xs font-bold p-2 cursor-pointer hover:bg-[#e8edf2] mb-1"
                  onClick={() => {
                    setShowTopSettings(false);
                    toggleModal('globalCopyBoxesSettings', true);
                  }}
                >
                  📦 Copy Boxes Settings
                </button>

                <div className="text-[11px] font-bold text-[#607d8b] border-b border-[#eceff1] mb-2 mt-3 pb-1.5 uppercase tracking-wide">Pages Reorder</div>
                <button 
                  className="w-full text-left border-0 rounded bg-[#f4f6f8] text-[#263238] text-xs font-bold p-2 cursor-pointer hover:bg-[#e8edf2] mb-1"
                  onClick={() => {
                    setShowTopSettings(false);
                    toggleModal('reorderPages', true);
                  }}
                >
                  🔄 Pages Reorder
                </button>

                <div className="text-[11px] font-bold text-[#607d8b] border-b border-[#eceff1] mb-2 mt-3 pb-1.5 uppercase tracking-wide">Data Backup</div>
                <button 
                  className="w-full text-left border-0 rounded bg-[#f4f6f8] text-[#263238] text-xs font-bold p-2 cursor-pointer hover:bg-[#e8edf2] mb-1"
                  onClick={() => {
                    setShowTopSettings(false);
                    handleExportData();
                  }}
                >
                  💾 Export Backup (JSON)
                </button>
                <button 
                  className="w-full text-left border-0 rounded bg-[#f4f6f8] text-[#263238] text-xs font-bold p-2 cursor-pointer hover:bg-[#e8edf2]"
                  onClick={() => {
                    setShowTopSettings(false);
                    // Add a small delay to allow the dropdown to close before clicking the input
                    setTimeout(() => {
                      fileInputRef.current?.click();
                    }, 50);
                  }}
                >
                  📂 Import Backup (JSON)
                </button>
              </div>
            )}
            <input 
              type="file" 
              accept=".json" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              onChange={handleImportData} 
            />
          </div>
        </div>
      </div>

      <div className="flex gap-1.5 flex-wrap items-center bg-white border border-[#d8d8d8] rounded-md p-2 min-h-[44px]">
        {state.pages.length === 0 ? (
          <span className="text-xs text-[#90a4ae] font-bold">No pages yet. Click Add Page to create one.</span>
        ) : (
          state.pages.map(page => (
            <button
              key={page}
              className={`border border-[#cfd8dc] rounded-full px-2.5 py-1 text-xs font-bold cursor-pointer transition-colors ${page === state.activePage ? 'bg-[#2b579a] text-white border-[#2b579a]' : 'bg-[#eceff1] text-[#37474f] hover:bg-gray-200'}`}
              onClick={() => {
                setState(prev => ({ ...prev, activePage: page }));
                toast(`Active page: ${page}`);
              }}
            >
              {page}
            </button>
          ))
        )}
      </div>

      {state.globalCopyBoxes && state.globalCopyBoxes.enabled !== false && (
        <GlobalCombinationCopyBoxes 
          settings={state.globalCopyBoxes} 
          box1Value={box1Value} 
          box2Value={box2Value} 
        />
      )}

      <div className="bg-white border border-[#d8d8d8] rounded-md p-2 flex gap-2">
        {(activeConfig.searchBarOrder || ['primary', 'secondary']).map((type) => {
          if (type === 'primary') {
            return (
              <div key="primary" className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 overflow-x-auto custom-scrollbar">
                  <Input 
                    ref={primaryInputRef}
                    className="border-2 border-[#217346] text-sm w-full" 
                    placeholder="" 
                    value={primarySearchInput}
                    onChange={handleSearchChange}
                    onFocus={() => setActiveSearchView('primary')}
                  />
                  {!primarySearchInput && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-[10px] pointer-events-none text-gray-400 text-sm whitespace-nowrap">
                      🔍 Search Data {state.activePage ? <>For "<strong>{state.activePage}</strong>"</> : ""}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleClearSearch} 
                    className="px-2 py-1 text-xs font-medium bg-[#f3f4f6] border border-gray-300 rounded hover:bg-gray-200 transition-colors text-[#217346]"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => primaryInputRef.current?.select()}
                    className="px-2 py-1 text-xs font-medium bg-[#f3f4f6] border border-gray-300 rounded hover:bg-gray-200 transition-colors text-[#217346]"
                  >
                    Select All
                  </button>
                </div>

                {/* Toast Notification */}
                {showUndoToast && !primarySearchInput && lastSearchQuery && (
                  <div className="absolute top-full mt-2 right-0 bg-[#2b579a] text-white text-[11px] font-medium px-3 py-1.5 rounded shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span>Tip: Press <b>Ctrl+Z</b> to undo</span>
                  </div>
                )}
              </div>
            );
          } else if (type === 'secondary' && activeConfig.secondarySearchPage) {
            return (
              <div key="secondary" className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 overflow-x-auto custom-scrollbar">
                  <Input 
                    ref={secondaryInputRef}
                    className="border-2 border-[#2b579a] text-sm w-full" 
                    placeholder="" 
                    value={secondarySearchInput}
                    onChange={e => {
                      setSecondarySearchInput(e.target.value);
                      setShowUndoToast(false);
                      if (e.target.value && (activeConfig.independentSearchBars === false)) setPrimarySearchInput('');
                    }}
                    onFocus={() => setActiveSearchView('secondary')}
                  />
                  {!secondarySearchInput && (
                    <div className="absolute inset-y-0 left-0 flex items-center pl-[10px] pointer-events-none text-gray-400 text-sm whitespace-nowrap">
                      🔍 Search Data For "<strong>{activeConfig.secondarySearchPage}</strong>" (Secondary Search)
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    onClick={handleClearSecondarySearch} 
                    className="px-2 py-1 text-xs font-medium bg-[#f3f4f6] border border-gray-300 rounded hover:bg-gray-200 transition-colors text-[#2b579a]"
                  >
                    Reset
                  </button>
                  <button 
                    onClick={() => secondaryInputRef.current?.select()}
                    className="px-2 py-1 text-xs font-medium bg-[#f3f4f6] border border-gray-300 rounded hover:bg-gray-200 transition-colors text-[#2b579a]"
                  >
                    Select All
                  </button>
                </div>

                {/* Toast Notification for Secondary Search */}
                {showUndoToast && !secondarySearchInput && lastSecondarySearchQuery && (
                  <div className="absolute top-full mt-2 right-0 bg-[#2b579a] text-white text-[11px] font-medium px-3 py-1.5 rounded shadow-lg z-50 flex items-center gap-2 animate-in fade-in slide-in-from-top-2 duration-300">
                    <span>Tip: Press <b>Ctrl+Z</b> to undo</span>
                  </div>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>

      <div className="flex-1 min-h-[260px] overflow-auto border border-gray-400 rounded-md bg-white flex flex-col">
        {!state.activePage ? (
          <div className="flex-1 flex items-center justify-center text-[#90a4ae] text-base font-bold text-center p-5 flex-col">
            Blank Workspace Area<br/>
            <span className="text-xs font-semibold text-[#b0bec5]">(search bar intentionally kept as requested)</span>
          </div>
        ) : memoizedTableContent}
      </div>

      <CreatePageModal 
        isOpen={modals.createPage} 
        onClose={closeAllModals} 
        onCreate={handleCreatePage} 
        existingPages={state.pages} 
      />
      
      <AddRowModal 
        isOpen={modals.addRow} 
        onClose={closeAllModals} 
        onBack={returnToImagePreview ? () => {
          closeAllModals();
          toggleModal('imagePreview', true);
        } : (returnToSettings ? () => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        } : undefined)}
        backText={returnToImagePreview ? "Back to Image Preview" : "Back to Active Page Settings"}
        onSave={(rows) => handleSaveRows(rows, previewContext?.pageName || editingPageName || undefined)} 
        onDelete={(id) => {
          setConfirmationModal({
            isOpen: true,
            title: "Confirm Deletion",
            message: "Are you sure you want to delete this row? This action cannot be undone.",
            onConfirm: () => {
              handleDeleteRow(id, previewContext?.pageName || editingPageName || undefined);
              closeAllModals();
            }
          });
        }}
        columns={previewContext ? state.pageConfigs[previewContext.pageName].columns : (editingPageName ? state.pageConfigs[editingPageName].columns : activeConfig.columns)} 
        editingRow={editingRowId ? (state.pageRows[previewContext?.pageName || editingPageName || state.activePage] || []).find(r => r.id === editingRowId) || null : null} 
        editingRowIndex={editingRowId ? (state.pageRows[previewContext?.pageName || editingPageName || state.activePage] || []).findIndex(r => r.id === editingRowId) : -1}
        activePage={previewContext?.pageName || editingPageName || state.activePage} 
        onToggleMagicPasteColumn={handleToggleMagicPasteColumn}
        setConfirmationModal={setConfirmationModal}
      />

      <ActivePageSettingsModal 
        isOpen={modals.activePageSettings} 
        onClose={closeAllModals} 
        activePage={state.activePage} 
        pageConfig={state.activePage ? activeConfig : null} 
        onSave={handleSaveActivePageSettings} 
        onRenamePage={() => { setReturnToSettings(true); toggleModal('activePageSettings', false); toggleModal('renamePage', true); }} 
        onCreateColumn={() => { setReturnToSettings(true); toggleModal('activePageSettings', false); toggleModal('createColumn', true); }} 
        onAddRow={() => { setReturnToSettings(true); toggleModal('activePageSettings', false); toggleModal('addRow', true); }} 
        onEditColumn={handleEditColumnClick}
        onDeletePage={handleDeletePage}
        onReorderSearchBars={() => {
          setReturnToSettings(true);
          toggleModal('activePageSettings', false);
          toggleModal('reorderSearchBars', true);
        }}
        onImportExcel={() => {
          setReturnToSettings(true);
          toggleModal('activePageSettings', false);
          toggleModal('excelImport', true);
        }}
        onExportExcel={() => {
          setReturnToSettings(true);
          toggleModal('activePageSettings', false);
          toggleModal('excelExport', true);
        }}
        onFindDuplicates={() => {
          setReturnToSettings(true);
          toggleModal('activePageSettings', false);
          setIsDupModalOpen(true);
        }}
        existingPages={state.pages}
        setConfirmationModal={setConfirmationModal}
      />

      <RenamePageModal 
        isOpen={modals.renamePage} 
        onClose={closeAllModals} 
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        }}
        activePage={state.activePage} 
        onRename={handleRenamePage} 
        existingPages={state.pages} 
      />

      <CreateColumnModal 
        isOpen={modals.createColumn} 
        onClose={closeAllModals} 
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        }}
        onSave={handleCreateColumns} 
        existingColumns={activeConfig.columns} 
      />

      <EditColumnModal 
        isOpen={modals.editColumn} 
        onClose={closeAllModals} 
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        }}
        onSave={handleSaveEditedColumn} 
        onUpdate={handleUpdateColumnPreview}
        column={editingColumn} 
        existingColumns={activeConfig.columns} 
        setConfirmationModal={setConfirmationModal}
      />

      {/* ConfirmationModal is now global */}

      <ConfirmationModal
        isOpen={!!confirmationModal?.isOpen}
        onClose={() => setConfirmationModal(null)}
        onConfirm={() => {
          if (confirmationModal?.onConfirm) {
            confirmationModal.onConfirm();
          }
          setConfirmationModal(null);
        }}
        title={confirmationModal?.title}
        message={confirmationModal?.message}
        confirmLabel={confirmationModal?.confirmLabel}
      />

      <ImagePreviewModal 
        isOpen={modals.imagePreview} 
        onClose={closeAllModals} 
        row={previewContext ? (state.pageRows[previewContext.pageName] || []).find(r => r.id === previewContext.rowId) || null : null} 
        imageColKey={previewContext?.imageKey || ''} 
        columns={previewContext ? state.pageConfigs[previewContext.pageName].columns : activeConfig.columns} 
        rowIndex={previewContext ? (state.pageRows[previewContext.pageName] || []).findIndex(r => r.id === previewContext.rowId) : -1} 
        onEditRow={() => { 
          setReturnToImagePreview(true);
          toggleModal('imagePreview', false); 
          setEditingRowId(previewContext?.rowId || null); 
          setEditingPageName(previewContext?.pageName || null);
          toggleModal('addRow', true); 
        }} 
        onReplaceImage={(newImage) => handleReplaceImage(newImage, previewContext?.pageName)}
        onDeleteImage={(rowId, imageKey) => handleDeleteImage(rowId, imageKey, previewContext?.pageName)}
        activePopupId={activePopupId}
        setActivePopupId={setActivePopupId}
        activeAnchor={activeAnchor}
        setActiveAnchor={setActiveAnchor}
        pageName={previewContext?.pageName || state.activePage}
        onCopy={(item, colKey, pageName) => {
          if (state.globalCopyBoxes) {
            if (state.globalCopyBoxes.box1.sourcePage === pageName && state.globalCopyBoxes.box1.sourceColumn === colKey) {
              setBox1Value(item);
            }
            if (state.globalCopyBoxes.box2.sourcePage === pageName && state.globalCopyBoxes.box2.sourceColumn === colKey) {
              setBox2Value(item);
            }
          }
        }}
      />

      <ReorderPagesModal 
        isOpen={modals.reorderPages}
        onClose={closeAllModals}
        pages={state.pages}
        onReorder={(newPages) => {
          setState(prev => ({ ...prev, pages: newPages }));
        }}
      />

      <ReorderSearchBarsModal 
        isOpen={modals.reorderSearchBars}
        onClose={() => {
          closeAllModals();
          setReturnToSettings(false);
        }}
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
          setReturnToSettings(false);
        }}
        order={activeConfig.searchBarOrder || ['primary', 'secondary']}
        activePageName={state.activePage}
        secondaryPageName={activeConfig.secondarySearchPage || ''}
        onReorder={(newOrder) => {
          setState(prev => ({
            ...prev,
            pageConfigs: {
              ...prev.pageConfigs,
              [state.activePage]: {
                ...prev.pageConfigs[state.activePage],
                searchBarOrder: newOrder
              }
            }
          }));
        }}
      />

      <ExcelImportModal
        isOpen={modals.excelImport}
        onClose={closeAllModals}
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        }}
        existingColumns={activeConfig.columns}
        existingRows={activeRows}
        importRows={excelImportData.rows}
        setImportRows={(rows) => setExcelImportData(prev => ({ ...prev, rows }))}
        headers={excelImportData.headers}
        setHeaders={(headers) => setExcelImportData(prev => ({ ...prev, headers }))}
        onImport={(newRows, newColumns) => {
          setState(prev => {
            const currentCols = prev.pageConfigs[state.activePage].columns;
            const updatedCols = [...currentCols, ...newColumns];
            
            return {
              ...prev,
              pageConfigs: {
                ...prev.pageConfigs,
                [state.activePage]: {
                  ...prev.pageConfigs[state.activePage],
                  columns: updatedCols
                }
              },
              pageRows: {
                ...prev.pageRows,
                [state.activePage]: [...(prev.pageRows[state.activePage] || []), ...newRows]
              }
            };
          });
        }}
      />

      <ExcelExportModal
        isOpen={modals.excelExport}
        onClose={closeAllModals}
        onBack={() => {
          closeAllModals();
          toggleModal('activePageSettings', true);
        }}
        pageName={state.activePage}
        columns={activeConfig.columns}
        rows={activeRows}
      />

      <GlobalCopyBoxesSettingsModal
        isOpen={modals.globalCopyBoxesSettings}
        onClose={closeAllModals}
        state={state}
        onSave={(settings) => {
          setState(prev => ({ ...prev, globalCopyBoxes: settings }));
          toast('Copy Boxes Settings saved');
        }}
      />

      <DuplicateFinderModal 
        isOpen={isDupModalOpen} 
        onClose={() => {
          setIsDupModalOpen(false);
          setReturnToSettings(false);
        }} 
        onBack={() => {
          setIsDupModalOpen(false);
          toggleModal('activePageSettings', true);
        }}
        rows={activeRows}
        columns={activeConfig.columns}
        onDeleteRow={(rowId) => handleDeleteRow(rowId)} 
      />

      {hoveredImage && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none bg-white p-1 rounded-lg shadow-2xl border border-gray-200"
          style={{
            left: hoveredImage.x + 20,
            top: Math.min(hoveredImage.y - 100, window.innerHeight - 320),
            width: '350px',
            height: '350px'
          }}
        >
          <img 
            src={hoveredImage.url} 
            alt="Hover Preview" 
            className="w-full h-full object-contain"
          />
        </div>,
        document.body
      )}
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
