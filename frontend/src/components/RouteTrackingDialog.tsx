import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, MapPin, Navigation } from 'lucide-react';

interface RouteTrackingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: {
    contentTitle: string;
    location: string;
    date: string;
    time: string;
  } | null;
}

const LOCATION_ROUTES: Record<string, Array<{ id: string; name: string; location: string }>> = {
  'Gangnam, Seoul': [
    { id: 'A', name: 'Start Point', location: '강남역 10번 출구' },
    { id: 'B', name: 'Spot B', location: '강남 CGV 앞' },
    { id: 'C', name: 'Spot C', location: '강남역 사거리' },
    { id: 'D', name: 'Spot D', location: '신논현역 앞' },
    { id: 'E', name: 'End Point', location: '강남 교보타워' },
  ],
  'Samsung, Seoul': [
    { id: 'A', name: 'Start Point', location: '삼성역 5번 출구' },
    { id: 'B', name: 'Spot B', location: '코엑스 동문' },
    { id: 'C', name: 'Spot C', location: '스타필드 코엑스몰' },
    { id: 'D', name: 'Spot D', location: '코엑스 아쿠아리움' },
    { id: 'E', name: 'End Point', location: '현대백화점 무역센터점' },
  ],
  'Myeongdong, Seoul': [
    { id: 'A', name: 'Start Point', location: '명동역 8번 출구' },
    { id: 'B', name: 'Spot B', location: '명동 중앙거리' },
    { id: 'C', name: 'Spot C', location: '명동 롯데백화점' },
    { id: 'D', name: 'Spot D', location: '명동예술극장' },
    { id: 'E', name: 'End Point', location: '명동성당 입구' },
  ],
  'Hongdae, Seoul': [
    { id: 'A', name: 'Start Point', location: '홍대입구역 9번 출구' },
    { id: 'B', name: 'Spot B', location: '홍대 걷고싶은거리' },
    { id: 'C', name: 'Spot C', location: '홍대 놀이터 공원' },
    { id: 'D', name: 'Spot D', location: '홍대 AK&홍대' },
    { id: 'E', name: 'End Point', location: '연남동 연트럴파크' },
  ],
  'Itaewon, Seoul': [
    { id: 'A', name: 'Start Point', location: '이태원역 3번 출구' },
    { id: 'B', name: 'Spot B', location: '이태원 앤틱가구거리' },
    { id: 'C', name: 'Spot C', location: '경리단길 입구' },
    { id: 'D', name: 'Spot D', location: '이태원 해밀턴호텔' },
    { id: 'E', name: 'End Point', location: '이태원 세계음식거리' },
  ],
};

export function RouteTrackingDialog({ 
  open, 
  onOpenChange, 
  reservation 
}: RouteTrackingDialogProps) {
  if (!reservation) return null;

  // Get spots based on location, fallback to default route if not found
  const defaultRoute = [
    { id: 'A', name: 'Start Point', location: 'Starting Location' },
    { id: 'B', name: 'Spot B', location: 'Waypoint 1' },
    { id: 'C', name: 'Spot C', location: 'Waypoint 2' },
    { id: 'D', name: 'Spot D', location: 'Waypoint 3' },
    { id: 'E', name: 'End Point', location: 'Final Destination' },
  ];
  const spots = LOCATION_ROUTES[reservation.location] || defaultRoute;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-xl font-bold">
            Robot Broadcast Route
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Reservation Info */}
          <div className="bg-secondary/50 rounded-lg p-4">
            <h3 className="font-semibold mb-2">{reservation.contentTitle}</h3>
            <div className="text-sm text-muted-foreground space-y-1">
              <p>{reservation.location} • {reservation.date}</p>
              <p>{reservation.time} (2 Hours)</p>
            </div>
          </div>

          {/* Route Progress */}
          <div className="relative">
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
                <Navigation className="w-4 h-4" />
                Scheduled Route
              </span>
            </div>

            {/* Route Steps */}
            <div className="flex items-center justify-between relative px-2">
              {/* Connecting Line */}
              <div className="absolute top-6 left-8 right-8 h-0.5 bg-border z-0">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/30" 
                     style={{ width: '100%' }} />
              </div>

              {spots.map((spot, index) => (
                <div key={spot.id} className="flex flex-col items-center z-10">
                  <div className={`
                    w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all
                    ${index === 0 
                      ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                      : 'bg-secondary border border-border'
                    }
                  `}>
                    {index === 0 ? (
                      <CheckCircle className="w-6 h-6" />
                    ) : (
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                  <span className="text-xs font-medium text-center">
                    Spot {spot.id}
                  </span>
                  <span className="text-[10px] text-muted-foreground text-center max-w-[60px] leading-tight mt-1">
                    {spot.location}
                  </span>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Start</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-secondary border border-border" />
                <span>Waypoint</span>
              </div>
            </div>
          </div>

          {/* Route Info */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary">5</p>
              <p className="text-xs text-muted-foreground">Spots</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary">2.5</p>
              <p className="text-xs text-muted-foreground">km Route</p>
            </div>
            <div className="bg-secondary/50 rounded-lg p-3">
              <p className="text-2xl font-bold text-primary">2</p>
              <p className="text-xs text-muted-foreground">Hours</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

