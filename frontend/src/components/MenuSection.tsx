import { useState } from 'react';
import { Link } from 'react-router-dom';
import heroRobot from '@/assets/hero-robot.png';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

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
    description: 'Complete your reservation using USDC or USDT for seamless blockchain transactions.',
  },
];

export function MenuSection() {
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showContact, setShowContact] = useState(false);
  const [email, setEmail] = useState('');
  const { toast } = useToast();

  const menuLinks = [
    { number: '01', label: 'CREATE', path: '/create' },
    { number: '02', label: 'LIBRARY', path: '/library' },
    { number: '03', label: 'RESERVATIONS', path: '/reservations' },
  ];

  return (
    <>
      <section className="relative py-20 overflow-hidden">
        {/* Blurred Background Image */}
        <div className="absolute inset-0">
          <img 
            src={heroRobot} 
            alt="" 
            className="w-full h-full object-cover blur-3xl opacity-20 scale-150"
          />
          <div className="absolute inset-0 bg-background/90" />
        </div>

        <div className="container mx-auto px-6 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16">
            {/* Left Side - Logo and Newsletter */}
            <div className="space-y-8">
              <h2 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight">
                ROBOAD
              </h2>
              <div className="space-y-4">
                <p className="text-muted-foreground text-sm">Keep up with us</p>
                <p className="text-muted-foreground/70 text-sm">
                  Get news, photos, events, and business updates.
                </p>
              </div>
              <div className="flex items-center gap-4 max-w-sm">
                <input 
                  type="email" 
                  placeholder="Email Address*"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="flex-1 bg-background border border-border rounded-full px-4 py-3 text-sm focus:outline-none focus:border-foreground transition-colors"
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
                  className="px-6 py-3 bg-foreground text-background rounded-full text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  Sign Up
                </button>
              </div>
            </div>

            {/* Right Side - Navigation Links */}
            <div className="space-y-2">
              {menuLinks.map((link) => (
                <Link 
                  key={link.path + link.number}
                  to={link.path}
                  className="flex items-center gap-4 py-4 border-b border-border hover:border-foreground transition-colors group"
                >
                  <span className="text-sm text-muted-foreground w-8">{link.number}</span>
                  <span className="font-display text-xl md:text-2xl lg:text-3xl font-bold tracking-wide group-hover:translate-x-2 transition-transform">
                    {link.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* Copyright */}
          <div className="mt-16 pt-8 border-t border-border flex flex-wrap items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © ROBOAD 2025
            </p>
            <div className="flex items-center gap-6">
              <button 
                onClick={() => setShowTerms(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Terms & Conditions
              </button>
              <button 
                onClick={() => setShowPrivacy(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Privacy Policy
              </button>
              <button 
                onClick={() => setShowContact(true)}
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Contact
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Dialog */}
      <Dialog open={showHowItWorks} onOpenChange={setShowHowItWorks}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl md:text-4xl font-bold uppercase tracking-tight">
              Broadcast Your Content<br />
              To The Real World.
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground mb-8">
            Our autonomous advertising robots roam public spaces, 
            displaying your content to thousands of viewers daily.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((feature) => (
              <div 
                key={feature.number} 
                className="p-6 bg-muted/50 rounded-2xl border border-border"
              >
                <span className="text-sm text-muted-foreground">{feature.number}</span>
                <h3 className="font-display text-lg font-bold mt-3 mb-2 tracking-wide">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Terms & Conditions Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Terms & Conditions
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong className="text-foreground">1. Acceptance of Terms</strong><br />
            By accessing and using the ROBOAD platform, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.</p>
            
            <p><strong className="text-foreground">2. Service Description</strong><br />
            ROBOAD provides a platform for users to create, upload, and schedule content for display on autonomous advertising robots. Users can manage their content through our web interface.</p>
            
            <p><strong className="text-foreground">3. User Responsibilities</strong><br />
            Users are responsible for the content they create and upload. All content must comply with applicable laws and must not contain offensive, illegal, or harmful material.</p>
            
            <p><strong className="text-foreground">4. Payment Terms</strong><br />
            Payments are processed through cryptocurrency (USDC/USDT). All transactions are final and non-refundable unless otherwise specified.</p>
            
            <p><strong className="text-foreground">5. Intellectual Property</strong><br />
            Users retain ownership of their content. By uploading content, users grant ROBOAD a license to display the content on our robot network.</p>
            
            <p><strong className="text-foreground">6. Limitation of Liability</strong><br />
            ROBOAD is not liable for any indirect, incidental, or consequential damages arising from the use of our platform.</p>
            
            <p><strong className="text-foreground">7. Modifications</strong><br />
            We reserve the right to modify these terms at any time. Continued use of the platform constitutes acceptance of updated terms.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Privacy Policy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Privacy Policy
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p><strong className="text-foreground">1. Information We Collect</strong><br />
            We collect wallet addresses, email addresses (for newsletter subscriptions), and content you upload to our platform.</p>
            
            <p><strong className="text-foreground">2. How We Use Your Information</strong><br />
            Your information is used to provide our services, process transactions, and communicate with you about updates and promotions.</p>
            
            <p><strong className="text-foreground">3. Data Storage</strong><br />
            Your data is stored securely using industry-standard encryption. We retain your data for as long as necessary to provide our services.</p>
            
            <p><strong className="text-foreground">4. Third-Party Sharing</strong><br />
            We do not sell or share your personal information with third parties except as required by law or to provide our services.</p>
            
            <p><strong className="text-foreground">5. Cookies</strong><br />
            We use cookies to improve your experience on our platform. You can disable cookies in your browser settings.</p>
            
            <p><strong className="text-foreground">6. Security</strong><br />
            We implement appropriate security measures to protect your data. However, no method of transmission over the internet is 100% secure.</p>
            
            <p><strong className="text-foreground">7. Your Rights</strong><br />
            You have the right to access, correct, or delete your personal information. Contact us to exercise these rights.</p>
            
            <p><strong className="text-foreground">8. Contact</strong><br />
            For privacy-related inquiries, please contact us through our platform.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contact Dialog */}
      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl md:text-3xl font-bold uppercase tracking-tight">
              Contact Us
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 text-muted-foreground text-sm leading-relaxed">
            <p>If you have any questions or inquiries, please contact us at:</p>
            <a 
              href="mailto:sglee0411@immersion-robot.com"
              className="block text-primary font-medium text-lg hover:underline"
            >
              sglee0411@immersion-robot.com
            </a>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}