export function encodeWAV(samples: Uint8Array, sampleRate = 24000): Buffer {
    const buffer = new ArrayBuffer(44 + samples.length);
    const view = new DataView(buffer);

    const writeString = (view: DataView, offset: number, string: string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    };

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // 1 channel
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); // byte rate (sr * channels * 2)
    view.setUint16(32, 2, true); // block align (channels * 2)
    view.setUint16(34, 16, true); // 16-bit
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length, true);

    // Write PCM samples
    for (let i = 0; i < samples.length; i++) {
        view.setUint8(44 + i, samples[i]);
    }

    return Buffer.from(buffer);
}
