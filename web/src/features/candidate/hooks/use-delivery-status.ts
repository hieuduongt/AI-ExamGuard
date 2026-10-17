import { useCallback, useEffect, useState } from 'react';
import { DELIVERY_SIGNAL } from '@/services/browser-signals';
import { getPendingEventCount } from '@/services/exam-sync';
export function useDeliveryStatus() {
    const [deliveredIds, setDeliveredIds] = useState<string[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    useEffect(() => {
        const onDelivery = (event: Event) => {
            const { id } = (event as CustomEvent<{
                id: string;
            }>).detail;
            setDeliveredIds((items) => [...items.filter((item) => item !== id), id].slice(-500));
            setPendingCount(getPendingEventCount());
        };
        window.addEventListener(DELIVERY_SIGNAL, onDelivery);
        return () => window.removeEventListener(DELIVERY_SIGNAL, onDelivery);
    }, []);
    const refreshPendingCount = useCallback(() => setPendingCount(getPendingEventCount()), []);
    return { deliveredIds, pendingCount, refreshPendingCount };
}
