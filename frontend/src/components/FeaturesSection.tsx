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

export function FeaturesSection() {
  return (
    <section id="features" className="py-24 bg-muted/30">
      <div className="container mx-auto px-6">
        {/* Header */}
        <div className="grid lg:grid-cols-2 gap-12 mb-16">
          <div>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold uppercase tracking-tight">
              Broadcast Your Content<br />
              To The Real World.
            </h2>
          </div>
          <div className="flex items-center">
            <p className="text-muted-foreground text-lg max-w-md">
              Our autonomous advertising robots roam public spaces, 
              displaying your content to thousands of viewers daily.
            </p>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <div 
              key={feature.number} 
              className="p-6 bg-background rounded-2xl border border-border hover:border-foreground/20 transition-colors"
            >
              <span className="text-sm text-muted-foreground">{feature.number}</span>
              <h3 className="font-display text-xl font-bold mt-4 mb-3 tracking-wide">{feature.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}