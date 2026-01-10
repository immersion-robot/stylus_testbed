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
    tokenId?: string;
    waypoint?: number; // 1=A, 2=B, 3=C, 4=D, 5=E
  } | null;
}

const LOCATION_ROUTES: Record<string, Array<{ id: string; name: string; location: string }>> = {
  'Gangnam, Seoul': [
    { id: 'A', name: 'Start Point', location: 'Gangnam Stn. Exit 10' },
    { id: 'B', name: 'Spot B', location: 'Gangnam CGV' },
    { id: 'C', name: 'Spot C', location: 'Gangnam Intersection' },
    { id: 'D', name: 'Spot D', location: 'Sinnonhyeon Stn.' },
    { id: 'E', name: 'End Point', location: 'Kyobo Tower' },
  ],
  'Samsung, Seoul': [
    { id: 'A', name: 'Start Point', location: 'Samsung Stn. Exit 5' },
    { id: 'B', name: 'Spot B', location: 'COEX East Gate' },
    { id: 'C', name: 'Spot C', location: 'Starfield COEX' },
    { id: 'D', name: 'Spot D', location: 'COEX Aquarium' },
    { id: 'E', name: 'End Point', location: 'Hyundai Trade Center' },
  ],
  'Myeongdong, Seoul': [
    { id: 'A', name: 'Start Point', location: 'Myeongdong Stn. Exit 8' },
    { id: 'B', name: 'Spot B', location: 'Central Street' },
    { id: 'C', name: 'Spot C', location: 'Lotte Dept. Store' },
    { id: 'D', name: 'Spot D', location: 'Art Theater' },
    { id: 'E', name: 'End Point', location: 'Cathedral' },
  ],
  'Hongdae, Seoul': [
    { id: 'A', name: 'Start Point', location: 'Hongik Stn. Exit 9' },
    { id: 'B', name: 'Spot B', location: 'Pedestrian Street' },
    { id: 'C', name: 'Spot C', location: 'Playground Park' },
    { id: 'D', name: 'Spot D', location: 'AK Plaza' },
    { id: 'E', name: 'End Point', location: 'Yeonnam Park' },
  ],
  'Itaewon, Seoul': [
    { id: 'A', name: 'Start Point', location: 'Itaewon Stn. Exit 3' },
    { id: 'B', name: 'Spot B', location: 'Antique Street' },
    { id: 'C', name: 'Spot C', location: 'Gyeongridan-gil' },
    { id: 'D', name: 'Spot D', location: 'Hamilton Hotel' },
    { id: 'E', name: 'End Point', location: 'Food Street' },
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
  
  // 현재 waypoint (1=A, 2=B, 3=C, 4=D, 5=E), 기본값은 1 (A)
  const currentWaypoint = reservation.waypoint || 1;
  
  // Waypoint를 인덱스로 변환 (1=A=0, 2=B=1, 3=C=2, 4=D=3, 5=E=4)
  const currentWaypointIndex = currentWaypoint - 1;
  
  // 진행률 계산 (현재 waypoint / 전체 waypoint 수)
  const progressPercentage = ((currentWaypointIndex + 1) / spots.length) * 100;

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
            <div className="flex items-start relative px-2">
              {/* Connecting Line */}
              <div className="absolute top-6 left-8 right-8 h-0.5 bg-border z-0">
                <div 
                  className="absolute inset-0 bg-gradient-to-r from-primary via-primary to-primary/30 transition-all duration-500" 
                  style={{ width: `${progressPercentage}%` }} 
                />
              </div>

              {spots.map((spot, index) => {
                // 현재 waypoint 이하인 경우 완료된 것으로 표시
                const isCompleted = index <= currentWaypointIndex;
                const isCurrent = index === currentWaypointIndex;
                
                return (
                  <div key={spot.id} className="flex-1 flex flex-col items-center z-10">
                    <div className={`
                      w-12 h-12 rounded-xl flex items-center justify-center mb-2 transition-all flex-shrink-0
                      ${isCompleted
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                        : 'bg-secondary border border-border'
                      }
                      ${isCurrent ? 'ring-2 ring-primary ring-offset-2' : ''}
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="w-6 h-6 flex-shrink-0" />
                      ) : (
                        <MapPin className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      )}
                    </div>
                    <div className="text-center w-full">
                      <span className="text-xs font-medium block">
                        Spot {spot.id}
                      </span>
                      <span className="text-[10px] text-muted-foreground block max-w-[60px] mx-auto leading-tight mt-1">
                        {spot.location}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-8 flex items-center justify-center gap-6 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-primary" />
                <span>Completed</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-secondary border border-border" />
                <span>Pending</span>
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

