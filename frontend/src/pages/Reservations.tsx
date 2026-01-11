import { useState, useEffect, useRef } from 'react';
import { Header } from '@/components/Header';
import { useContent } from '@/contexts/ContentContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar, Clock, MapPin, CheckCircle, 
  ExternalLink, Copy, Mail, Navigation, Loader2
} from 'lucide-react';
import { toast } from 'sonner';
import { RouteTrackingDialog } from '@/components/RouteTrackingDialog';
import { Reservation } from '@/types/content';
import { useMetaMask } from '@/hooks/useMetaMask';
import { useContract } from '@/hooks/useContract';
import { CONTENT_TYPE_PRICE } from '@/config/contracts';

const Reservations = () => {
  const { reservations, contents } = useContent();
  const { account, isConnected } = useMetaMask();
  const { getPurchaseEvents, getWaypoint } = useContract();
  const [routeDialogOpen, setRouteDialogOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState<Reservation | null>(null);
  const [contractReservations, setContractReservations] = useState<Reservation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const reservationsRef = useRef<Reservation[]>([]);

  // Restore metadata from localStorage
  const getStoredReservations = (): Reservation[] => {
    try {
      const stored = localStorage.getItem(`reservations_${account}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // Save metadata to localStorage
  const saveReservationsToStorage = (reservationsData: Reservation[]) => {
    if (!account) return;
    try {
      localStorage.setItem(`reservations_${account}`, JSON.stringify(reservationsData));
    } catch (error) {
      console.error('Failed to save reservations to localStorage:', error);
    }
  };

  // Fetch purchase history from contract (on initial load and when reservations/contents change)
  useEffect(() => {
    const fetchPurchases = async () => {
      if (!isConnected || !account) {
        setContractReservations([]);
        reservationsRef.current = [];
        return;
      }

      setIsLoading(true);
      try {
        const events = await getPurchaseEvents(account);
        
        // Convert PurchaseEvent to Reservation format
        const contractReservationsData: Reservation[] = await Promise.all(
          events.map(async (event) => {
            // Calculate price (6 decimal places)
            const priceInWei = BigInt(event.amount);
            const priceInUSDT = Number(priceInWei) / 1_000_000; // 6 decimal places
            
            // Map price based on contentType
            const contentType = event.contentType;
            const amount = priceInUSDT;
            
            // Get waypoint
            const waypoint = await getWaypoint(event.tokenId);
            
            // Default location (map by contentType or use default)
            const locationMap: Record<number, string> = {
              1: 'Gangnam, Seoul',
              2: 'Samsung, Seoul',
              3: 'Myeongdong, Seoul',
            };
            
            // Restore stored metadata from localStorage
            const storedReservations = getStoredReservations();
            const storedReservation = storedReservations.find(
              r => r.tokenId === event.tokenId || r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            );
            
            // Match by same tokenId or transactionHash from existing reservation data (preserve metadata)
            const existingReservation = reservationsRef.current.find(
              r => r.tokenId === event.tokenId || r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            ) || storedReservation;
            
            // Match by transactionHash from ContentContext reservations to get selected date/time
            const matchedReservation = reservations.find(
              r => r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            );
            
            // Match by contentId from ContentContext contents to get actual content title
            const contentId = existingReservation?.contentId || matchedReservation?.contentId || `content-${event.tokenId}`;
            const matchedContent = contents.find(c => c.id === contentId);
            
            // Priority: existing/stored data (preserve metadata) > matchedContent > matchedReservation > default
            const contentTitle = existingReservation?.contentTitle || 
              matchedContent?.title || 
              matchedReservation?.contentTitle || 
              `Content Purchase #${event.tokenId}`;
            
            // Use selected date/time if matched reservation exists, otherwise use purchase time
            // Use existing/stored data first if available (preserve metadata)
            const date = existingReservation?.date || matchedReservation?.date || (() => {
              const purchaseDate = new Date(Number(event.purchaseTime) * 1000);
              return purchaseDate.toISOString().split('T')[0];
            })();
            const time = existingReservation?.time || matchedReservation?.time || (() => {
              const purchaseDate = new Date(Number(event.purchaseTime) * 1000);
              return purchaseDate.toTimeString().split(' ')[0].slice(0, 5);
            })();
            
            return {
              id: event.tokenId,
              contentId,
              contentTitle,
              location: existingReservation?.location || matchedReservation?.location || locationMap[contentType] || 'Gangnam, Seoul',
              date,
              time,
              status: 'completed' as const,
              paymentMethod: 'USDT' as const,
              amount,
              transactionHash: event.transactionHash,
              tokenId: event.tokenId,
              contentType,
              waypoint: existingReservation?.waypoint || (waypoint > 0 ? waypoint : 1), // Preserve existing waypoint, use newly fetched value if not available
              customerEmail: existingReservation?.customerEmail || matchedReservation?.customerEmail,
            };
          })
        );
        
        // Sort by latest first (tokenId descending)
        contractReservationsData.sort((a, b) => {
          const tokenIdA = BigInt(a.tokenId || '0');
          const tokenIdB = BigInt(b.tokenId || '0');
          return tokenIdA > tokenIdB ? -1 : tokenIdA < tokenIdB ? 1 : 0;
        });
        
        setContractReservations(contractReservationsData);
        reservationsRef.current = contractReservationsData;
        
        // Save metadata to localStorage (save only metadata, exclude waypoint)
        const metadataToStore = contractReservationsData.map(({ waypoint, ...rest }) => rest);
        saveReservationsToStorage(metadataToStore);
      } catch (error) {
        console.error('Failed to fetch purchase history:', error);
        toast.error('Failed to load purchase history.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();
    // reservations and contents are needed to get metadata on initial load
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account, getPurchaseEvents, getWaypoint, reservations, contents]);

  // Separate useEffect to update only waypoint (preserve existing data)
  useEffect(() => {
    if (!isConnected || !account) {
      return;
    }

    let isMounted = true;

    const updateWaypoints = async () => {
      if (!isMounted) return;
      
      try {
        // Update only waypoint based on current state
        // Use functional update to always get latest state
        const currentReservations = reservationsRef.current;
        if (currentReservations.length === 0) return;

        const updatedReservations = await Promise.all(
          currentReservations.map(async (reservation) => {
            if (!reservation.tokenId) return reservation;
            
            const waypoint = await getWaypoint(reservation.tokenId);
            // Preserve all existing data and update only waypoint
            return {
              ...reservation,
              waypoint: waypoint > 0 ? waypoint : 1,
            };
          })
        );

        // Update only when component is mounted
        if (isMounted) {
          setContractReservations(updatedReservations);
          reservationsRef.current = updatedReservations;
          
          // Save metadata to localStorage (save only metadata, exclude waypoint)
          const metadataToStore = updatedReservations.map(({ waypoint, ...rest }) => rest);
          saveReservationsToStorage(metadataToStore);
        }
      } catch (error) {
        console.error('Failed to update waypoint:', error);
      }
    };

    // Periodically update waypoint (every 5 seconds)
    const interval = setInterval(updateWaypoints, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, account, getWaypoint]);

  // Use reservation info from contract (already matched)
  const completedReservations = contractReservations.filter(r => r.status === 'completed');

  const copyTxHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Transaction hash copied!');
  };

  const handleViewRoute = (reservation: Reservation) => {
    setSelectedReservation(reservation);
    setRouteDialogOpen(true);
  };

  const ReservationCard = ({ reservation }: { reservation: Reservation }) => {
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

        {reservation.tokenId && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">No. {reservation.tokenId}</p>
              {reservation.waypoint && (
                <Badge variant="outline" className="text-xs">
                  Waypoint: {['A', 'B', 'C', 'D', 'E'][reservation.waypoint - 1] || 'A'}
                </Badge>
              )}
            </div>
          </div>
        )}

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
                onClick={() => window.open(`http://localhost/tx/${reservation.transactionHash}`, '_blank')}
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 pt-4 border-t border-border">
          <Button 
            variant="outline" 
            size="sm"
            className="w-full"
            onClick={() => handleViewRoute(reservation)}
          >
            <Navigation className="w-4 h-4 mr-2" />
            View Route
          </Button>
        </div>
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
            {account && (
              <p className="text-sm text-muted-foreground mt-2">
                Connected: {account.slice(0, 6)}...{account.slice(-4)}
              </p>
            )}
          </div>

          {!isConnected ? (
            <div className="text-center py-20 glass-card">
              <div className="w-20 h-20 mx-auto bg-secondary rounded-2xl flex items-center justify-center mb-6">
                <CheckCircle className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-2">Wallet Not Connected</h2>
              <p className="text-muted-foreground mb-6">
                Please connect your wallet to view your reservations.
              </p>
            </div>
          ) : isLoading ? (
            <div className="text-center py-20 glass-card">
              <Loader2 className="w-10 h-10 mx-auto animate-spin text-primary mb-4" />
              <p className="text-muted-foreground">Loading your reservations...</p>
            </div>
          ) : completedReservations.length === 0 ? (
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

      {/* Route Tracking Dialog */}
      <RouteTrackingDialog
        open={routeDialogOpen}
        onOpenChange={setRouteDialogOpen}
        reservation={selectedReservation}
      />
    </div>
  );
};

export default Reservations;
