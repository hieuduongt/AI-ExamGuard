import { useEffect, useState } from 'react';
import { fetchDiscoveredHubs, hasFirebaseConfig, isConnectCode, type DiscoveredHub } from '@/services/exam-sync';
const POLL_MS = 2000;
const SEARCH_ATTEMPTS = 3;
export type CodeSearch = {
    state: 'idle';
} | {
    state: 'searching';
} | {
    state: 'none';
} | {
    state: 'many';
    hubs: DiscoveredHub[];
};
const wait = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));
export function useHubDiscovery(active: boolean, connectTo: (address: string) => Promise<boolean>) {
    const [available, setAvailable] = useState(false);
    const [nearby, setNearby] = useState<DiscoveredHub[]>([]);
    const [code, setCode] = useState('');
    const [search, setSearch] = useState<CodeSearch>({ state: 'idle' });
    useEffect(() => {
        if (hasFirebaseConfig || !active)
            return;
        let cancelled = false;
        const poll = async () => {
            const hubs = await fetchDiscoveredHubs();
            if (cancelled)
                return;
            setAvailable(hubs !== null);
            setNearby(hubs ?? []);
        };
        void poll();
        const timer = window.setInterval(() => void poll(), POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(timer);
        };
    }, [active]);
    async function searchByCode(value = code) {
        if (!isConnectCode(value))
            return;
        setSearch({ state: 'searching' });
        for (let attempt = 0; attempt < SEARCH_ATTEMPTS; attempt += 1) {
            if (attempt)
                await wait(POLL_MS);
            const hubs = await fetchDiscoveredHubs(value) ?? [];
            if (hubs.length === 1) {
                setSearch({ state: 'idle' });
                await connectTo(hubs[0].hubUrl);
                return;
            }
            if (hubs.length > 1) {
                setSearch({ state: 'many', hubs });
                return;
            }
        }
        setSearch({ state: 'none' });
    }
    function changeCode(value: string) {
        const digits = value.replace(/\D/g, '').slice(0, 4);
        setCode(digits);
        setSearch({ state: 'idle' });
        if (digits.length === 4)
            void searchByCode(digits);
    }
    async function chooseHub(hub: DiscoveredHub) {
        setSearch({ state: 'idle' });
        await connectTo(hub.hubUrl);
    }
    return { available, nearby, code, search, changeCode, searchByCode, chooseHub };
}
