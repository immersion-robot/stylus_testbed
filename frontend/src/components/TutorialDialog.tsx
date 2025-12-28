import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, ArrowRight, Wallet } from 'lucide-react';
import { useMetaMask } from '@/hooks/useMetaMask';

const features = [
  {
    number: '01',
    title: 'CONNECT WALLET',
    description: 'Securely connect your MetaMask wallet to access the platform and manage your content.',
  },
  {
    number: '02',
    title: 'CREATE CONTENT',
    description: 'Use our intuitive canvas editor or upload your own videos and images for the robots.',
  },
  {
    number: '03',
    title: 'BOOK TIMESLOTS',
    description: 'Choose locations and times for your content to be displayed on autonomous robots.',
  },
  {
    number: '04',
    title: 'PAY WITH CRYPTO',
    description: 'Complete your reservation using USDT for seamless blockchain transactions.',
  },
];

interface TutorialDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TutorialDialog({ open, onOpenChange }: TutorialDialogProps) {
  const [step, setStep] = useState<'welcome' | 'steps'>('welcome');
  const [currentStep, setCurrentStep] = useState(0);
  const [hasMetaMask, setHasMetaMask] = useState<boolean | null>(null);
  const { connect, account } = useMetaMask();

  useEffect(() => {
    // Check if MetaMask is installed
    const checkMetaMask = () => {
      const isInstalled = typeof window !== 'undefined' && !!(window as any).ethereum;
      setHasMetaMask(isInstalled);
    };
    checkMetaMask();
  }, []);

  const handleStartTutorial = () => {
    setStep('steps');
    setCurrentStep(0);
  };

  const handleNext = async () => {
    if (currentStep === 0) {
      // Step 1: Check MetaMask
      if (hasMetaMask) {
        setCurrentStep(1);
      }
    } else if (currentStep === 1) {
      // Step 2: Connect wallet
      if (!account) {
        await connect();
      }
      setCurrentStep(2);
    } else if (currentStep === 2) {
      // Step 3: Book Timeslots
      setCurrentStep(3);
    } else if (currentStep === 3) {
      // Done
      onOpenChange(false);
      localStorage.setItem('roboad_tutorial_completed', 'true');
    }
  };

  const handleSkip = () => {
    onOpenChange(false);
    localStorage.setItem('roboad_tutorial_completed', 'true');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        {step === 'welcome' ? (
          <div className="text-center py-8 space-y-6">
            <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight">
              Welcome to ROBOAD
            </h1>
            <p className="text-muted-foreground text-lg max-w-md mx-auto">
              Would you like to learn how to use the platform?
            </p>
            <div className="flex items-center justify-center gap-4 pt-4">
              <Button variant="outline" onClick={handleSkip}>
                Skip
              </Button>
              <Button onClick={handleStartTutorial} className="btn-hero">
                Yes, Show Me
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="py-4">
            <h2 className="font-display text-2xl md:text-3xl font-bold mb-6 text-center">
              How It Works
            </h2>
            
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {features.map((feature, index) => {
                const isActive = index === currentStep;
                const isDone = index < currentStep;
                const isInactive = index > currentStep;
                
                return (
                  <div 
                    key={feature.number} 
                    className={`p-5 rounded-2xl border transition-all duration-300 ${
                      isActive 
                        ? 'bg-primary/10 border-primary shadow-lg' 
                        : isDone 
                          ? 'bg-green-500/10 border-green-500/30' 
                          : 'bg-muted/30 border-border opacity-50'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-sm ${isActive ? 'text-primary' : isDone ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {feature.number}
                      </span>
                      {isDone && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <h3 className={`font-display text-lg font-bold tracking-wide mb-1 ${isInactive ? 'text-muted-foreground' : ''}`}>
                      {feature.title}
                    </h3>
                    <p className={`text-sm leading-relaxed ${isInactive ? 'text-muted-foreground/50' : 'text-muted-foreground'}`}>
                      {feature.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* Step-specific content */}
            <div className="bg-muted/50 rounded-xl p-6 mb-6">
              {currentStep === 0 && (
                <div className="text-center space-y-4">
                  <Wallet className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-display text-xl font-bold">Do you have MetaMask installed?</h3>
                  {hasMetaMask ? (
                    <p className="text-green-500 flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      MetaMask is installed!
                    </p>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-muted-foreground">MetaMask is not detected.</p>
                      <a 
                        href="https://metamask.io/download/" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary underline text-sm"
                      >
                        Install MetaMask
                      </a>
                    </div>
                  )}
                </div>
              )}
              {currentStep === 1 && (
                <div className="text-center space-y-4">
                  <Wallet className="w-12 h-12 mx-auto text-primary" />
                  <h3 className="font-display text-xl font-bold">Connect Your Wallet</h3>
                  {account ? (
                    <p className="text-green-500 flex items-center justify-center gap-2">
                      <Check className="w-5 h-5" />
                      Wallet connected: {account.slice(0, 6)}...{account.slice(-4)}
                    </p>
                  ) : (
                    <p className="text-muted-foreground">
                      Click next to connect your MetaMask wallet.
                    </p>
                  )}
                </div>
              )}
              {currentStep === 2 && (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-xl font-bold">Book Timeslots</h3>
                  <p className="text-muted-foreground">
                    Select a location and time slot for your content 
                    to be displayed on autonomous robots!
                  </p>
                </div>
              )}
              {currentStep === 3 && (
                <div className="text-center space-y-4">
                  <h3 className="font-display text-xl font-bold">Pay with Crypto</h3>
                  <p className="text-muted-foreground">
                    Complete your reservation using USDT 
                    for seamless blockchain transactions!
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <Button variant="ghost" onClick={handleSkip}>
                Skip Tutorial
              </Button>
              <Button 
                onClick={handleNext} 
                className="btn-hero"
                disabled={currentStep === 0 && !hasMetaMask}
              >
                {currentStep === 3 ? 'Finish' : 'Next'}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}