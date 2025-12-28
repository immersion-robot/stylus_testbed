import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import heroRobot from '@/assets/hero-robot.png';

export function HeroSection() {
  return (
    <section className="relative min-h-screen bg-secondary overflow-hidden">
      {/* Hero Robot Image - Centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img 
          src={heroRobot} 
          alt="Autonomous Advertising Robot" 
          className="w-auto h-[85vh] object-contain"
        />
      </div>

      {/* Dark Overlay for Text Readability */}
      <div className="absolute inset-0 bg-gradient-to-b from-foreground/60 via-transparent to-foreground/80" />

      {/* Top Left Content */}
      <div className="absolute top-32 left-6 md:left-12 lg:left-20 z-10 max-w-md">
        <div className="space-y-4 animate-slide-up">
          <h2 className="text-primary-foreground text-lg md:text-xl font-medium uppercase tracking-wider">
            THE FUTURE OF
          </h2>
          <h1 className="text-primary-foreground text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
            AUTONOMOUS MOBILE ADVERTISING
          </h1>
          <p className="text-primary-foreground/70 text-sm md:text-base leading-relaxed">
            ROBOAD has developed cutting-edge self-driving advertising robots 
            with advanced AI technology and display systems.
          </p>
          <Link 
            to="/create" 
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/30 text-primary-foreground rounded-full text-sm font-medium transition-all hover:bg-primary-foreground/20"
          >
            Get Started
            <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10">
        <div className="flex flex-col items-center gap-2 text-primary-foreground/50 animate-pulse-slow">
          <span className="text-xs tracking-widest uppercase">Scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-primary-foreground/50 to-transparent" />
        </div>
      </div>
    </section>
  );
}
