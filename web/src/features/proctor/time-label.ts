export function timeLabel(timestamp: number) {
    const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (seconds < 10)
        return 'vừa xong';
    if (seconds < 60)
        return `${seconds} giây trước`;
    if (seconds < 3600)
        return `${Math.floor(seconds / 60)} phút trước`;
    return new Date(timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}
