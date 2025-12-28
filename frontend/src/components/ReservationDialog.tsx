import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, MapPin, Clock, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { ContentItem, Reservation } from '@/types/content';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface ReservationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  content: ContentItem;
  onReserve: (reservation: Omit<Reservation, 'id'>) => void;
  existingReservations?: Reservation[];
}

const locations = [
  { id: 'seoul-gangnam', name: 'Gangnam, Seoul', price: 45 },
  { id: 'seoul-myeongdong', name: 'Myeongdong, Seoul', price: 45 },
  { id: 'seoul-samsung', name: 'Samsung, Seoul', price: 45 },
  { id: 'seoul-hongdae', name: 'Hongdae, Seoul', price: 45 },
  { id: 'seoul-itaewon', name: 'Itaewon, Seoul', price: 50 },
  { id: 'nyc-times-square', name: 'Times Square, New York', price: 50 },
  { id: 'london-piccadilly', name: 'Piccadilly Circus, London', price: 50 },
  { id: 'tokyo-shibuya', name: 'Shibuya Crossing, Tokyo', price: 55 },
  { id: 'paris-champs', name: 'Champs-Élysées, Paris', price: 55 },
  { id: 'dubai-downtown', name: 'Downtown Dubai', price: 55 },
];

// 2-hour time slots (minimum 2 hours as requested)
const timeSlots = [
  { start: '09:00', end: '11:00', label: '09:00 - 11:00' },
  { start: '11:00', end: '13:00', label: '11:00 - 13:00' },
  { start: '13:00', end: '15:00', label: '13:00 - 15:00' },
  { start: '15:00', end: '17:00', label: '15:00 - 17:00' },
  { start: '17:00', end: '19:00', label: '17:00 - 19:00' },
  { start: '19:00', end: '21:00', label: '19:00 - 21:00' },
];

export function ReservationDialog({ 
  open, 
  onOpenChange, 
  content, 
  onReserve,
  existingReservations = []
}: ReservationDialogProps) {
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const paymentMethod = 'USDT' as const;

  const selectedLocationData = locations.find(l => l.id === selectedLocation);

  // Get reserved slots for the selected date and location
  const reservedSlots = useMemo(() => {
    if (!selectedDate || !selectedLocation) return new Set<string>();
    
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const reserved = existingReservations
      .filter(r => 
        r.date === dateStr && 
        r.location === (selectedLocationData?.name || '') &&
        r.status === 'completed'
      )
      .map(r => r.time);
    
    return new Set(reserved);
  }, [selectedDate, selectedLocation, existingReservations, selectedLocationData]);

  const handleReserve = () => {
    if (!selectedLocation || !selectedDate || !selectedTime) {
      toast.error('Please fill in all reservation details');
      return;
    }
    if (!customerEmail || !customerEmail.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }

    onReserve({
      contentId: content.id,
      contentTitle: content.title,
      location: selectedLocationData?.name || '',
      time: selectedTime,
      date: format(selectedDate, 'yyyy-MM-dd'),
      status: 'completed',
      paymentMethod,
      amount: selectedLocationData?.price || 0,
      customerEmail,
    });

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Book Advertising Slot</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Content Info */}
          <div className="bg-secondary p-4 rounded-xl">
            <p className="text-sm text-muted-foreground">Content</p>
            <p className="font-medium">{content.title}</p>
          </div>

          {/* Customer Email */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Customer Email
            </Label>
            <Input
              type="email"
              placeholder="Enter your email address"
              value={customerEmail}
              onChange={(e) => setCustomerEmail(e.target.value)}
            />
          </div>

          {/* Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </Label>
            <Select value={selectedLocation} onValueChange={(v) => { setSelectedLocation(v); setSelectedTime(''); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {locations.map((loc) => (
                  <SelectItem key={loc.id} value={loc.id}>
                    {loc.name} - ${loc.price}/slot
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4" />
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !selectedDate && 'text-muted-foreground'
                  )}
                >
                  {selectedDate ? format(selectedDate, 'PPP') : 'Pick a date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => { setSelectedDate(date); setSelectedTime(''); }}
                  disabled={(date) => date < new Date()}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Time Slots */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Slot (2 hours minimum)
            </Label>
            <div className="grid grid-cols-2 gap-2">
              {timeSlots.map((slot) => {
                const isReserved = reservedSlots.has(slot.start);
                const isSelected = selectedTime === slot.start;
                
                return (
                  <Button
                    key={slot.start}
                    variant={isSelected ? 'default' : 'outline'}
                    className={cn(
                      'text-sm',
                      isReserved && 'opacity-50 cursor-not-allowed line-through'
                    )}
                    disabled={isReserved}
                    onClick={() => setSelectedTime(slot.start)}
                  >
                    {slot.label}
                    {isReserved && <span className="ml-1 text-xs">(Booked)</span>}
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <div className="p-3 bg-muted rounded-lg text-center">
              <span className="font-medium">USDT</span>
              <span className="text-muted-foreground text-sm ml-2">(Tether)</span>
            </div>
          </div>

          {/* Price Summary */}
          {selectedLocationData && (
            <div className="bg-primary text-primary-foreground p-4 rounded-xl">
              <div className="flex justify-between items-center">
                <span>Total Amount</span>
                <span className="text-2xl font-bold">
                  ${selectedLocationData.price} {paymentMethod}
                </span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleReserve} className="btn-hero">
            Proceed to Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}