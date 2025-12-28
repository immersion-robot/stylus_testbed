import { Play, ArrowRight } from 'lucide-react';
import gallery1 from '@/assets/gallery-1.png';

export function GallerySection() {
  return (
    <section className="bg-background">
      <div className="grid grid-cols-1 md:grid-cols-3">
        {/* First Item - Image */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-[400px] overflow-hidden group cursor-pointer">
          <img 
            src={gallery1} 
            alt="Robots in Public Space" 
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
            <span className="text-primary-foreground text-sm font-medium uppercase tracking-wider">
              ROBOAD IN PUBLIC
            </span>
            <button className="text-primary-foreground hover:opacity-70 transition-opacity">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Second Item - Video 1 */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-[400px] overflow-hidden group cursor-pointer bg-secondary">
          <video 
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          >
            <source src="/videos/gallery-video-1.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary-foreground text-sm font-medium uppercase tracking-wider">
                ROBOAD SHOWCASE
              </span>
              <span className="flex items-center gap-1 text-primary-foreground/70 text-xs">
                <Play className="w-3 h-3" /> Watch
              </span>
            </div>
          </div>
        </div>

        {/* Third Item - Video 2 */}
        <div className="relative aspect-[4/3] md:aspect-auto md:h-[400px] overflow-hidden group cursor-pointer bg-secondary">
          <video 
            className="w-full h-full object-cover"
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play()}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          >
            <source src="/videos/gallery-video-2.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-transparent to-transparent pointer-events-none" />
          <div className="absolute inset-0 flex items-center justify-center opacity-100 group-hover:opacity-0 transition-opacity pointer-events-none">
            <div className="w-16 h-16 rounded-full bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center">
              <Play className="w-6 h-6 text-primary-foreground fill-primary-foreground" />
            </div>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-6 flex items-end justify-between">
            <div className="flex items-center gap-2">
              <span className="text-primary-foreground text-sm font-medium uppercase tracking-wider">
                CREATE YOUR AD
              </span>
              <span className="flex items-center gap-1 text-primary-foreground/70 text-xs">
                <Play className="w-3 h-3" /> Watch
              </span>
            </div>
            <button className="text-primary-foreground hover:opacity-70 transition-opacity">
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
