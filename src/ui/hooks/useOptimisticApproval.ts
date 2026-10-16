import { useState, useRef, useEffect, useCallback } from 'react';

interface UseOptimisticApprovalOptions {
  onCommit: (orderId: string, paymentMethod: string) => void;
  showToast: (message: string, severity?: 'success' | 'error') => void;
  timeoutMs?: number;
}

export function useOptimisticApproval({
  onCommit,
  showToast,
  timeoutMs = 5000,
}: UseOptimisticApprovalOptions) {
  const [pendingApproval, setPendingApproval] = useState<string | null>(null);
  const approvalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const commitCallbackRef = useRef(onCommit);
  useEffect(() => {
    commitCallbackRef.current = onCommit;
  }, [onCommit]);

  const triggerApproval = useCallback(
    (orderId: string, paymentMethod: string) => {
      if (approvalTimeoutRef.current) {
        clearTimeout(approvalTimeoutRef.current);
      }

      setPendingApproval(orderId);
      showToast('Pedido aprobado. Deshacer disponible...', 'success');

      approvalTimeoutRef.current = setTimeout(() => {
        commitCallbackRef.current(orderId, paymentMethod);
        setPendingApproval(null);
        approvalTimeoutRef.current = null;
      }, timeoutMs);
    },
    [showToast, timeoutMs]
  );

  const handleUndoApprove = useCallback(() => {
    if (approvalTimeoutRef.current) {
      clearTimeout(approvalTimeoutRef.current);
      approvalTimeoutRef.current = null;
    }
    setPendingApproval(null);
    showToast('Aprobación cancelada');
  }, [showToast]);

  useEffect(() => {
    return () => {
      if (approvalTimeoutRef.current) {
        clearTimeout(approvalTimeoutRef.current);
      }
    };
  }, []);

  return {
    pendingApproval,
    triggerApproval,
    handleUndoApprove,
  };
}
