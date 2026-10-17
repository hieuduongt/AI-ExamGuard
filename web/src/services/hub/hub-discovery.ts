import { fetchWithTimeout } from './hub-transport';
export interface DiscoveredHub {
    hubUrl: string;
    room: string;
    host: string;
    version: string;
}
export function isConnectCode(value: string) {
    return /^\d{4}$/.test(value.trim());
}
export function roomKey(value: string) {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .replace('THI', '');
}
export function sameRoom(hubRoom: string, candidateRoom: string) {
    const key = roomKey(hubRoom);
    return Boolean(key) && key === roomKey(candidateRoom);
}
export async function fetchDiscoveredHubs(code = ''): Promise<DiscoveredHub[] | null> {
    if (typeof window === 'undefined')
        return null;
    const url = new URL('/api/discover', window.location.origin);
    if (code)
        url.searchParams.set('code', code.trim());
    try {
        const response = await fetchWithTimeout(url.href);
        if (!response.ok)
            return null;
        const payload = await response.json() as {
            ok?: boolean;
            running?: boolean;
            hubs?: DiscoveredHub[];
        };
        return payload.ok && payload.running && Array.isArray(payload.hubs) ? payload.hubs : null;
    }
    catch {
        return null;
    }
}
