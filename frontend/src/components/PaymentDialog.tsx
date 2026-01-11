import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Reservation } from '@/types/content';
import { Wallet, CheckCircle, Clock, Loader2, Shield } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useContract } from '@/hooks/useContract';
import { useMetaMask } from '@/hooks/useMetaMask';
import { CONTRACT_CONFIG, CONTENT_TYPE_MAP, CONTENT_TYPE_PRICE } from '@/config/contracts';

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reservation: Omit<Reservation, 'id'>;
  onConfirm: (transactionHash: string) => void;
}

export function PaymentDialog({ open, onOpenChange, reservation, onConfirm }: PaymentDialogProps) {
  const [isApproving, setIsApproving] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>('');
  const { approveUSDT, purchaseContent, checkAllowance, getContentTypeFromPrice, getPriceFromContentType } = useContract();
  const { isConnected, account, accessToken } = useMetaMask();

  const checkApprovalStatus = async () => {
    if (!isConnected || !account) {
      setIsApproved(false);
      return;
    }
    
    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const requiredAmount = getPriceFromContentType(contentType);
      const currentAllowance = await checkAllowance(requiredAmount);
      const isApprovedValue = BigInt(currentAllowance) >= BigInt(requiredAmount);
      setIsApproved(isApprovedValue);
    } catch (error) {
      console.error('Failed to check allowance:', error);
      setIsApproved(false);
    }
  };

  // Check allowance whenever dialog opens
  useEffect(() => {
    if (open && isConnected && account) {
      checkApprovalStatus();
    } else {
      setIsApproved(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, isConnected, account, reservation.amount]);

  const handleApprove = async () => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first.');
      return;
    }

    setIsApproving(true);
    setProcessingStep('Approving USDT...');

    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const priceAmount = getPriceFromContentType(contentType);
      
      await approveUSDT(priceAmount);
      
      setIsApproved(true);
      setIsApproving(false);
      setProcessingStep('');
      toast.success('USDT approval completed. You can now proceed with payment.');
    } catch (error: any) {
      setIsApproving(false);
      setProcessingStep('');
      console.error('Approve failed:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected || !account) {
      toast.error('Please connect your wallet first.');
      return;
    }

    if (!isApproved) {
      toast.error('Please complete USDT approval first.');
      return;
    }

    setIsPurchasing(true);
    setProcessingStep('Sending purchase transaction...');

    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const result = await purchaseContent(contentType);
      
      setIsPurchasing(false);
      setIsConfirmed(true);
      setProcessingStep('');
      
      toast.success('Payment completed!');
      
      // purchaseContent returns { receipt, hash }
      const txHash = (result as any).hash || (result as any).transactionHash || (result as any)?.receipt?.transactionHash;
      
      if (txHash) {
        console.log('Transaction hash:', txHash);
        
        // Send payment information to API server on successful payment
        try {
          const contentType = getContentTypeFromPrice(reservation.amount);
          const priceAmount = getPriceFromContentType(contentType);
          
          const paymentData = {
            customerEmail: reservation.customerEmail || '',
            location: reservation.location,
            date: reservation.date,
            timeSlot: reservation.time, // Time Slot
            paymentMethod: reservation.paymentMethod,
            totalAmount: priceAmount, // wei unit, string format
            transactionHash: txHash, // Include transaction hash
            title: reservation.contentTitle, // Include content title
          };

          // Include Authorization header if accessToken exists
          const headers: HeadersInit = {
            'Content-Type': 'application/json',
          };

          if (accessToken) {
            headers['Authorization'] = `Bearer ${accessToken}`;
          }

          const response = await fetch(`${CONTRACT_CONFIG.API_BASE_URL}/api/v1/payments`, {
            method: 'POST',
            headers,
            body: JSON.stringify(paymentData),
          });

          if (response.ok) {
            const responseData = await response.json();
            console.log('Payment information sent to API server:', responseData);
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.error('Failed to send payment information to API server:', errorData);
            // Ignore error even if API send fails, since payment is completed
          }
        } catch (apiError: any) {
          console.error('Error sending payment information to API server:', apiError);
          // Ignore error even if API send fails, since payment is completed
        }

        setTimeout(() => {
          onConfirm(txHash);
          setIsConfirmed(false);
          setIsApproved(false);
          setProcessingStep('');
          onOpenChange(false);
        }, 2000);
      } else {
        console.error('Transaction hash not found in result:', result);
        toast.error('Failed to get transaction hash.');
        setIsPurchasing(false);
        setProcessingStep('');
      }
    } catch (error: any) {
      setIsPurchasing(false);
      setProcessingStep('');
      console.error('Purchase failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Confirm Payment</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Reservation Summary */}
          <div className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Content</span>
              <span className="font-medium">{reservation.contentTitle}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Location</span>
              <span className="font-medium">{reservation.location}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Date & Time</span>
              <span className="font-medium">{reservation.date} at {reservation.time} (2 Hours)</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Payment Method</span>
              <span className="font-medium">{reservation.paymentMethod}</span>
            </div>
          </div>

          {/* Amount */}
          <div className="bg-primary text-primary-foreground p-6 rounded-xl text-center">
            <p className="text-sm opacity-80 mb-1">Amount Due</p>
            <p className="text-3xl font-bold">
              ${reservation.amount} {reservation.paymentMethod}
            </p>
          </div>

          {/* Approval Status */}
          {isApproved && !isConfirmed && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
              <span>USDT approval completed - You can proceed with payment</span>
            </div>
          )}

          {/* Processing Status */}
          {(isApproving || isPurchasing) && (
            <div className="flex flex-col items-center justify-center gap-3 p-4 bg-secondary rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">
                {processingStep || 'Processing transaction...'}
              </span>
              <span className="text-xs text-muted-foreground">
                Please confirm the transaction in MetaMask.
              </span>
            </div>
          )}

          {isConfirmed && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
              <span>Payment completed!</span>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-row">
          <Button 
            variant="outline" 
            onClick={() => {
              setIsApproved(false);
              setIsApproving(false);
              setIsPurchasing(false);
              setIsConfirmed(false);
              onOpenChange(false);
            }}
            disabled={isApproving || isPurchasing}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          
          {!isApproved ? (
            <Button 
              onClick={handleApprove} 
              className="btn-hero w-full sm:w-auto"
              disabled={isApproving || !isConnected}
              type="button"
            >
              {isApproving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Approving...
                </>
              ) : !isConnected ? (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Connect Wallet First
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" />
                  Approve
                </>
              )}
            </Button>
          ) : (
            <Button 
              onClick={handlePurchase} 
              className="btn-hero w-full sm:w-auto"
              disabled={isPurchasing || isConfirmed || !isConnected}
              type="button"
            >
              {isPurchasing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Wallet className="w-4 h-4 mr-2" />
                  Pay
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
