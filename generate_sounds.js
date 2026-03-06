
const fs = require('fs');
const path = require('path');

function writeWav(filename, samples, sampleRate = 44100) {
    const buffer = Buffer.alloc(44 + samples.length * 2);

    // RIFF chunk descriptor
    buffer.write('RIFF', 0);
    buffer.writeUInt32LE(36 + samples.length * 2, 4);
    buffer.write('WAVE', 8);

    // fmt sub-chunk
    buffer.write('fmt ', 12);
    buffer.writeUInt32LE(16, 16); // Subchunk1Size
    buffer.writeUInt16LE(1, 20); // AudioFormat (1 = PCM)
    buffer.writeUInt16LE(1, 22); // NumChannels (1 = Mono)
    buffer.writeUInt32LE(sampleRate, 24); // SampleRate
    buffer.writeUInt32LE(sampleRate * 2, 28); // ByteRate
    buffer.writeUInt16LE(2, 32); // BlockAlign
    buffer.writeUInt16LE(16, 34); // BitsPerSample

    // data sub-chunk
    buffer.write('data', 36);
    buffer.writeUInt32LE(samples.length * 2, 40);

    for (let i = 0; i < samples.length; i++) {
        let sample = Math.max(-1, Math.min(1, samples[i]));
        sample = sample * 32767;
        buffer.writeInt16LE(sample, 44 + i * 2);
    }

    fs.writeFileSync(filename, buffer);
    console.log(`Generated ${filename}`);
}

function generateNote(freq, duration, sampleRate = 44100) {
    const samples = [];
    const totalSamples = duration * sampleRate;
    for (let i = 0; i < totalSamples; i++) {
        const t = i / sampleRate;
        const envelope = Math.min(1, i / 500) * Math.max(0, 1 - i / totalSamples); // Attack and Decay
        samples.push(Math.sin(2 * Math.PI * freq * t) * envelope);
    }
    return samples;
}

function mix(buffers) {
    const maxLength = Math.max(...buffers.map(b => b.length));
    const result = new Array(maxLength).fill(0);
    for (const buffer of buffers) {
        for (let i = 0; i < buffer.length; i++) {
            result[i] += buffer[i] / buffers.length;
        }
    }
    return result;
}

function concat(buffers) {
    return buffers.flat();
}

const OUT_DIR = path.join(__dirname, 'public', 'sounds');
if (!fs.existsSync(OUT_DIR)) {
    fs.mkdirSync(OUT_DIR, { recursive: true });
}

// 1. Start Sound (Ascending Chime)
const start = concat([
    generateNote(523.25, 0.1), // C5
    generateNote(659.25, 0.1), // E5
    generateNote(783.99, 0.4)  // G5
]);
writeWav(path.join(OUT_DIR, 'start.wav'), start);

// 2. Success (High Ping for "Exercise Done")
const success = generateNote(1046.50, 0.3); // C6
writeWav(path.join(OUT_DIR, 'success.wav'), success);

// 3. Timer (Soft Tick)
const timer = generateNote(880, 0.05); // A5 short
writeWav(path.join(OUT_DIR, 'timer.wav'), timer);

// 4. Complete (Victory Fanfare)
const complete = concat([
    generateNote(523.25, 0.15), // C5
    generateNote(523.25, 0.15), // C5
    generateNote(523.25, 0.15), // C5
    generateNote(659.25, 0.4),  // E5
    generateNote(783.99, 0.4),  // G5
    generateNote(1046.50, 0.8)  // C6
]);
writeWav(path.join(OUT_DIR, 'complete.wav'), complete);
