import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Type, Square, Circle, Trash2, 
  ChevronLeft, ChevronRight, Plus, Play, Save,
  Move, Undo2, Redo2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SlideItem, CanvasElement } from '@/types/content';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface CanvasEditorProps {
  onSave?: (slides: SlideItem[]) => void;
  onCreateVideo?: (slides: SlideItem[]) => void;
  initialSlides?: SlideItem[];
}

const FONTS = [
  { value: 'Inter, sans-serif', label: 'Inter' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: '"Courier New", monospace', label: 'Courier' },
];

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'e' | 'w' | null;

export function CanvasEditor({ onSave, onCreateVideo, initialSlides }: CanvasEditorProps) {
  const [slides, setSlides] = useState<SlideItem[]>(
    initialSlides || [{ id: '1', elements: [], backgroundColor: '#ffffff' }]
  );
  
  // Update slides when initialSlides changes
  useEffect(() => {
    if (initialSlides && initialSlides.length > 0) {
      setSlides(initialSlides);
      setCurrentSlideIndex(0);
      setHistory([JSON.parse(JSON.stringify(initialSlides))]);
      setHistoryIndex(0);
    }
  }, [initialSlides]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<'select' | 'text' | 'rectangle' | 'circle'>('select');
  const [textInput, setTextInput] = useState('');
  const [selectedColor, setSelectedColor] = useState('#000000');
  const [selectedFont, setSelectedFont] = useState('Inter, sans-serif');
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0, elemX: 0, elemY: 0, fontSize: 24 });
  const [isPlacingText, setIsPlacingText] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  
  // Undo/Redo history
  const [history, setHistory] = useState<SlideItem[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);

  // Save state to history
  const saveToHistory = useCallback((newSlides: SlideItem[]) => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newSlides)));
      return newHistory.slice(-50); // Keep last 50 states
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevState = history[historyIndex - 1];
      setSlides(JSON.parse(JSON.stringify(prevState)));
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[historyIndex + 1];
      setSlides(JSON.parse(JSON.stringify(nextState)));
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Initialize history
  useEffect(() => {
    if (history.length === 0) {
      setHistory([JSON.parse(JSON.stringify(slides))]);
      setHistoryIndex(0);
    }
  }, []);

  const currentSlide = slides[currentSlideIndex];
  const selectedEl = currentSlide.elements.find(el => el.id === selectedElement);

  const addElementAtPosition = (x: number, y: number) => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'text',
      x,
      y,
      width: 200,
      height: 40,
      color: selectedColor,
      content: 'Enter text',
      fontSize: 24,
      fontFamily: selectedFont,
    };

    setSlides(prev => {
      const newSlides = prev.map((slide, index) => 
        index === currentSlideIndex 
          ? { ...slide, elements: [...slide.elements, newElement] }
          : slide
      );
      saveToHistory(newSlides);
      return newSlides;
    });
    setSelectedElement(newElement.id);
    setIsPlacingText(false);
    setActiveTool('select');
    toast.success('Text added - edit in properties panel');
  };

  const addShapeElement = (shapeType: CanvasElement['shapeType']) => {
    const newElement: CanvasElement = {
      id: Date.now().toString(),
      type: 'shape',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      color: selectedColor,
      shapeType,
    };

    setSlides(prev => {
      const newSlides = prev.map((slide, index) => 
        index === currentSlideIndex 
          ? { ...slide, elements: [...slide.elements, newElement] }
          : slide
      );
      saveToHistory(newSlides);
      return newSlides;
    });
    setSelectedElement(newElement.id);
    toast.success('Element added');
  };

  const updateElement = (id: string, updates: Partial<CanvasElement>, saveHistory = false) => {
    setSlides(prev => {
      const newSlides = prev.map((slide, index) => 
        index === currentSlideIndex 
          ? { 
              ...slide, 
              elements: slide.elements.map(el => 
                el.id === id ? { ...el, ...updates } : el
              ) 
            }
          : slide
      );
      if (saveHistory) saveToHistory(newSlides);
      return newSlides;
    });
  };

  const deleteElement = () => {
    if (!selectedElement) return;
    
    setSlides(prev => {
      const newSlides = prev.map((slide, index) => 
        index === currentSlideIndex 
          ? { ...slide, elements: slide.elements.filter(el => el.id !== selectedElement) }
          : slide
      );
      saveToHistory(newSlides);
      return newSlides;
    });
    setSelectedElement(null);
    toast.success('Element deleted');
  };

  const addSlide = () => {
    const newSlide: SlideItem = {
      id: Date.now().toString(),
      elements: [],
      backgroundColor: '#ffffff'
    };
    setSlides(prev => [...prev, newSlide]);
    setCurrentSlideIndex(slides.length);
    toast.success('New slide added');
  };

  const handleSave = () => {
    onSave?.(slides);
    toast.success('Slides saved successfully');
  };

  const handleCreateVideo = () => {
    onCreateVideo?.(slides);
    toast.success('Video creation started');
  };

  const handleMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setIsDragging(true);
    const element = currentSlide.elements.find(el => el.id === elementId);
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left - element.x,
        y: e.clientY - rect.top - element.y
      });
    }
  };

  const handleResizeStart = (e: React.MouseEvent, elementId: string, direction: ResizeDirection) => {
    e.stopPropagation();
    setSelectedElement(elementId);
    setIsResizing(true);
    setResizeDirection(direction);
    const element = currentSlide.elements.find(el => el.id === elementId);
    if (element && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      setResizeStart({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
        width: element.width,
        height: element.height,
        elemX: element.x,
        elemY: element.y,
        fontSize: element.fontSize || 24,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();

    if (isDragging && selectedElement) {
      const newX = Math.max(0, Math.min(e.clientX - rect.left - dragOffset.x, 960 - (selectedEl?.width || 100)));
      const newY = Math.max(0, Math.min(e.clientY - rect.top - dragOffset.y, 540 - (selectedEl?.height || 100)));
      updateElement(selectedElement, { x: newX, y: newY });
    }

    if (isResizing && selectedElement && selectedEl && resizeDirection) {
      const currentX = e.clientX - rect.left;
      const currentY = e.clientY - rect.top;
      const deltaX = currentX - resizeStart.x;
      const deltaY = currentY - resizeStart.y;

      let newWidth = resizeStart.width;
      let newHeight = resizeStart.height;
      let newX = resizeStart.elemX;
      let newY = resizeStart.elemY;

      // Handle horizontal resizing
      if (resizeDirection.includes('e')) {
        newWidth = Math.max(20, resizeStart.width + deltaX);
      }
      if (resizeDirection.includes('w')) {
        newWidth = Math.max(20, resizeStart.width - deltaX);
        newX = resizeStart.elemX + (resizeStart.width - newWidth);
      }

      // Handle vertical resizing
      if (resizeDirection.includes('s')) {
        newHeight = Math.max(20, resizeStart.height + deltaY);
      }
      if (resizeDirection.includes('n')) {
        newHeight = Math.max(20, resizeStart.height - deltaY);
        newY = resizeStart.elemY + (resizeStart.height - newHeight);
      }

      // For text elements, also update fontSize proportionally based on ORIGINAL size
      if (selectedEl.type === 'text') {
        const scale = newHeight / resizeStart.height;
        const newFontSize = Math.max(8, Math.round(resizeStart.fontSize * scale));
        updateElement(selectedElement, { 
          width: newWidth, 
          height: newHeight, 
          x: newX, 
          y: newY,
          fontSize: newFontSize
        });
      } else {
        updateElement(selectedElement, { width: newWidth, height: newHeight, x: newX, y: newY });
      }
    }
  };

  const handleMouseUp = () => {
    // Save to history after drag/resize ends
    if ((isDragging || isResizing) && selectedElement) {
      saveToHistory(slides);
    }
    setIsDragging(false);
    setIsResizing(false);
    setResizeDirection(null);
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (isPlacingText && canvasRef.current) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      addElementAtPosition(x, y);
    } else {
      setSelectedElement(null);
    }
  };

  const handleTextToolClick = () => {
    setActiveTool('text');
    setIsPlacingText(true);
  };

  const getCursorForDirection = (dir: ResizeDirection) => {
    switch (dir) {
      case 'nw': return 'cursor-nw-resize';
      case 'ne': return 'cursor-ne-resize';
      case 'sw': return 'cursor-sw-resize';
      case 'se': return 'cursor-se-resize';
      case 'n': return 'cursor-n-resize';
      case 's': return 'cursor-s-resize';
      case 'e': return 'cursor-e-resize';
      case 'w': return 'cursor-w-resize';
      default: return 'cursor-pointer';
    }
  };

  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-3 border-b border-border bg-background flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            variant={activeTool === 'select' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => { setActiveTool('select'); setIsPlacingText(false); }}
          >
            <Move className="w-4 h-4 mr-1" />
            Select
          </Button>
          <Button 
            variant={activeTool === 'text' ? 'default' : 'ghost'} 
            size="sm"
            onClick={handleTextToolClick}
          >
            <Type className="w-4 h-4 mr-1" />
            Text
          </Button>
          <Button 
            variant={activeTool === 'rectangle' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => { setActiveTool('rectangle'); setIsPlacingText(false); addShapeElement('rectangle'); }}
          >
            <Square className="w-4 h-4 mr-1" />
            Rectangle
          </Button>
          <Button 
            variant={activeTool === 'circle' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => { setActiveTool('circle'); setIsPlacingText(false); addShapeElement('circle'); }}
          >
            <Circle className="w-4 h-4 mr-1" />
            Circle
          </Button>
          {/* Color picker right next to Circle */}
          <div className="flex items-center gap-1 ml-1">
            <input 
              type="color" 
              value={selectedColor}
              onChange={(e) => {
                setSelectedColor(e.target.value);
                if (selectedElement) {
                  updateElement(selectedElement, { color: e.target.value });
                }
              }}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={undo}
            disabled={historyIndex <= 0}
            title="Undo"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          {selectedElement && (
            <Button variant="destructive" size="sm" onClick={deleteElement}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>


      {/* Element Properties Panel - Always visible to prevent layout shift */}
      <div className="min-h-14 flex items-center gap-4 px-3 py-2 bg-muted/50 border-b border-border">
        {selectedEl ? (
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label className="text-xs">W</Label>
              <Input 
                type="number"
                value={selectedEl.width}
                onChange={(e) => updateElement(selectedEl.id, { width: Number(e.target.value) })}
                className="w-16 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">H</Label>
              <Input 
                type="number"
                value={selectedEl.height}
                onChange={(e) => updateElement(selectedEl.id, { height: Number(e.target.value) })}
                className="w-16 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">X</Label>
              <Input 
                type="number"
                value={Math.round(selectedEl.x)}
                onChange={(e) => updateElement(selectedEl.id, { x: Number(e.target.value) })}
                className="w-16 h-8"
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">Y</Label>
              <Input 
                type="number"
                value={Math.round(selectedEl.y)}
                onChange={(e) => updateElement(selectedEl.id, { y: Number(e.target.value) })}
                className="w-16 h-8"
              />
            </div>
            {selectedEl.type === 'text' && (
              <>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Text</Label>
                  <Input 
                    value={selectedEl.content || ''}
                    onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                    className="w-32 h-8"
                    placeholder="Enter text"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Size</Label>
                  <Input 
                    type="number"
                    value={selectedEl.fontSize || 24}
                    onChange={(e) => updateElement(selectedEl.id, { fontSize: Number(e.target.value) })}
                    className="w-16 h-8"
                  />
                </div>
                <Select 
                  value={selectedEl.fontFamily || 'Inter, sans-serif'} 
                  onValueChange={(v) => updateElement(selectedEl.id, { fontFamily: v })}
                >
                  <SelectTrigger className="w-32 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FONTS.map((font) => (
                      <SelectItem key={font.value} value={font.value}>
                        <span style={{ fontFamily: font.value }}>{font.label}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">Select an element to edit properties</span>
        )}
      </div>

      {/* Canvas Area */}
      <div className="p-4 bg-muted overflow-auto">
        <div 
          ref={canvasRef}
          className={`mx-auto bg-background rounded-lg shadow-lg relative ${isPlacingText ? 'cursor-crosshair' : 'cursor-default'}`}
          style={{ 
            width: '960px', 
            height: '540px',
            backgroundColor: currentSlide.backgroundColor 
          }}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {currentSlide.elements.map((element) => (
            <div
              key={element.id}
              className={`absolute cursor-move ${selectedElement === element.id ? 'outline outline-2 outline-primary' : ''}`}
              style={{
                left: element.x,
                top: element.y,
                width: element.width,
                height: element.height,
              }}
              onMouseDown={(e) => handleMouseDown(e, element.id)}
              onClick={(e) => e.stopPropagation()}
            >
              {element.type === 'text' && (
                <div 
                  contentEditable
                  suppressContentEditableWarning
                  onMouseDown={(e) => {
                    // Allow text selection within the element
                    if (selectedElement === element.id) {
                      e.stopPropagation();
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (selectedElement === element.id) {
                      (e.target as HTMLElement).focus();
                    }
                  }}
                  onDoubleClick={(e) => {
                    e.stopPropagation();
                    (e.target as HTMLElement).focus();
                  }}
                  onInput={(e) => {
                    const newContent = (e.target as HTMLElement).innerText;
                    updateElement(element.id, { content: newContent });
                  }}
                  onBlur={(e) => {
                    const newContent = (e.target as HTMLElement).innerText;
                    if (newContent !== element.content) {
                      updateElement(element.id, { content: newContent }, true);
                    }
                  }}
                  onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === 'Escape') {
                      (e.target as HTMLElement).blur();
                    }
                  }}
                  style={{ 
                    color: element.color, 
                    fontSize: element.fontSize,
                    fontFamily: element.fontFamily || 'Inter, sans-serif',
                    fontWeight: 'bold',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    overflow: 'hidden',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    outline: 'none',
                    cursor: selectedElement === element.id ? 'text' : 'move',
                    userSelect: selectedElement === element.id ? 'text' : 'none',
                  }}
                  dangerouslySetInnerHTML={{ __html: element.content || '' }}
                />
              )}
              {element.type === 'shape' && element.shapeType === 'rectangle' && (
                <div 
                  className="w-full h-full"
                  style={{ backgroundColor: element.color }}
                />
              )}
              {element.type === 'shape' && element.shapeType === 'circle' && (
                <div 
                  className="w-full h-full rounded-full"
                  style={{ backgroundColor: element.color }}
                />
              )}
              {/* Resize handles - all 8 directions */}
              {selectedElement === element.id && (
                <>
                  {/* Corner handles */}
                  <div 
                    className={`absolute -left-1.5 -top-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('nw')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'nw')}
                  />
                  <div 
                    className={`absolute -right-1.5 -top-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('ne')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'ne')}
                  />
                  <div 
                    className={`absolute -left-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('sw')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'sw')}
                  />
                  <div 
                    className={`absolute -right-1.5 -bottom-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('se')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'se')}
                  />
                  {/* Edge handles */}
                  <div 
                    className={`absolute left-1/2 -translate-x-1/2 -top-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('n')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'n')}
                  />
                  <div 
                    className={`absolute left-1/2 -translate-x-1/2 -bottom-1.5 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('s')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 's')}
                  />
                  <div 
                    className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('w')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'w')}
                  />
                  <div 
                    className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-sm border border-background ${getCursorForDirection('e')}`}
                    onMouseDown={(e) => handleResizeStart(e, element.id, 'e')}
                  />
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Slide Navigation */}
      <div className="p-3 border-t border-border bg-background">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
              disabled={currentSlideIndex === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {currentSlideIndex + 1} / {slides.length}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setCurrentSlideIndex(Math.min(slides.length - 1, currentSlideIndex + 1))}
              disabled={currentSlideIndex === slides.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={addSlide}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleSave}>
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            <Button size="sm" onClick={handleCreateVideo} className="btn-hero">
              <Play className="w-4 h-4 mr-1" />
              Create Video
            </Button>
          </div>
        </div>

        {/* Slide Thumbnails with Preview */}
        <div className="flex items-center gap-2 mt-3 overflow-x-auto pb-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              className={`w-20 h-12 rounded border-2 flex-shrink-0 relative overflow-hidden ${
                index === currentSlideIndex ? 'border-primary' : 'border-border'
              }`}
              style={{ backgroundColor: slide.backgroundColor }}
              onClick={() => setCurrentSlideIndex(index)}
            >
              {/* Mini preview of elements */}
              {slide.elements.map((el) => (
                <div
                  key={el.id}
                  className="absolute"
                  style={{
                    left: `${(el.x / 960) * 100}%`,
                    top: `${(el.y / 540) * 100}%`,
                    width: `${(el.width / 960) * 100}%`,
                    height: `${(el.height / 540) * 100}%`,
                  }}
                >
                  {el.type === 'text' && (
                    <div 
                      style={{ 
                        color: el.color, 
                        fontSize: '4px',
                        fontFamily: el.fontFamily,
                        overflow: 'hidden',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {el.content}
                    </div>
                  )}
                  {el.type === 'shape' && el.shapeType === 'rectangle' && (
                    <div className="w-full h-full" style={{ backgroundColor: el.color }} />
                  )}
                  {el.type === 'shape' && el.shapeType === 'circle' && (
                    <div className="w-full h-full rounded-full" style={{ backgroundColor: el.color }} />
                  )}
                </div>
              ))}
              {slide.elements.length === 0 && (
                <span className="absolute inset-0 flex items-center justify-center text-xs text-muted-foreground">
                  {index + 1}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
