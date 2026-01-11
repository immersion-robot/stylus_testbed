import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { useContent } from '@/contexts/ContentContext';
import { useMetaMask } from '@/hooks/useMetaMask';
import { ReservationDialog } from '@/components/ReservationDialog';
import { PaymentDialog } from '@/components/PaymentDialog';
import { ContentDetailDialog } from '@/components/ContentDetailDialog';
import { RouteTrackingDialog } from '@/components/RouteTrackingDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, Image, Video, Layers, MoreVertical,
  Play, Trash2, Edit, ExternalLink, Clock, HardDrive, FileType, Pencil
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ContentItem, Reservation } from '@/types/content';
import { format } from 'date-fns';
import { toast } from 'sonner';

const Library = () => {
  const navigate = useNavigate();
  const { contents, addReservation, reservations, updateContent, deleteContent } = useContent();
  const { account } = useMetaMask();
  const [selectedContent, setSelectedContent] = useState<ContentItem | null>(null);
  const [showReservationDialog, setShowReservationDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailMode, setDetailMode] = useState<'view' | 'edit'>('view');
  const [pendingReservation, setPendingReservation] = useState<Omit<Reservation, 'id'> | null>(null);
  const [thumbnails, setThumbnails] = useState<Record<string, string>>({});
  const [showRouteDialog, setShowRouteDialog] = useState(false);
  const [completedReservation, setCompletedReservation] = useState<Reservation | null>(null);

  // Generate thumbnails for videos
  useEffect(() => {
    contents.forEach(content => {
      if (content.format === 'video' && content.file && !thumbnails[content.id] && !content.thumbnail) {
        generateVideoThumbnail(content);
      }
    });
  }, [contents]);

  const generateVideoThumbnail = (content: ContentItem) => {
    if (!content.file) return;
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(content.file);
    video.currentTime = 1; // Get frame at 1 second
    video.onloadeddata = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg');
        setThumbnails(prev => ({ ...prev, [content.id]: thumbnail }));
      }
      URL.revokeObjectURL(video.src);
    };
  };

  const getFormatIcon = (format: ContentItem['format']) => {
    switch (format) {
      case 'image': return Image;
      case 'video': return Video;
      case 'slideshow': return Layers;
    }
  };

  const getStatusColor = (status: ContentItem['status']) => {
    switch (status) {
      case 'draft': return 'bg-muted text-muted-foreground';
      case 'ready': return 'bg-green-500/10 text-green-600';
      case 'scheduled': return 'bg-blue-500/10 text-blue-600';
      case 'completed': return 'bg-primary/10 text-primary';
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return null;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null;
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `0:${secs.toString().padStart(2, '0')}`;
  };

  const handleReserve = (content: ContentItem) => {
    if (!account) {
      toast.error('Please connect your wallet first');
      return;
    }
    setSelectedContent(content);
    setShowReservationDialog(true);
  };

  const handleViewDetails = (content: ContentItem) => {
    setSelectedContent(content);
    setDetailMode('view');
    setShowDetailDialog(true);
  };

  const handleEdit = (content: ContentItem) => {
    setSelectedContent(content);
    setDetailMode('edit');
    setShowDetailDialog(true);
  };

  const handleContinueEditing = (content: ContentItem) => {
    // Navigate to create page with the content to continue editing
    // Store content ID in sessionStorage so Create page can load it
    sessionStorage.setItem('editingContentId', content.id);
    navigate('/create');
    toast.info('Loading your project...');
  };

  const handleDelete = (content: ContentItem) => {
    if (confirm(`Are you sure you want to delete "${content.title}"?`)) {
      deleteContent(content.id);
      toast.success('Content deleted');
    }
  };

  const handleSaveEdit = (id: string, updates: Partial<ContentItem>) => {
    updateContent(id, updates);
    toast.success('Content updated');
  };

  const handleReservationSubmit = (reservation: Omit<Reservation, 'id'>) => {
    setPendingReservation(reservation);
    setShowReservationDialog(false);
    setShowPaymentDialog(true);
  };

  const handlePaymentConfirm = (transactionHash: string) => {
    if (pendingReservation) {
      const newReservation: Reservation = {
        ...pendingReservation,
        id: Date.now().toString(),
        status: 'completed',
        transactionHash,
      };
      addReservation(newReservation);
      toast.success('Reservation confirmed! Your content will be broadcast soon.');
      
      // Show checkpoint after payment completion
      setCompletedReservation(newReservation);
      setTimeout(() => {
        setShowRouteDialog(true);
      }, 500);
    }
    setPendingReservation(null);
    setSelectedContent(null);
  };

  const getThumbnail = (content: ContentItem) => {
    if (content.thumbnail) return content.thumbnail;
    if (thumbnails[content.id]) return thumbnails[content.id];
    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold mb-2">Content Library</h1>
            <p className="text-muted-foreground">
              Manage your uploaded content and schedule broadcasts.
            </p>
          </div>

          {contents.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <div className="w-20 h-20 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6">
                <Layers className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">No Content Yet</h2>
              <p className="text-muted-foreground mb-6">
                Start creating or uploading content to display on robots.
              </p>
              <Button asChild className="btn-hero">
                <a href="/create">Create Content</a>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {contents.map((content) => {
                const Icon = getFormatIcon(content.format);
                const thumbnail = getThumbnail(content);
                const duration = formatDuration(content.duration);
                const fileSize = formatFileSize(content.fileSize);
                
                // Calculate aspect ratio with common ratio detection
                const getAspectRatio = () => {
                  if (content.dimensions) {
                    const { width, height } = content.dimensions;
                    const ratio = width / height;
                    // Check for common ratios
                    if (Math.abs(ratio - 16/9) < 0.01) return '16:9';
                    if (Math.abs(ratio - 4/3) < 0.01) return '4:3';
                    if (Math.abs(ratio - 1) < 0.01) return '1:1';
                    if (Math.abs(ratio - 9/16) < 0.01) return '9:16';
                    if (Math.abs(ratio - 21/9) < 0.01) return '21:9';
                    // Fallback to calculated ratio
                    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
                    const divisor = gcd(width, height);
                    return `${width / divisor}:${height / divisor}`;
                  }
                  return null;
                };
                const aspectRatio = getAspectRatio();

                // Get count info based on format
                const getCountInfo = () => {
                  if (content.format === 'video') return duration;
                  if (content.format === 'slideshow') return content.slideCount ? `${content.slideCount} slides` : null;
                  if (content.format === 'image') return content.imageCount ? `${content.imageCount} images` : '1 image';
                  return null;
                };
                const countInfo = getCountInfo();
                
                return (
                  <div 
                    key={content.id}
                    className="glass-card p-4 group hover:border-primary/30 transition-all duration-300"
                  >
                    {/* Thumbnail */}
                    <div 
                      className="aspect-video bg-secondary rounded-xl mb-4 flex items-center justify-center relative overflow-hidden cursor-pointer"
                      onClick={() => handleViewDetails(content)}
                    >
                      {thumbnail ? (
                        <img 
                          src={thumbnail}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      ) : content.file && content.file.type.startsWith('image/') ? (
                        <img 
                          src={URL.createObjectURL(content.file)}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      ) : content.format === 'slideshow' && content.slideThumbnails && content.slideThumbnails.length > 0 ? (
                        <img 
                          src={content.slideThumbnails[0]}
                          alt={content.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Icon className="w-16 h-16 text-muted-foreground" />
                      )}
                      
                      {/* Count overlay - videos show duration, others show count */}
                      {countInfo && (
                        <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                          {content.format === 'video' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <Layers className="w-3 h-3" />
                          )}
                          {countInfo}
                        </div>
                      )}

                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                        <Play className="w-12 h-12 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-lg" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-bold line-clamp-1">{content.title}</h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-shrink-0">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(content)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleViewDetails(content)}>
                              <ExternalLink className="w-4 h-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="text-destructive"
                              onClick={() => handleDelete(content)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {content.description || 'No description'}
                      </p>

                      {/* Meta info row - consistent for all formats */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1 capitalize">
                          <Icon className="w-3 h-3" />
                          {content.format}
                        </span>
                        {(content.mimeType || content.fileType) && (
                          <span className="flex items-center gap-1">
                            <FileType className="w-3 h-3" />
                            {content.mimeType?.split('/')[1]?.toUpperCase() || content.fileType?.toUpperCase()}
                          </span>
                        )}
                        {fileSize && (
                          <span className="flex items-center gap-1">
                            <HardDrive className="w-3 h-3" />
                            {fileSize}
                          </span>
                        )}
                        {aspectRatio && (
                          <span>
                            {aspectRatio}
                          </span>
                        )}
                      </div>

                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={getStatusColor(content.status)}>
                          {content.status}
                        </Badge>
                        {countInfo && (
                          <Badge variant="outline" className="text-xs">
                            {content.format === 'video' ? <Clock className="w-3 h-3 mr-1" /> : <Layers className="w-3 h-3 mr-1" />}
                            {countInfo}
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Created {format(content.createdAt, 'MMM d, yyyy • h:mm a')}
                      </div>

                      {/* Show Continue Editing for drafts, Book Broadcast for uploaded/ready content */}
                      {content.status === 'draft' ? (
                        <Button 
                          className="w-full"
                          variant="outline"
                          onClick={() => handleContinueEditing(content)}
                        >
                          <Pencil className="w-4 h-4 mr-2" />
                          Continue Editing
                        </Button>
                      ) : content.source === 'upload' || content.status === 'ready' ? (
                        <Button 
                          className="w-full btn-hero"
                          onClick={() => handleReserve(content)}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Book Broadcast
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Detail/Edit Dialog */}
      <ContentDetailDialog
        open={showDetailDialog}
        onOpenChange={setShowDetailDialog}
        content={selectedContent}
        onSave={handleSaveEdit}
        mode={detailMode}
      />

      {selectedContent && (
        <>
          <ReservationDialog
            open={showReservationDialog}
            onOpenChange={setShowReservationDialog}
            content={selectedContent}
            onReserve={handleReservationSubmit}
            existingReservations={reservations}
          />
          
          {pendingReservation && (
            <PaymentDialog
              open={showPaymentDialog}
              onOpenChange={setShowPaymentDialog}
              reservation={pendingReservation}
              onConfirm={handlePaymentConfirm}
            />
          )}
        </>
      )}

      {/* Route Tracking Dialog - Show checkpoint after payment completion */}
      {completedReservation && (
        <RouteTrackingDialog
          open={showRouteDialog}
          onOpenChange={(open) => {
            setShowRouteDialog(open);
            if (!open) {
              setCompletedReservation(null);
            }
          }}
          reservation={completedReservation}
        />
      )}
    </div>
  );
};

export default Library;
