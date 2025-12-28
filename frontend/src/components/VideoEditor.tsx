import { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Play, Pause, Type, Scissors, 
  Download, Save, Volume2, VolumeX, Upload, Trash2, Plus,
  Move, RotateCw, Smile, SunDim, Merge, Undo2, Redo2, GripVertical
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  color: string;
  fontSize: number;
}

interface FreeText {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  rotation: number;
  scale: number;
}

interface Sticker {
  id: string;
  emoji: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

interface VideoClip {
  id: string;
  file: File;
  startTime: number;
  endTime: number;
  url: string;
  thumbnail?: string;
}

interface ColorFilters {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
}

interface EditorState {
  clips: VideoClip[];
  subtitles: Subtitle[];
  freeTexts: FreeText[];
  stickers: Sticker[];
  filters: ColorFilters;
}

interface VideoEditorProps {
  videoFile?: File;
  onSave?: (editData: { subtitles: Subtitle[]; clips: VideoClip[]; freeTexts: FreeText[]; stickers: Sticker[]; filters: ColorFilters }, videoFile?: File, thumbnail?: string) => void;
  onFileSelect?: (file: File) => void;
  initialEditData?: {
    clips?: any[];
    subtitles?: any[];
    freeTexts?: any[];
    stickers?: any[];
    filters?: any;
  };
}

const EMOJIS = ['😀', '😎', '🔥', '❤️', '⭐', '🎉', '👍', '✨', '💯', '🎬', '📷', '🎵', '🚀', '💡', '🏆'];

export function VideoEditor({ videoFile, onSave, onFileSelect, initialEditData }: VideoEditorProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [newSubtitle, setNewSubtitle] = useState('');
  const [subtitleColor, setSubtitleColor] = useState('#ffffff');
  const [subtitleFontSize, setSubtitleFontSize] = useState(24);
  const [clips, setClips] = useState<VideoClip[]>([]);
  const [activeClipIndex, setActiveClipIndex] = useState(0);
  const [selectedClipIds, setSelectedClipIds] = useState<string[]>([]);
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(0);
  
  // Free text & stickers
  const [freeTexts, setFreeTexts] = useState<FreeText[]>([]);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [newFreeText, setNewFreeText] = useState('');
  const [freeTextColor, setFreeTextColor] = useState('#ffffff');
  const [freeTextFontSize, setFreeTextFontSize] = useState(32);
  const [selectedFreeText, setSelectedFreeText] = useState<string | null>(null);
  const [selectedSticker, setSelectedSticker] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Clip dragging for reorder
  const [draggingClipId, setDraggingClipId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  
  // Color filters
  const [filters, setFilters] = useState<ColorFilters>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
  });
  
  // Undo/Redo history
  const [history, setHistory] = useState<EditorState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const isUndoRedoAction = useRef(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  // Save state to history
  const saveToHistory = useCallback(() => {
    if (isUndoRedoAction.current) {
      isUndoRedoAction.current = false;
      return;
    }
    const state: EditorState = {
      clips: JSON.parse(JSON.stringify(clips)),
      subtitles: JSON.parse(JSON.stringify(subtitles)),
      freeTexts: JSON.parse(JSON.stringify(freeTexts)),
      stickers: JSON.parse(JSON.stringify(stickers)),
      filters: { ...filters },
    };
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(state);
      return newHistory.slice(-50);
    });
    setHistoryIndex(prev => Math.min(prev + 1, 49));
  }, [clips, subtitles, freeTexts, stickers, filters, historyIndex]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      isUndoRedoAction.current = true;
      const prevState = history[historyIndex - 1];
      setClips(JSON.parse(JSON.stringify(prevState.clips)));
      setSubtitles(JSON.parse(JSON.stringify(prevState.subtitles)));
      setFreeTexts(JSON.parse(JSON.stringify(prevState.freeTexts)));
      setStickers(JSON.parse(JSON.stringify(prevState.stickers)));
      setFilters({ ...prevState.filters });
      setHistoryIndex(prev => prev - 1);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const nextState = history[historyIndex + 1];
      setClips(JSON.parse(JSON.stringify(nextState.clips)));
      setSubtitles(JSON.parse(JSON.stringify(nextState.subtitles)));
      setFreeTexts(JSON.parse(JSON.stringify(nextState.freeTexts)));
      setStickers(JSON.parse(JSON.stringify(nextState.stickers)));
      setFilters({ ...nextState.filters });
      setHistoryIndex(prev => prev + 1);
    }
  }, [history, historyIndex]);

  // Initialize history when clips are loaded
  useEffect(() => {
    if (clips.length > 0 && history.length === 0) {
      const initialState: EditorState = {
        clips: JSON.parse(JSON.stringify(clips)),
        subtitles: [],
        freeTexts: [],
        stickers: [],
        filters: { brightness: 100, contrast: 100, saturation: 100, hue: 0 },
      };
      setHistory([initialState]);
      setHistoryIndex(0);
    }
  }, [clips.length]);

  // Initialize first clip when videoFile changes
  useEffect(() => {
    if (videoFile && clips.length === 0) {
      const url = URL.createObjectURL(videoFile);
      setClips([{
        id: Date.now().toString(),
        file: videoFile,
        startTime: 0,
        endTime: 0,
        url
      }]);
    }
  }, [videoFile]);

  // Load initial edit data from library
  useEffect(() => {
    if (initialEditData) {
      if (initialEditData.subtitles) setSubtitles(initialEditData.subtitles);
      if (initialEditData.freeTexts) setFreeTexts(initialEditData.freeTexts);
      if (initialEditData.stickers) setStickers(initialEditData.stickers);
      if (initialEditData.filters) setFilters(initialEditData.filters);
    }
  }, [initialEditData]);

  // Generate thumbnails for clips
  const generateThumbnail = (clip: VideoClip, index: number) => {
    const video = document.createElement('video');
    video.src = clip.url;
    video.currentTime = 0.1;
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 120;
      canvas.height = 68;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        setClips(prev => prev.map((c, i) => i === index ? { ...c, thumbnail } : c));
      }
    };
  };

  useEffect(() => {
    clips.forEach((clip, index) => {
      if (!clip.thumbnail) {
        generateThumbnail(clip, index);
      }
    });
  }, [clips.length]);

  // Cleanup URLs on unmount
  useEffect(() => {
    return () => {
      clips.forEach(clip => URL.revokeObjectURL(clip.url));
    };
  }, []);

  const activeClip = clips[activeClipIndex];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect?.(file);
        const url = URL.createObjectURL(file);
        if (clips.length === 0) {
          setClips([{
            id: Date.now().toString(),
            file,
            startTime: 0,
            endTime: 0,
            url
          }]);
        } else {
          setClips(prev => [...prev, {
            id: Date.now().toString(),
            file,
            startTime: 0,
            endTime: 0,
            url
          }]);
        }
        toast.success('Video added');
      } else {
        toast.error('Please select a video file');
      }
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      const file = files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect?.(file);
        const url = URL.createObjectURL(file);
        if (clips.length === 0) {
          setClips([{
            id: Date.now().toString(),
            file,
            startTime: 0,
            endTime: 0,
            url
          }]);
        } else {
          setClips(prev => [...prev, {
            id: Date.now().toString(),
            file,
            startTime: 0,
            endTime: 0,
            url
          }]);
        }
        toast.success('Video added');
      } else {
        toast.error('Please drop a video file');
      }
    }
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setTrimStart(videoRef.current.currentTime);
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current || !activeClip) return;
      
      if (e.code === 'Space' && e.target === document.body) {
        e.preventDefault();
        handlePlayPause();
      }
      
      if (e.code === 'ArrowLeft') {
        e.preventDefault();
        const newTime = Math.max(0, videoRef.current.currentTime - 1);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
      if (e.code === 'ArrowRight') {
        e.preventDefault();
        const newTime = Math.min(duration, videoRef.current.currentTime + 1);
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeClip, duration, isPlaying]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * duration;
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current && activeClip) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      // Stop playback at clip end time
      if (time >= activeClip.endTime && activeClip.endTime > 0) {
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setDuration(dur);
      setTrimEnd(dur);
      if (activeClip && activeClip.endTime === 0) {
        setClips(prev => prev.map((clip, idx) => 
          idx === activeClipIndex ? { ...clip, endTime: dur } : clip
        ));
      }
    }
  };

  const handleSeek = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.currentTime = value[0];
      setCurrentTime(value[0]);
    }
  };

  const handleVolumeChange = (value: number[]) => {
    if (videoRef.current) {
      videoRef.current.volume = value[0];
      setVolume(value[0]);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const addSubtitle = () => {
    if (!newSubtitle.trim()) return;
    
    const subtitle: Subtitle = {
      id: Date.now().toString(),
      text: newSubtitle,
      startTime: currentTime,
      endTime: Math.min(currentTime + 3, duration),
      x: 50,
      y: 85,
      color: subtitleColor,
      fontSize: subtitleFontSize,
    };
    
    setSubtitles(prev => [...prev, subtitle]);
    setNewSubtitle('');
    setTimeout(() => saveToHistory(), 0);
    toast.success('Subtitle added');
  };

  const removeSubtitle = (id: string) => {
    setSubtitles(prev => prev.filter(s => s.id !== id));
    setTimeout(() => saveToHistory(), 0);
    toast.success('Subtitle removed');
  };

  // Free text functions
  const addFreeText = () => {
    if (!newFreeText.trim()) return;
    
    const freeText: FreeText = {
      id: Date.now().toString(),
      text: newFreeText,
      x: 50,
      y: 50,
      color: freeTextColor,
      fontSize: freeTextFontSize,
      rotation: 0,
      scale: 1,
    };
    
    setFreeTexts(prev => [...prev, freeText]);
    setNewFreeText('');
    setTimeout(() => saveToHistory(), 0);
    toast.success('Text added - drag to position');
  };

  const updateFreeText = (id: string, updates: Partial<FreeText>) => {
    setFreeTexts(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const removeFreeText = (id: string) => {
    setFreeTexts(prev => prev.filter(t => t.id !== id));
    setSelectedFreeText(null);
    setTimeout(() => saveToHistory(), 0);
    toast.success('Text removed');
  };

  // Sticker functions
  const addSticker = (emoji: string) => {
    const sticker: Sticker = {
      id: Date.now().toString(),
      emoji,
      x: 50,
      y: 50,
      scale: 1,
      rotation: 0,
    };
    setStickers(prev => [...prev, sticker]);
    setTimeout(() => saveToHistory(), 0);
    toast.success('Sticker added - drag to position');
  };

  const updateSticker = (id: string, updates: Partial<Sticker>) => {
    setStickers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const removeSticker = (id: string) => {
    setStickers(prev => prev.filter(s => s.id !== id));
    setSelectedSticker(null);
    setTimeout(() => saveToHistory(), 0);
    toast.success('Sticker removed');
  };

  // Dragging for free text and stickers
  const handleElementMouseDown = (e: React.MouseEvent, type: 'text' | 'sticker', id: string) => {
    e.stopPropagation();
    if (type === 'text') {
      setSelectedFreeText(id);
      setSelectedSticker(null);
    } else {
      setSelectedSticker(id);
      setSelectedFreeText(null);
    }
    setIsDragging(true);
    
    if (previewRef.current) {
      const rect = previewRef.current.getBoundingClientRect();
      const element = type === 'text' 
        ? freeTexts.find(t => t.id === id)
        : stickers.find(s => s.id === id);
      if (element) {
        setDragOffset({
          x: e.clientX - rect.left - (element.x / 100) * rect.width,
          y: e.clientY - rect.top - (element.y / 100) * rect.height,
        });
      }
    }
  };

  const handlePreviewMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !previewRef.current) return;
    
    const rect = previewRef.current.getBoundingClientRect();
    const newX = Math.max(0, Math.min(100, ((e.clientX - rect.left - dragOffset.x) / rect.width) * 100));
    const newY = Math.max(0, Math.min(100, ((e.clientY - rect.top - dragOffset.y) / rect.height) * 100));
    
    if (selectedFreeText) {
      updateFreeText(selectedFreeText, { x: newX, y: newY });
    }
    if (selectedSticker) {
      updateSticker(selectedSticker, { x: newX, y: newY });
    }
  };

  const handlePreviewMouseUp = () => {
    setIsDragging(false);
  };

  // Select a clip and set video time to clip start
  const handleClipSelect = (index: number, e?: React.MouseEvent) => {
    const clip = clips[index];
    
    // Multi-select with Ctrl/Cmd key
    if (e?.ctrlKey || e?.metaKey) {
      setSelectedClipIds(prev => {
        if (prev.includes(clip.id)) {
          return prev.filter(id => id !== clip.id);
        }
        return [...prev, clip.id];
      });
    } else {
      setSelectedClipIds([clip.id]);
    }
    
    setActiveClipIndex(index);
    if (videoRef.current && clip) {
      videoRef.current.currentTime = clip.startTime;
      setCurrentTime(clip.startTime);
    }
  };

  // Clip drag handlers for reordering
  const handleClipDragStart = (e: React.DragEvent, clipId: string) => {
    setDraggingClipId(clipId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleClipDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleClipDragEnd = () => {
    if (draggingClipId && dragOverIndex !== null) {
      const fromIndex = clips.findIndex(c => c.id === draggingClipId);
      if (fromIndex !== -1 && fromIndex !== dragOverIndex) {
        setClips(prev => {
          const newClips = [...prev];
          const [movedClip] = newClips.splice(fromIndex, 1);
          newClips.splice(dragOverIndex, 0, movedClip);
          return newClips;
        });
        saveToHistory();
        toast.success('Clip reordered');
      }
    }
    setDraggingClipId(null);
    setDragOverIndex(null);
  };

  const removeClip = (index: number) => {
    if (clips.length <= 1) {
      toast.error('Cannot remove the last clip');
      return;
    }
    URL.revokeObjectURL(clips[index].url);
    setClips(prev => prev.filter((_, i) => i !== index));
    setSelectedClipIds(prev => prev.filter(id => id !== clips[index].id));
    if (activeClipIndex >= clips.length - 1) {
      setActiveClipIndex(Math.max(0, clips.length - 2));
    }
    saveToHistory();
    toast.success('Clip removed');
  };

  // Merge selected clips or current with next
  const mergeSelectedClips = () => {
    if (selectedClipIds.length < 2) {
      toast.error('Select at least 2 clips to merge (Ctrl+click)');
      return;
    }
    
    // Get selected clips in order
    const selectedIndices = clips
      .map((c, i) => selectedClipIds.includes(c.id) ? i : -1)
      .filter(i => i !== -1)
      .sort((a, b) => a - b);
    
    // Check if clips are consecutive
    for (let i = 1; i < selectedIndices.length; i++) {
      if (selectedIndices[i] !== selectedIndices[i - 1] + 1) {
        toast.error('Selected clips must be consecutive');
        return;
      }
    }
    
    // Check if all selected clips are from the same file
    const firstClip = clips[selectedIndices[0]];
    const allSameFile = selectedIndices.every(i => clips[i].file.name === firstClip.file.name);
    if (!allSameFile) {
      toast.error('Can only merge clips from the same video');
      return;
    }
    
    const lastClip = clips[selectedIndices[selectedIndices.length - 1]];
    const merged: VideoClip = {
      ...firstClip,
      endTime: lastClip.endTime,
    };
    
    setClips(prev => {
      const newClips = [...prev];
      newClips.splice(selectedIndices[0], selectedIndices.length, merged);
      return newClips;
    });
    setSelectedClipIds([merged.id]);
    saveToHistory();
    toast.success('Clips merged');
  };

  const splitClip = () => {
    if (!activeClip || currentTime <= activeClip.startTime || currentTime >= (activeClip.endTime || duration)) {
      toast.error('Cannot split at this position');
      return;
    }

    const firstHalf: VideoClip = {
      ...activeClip,
      id: Date.now().toString(),
      endTime: currentTime,
    };

    const secondHalf: VideoClip = {
      ...activeClip,
      id: (Date.now() + 1).toString(),
      startTime: currentTime,
      thumbnail: undefined,
    };

    setClips(prev => {
      const newClips = [...prev];
      newClips.splice(activeClipIndex, 1, firstHalf, secondHalf);
      return newClips;
    });
    saveToHistory();
    toast.success('Clip split at current position');
  };

  const applyTrim = () => {
    if (!activeClip) return;
    setClips(prev => prev.map((clip, idx) => 
      idx === activeClipIndex 
        ? { ...clip, startTime: trimStart, endTime: trimEnd }
        : clip
    ));
    saveToHistory();
    toast.success('Trim applied');
  };

  const handleSave = async () => {
    // Generate thumbnail from current video frame
    let thumbnail: string | undefined;
    if (videoRef.current && activeClip) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        thumbnail = canvas.toDataURL('image/jpeg');
      }
    }
    
    onSave?.({ subtitles, clips, freeTexts, stickers, filters }, activeClip?.file, thumbnail);
  };

  const handleExportVideo = async () => {
    if (!activeClip) {
      toast.error('No video to export');
      return;
    }
    
    // For now, download the original video file
    // In a real implementation, this would render all edits to a new video
    const link = document.createElement('a');
    link.href = activeClip.url;
    link.download = `exported-video-${Date.now()}.mp4`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Video downloaded to your computer');
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const currentSubtitle = subtitles.find(
    s => currentTime >= s.startTime && currentTime <= s.endTime
  );

  const getFilterStyle = () => {
    return `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) hue-rotate(${filters.hue}deg)`;
  };

  const selectedFreeTextObj = freeTexts.find(t => t.id === selectedFreeText);
  const selectedStickerObj = stickers.find(s => s.id === selectedSticker);

  return (
    <div className="flex flex-col bg-card rounded-2xl border border-border overflow-hidden">
      {/* Video Preview */}
      <div 
        ref={previewRef}
        className="relative bg-black flex items-center justify-center"
        style={{ height: '400px' }}
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onMouseMove={handlePreviewMouseMove}
        onMouseUp={handlePreviewMouseUp}
        onMouseLeave={handlePreviewMouseUp}
        onClick={() => { setSelectedFreeText(null); setSelectedSticker(null); }}
      >
        {activeClip ? (
          <>
            <video
              ref={videoRef}
              src={activeClip.url}
              className="max-w-full max-h-full"
              style={{ filter: getFilterStyle() }}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
            />
            {currentSubtitle && (
              <div 
                className="absolute px-4 py-2 rounded-lg font-bold pointer-events-none"
                style={{ 
                  left: `${currentSubtitle.x}%`,
                  top: `${currentSubtitle.y}%`,
                  transform: 'translate(-50%, -50%)',
                  backgroundColor: 'rgba(0,0,0,0.7)',
                  color: currentSubtitle.color,
                  fontSize: currentSubtitle.fontSize,
                }}
              >
                {currentSubtitle.text}
              </div>
            )}
            {/* Free Texts */}
            {freeTexts.map(ft => (
              <div
                key={ft.id}
                className={`absolute cursor-move select-none ${selectedFreeText === ft.id ? 'ring-2 ring-primary' : ''}`}
                style={{
                  left: `${ft.x}%`,
                  top: `${ft.y}%`,
                  transform: `translate(-50%, -50%) rotate(${ft.rotation}deg) scale(${ft.scale})`,
                  color: ft.color,
                  fontSize: ft.fontSize,
                  fontWeight: 'bold',
                  textShadow: '2px 2px 4px rgba(0,0,0,0.5)',
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'text', ft.id)}
                onClick={(e) => e.stopPropagation()}
              >
                {ft.text}
              </div>
            ))}
            {/* Stickers */}
            {stickers.map(s => (
              <div
                key={s.id}
                className={`absolute cursor-move select-none ${selectedSticker === s.id ? 'ring-2 ring-primary rounded-lg' : ''}`}
                style={{
                  left: `${s.x}%`,
                  top: `${s.y}%`,
                  transform: `translate(-50%, -50%) rotate(${s.rotation}deg) scale(${s.scale})`,
                  fontSize: '48px',
                }}
                onMouseDown={(e) => handleElementMouseDown(e, 'sticker', s.id)}
                onClick={(e) => e.stopPropagation()}
              >
                {s.emoji}
              </div>
            ))}
          </>
        ) : (
          <div 
            className="flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-lg text-muted-foreground mb-2">Drop a video here or click to upload</p>
            <p className="text-sm text-muted-foreground/70">Supports MP4, MOV, AVI, WebM</p>
          </div>
        )}
        <input 
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileUpload}
        />
      </div>

      {/* Controls */}
      <div className="p-4 border-t border-border bg-background space-y-4">
        {/* Playback Controls */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handlePlayPause} disabled={!activeClip}>
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </Button>
          
          <span className="text-sm text-muted-foreground min-w-[80px]">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>

          <div 
            className="flex-1 relative h-2 bg-secondary rounded-full cursor-pointer"
            onClick={handleTimelineClick}
          >
            <div 
              className="absolute h-full bg-primary rounded-full"
              style={{ width: `${(currentTime / (duration || 1)) * 100}%` }}
            />
            <div 
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full shadow-md"
              style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }}
            />
          </div>

          <Button variant="ghost" size="sm" onClick={toggleMute}>
            {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
          </Button>

          <Slider
            value={[volume]}
            max={1}
            step={0.1}
            onValueChange={handleVolumeChange}
            className="w-20"
          />
        </div>

        {/* Clip Timeline with Thumbnails */}
        {clips.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Clips Timeline (Ctrl+click to multi-select, drag to reorder)</Label>
              <div className="flex gap-2">
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
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={splitClip}
                  disabled={!activeClip}
                >
                  <Scissors className="w-4 h-4 mr-1" />
                  Split
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={mergeSelectedClips}
                  disabled={selectedClipIds.length < 2}
                >
                  <Merge className="w-4 h-4 mr-1" />
                  Merge
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Add Clip
                </Button>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {clips.map((clip, index) => (
                <div 
                  key={clip.id}
                  draggable
                  onDragStart={(e) => handleClipDragStart(e, clip.id)}
                  onDragOver={(e) => handleClipDragOver(e, index)}
                  onDragEnd={handleClipDragEnd}
                  className={`flex-shrink-0 rounded border-2 cursor-grab overflow-hidden transition-all ${
                    index === activeClipIndex ? 'border-primary' : 
                    selectedClipIds.includes(clip.id) ? 'border-primary/50 bg-primary/10' : 
                    'border-border'
                  } ${draggingClipId === clip.id ? 'opacity-50' : ''} ${dragOverIndex === index ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                  onClick={(e) => handleClipSelect(index, e)}
                  style={{ width: '120px' }}
                >
                  {/* Drag Handle */}
                  <div className="flex items-center justify-center py-1 bg-muted/50">
                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                  </div>
                  {/* Thumbnail */}
                  <div className="relative h-14 bg-muted">
                    {clip.thumbnail ? (
                      <img src={clip.thumbnail} alt={`Clip ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Play className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    {clips.length > 1 && (
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="absolute top-1 right-1 h-5 w-5 p-0"
                        onClick={(e) => { e.stopPropagation(); removeClip(index); }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-1 bg-card">
                    <span className="text-xs font-medium block">Clip {index + 1}</span>
                    <span className="text-xs text-muted-foreground">
                      {formatTime(clip.startTime)} - {formatTime(clip.endTime || 0)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trim Controls */}
        {activeClip && (
          <div className="flex items-center gap-4 flex-wrap">
            <Scissors className="w-5 h-5 text-muted-foreground" />
            <div className="flex items-center gap-2">
              <Label className="text-xs">Start</Label>
              <Input 
                type="number"
                value={trimStart.toFixed(1)}
                onChange={(e) => setTrimStart(Number(e.target.value))}
                className="w-20 h-8"
                step={0.1}
                min={0}
                max={trimEnd}
              />
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs">End</Label>
              <Input 
                type="number"
                value={trimEnd.toFixed(1)}
                onChange={(e) => setTrimEnd(Number(e.target.value))}
                className="w-20 h-8"
                step={0.1}
                min={trimStart}
                max={duration}
              />
            </div>
            <Button size="sm" variant="outline" onClick={applyTrim}>
              Apply Trim
            </Button>
          </div>
        )}

        {/* Subtitle Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Type className="w-4 h-4" />
            Subtitles
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
              placeholder="Add subtitle text..."
              value={newSubtitle}
              onChange={(e) => setNewSubtitle(e.target.value)}
              className="flex-1 min-w-[150px]"
            />
            <input 
              type="color" 
              value={subtitleColor}
              onChange={(e) => setSubtitleColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <Input 
              type="number"
              value={subtitleFontSize}
              onChange={(e) => setSubtitleFontSize(Number(e.target.value))}
              className="w-16 h-8"
              min={12}
              max={72}
            />
            <Button size="sm" onClick={addSubtitle} disabled={!activeClip}>
              Add Subtitle
            </Button>
          </div>
        </div>

        {/* Free Text Input */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Move className="w-4 h-4" />
            Free Text (Drag & Transform)
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            <Input 
              placeholder="Add free text..."
              value={newFreeText}
              onChange={(e) => setNewFreeText(e.target.value)}
              className="flex-1 min-w-[150px]"
            />
            <input 
              type="color" 
              value={freeTextColor}
              onChange={(e) => setFreeTextColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-border"
            />
            <Input 
              type="number"
              value={freeTextFontSize}
              onChange={(e) => setFreeTextFontSize(Number(e.target.value))}
              className="w-16 h-8"
              min={12}
              max={120}
            />
            <Button size="sm" onClick={addFreeText} disabled={!activeClip}>
              Add Text
            </Button>
          </div>
          
          {/* Selected Free Text Controls */}
          {selectedFreeTextObj && (
            <div className="flex items-center gap-4 p-2 bg-muted rounded-lg flex-wrap">
              <span className="text-sm font-medium">Edit: "{selectedFreeTextObj.text}"</span>
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                <Slider
                  value={[selectedFreeTextObj.rotation]}
                  min={-180}
                  max={180}
                  onValueChange={(v) => updateFreeText(selectedFreeTextObj.id, { rotation: v[0] })}
                  className="w-24"
                />
                <span className="text-xs w-10">{selectedFreeTextObj.rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Scale</Label>
                <Slider
                  value={[selectedFreeTextObj.scale * 100]}
                  min={50}
                  max={200}
                  onValueChange={(v) => updateFreeText(selectedFreeTextObj.id, { scale: v[0] / 100 })}
                  className="w-24"
                />
              </div>
              <Button size="sm" variant="destructive" onClick={() => removeFreeText(selectedFreeTextObj.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Stickers */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <Smile className="w-4 h-4" />
            Stickers & Emojis
          </Label>
          <div className="flex items-center gap-2 flex-wrap">
            {EMOJIS.map(emoji => (
              <Button
                key={emoji}
                variant="outline"
                size="sm"
                className="text-xl p-2 h-10 w-10"
                onClick={() => addSticker(emoji)}
                disabled={!activeClip}
              >
                {emoji}
              </Button>
            ))}
          </div>
          
          {/* Selected Sticker Controls */}
          {selectedStickerObj && (
            <div className="flex items-center gap-4 p-2 bg-muted rounded-lg flex-wrap">
              <span className="text-2xl">{selectedStickerObj.emoji}</span>
              <div className="flex items-center gap-2">
                <RotateCw className="w-4 h-4" />
                <Slider
                  value={[selectedStickerObj.rotation]}
                  min={-180}
                  max={180}
                  onValueChange={(v) => updateSticker(selectedStickerObj.id, { rotation: v[0] })}
                  className="w-24"
                />
                <span className="text-xs w-10">{selectedStickerObj.rotation}°</span>
              </div>
              <div className="flex items-center gap-2">
                <Label className="text-xs">Scale</Label>
                <Slider
                  value={[selectedStickerObj.scale * 100]}
                  min={50}
                  max={300}
                  onValueChange={(v) => updateSticker(selectedStickerObj.id, { scale: v[0] / 100 })}
                  className="w-24"
                />
              </div>
              <Button size="sm" variant="destructive" onClick={() => removeSticker(selectedStickerObj.id)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Color/Tone Adjustment */}
        <div className="space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <SunDim className="w-4 h-4" />
            Color & Tone
          </Label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <Label className="text-xs">Brightness</Label>
              <Slider
                value={[filters.brightness]}
                min={0}
                max={200}
                onValueChange={(v) => setFilters(f => ({ ...f, brightness: v[0] }))}
              />
              <span className="text-xs text-muted-foreground">{filters.brightness}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Contrast</Label>
              <Slider
                value={[filters.contrast]}
                min={0}
                max={200}
                onValueChange={(v) => setFilters(f => ({ ...f, contrast: v[0] }))}
              />
              <span className="text-xs text-muted-foreground">{filters.contrast}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Saturation</Label>
              <Slider
                value={[filters.saturation]}
                min={0}
                max={200}
                onValueChange={(v) => setFilters(f => ({ ...f, saturation: v[0] }))}
              />
              <span className="text-xs text-muted-foreground">{filters.saturation}%</span>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Hue</Label>
              <Slider
                value={[filters.hue]}
                min={-180}
                max={180}
                onValueChange={(v) => setFilters(f => ({ ...f, hue: v[0] }))}
              />
              <span className="text-xs text-muted-foreground">{filters.hue}°</span>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={() => setFilters({ brightness: 100, contrast: 100, saturation: 100, hue: 0 })}
          >
            Reset Filters
          </Button>
        </div>

        {/* Subtitles List */}
        {subtitles.length > 0 && (
          <div className="space-y-2 max-h-24 overflow-y-auto">
            <Label className="text-sm font-medium">Subtitles</Label>
            {subtitles.map((sub) => (
              <div key={sub.id} className="flex items-center justify-between bg-secondary p-2 rounded">
                <span className="text-sm">
                  [{formatTime(sub.startTime)} - {formatTime(sub.endTime)}] {sub.text}
                </span>
                <Button variant="ghost" size="sm" onClick={() => removeSubtitle(sub.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Free Texts List */}
        {freeTexts.length > 0 && (
          <div className="space-y-2 max-h-24 overflow-y-auto">
            <Label className="text-sm font-medium">Free Texts</Label>
            {freeTexts.map((ft) => (
              <div 
                key={ft.id} 
                className={`flex items-center justify-between p-2 rounded cursor-pointer ${selectedFreeText === ft.id ? 'bg-primary/20' : 'bg-secondary'}`}
                onClick={() => setSelectedFreeText(ft.id)}
              >
                <span className="text-sm" style={{ color: ft.color }}>{ft.text}</span>
                <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeFreeText(ft.id); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="sm" onClick={handleSave} disabled={clips.length === 0}>
            <Save className="w-4 h-4 mr-2" />
            Save
          </Button>
          <Button size="sm" className="btn-hero" onClick={handleExportVideo} disabled={clips.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export Video
          </Button>
        </div>
      </div>
    </div>
  );
}
