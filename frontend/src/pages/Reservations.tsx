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

  // localStorage에서 메타데이터 복원
  const getStoredReservations = (): Reservation[] => {
    try {
      const stored = localStorage.getItem(`reservations_${account}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  // localStorage에 메타데이터 저장
  const saveReservationsToStorage = (reservationsData: Reservation[]) => {
    if (!account) return;
    try {
      localStorage.setItem(`reservations_${account}`, JSON.stringify(reservationsData));
    } catch (error) {
      console.error('Failed to save reservations to localStorage:', error);
    }
  };

  // 컨트랙트에서 구매 내역 조회 (초기 로드 및 reservations/contents 변경 시)
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
        
        // PurchaseEvent를 Reservation 형태로 변환
        const contractReservationsData: Reservation[] = await Promise.all(
          events.map(async (event) => {
            // 가격 계산 (6자리 소수점)
            const priceInWei = BigInt(event.amount);
            const priceInUSDT = Number(priceInWei) / 1_000_000; // 6자리 소수점
            
            // contentType에 따른 가격 매핑
            const contentType = event.contentType;
            const amount = priceInUSDT;
            
            // Waypoint 조회
            const waypoint = await getWaypoint(event.tokenId);
            
            // 기본 location (contentType에 따라 매핑하거나 기본값 사용)
            const locationMap: Record<number, string> = {
              1: 'Gangnam, Seoul',
              2: 'Samsung, Seoul',
              3: 'Myeongdong, Seoul',
            };
            
            // localStorage에서 저장된 메타데이터 복원
            const storedReservations = getStoredReservations();
            const storedReservation = storedReservations.find(
              r => r.tokenId === event.tokenId || r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            );
            
            // 기존 예약 데이터에서 동일한 tokenId나 transactionHash로 매칭 (메타데이터 보존)
            const existingReservation = reservationsRef.current.find(
              r => r.tokenId === event.tokenId || r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            ) || storedReservation;
            
            // ContentContext의 reservations에서 transactionHash로 매칭하여 선택한 날짜/시간 가져오기
            const matchedReservation = reservations.find(
              r => r.transactionHash?.toLowerCase() === event.transactionHash.toLowerCase()
            );
            
            // ContentContext의 contents에서 contentId로 매칭하여 실제 콘텐츠 제목 가져오기
            const contentId = existingReservation?.contentId || matchedReservation?.contentId || `content-${event.tokenId}`;
            const matchedContent = contents.find(c => c.id === contentId);
            
            // 우선순위: 기존/저장된 데이터(메타데이터 보존) > matchedContent > matchedReservation > 기본값
            const contentTitle = existingReservation?.contentTitle || 
              matchedContent?.title || 
              matchedReservation?.contentTitle || 
              `Content Purchase #${event.tokenId}`;
            
            // 매칭된 예약이 있으면 선택한 날짜/시간 사용, 없으면 구매 시간 사용
            // 기존/저장된 데이터가 있으면 그 데이터를 우선 사용 (메타데이터 보존)
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
              waypoint: existingReservation?.waypoint || (waypoint > 0 ? waypoint : 1), // 기존 waypoint 보존, 없으면 새로 조회한 값 사용
              customerEmail: existingReservation?.customerEmail || matchedReservation?.customerEmail,
            };
          })
        );
        
        // 최신순으로 정렬 (tokenId 내림차순)
        contractReservationsData.sort((a, b) => {
          const tokenIdA = BigInt(a.tokenId || '0');
          const tokenIdB = BigInt(b.tokenId || '0');
          return tokenIdA > tokenIdB ? -1 : tokenIdA < tokenIdB ? 1 : 0;
        });
        
        setContractReservations(contractReservationsData);
        reservationsRef.current = contractReservationsData;
        
        // localStorage에 메타데이터 저장 (waypoint 제외하고 메타데이터만 저장)
        const metadataToStore = contractReservationsData.map(({ waypoint, ...rest }) => rest);
        saveReservationsToStorage(metadataToStore);
      } catch (error) {
        console.error('구매 내역 조회 실패:', error);
        toast.error('구매 내역을 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPurchases();
    // reservations와 contents는 초기 로드 시 메타데이터를 가져오기 위해 필요
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConnected, account, getPurchaseEvents, getWaypoint, reservations, contents]);

  // Waypoint만 업데이트하는 별도 useEffect (기존 데이터는 유지)
  useEffect(() => {
    if (!isConnected || !account) {
      return;
    }

    let isMounted = true;

    const updateWaypoints = async () => {
      if (!isMounted) return;
      
      try {
        // 현재 상태를 기반으로 waypoint만 업데이트
        // 함수형 업데이트를 사용하여 항상 최신 상태를 가져옴
        const currentReservations = reservationsRef.current;
        if (currentReservations.length === 0) return;

        const updatedReservations = await Promise.all(
          currentReservations.map(async (reservation) => {
            if (!reservation.tokenId) return reservation;
            
            const waypoint = await getWaypoint(reservation.tokenId);
            // 기존 데이터를 모두 유지하면서 waypoint만 업데이트
            return {
              ...reservation,
              waypoint: waypoint > 0 ? waypoint : 1,
            };
          })
        );

        // 컴포넌트가 마운트되어 있을 때만 업데이트
        if (isMounted) {
          setContractReservations(updatedReservations);
          reservationsRef.current = updatedReservations;
          
          // localStorage에 메타데이터 저장 (waypoint 제외하고 메타데이터만 저장)
          const metadataToStore = updatedReservations.map(({ waypoint, ...rest }) => rest);
          saveReservationsToStorage(metadataToStore);
        }
      } catch (error) {
        console.error('Waypoint 업데이트 실패:', error);
      }
    };

    // 주기적으로 waypoint 업데이트 (5초마다)
    const interval = setInterval(updateWaypoints, 5000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isConnected, account, getWaypoint]);

  // 컨트랙트에서 가져온 예약 정보 사용 (이미 매칭 완료됨)
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
