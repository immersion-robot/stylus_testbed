import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ContentItem } from '@/types/content';
import { toast } from 'sonner';
import { Image, Video, Layers, HardDrive, Clock, Loader2 } from 'lucide-react';
import { useMetaMask } from '@/hooks/useMetaMask';
import { CONTRACT_CONFIG } from '@/config/contracts';

interface ContentInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  file?: File;
  onSave: (content: Omit<ContentItem, 'id' | 'createdAt'>) => void;
  walletAddress?: string;
  slideThumbnails?: string[];
  slideCount?: number;
}

export function ContentInfoDialog({ open, onOpenChange, file, onSave, walletAddress, slideThumbnails, slideCount }: ContentInfoDialogProps) {
  const { accessToken } = useMetaMask();
  const [title, setTitle] = useState('');
  const [format, setFormat] = useState<ContentItem['format']>('image');
  const [description, setDescription] = useState('');
  const [fileType, setFileType] = useState(file?.type || '');
  const [thumbnail, setThumbnail] = useState<string | undefined>();
  const [duration, setDuration] = useState<number | undefined>();
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | undefined>();
  const [fileUrl, setFileUrl] = useState<string | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Auto-detect format and extract metadata when file or slides change
  useEffect(() => {
    // Handle slide-created video
    if (slideThumbnails && slideThumbnails.length > 0) {
      setFormat('video');
      setThumbnail(slideThumbnails[0]);
      setDimensions({ width: 1920, height: 1080 }); // Default 16:9
      setFileType('video/mp4');
      return;
    }

    if (file) {
      setFileType(file.type);
      
      // Auto-detect format
      if (file.type.startsWith('video/')) {
        setFormat('video');
        extractVideoMetadata(file);
      } else if (file.type.startsWith('image/')) {
        setFormat('image');
        extractImageMetadata(file);
      }

      // Create file URL for preview
      const url = URL.createObjectURL(file);
      setFileUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [file, slideThumbnails]);

  const extractVideoMetadata = (file: File) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    video.onloadedmetadata = () => {
      const dur = Math.round(video.duration);
      const width = video.videoWidth || 1920;
      const height = video.videoHeight || 1080;
      
      setDuration(isNaN(dur) ? undefined : dur);
      setDimensions({ width, height });
      
      // Generate thumbnail
      video.currentTime = Math.min(1, video.duration / 2);
    };

    video.onseeked = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL('image/jpeg'));
      }
      URL.revokeObjectURL(url);
    };

    video.onerror = () => {
      console.error('Error loading video metadata');
      URL.revokeObjectURL(url);
    };
  };

  const extractImageMetadata = (file: File) => {
    const img = new window.Image();
    img.src = URL.createObjectURL(file);
    img.onload = () => {
      setDimensions({ width: img.naturalWidth, height: img.naturalHeight });
      
      // Use image itself as thumbnail
      const canvas = document.createElement('canvas');
      const maxSize = 320;
      const scale = Math.min(maxSize / img.naturalWidth, maxSize / img.naturalHeight);
      canvas.width = img.naturalWidth * scale;
      canvas.height = img.naturalHeight * scale;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setThumbnail(canvas.toDataURL('image/jpeg'));
      }
      URL.revokeObjectURL(img.src);
    };
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds || seconds === 0) return null;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
  };

  // Extract file extension
  const getFileExtension = (filename: string, mimeType: string): string => {
    if (filename.includes('.')) {
      return filename.split('.').pop() || '';
    }
    // Extract extension from MIME type
    const mimeToExt: Record<string, string> = {
      'video/mp4': 'mp4',
      'video/webm': 'webm',
      'video/quicktime': 'mov',
      'image/png': 'png',
      'image/jpeg': 'jpg',
      'image/jpg': 'jpg',
      'image/gif': 'gif',
      'image/webp': 'webp',
    };
    return mimeToExt[mimeType] || 'mp4';
  };

  // Convert Base64 thumbnail to File
  const base64ToFile = (base64: string, filename: string): File => {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Request S3 presigned URL
  const getPresignedUrl = async (filename: string, category: string, contentType: string): Promise<{ uploadUrl: string; fileUrl: string; fileId: string }> => {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const response = await fetch(`${CONTRACT_CONFIG.API_BASE_URL}/api/v1/uploads/presigned-url`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename,
        category,
        contentType,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to get presigned URL: ${response.statusText}`);
    }

    return response.json();
  };

  // Upload file to S3 (direct S3 or proxy upload via test server)
  const uploadToS3 = async (uploadUrl: string, file: File, fileId?: string, category?: string): Promise<void> => {
    // Check if uploadUrl is a test server endpoint
    const isTestServerUrl = uploadUrl.includes('/api/v1/uploads/upload');
    
    if (isTestServerUrl) {
      // Upload via test server (using FormData)
      // uploadUrl already includes query string (fileId, category), so use as is
      const formData = new FormData();
      formData.append('file', file);
      // fileId and category are already in query string, so no need to add
      // But add them anyway as a safeguard so server can read from req.body
      if (fileId) formData.append('fileId', fileId);
      if (category) formData.append('category', category);

      if (!accessToken) {
        throw new Error('Access token is required for file upload');
      }

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          // Don't set Content-Type when using FormData (browser automatically sets boundary)
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to upload file: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('File uploaded via test server:', result);
      return;
    }

    // Upload to actual S3 presigned URL (PUT method)
    try {
      const response = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!response.ok) {
        throw new Error(`Failed to upload file to S3: ${response.statusText}`);
      }
    } catch (error: any) {
      // Handle CORS error
      if (error.message.includes('CORS') || error.message.includes('Failed to fetch')) {
        throw new Error('CORS error: Unable to upload to S3. Please use test server or configure CORS on S3 bucket.');
      }
      throw error;
    }
  };

  // Register ad creative API
  const registerAdCreative = async (data: {
    title: string;
    type: string;
    mediaUrl: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    duration?: number;
  }): Promise<{ adCreativeId: string; status: string }> => {
    if (!accessToken) {
      throw new Error('Access token is required');
    }

    const response = await fetch(`${CONTRACT_CONFIG.API_BASE_URL}/api/v1/ad-creatives`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`Failed to register ad creative: ${response.statusText}`);
    }

    return response.json();
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!file) {
      toast.error('Please select a file');
      return;
    }

    if (!accessToken) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsUploading(true);

    try {
      // 1. Extract file extension and create filename
      const extension = getFileExtension(file.name, file.type);
      const filename = `${title}.${extension}`;

      // 2. Map category (VIDEO, IMAGE)
      const category = format === 'video' ? 'AD_VIDEO' : 'AD_IMAGE';

      // 3. Request presigned URL
      toast.info('Getting upload URL...');
      const { uploadUrl, fileUrl: s3FileUrl, fileId } = await getPresignedUrl(filename, category, file.type);

      // 4. Upload file to S3 (or via test server)
      toast.info('Uploading file...');
      await uploadToS3(uploadUrl, file, fileId, category);

      // 5. Upload thumbnail (if exists)
      let thumbnailUrl: string | undefined;
      if (thumbnail) {
        try {
          const thumbnailExtension = 'jpg';
          const thumbnailFilename = `${title}_thumb.${thumbnailExtension}`;
          const thumbnailCategory = 'THUMBNAIL';
          
          const thumbPresigned = await getPresignedUrl(thumbnailFilename, thumbnailCategory, 'image/jpeg');
          const thumbnailFile = base64ToFile(thumbnail, thumbnailFilename);
          await uploadToS3(thumbPresigned.uploadUrl, thumbnailFile, thumbPresigned.fileId, thumbnailCategory);
          thumbnailUrl = thumbPresigned.fileUrl;
        } catch (error) {
          console.error('Thumbnail upload failed:', error);
          // Continue even if thumbnail upload fails
        }
      }

      // 6. Register ad creative (save metadata)
      toast.info('Registering content...');
      const adCreativeResponse = await registerAdCreative({
        title,
        type: format === 'video' ? 'VIDEO' : 'IMAGE',
        mediaUrl: s3FileUrl,
        thumbnailUrl,
        width: dimensions?.width || 1920,
        height: dimensions?.height || 1080,
        duration: format === 'video' ? duration : undefined,
      });

      // 7. Also save to local ContentContext
      onSave({
        title,
        format,
        description,
        owner: walletAddress || 'Unknown',
        fileType: file.type || fileType,
        file,
        fileUrl: s3FileUrl,
        thumbnail: thumbnailUrl || thumbnail,
        duration,
        dimensions,
        fileSize: file.size,
        mimeType: file.type,
        status: 'ready',
      });

      // Reset form
      setTitle('');
      setFormat('image');
      setDescription('');
      setFileType('');
      setThumbnail(undefined);
      setDuration(undefined);
      setDimensions(undefined);
      setFileUrl(undefined);
      onOpenChange(false);
      
      toast.success(`Content uploaded successfully! Status: ${adCreativeResponse.status}`);
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload content');
    } finally {
      setIsUploading(false);
    }
  };

  const getFormatIcon = () => {
    switch (format) {
      case 'image': return <Image className="w-5 h-5" />;
      case 'video': return <Video className="w-5 h-5" />;
      case 'slideshow': return <Layers className="w-5 h-5" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl flex items-center gap-2">
            {getFormatIcon()}
            Content Information
          </DialogTitle>
          <DialogDescription>
            Enter details about your content to save it to your library.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Preview */}
          {(thumbnail || fileUrl || (slideThumbnails && slideThumbnails.length > 0)) && (
            <div className="aspect-video bg-secondary rounded-xl overflow-hidden relative">
              {format === 'video' && fileUrl ? (
                <video
                  ref={videoRef}
                  src={fileUrl}
                  className="w-full h-full object-contain"
                  controls
                />
              ) : slideThumbnails && slideThumbnails.length > 0 ? (
                <img 
                  src={slideThumbnails[0]} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              ) : thumbnail ? (
                <img 
                  src={thumbnail} 
                  alt="Preview" 
                  className="w-full h-full object-contain"
                />
              ) : null}
            </div>
          )}

          {/* File info cards */}
          {(file || slideThumbnails) && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {file && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <HardDrive className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Size</div>
                  <div className="text-sm font-medium">{formatFileSize(file.size)}</div>
                </div>
              )}
              {dimensions && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <Image className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Resolution</div>
                  <div className="text-sm font-medium">{dimensions.width}×{dimensions.height}</div>
                </div>
              )}
              {duration !== undefined && duration > 0 && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <Clock className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Duration</div>
                  <div className="text-sm font-medium">{formatDuration(duration)}</div>
                </div>
              )}
              {slideCount !== undefined && slideCount > 0 && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <Layers className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Slides</div>
                  <div className="text-sm font-medium">{slideCount} slides</div>
                </div>
              )}
              {(file?.type || fileType) && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <Video className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Type</div>
                  <div className="text-sm font-medium truncate">{(file?.type || fileType).split('/')[1]?.toUpperCase() || 'MP4'}</div>
                </div>
              )}
              {dimensions && (
                <div className="bg-muted p-2 rounded-lg text-center">
                  <Image className="w-4 h-4 mx-auto mb-1 text-muted-foreground" />
                  <div className="text-xs text-muted-foreground">Ratio</div>
                  <div className="text-sm font-medium">16:9</div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input 
              id="title"
              placeholder="Enter content title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="format">Format</Label>
            <Select value={format} onValueChange={(v) => setFormat(v as ContentItem['format'])}>
              <SelectTrigger>
                <SelectValue placeholder="Select format" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea 
              id="description"
              placeholder="Describe your content..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Owner</Label>
              <Input 
                value={walletAddress ? `${walletAddress.slice(0, 10)}...` : 'Not connected'}
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label>File Type</Label>
              <Input 
                value={file?.type || fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="e.g., image/png"
                disabled={!!file}
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isUploading}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="btn-hero" disabled={isUploading || !accessToken}>
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              'Save Content'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
