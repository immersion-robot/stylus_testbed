import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function Footer() {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const footerLinks = [
    { number: '01', label: 'HOME', path: '/' },
    { number: '02', label: 'CREATE', path: '/create' },
    { number: '03', label: 'LIBRARY', path: '/library' },
    { number: '04', label: 'RESERVATIONS', path: '/reservations' },
    { number: '05', label: 'HOW IT WORKS', path: '/#features' },
  ];

  return (
    <footer className="bg-primary text-primary-foreground py-20">
      <div className="container mx-auto px-6">
        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left Side */}
          <div className="space-y-8">
            <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
              ROBOAD
            </h2>
            <p className="text-primary-foreground/70 max-w-sm">
              Get updates on our latest features and advertising opportunities.
            </p>
            <div className="flex items-center gap-4">
              <input 
                type="email" 
                placeholder="Email Address*"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-transparent border-b border-primary-foreground/30 py-3 text-primary-foreground placeholder:text-primary-foreground/50 focus:outline-none focus:border-primary-foreground"
              />
              <button 
                onClick={() => {
                  if (!email || !email.includes('@')) {
                    toast({
                      title: "Invalid Email",
                      description: "Please enter a valid email address.",
                      variant: "destructive",
                    });
                    return;
                  }
                  toast({
                    title: "Subscribed!",
                    description: "Thank you for signing up for updates.",
                  });
                  setEmail('');
                }}
                className="px-6 py-3 bg-primary-foreground text-primary rounded-full font-medium hover:opacity-90 transition-opacity"
              >
                Sign Up
              </button>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                <ArrowUpRight className="w-5 h-5" />
              </a>
              <span className="text-primary-foreground/50">|</span>
              <a href="#" className="text-sm text-primary-foreground/70 hover:text-primary-foreground transition-colors">
                Contact Us
              </a>
            </div>
          </div>

          {/* Right Side - Links */}
          <div className="space-y-4">
            {footerLinks.map((link) => (
              <Link 
                key={link.path + link.number}
                to={link.path}
                className="flex items-center gap-4 py-3 border-b border-primary-foreground/10 hover:border-primary-foreground/30 transition-colors group"
              >
                <span className="text-sm text-primary-foreground/50">{link.number}</span>
                <span className="font-display text-2xl md:text-3xl font-bold tracking-wide group-hover:translate-x-2 transition-transform">
                  {link.label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-16 pt-8 border-t border-primary-foreground/10">
          <p className="text-sm text-primary-foreground/50">
            © 2024 ROBOAD. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
