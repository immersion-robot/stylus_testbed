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
  const { isConnected, account } = useMetaMask();

  const checkApprovalStatus = async () => {
    if (!isConnected || !account) {
      setIsApproved(false);
      return;
    }
    
    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const priceAmount = getPriceFromContentType(contentType);
      const currentAllowance = await checkAllowance(priceAmount);
      const requiredAmount = BigInt(priceAmount);
      setIsApproved(BigInt(currentAllowance) >= requiredAmount);
    } catch (error) {
      console.error('Allowance 확인 실패:', error);
      setIsApproved(false);
    }
  };

  // 다이얼로그가 열릴 때마다 allowance 확인
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
      toast.error('지갑을 먼저 연결해주세요.');
      return;
    }

    setIsApproving(true);
    setProcessingStep('USDT 승인 중...');

    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const priceAmount = getPriceFromContentType(contentType);
      
      await approveUSDT(priceAmount);
      
      setIsApproved(true);
      setIsApproving(false);
      setProcessingStep('');
      toast.success('USDT 승인이 완료되었습니다. 이제 결제할 수 있습니다.');
    } catch (error: any) {
      setIsApproving(false);
      setProcessingStep('');
      console.error('Approve 실패:', error);
    }
  };

  const handlePurchase = async () => {
    if (!isConnected || !account) {
      toast.error('지갑을 먼저 연결해주세요.');
      return;
    }

    if (!isApproved) {
      toast.error('먼저 USDT 승인을 완료해주세요.');
      return;
    }

    setIsPurchasing(true);
    setProcessingStep('구매 트랜잭션 전송 중...');

    try {
      const contentType = getContentTypeFromPrice(reservation.amount);
      const result = await purchaseContent(contentType);
      
      setIsPurchasing(false);
      setIsConfirmed(true);
      setProcessingStep('');
      
      toast.success('결제가 완료되었습니다!');
      
      setTimeout(() => {
        // purchaseContent는 { receipt, hash }를 반환
        const txHash = (result as any).hash || (result as any).transactionHash || (result as any)?.receipt?.transactionHash;
        if (txHash) {
          console.log('Transaction hash:', txHash);
          onConfirm(txHash);
        } else {
          console.error('Transaction hash not found in result:', result);
          toast.error('트랜잭션 해시를 가져올 수 없습니다.');
        }
        setIsConfirmed(false);
        setIsApproved(false);
        setProcessingStep('');
        onOpenChange(false);
      }, 2000);
    } catch (error: any) {
      setIsPurchasing(false);
      setProcessingStep('');
      console.error('Purchase 실패:', error);
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
              <span>USDT 승인 완료 - 결제할 수 있습니다</span>
            </div>
          )}

          {/* Processing Status */}
          {(isApproving || isPurchasing) && (
            <div className="flex flex-col items-center justify-center gap-3 p-4 bg-secondary rounded-xl">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm">
                {processingStep || '트랜잭션 처리 중...'}
              </span>
              <span className="text-xs text-muted-foreground">
                MetaMask에서 트랜잭션을 확인해주세요.
              </span>
            </div>
          )}

          {isConfirmed && (
            <div className="flex items-center justify-center gap-3 p-4 bg-green-500/10 text-green-600 rounded-xl">
              <CheckCircle className="w-5 h-5" />
              <span>결제가 완료되었습니다!</span>
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
