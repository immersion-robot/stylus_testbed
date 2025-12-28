import { Header } from '@/components/Header';
import { useContent } from '@/contexts/ContentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, MapPin, CheckCircle, 
  ExternalLink, Copy, Mail 
} from 'lucide-react';
import { toast } from 'sonner';

const Reservations = () => {
  const { reservations } = useContent();

  const completedReservations = reservations.filter(r => r.status === 'completed');

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Transaction hash copied!');
  };

  const ReservationCard = ({ reservation }: { reservation: typeof reservations[0] }) => {
    return (
      <div className="glass-card p-6 hover:border-primary/30 transition-all duration-300">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-display text-lg font-bold">{reservation.contentTitle}</h3>
            <Badge className="bg-primary/10 text-primary">
              <CheckCircle className="w-3 h-3 mr-1" />
              Completed
            </Badge>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">${reservation.amount}</p>
            <p className="text-sm text-muted-foreground">{reservation.paymentMethod}</p>
          </div>
        </div>

        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span>{reservation.location}</span>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span>{reservation.date}</span>
          </div>
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <span>{reservation.time} (2 Hours)</span>
          </div>
          {reservation.customerEmail && (
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span>{reservation.customerEmail}</span>
            </div>
          )}
        </div>

        {reservation.transactionHash && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground mb-2">Transaction Hash</p>
            <div className="flex items-center gap-2">
              <code className="text-xs bg-secondary px-2 py-1 rounded flex-1 truncate">
                {reservation.transactionHash}
              </code>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => copyTxHash(reservation.transactionHash!)}
              >
                <Copy className="w-4 h-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => window.open(`https://etherscan.io/tx/${reservation.transactionHash}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="pt-24 pb-12">
        <div className="container mx-auto px-6">
          <div className="mb-8">
            <h1 className="font-display text-4xl font-bold mb-2">Reservations</h1>
            <p className="text-muted-foreground">
              Track your completed broadcasts.
            </p>
          </div>

          {completedReservations.length === 0 ? (
            <div className="text-center py-20 glass-card">
              <div className="w-20 h-20 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">No Reservations Yet</h2>
              <p className="text-muted-foreground mb-6">
                Book a broadcast slot from your content library.
              </p>
              <Button asChild className="btn-hero">
                <a href="/library">Go to Library</a>
              </Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedReservations.map((reservation) => (
                <ReservationCard key={reservation.id} reservation={reservation} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Reservations;
