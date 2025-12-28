import { useState, useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ContentItem } from '@/types/content';
import { format } from 'date-fns';
import { 
  Play, Pause, Image, Video, Layers, Clock, 
  HardDrive, FileType, Calendar, User, Save
} from 'lucide-react';

interface ContentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem | null;
  onSave?: (id: string, updates: Partial<ContentItem>) => void;
  mode: 'view' | 'edit';
}

export function ContentDetailDialog({ 
  open, 
  onOpenChange, 
  content, 
  onSave,
  mode 
}: ContentDetailDialogProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (content) {
      setEditTitle(content.title);
      setEditDescription(content.description);
    }
  }, [content]);

  if (!content) return null;

  const getFormatIcon = (format: ContentItem['format']) => {
    switch (format) {
      case 'image': return Image;
      case 'video': return Video;
      case 'slideshow': return Layers;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return 'Unknown';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleSave = () => {
    onSave?.(content.id, {
      title: editTitle,
      description: editDescription,
    });
    onOpenChange(false);
  };

  const Icon = getFormatIcon(content.format);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5" />
            {mode === 'edit' ? 'Edit Content' : 'Content Details'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'edit' ? 'Update your content information' : 'View detailed information about this content'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6">
          {/* Preview Section */}
          <div className="aspect-video bg-secondary rounded-xl overflow-hidden relative">
            {content.format === 'video' && (content.fileUrl || content.file || content.thumbnail) ? (
              <>
                <video
                  ref={videoRef}
                  src={content.fileUrl || (content.file ? URL.createObjectURL(content.file) : '')}
                  className="w-full h-full object-contain"
                  onEnded={() => setIsPlaying(false)}
                  poster={content.thumbnail}
                  controls={false}
                />
                <Button
                  variant="secondary"
                  size="lg"
                  className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10"
                  onClick={handlePlayPause}
                >
                  {isPlaying ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
                  {isPlaying ? 'Pause' : 'Play'}
                </Button>
              </>
            ) : content.format === 'image' && (content.fileUrl || content.file) ? (
              <img
                src={content.fileUrl || (content.file ? URL.createObjectURL(content.file) : '')}
                alt={content.title}
                className="w-full h-full object-contain"
              />
            ) : content.format === 'slideshow' && content.slideThumbnails && content.slideThumbnails.length > 0 ? (
              <img
                src={content.slideThumbnails[0]}
                alt={content.title}
                className="w-full h-full object-contain"
              />
            ) : content.thumbnail ? (
              <img
                src={content.thumbnail}
                alt={content.title}
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Icon className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Slideshow Thumbnails Gallery */}
          {content.format === 'slideshow' && content.slideThumbnails && content.slideThumbnails.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              {content.slideThumbnails.map((thumb, idx) => (
                <img
                  key={idx}
                  src={thumb}
                  alt={`Slide ${idx + 1}`}
                  className="h-16 w-auto rounded border border-border flex-shrink-0"
                />
              ))}
            </div>
          )}

          {/* Info Section */}
          {mode === 'view' ? (
            <div className="grid gap-4">
              <div>
                <h3 className="font-display text-2xl font-bold">{content.title}</h3>
                <p className="text-muted-foreground mt-1">
                  {content.description || 'No description'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <FileType className="w-4 h-4" />
                    Format
                  </div>
                  <div className="font-medium capitalize">{content.format}</div>
                  <div className="text-xs text-muted-foreground">
                    {content.mimeType || content.fileType || 'Unknown'}
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <HardDrive className="w-4 h-4" />
                    Size
                  </div>
                  <div className="font-medium">{formatFileSize(content.fileSize)}</div>
                  {content.dimensions && (
                    <div className="text-xs text-muted-foreground">
                      {(() => {
                        const { width, height } = content.dimensions;
                        const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                        const divisor = gcd(width, height);
                        return `${width / divisor}:${height / divisor}`;
                      })()}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Clock className="w-4 h-4" />
                    {content.format === 'video' ? 'Duration' : 'Count'}
                  </div>
                  <div className="font-medium">
                    {content.format === 'video' ? formatDuration(content.duration) : 
                     content.format === 'slideshow' ? `${content.slideCount || 0} slides` : 
                     content.format === 'image' ? `${content.imageCount || 1} image${(content.imageCount || 1) > 1 ? 's' : ''}` : 'N/A'}
                  </div>
                </div>

                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                    <Calendar className="w-4 h-4" />
                    Created
                  </div>
                  <div className="font-medium">
                    {format(content.createdAt, 'MMM d, yyyy')}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {format(content.createdAt, 'h:mm a')}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="capitalize">
                  <Icon className="w-3 h-3 mr-1" />
                  {content.format}
                </Badge>
                <Badge variant={content.status === 'ready' ? 'default' : 'secondary'}>
                  {content.status}
                </Badge>
              </div>

              {content.owner && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  Owner: {content.owner.slice(0, 6)}...{content.owner.slice(-4)}
                </div>
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Content title"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Describe your content..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Format:</span>{' '}
                  <span className="capitalize font-medium">{content.format}</span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Size:</span>{' '}
                  <span className="font-medium">{formatFileSize(content.fileSize)}</span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">Ratio:</span>{' '}
                  <span className="font-medium">
                    {content.dimensions ? (() => {
                      const { width, height } = content.dimensions;
                      const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                      const divisor = gcd(width, height);
                      return `${width / divisor}:${height / divisor}`;
                    })() : 'N/A'}
                  </span>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <span className="text-muted-foreground">
                    {content.format === 'video' ? 'Duration:' : 'Count:'}
                  </span>{' '}
                  <span className="font-medium">
                    {content.format === 'video' ? formatDuration(content.duration) : 
                     content.format === 'slideshow' ? `${content.slideCount || 0} slides` : 
                     `${content.imageCount || 1} image${(content.imageCount || 1) > 1 ? 's' : ''}`}
                  </span>
                </div>
              </div>

              <Button onClick={handleSave} className="btn-hero">
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
