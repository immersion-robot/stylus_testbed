import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '@/components/Header';
import { CanvasEditor } from '@/components/CanvasEditor';
import { VideoEditor } from '@/components/VideoEditor';
import { FileUploader } from '@/components/FileUploader';
import { ContentInfoDialog } from '@/components/ContentInfoDialog';
import { useContent } from '@/contexts/ContentContext';
import { useMetaMask } from '@/hooks/useMetaMask';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Paintbrush, Film, Upload } from 'lucide-react';
import { ContentItem, SlideItem, VideoEditData } from '@/types/content';
import { toast } from 'sonner';

const Create = () => {
  const navigate = useNavigate();
  const { account } = useMetaMask();
  const { addContent, contents, updateContent } = useContent();
  const [activeTab, setActiveTab] = useState('canvas');
  const [selectedFile, setSelectedFile] = useState<File | undefined>();
  const [showInfoDialog, setShowInfoDialog] = useState(false);
  const [pendingSlides, setPendingSlides] = useState<SlideItem[] | null>(null);
  const [slideThumbnails, setSlideThumbnails] = useState<string[]>([]);
  
  // For continuing edits from library
  const [editingContentId, setEditingContentId] = useState<string | null>(null);
  const [initialSlides, setInitialSlides] = useState<SlideItem[] | undefined>();
  const [initialVideoEditData, setInitialVideoEditData] = useState<VideoEditData | undefined>();
  const [initialVideoFile, setInitialVideoFile] = useState<File | undefined>();

  // Check for editing content from library on mount
  useEffect(() => {
    const storedId = sessionStorage.getItem('editingContentId');
    if (storedId) {
      sessionStorage.removeItem('editingContentId');
      const content = contents.find(c => c.id === storedId);
      if (content) {
        setEditingContentId(storedId);
        
        if (content.source === 'slide-editor' && content.editData?.slides) {
          setInitialSlides(content.editData.slides);
          setActiveTab('canvas');
          toast.success('Loaded slide project');
        } else if (content.source === 'video-editor' && content.editData?.videoEdits) {
          setInitialVideoEditData(content.editData.videoEdits);
          if (content.file) {
            setInitialVideoFile(content.file);
          }
          setActiveTab('video');
          toast.success('Loaded video project');
        }
      }
    }
  }, [contents]);

  const generateSlideThumbnails = useCallback(async (slides: SlideItem[]): Promise<string[]> => {
    const thumbnails: string[] = [];
    
    for (const slide of slides) {
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Draw background
        ctx.fillStyle = slide.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale factor from 960x540 to 320x180
        const scaleX = canvas.width / 960;
        const scaleY = canvas.height / 540;
        
        // Draw elements
        for (const el of slide.elements) {
          if (el.type === 'text') {
            ctx.fillStyle = el.color || '#000000';
            const fontSize = Math.max(6, (el.fontSize || 24) * scaleY);
            ctx.font = `bold ${fontSize}px ${el.fontFamily || 'Inter, sans-serif'}`;
            ctx.fillText(el.content || '', el.x * scaleX, (el.y + (el.fontSize || 24)) * scaleY);
          } else if (el.type === 'shape') {
            ctx.fillStyle = el.color || '#000000';
            if (el.shapeType === 'rectangle') {
              ctx.fillRect(el.x * scaleX, el.y * scaleY, el.width * scaleX, el.height * scaleY);
            } else if (el.shapeType === 'circle') {
              ctx.beginPath();
              ctx.ellipse(
                (el.x + el.width / 2) * scaleX,
                (el.y + el.height / 2) * scaleY,
                (el.width / 2) * scaleX,
                (el.height / 2) * scaleY,
                0, 0, Math.PI * 2
              );
              ctx.fill();
            }
          }
        }
        
        thumbnails.push(canvas.toDataURL('image/jpeg'));
      }
    }
    
    return thumbnails;
  }, []);

  const handleSlidesSave = async (slides: SlideItem[]) => {
    // Generate thumbnails and save as draft
    const thumbnails = await generateSlideThumbnails(slides);
    
    if (editingContentId) {
      // Update existing content
      updateContent(editingContentId, {
        editData: { slides },
        slideThumbnails: thumbnails,
        thumbnail: thumbnails[0],
        slideCount: slides.length,
      });
      toast.success('Project updated');
    } else {
      // Create new draft
      const newContent: ContentItem = {
        id: Date.now().toString(),
        title: `Slide Project ${new Date().toLocaleDateString()}`,
        format: 'slideshow',
        description: 'Draft slideshow project',
        owner: account || 'Unknown',
        fileType: 'slideshow',
        createdAt: new Date(),
        status: 'draft',
        slideCount: slides.length,
        slideThumbnails: thumbnails,
        thumbnail: thumbnails[0],
        dimensions: { width: 1920, height: 1080 },
        source: 'slide-editor',
        editData: { slides },
      };
      addContent(newContent);
      setEditingContentId(newContent.id);
      toast.success('Slides saved to library as draft');
    }
  };

  const handleCreateVideo = async (slides: SlideItem[]) => {
    toast.info('Creating video from slides...');
    
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      toast.error('Failed to create video');
      return;
    }

    // Set up MediaRecorder
    const stream = canvas.captureStream(30);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000,
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    
    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'video/webm' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `slideshow-video-${Date.now()}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Video downloaded to your computer');
    };

    mediaRecorder.start();

    // Draw each slide for 3 seconds
    const drawSlide = async (slide: SlideItem): Promise<void> => {
      return new Promise((resolve) => {
        // Draw background
        ctx.fillStyle = slide.backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale factor from 960x540 to 1920x1080
        const scaleX = canvas.width / 960;
        const scaleY = canvas.height / 540;
        
        // Draw elements
        for (const el of slide.elements) {
          if (el.type === 'text') {
            ctx.fillStyle = el.color || '#000000';
            const fontSize = (el.fontSize || 24) * scaleY;
            ctx.font = `bold ${fontSize}px ${el.fontFamily || 'Inter, sans-serif'}`;
            ctx.fillText(el.content || '', el.x * scaleX, (el.y + (el.fontSize || 24)) * scaleY);
          } else if (el.type === 'shape') {
            ctx.fillStyle = el.color || '#000000';
            if (el.shapeType === 'rectangle') {
              ctx.fillRect(el.x * scaleX, el.y * scaleY, el.width * scaleX, el.height * scaleY);
            } else if (el.shapeType === 'circle') {
              ctx.beginPath();
              ctx.ellipse(
                (el.x + el.width / 2) * scaleX,
                (el.y + el.height / 2) * scaleY,
                (el.width / 2) * scaleX,
                (el.height / 2) * scaleY,
                0, 0, Math.PI * 2
              );
              ctx.fill();
            }
          }
        }
        
        // Wait 3 seconds before next slide
        setTimeout(resolve, 3000);
      });
    };

    // Draw all slides sequentially
    for (const slide of slides) {
      await drawSlide(slide);
    }

    mediaRecorder.stop();
  };

  const handleVideoEditorSave = async (editData: VideoEditData, videoFile?: File, thumbnail?: string) => {
    if (editingContentId) {
      // Update existing content
      updateContent(editingContentId, {
        editData: { videoEdits: editData },
        thumbnail: thumbnail,
      });
      toast.success('Video project updated');
    } else {
      // Create new draft
      const newContent: ContentItem = {
        id: Date.now().toString(),
        title: `Video Project ${new Date().toLocaleDateString()}`,
        format: 'video',
        description: 'Draft video project',
        owner: account || 'Unknown',
        fileType: 'video',
        createdAt: new Date(),
        status: 'draft',
        dimensions: { width: 1920, height: 1080 },
        source: 'video-editor',
        editData: { videoEdits: editData },
        file: videoFile,
        thumbnail: thumbnail,
      };
      addContent(newContent);
      setEditingContentId(newContent.id);
      toast.success('Video saved to library as draft');
    }
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      setPendingSlides(null);
      setSlideThumbnails([]);
      setSelectedFile(files[0]);
      setShowInfoDialog(true);
    }
  };

  const handleContentSave = (content: Omit<ContentItem, 'id' | 'createdAt'>) => {
    const newContent: ContentItem = {
      ...content,
      id: Date.now().toString(),
      createdAt: new Date(),
      // Mark uploaded files as ready for payment
      source: 'upload',
      status: 'ready',
    };
    addContent(newContent);
    setSelectedFile(undefined);
    setPendingSlides(null);
    setSlideThumbnails([]);
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-6">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold mb-2">Create Content</h1>
            <p className="text-muted-foreground">
              Design slides, edit videos, or upload your own content for the robots.
            </p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full max-w-md grid-cols-3">
              <TabsTrigger value="canvas" className="flex items-center gap-2">
                <Paintbrush className="w-4 h-4" />
                Slide Editor
              </TabsTrigger>
              <TabsTrigger value="video" className="flex items-center gap-2">
                <Film className="w-4 h-4" />
                Video Editor
              </TabsTrigger>
              <TabsTrigger value="upload" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload
              </TabsTrigger>
            </TabsList>

            <TabsContent value="canvas" className="min-h-0">
              <CanvasEditor 
                onSave={handleSlidesSave}
                onCreateVideo={handleCreateVideo}
                initialSlides={initialSlides}
              />
            </TabsContent>

            <TabsContent value="video" className="min-h-0">
              <VideoEditor 
                videoFile={initialVideoFile || selectedFile}
                onSave={handleVideoEditorSave}
                onFileSelect={(file) => setSelectedFile(file)}
                initialEditData={initialVideoEditData}
              />
            </TabsContent>

            <TabsContent value="upload">
              <div className="glass-card p-8">
                <h2 className="font-display text-2xl font-bold mb-6">Upload Content</h2>
                <FileUploader onFileSelect={handleFileSelect} />
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ContentInfoDialog
        open={showInfoDialog}
        onOpenChange={setShowInfoDialog}
        file={selectedFile}
        onSave={handleContentSave}
        walletAddress={account || undefined}
        slideThumbnails={slideThumbnails}
        slideCount={pendingSlides?.length}
      />
    </div>
  );
};

export default Create;