
export const playSound = (type: 'start' | 'success' | 'timer' | 'complete') => {
    const audio = new Audio(`/sounds/${type}.wav`);
    audio.volume = 0.5;
    audio.play().catch(e => {
        if (e.name !== 'NotAllowedError') {
            console.warn("Audio play failed", e);
        }
    });
};
