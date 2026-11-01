"""Colonna sonora originale del video, generata da codice (nessun campione esterno).

Uso:  python3 video/audio/score.py landscape|portrait
Legge video/.cache/audio/cues-<formato>.json (scritto da `node video/render.mjs cues`)
e scrive video/.cache/audio/<formato>-raw.wav (48 kHz, stereo, 24 bit).

Brano: 120 BPM, re maggiore, giro IV-V-iii-vi (Gmaj9, A6/9, F#m7, Bm9),
chiusura su Dmaj9. Gli effetti (clic, tasti, passaggi) seguono i segnali del video.
"""

import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 120.0
BEAT = 60.0 / BPM
BAR = 4 * BEAT
STEP = BEAT / 4

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / ".cache" / "audio"

rng = np.random.default_rng(20261102)
LAST_REPORT = []


def midi_hz(m):
    return 440.0 * 2.0 ** ((m - 69) / 12.0)


def secs(n):
    return int(round(n * SR))


# ---------------------------------------------------------------- filtri

def fft_filter(x, fn):
    """Filtro statico in frequenza: fn(freqs) -> guadagno."""
    n = len(x)
    size = 1 << int(np.ceil(np.log2(max(n, 2))))
    spec = np.fft.rfft(x, size)
    freqs = np.fft.rfftfreq(size, 1.0 / SR)
    spec *= fn(freqs)
    return np.fft.irfft(spec, size)[:n]


def lowpass(x, fc, order=2):
    return fft_filter(x, lambda f: 1.0 / np.sqrt(1.0 + (f / fc) ** (2 * order)))


def highpass(x, fc, order=2):
    return fft_filter(x, lambda f: 1.0 / np.sqrt(1.0 + (fc / np.maximum(f, 1e-3)) ** (2 * order)))


def bandpass(x, lo, hi, order=2):
    return highpass(lowpass(x, hi, order), lo, order)


def stft_sweep(x, cutoff_at, kind="low", order=2, frame=2048):
    """Filtro che cambia nel tempo: cutoff_at(t) in Hz, applicato a blocchi sovrapposti."""
    hop = frame // 4
    win = np.hanning(frame)
    pad = np.concatenate([np.zeros(frame), x, np.zeros(frame)])
    out = np.zeros_like(pad)
    norm = np.zeros_like(pad)
    freqs = np.fft.rfftfreq(frame, 1.0 / SR)
    for start in range(0, len(pad) - frame, hop):
        seg = pad[start:start + frame] * win
        t = (start + frame / 2 - frame) / SR
        fc = max(20.0, cutoff_at(t))
        if kind == "low":
            g = 1.0 / np.sqrt(1.0 + (freqs / fc) ** (2 * order))
        elif kind == "high":
            g = 1.0 / np.sqrt(1.0 + (fc / np.maximum(freqs, 1e-3)) ** (2 * order))
        else:
            bw = fc * 0.6
            g = np.exp(-0.5 * ((freqs - fc) / bw) ** 2)
        y = np.fft.irfft(np.fft.rfft(seg) * g, frame) * win
        out[start:start + frame] += y
        norm[start:start + frame] += win ** 2
    norm[norm < 1e-6] = 1.0
    return (out / norm)[frame:frame + len(x)]


# ---------------------------------------------------------------- inviluppi

def adsr(n, a=0.01, d=0.1, s=0.7, r=0.2, sustain_len=None):
    a_n, d_n, r_n = secs(a), secs(d), secs(r)
    if sustain_len is None:
        sustain_len = max(0, n - a_n - d_n - r_n)
    env = np.concatenate([
        np.linspace(0, 1, max(a_n, 1), endpoint=False),
        np.linspace(1, s, max(d_n, 1), endpoint=False),
        np.full(max(secs(sustain_len), 0) if isinstance(sustain_len, float) else max(sustain_len, 0), s),
        np.linspace(s, 0, max(r_n, 1)),
    ])
    if len(env) < n:
        env = np.concatenate([env, np.zeros(n - len(env))])
    return env[:n]


def fade(x, a=0.004, r=0.01):
    n = len(x)
    an = min(secs(a), n // 2)
    rn = min(secs(r), n // 2)
    if an:
        x[:an] *= np.linspace(0, 1, an)
    if rn:
        x[-rn:] *= np.linspace(1, 0, rn)
    return x


# ---------------------------------------------------------------- strumenti

def pad_note(freq, dur, bright=0.5, voices=5, detune=0.11):
    """Pad caldo: seghe sintetizzate in additiva, con leggero chorus."""
    n = secs(dur)
    t = np.arange(n) / SR
    left = np.zeros(n)
    right = np.zeros(n)
    max_h = int(min(40, 9000 / freq))
    fc = 900 + 2600 * bright
    for v in range(voices):
        cents = (v - (voices - 1) / 2) * detune * 100 / max(voices - 1, 1)
        f = freq * 2 ** (cents / 1200)
        pan = 0.5 + 0.42 * ((v / max(voices - 1, 1)) - 0.5) * 2
        vib = 1 + 0.0012 * np.sin(2 * np.pi * (0.23 + 0.07 * v) * t + v)
        phase0 = rng.uniform(0, 2 * np.pi, max_h + 1)
        sig = np.zeros(n)
        for k in range(1, max_h + 1):
            amp = (1.0 / k) / np.sqrt(1 + (k * f / fc) ** 4)
            sig += amp * np.sin(2 * np.pi * k * f * vib * t + phase0[k])
        left += sig * np.cos(pan * np.pi / 2)
        right += sig * np.sin(pan * np.pi / 2)
    env = adsr(n, a=min(0.9, dur * 0.35), d=0.4, s=0.85, r=min(1.2, dur * 0.4))
    return np.stack([left * env, right * env]) / voices


def pluck(freq, dur=0.7, bright=1.0, decay=1.0):
    n = secs(dur)
    t = np.arange(n) / SR
    sig = np.zeros(n)
    max_h = int(min(18, 10000 / freq))
    for k in range(1, max_h + 1):
        amp = (1.0 / k ** 1.25) * (bright ** (k - 1))
        rate = (4.5 + 2.6 * k) * decay
        inharm = 1 + 0.0004 * k * k
        sig += amp * np.exp(-rate * t) * np.sin(2 * np.pi * k * freq * inharm * t)
    sig *= np.minimum(1, t / 0.002)
    return fade(sig, 0.001, 0.02)


def bell(freq, dur=2.5, index=2.2):
    n = secs(dur)
    t = np.arange(n) / SR
    env = np.exp(-t * 2.6)
    mod = index * np.exp(-t * 3.5) * np.sin(2 * np.pi * freq * 3.5 * t)
    sig = np.sin(2 * np.pi * freq * t + mod) * env
    sig += 0.35 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 4.5)
    sig *= np.minimum(1, t / 0.003)
    return fade(sig, 0.001, 0.05)


def bass_note(freq, dur):
    n = secs(dur)
    t = np.arange(n) / SR
    sig = (
        0.8 * np.sin(2 * np.pi * freq * t)
        + 0.55 * np.sin(2 * np.pi * 2 * freq * t)
        + 0.3 * np.sin(2 * np.pi * 3 * freq * t)
        + 0.16 * np.sin(2 * np.pi * 4 * freq * t)
    )
    env = adsr(n, a=0.006, d=0.18, s=0.6, r=0.08)
    return np.tanh(sig * env * 1.6) / np.tanh(1.6)


def kick(vel=1.0, punch=1.0):
    n = secs(0.5)
    t = np.arange(n) / SR
    f = 52 + 120 * np.exp(-t / 0.03) + 50 * np.exp(-t / 0.006)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * np.exp(-t / 0.15)
    click = rng.standard_normal(n) * np.exp(-t / 0.0025) * 0.35 * punch
    click = highpass(click, 1800)
    sig = np.tanh((body + click) * 1.6) * vel
    return fade(sig, 0.0005, 0.03)


def clap(vel=1.0):
    n = secs(0.35)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.zeros(n)
    for k, off in enumerate([0.0, 0.011, 0.022, 0.033]):
        o = secs(off)
        seg = np.exp(-np.arange(n - o) / SR / (0.006 if k < 3 else 0.11))
        env[o:] += seg * (0.8 if k < 3 else 1.0)
    sig = bandpass(noise * env, 900, 5200)
    return fade(sig * vel * 0.9, 0.0005, 0.03)


def hat(vel=1.0, open_=False):
    n = secs(0.45 if open_ else 0.08)
    t = np.arange(n) / SR
    noise = rng.standard_normal(n)
    env = np.exp(-t / (0.12 if open_ else 0.016))
    sig = highpass(noise * env, 7500, 3)
    sig = lowpass(sig, 15000)
    return fade(sig * vel * 0.5, 0.0005, 0.01)


def shaker(vel=1.0):
    n = secs(0.09)
    t = np.arange(n) / SR
    env = (t / 0.012) * np.exp(1 - t / 0.012)
    sig = bandpass(rng.standard_normal(n) * env, 5000, 11000)
    return fade(sig * vel * 0.35, 0.001, 0.01)


def noise_sweep(dur, f0, f1, kind="band", rise=True):
    n = secs(dur)
    x = rng.standard_normal(n)
    sig = stft_sweep(x, lambda t: f0 * (f1 / f0) ** min(1, max(0, t / dur)), kind=kind)
    t = np.arange(n) / SR
    if rise:
        env = (t / dur) ** 2.2
    else:
        env = np.exp(-t / (dur * 0.35))
    return fade(sig * env, 0.005, 0.02)


def whoosh(dur=0.9):
    n = secs(dur + 0.4)
    x = rng.standard_normal(n)
    peak = dur * 0.55
    def center(t):
        p = min(1, max(0, t / (dur + 0.4)))
        return 350 + 3400 * np.sin(np.pi * min(1, p * 1.15)) ** 1.5
    sig = stft_sweep(x, center, kind="band")
    t = np.arange(n) / SR
    env = np.where(t < peak, (t / peak) ** 2.0, np.exp(-(t - peak) / 0.18))
    sig = fade(sig * env, 0.005, 0.05)
    pan = np.clip(t / (dur + 0.4), 0, 1)
    return np.stack([sig * np.cos(pan * np.pi / 2), sig * np.sin(pan * np.pi / 2)]) * 0.9


def impact(size=1.0):
    n = secs(2.4)
    t = np.arange(n) / SR
    f = 38 + 60 * np.exp(-t / 0.06)
    boom = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / (0.55 * size))
    hit = lowpass(rng.standard_normal(n) * np.exp(-t / 0.04), 2500) * 0.5
    air = highpass(rng.standard_normal(n) * np.exp(-t / 0.5), 6000) * 0.05
    sig = np.tanh((boom * 1.2 + hit + air) * 1.3)
    return fade(sig, 0.0005, 0.2)


def tick(pitch=0, vel=1.0):
    n = secs(0.06)
    t = np.arange(n) / SR
    f = 2600 * 2 ** (pitch / 12)
    sig = np.sin(2 * np.pi * f * t) * np.exp(-t / 0.008)
    sig += highpass(rng.standard_normal(n) * np.exp(-t / 0.002), 3000) * 0.3
    return fade(sig * vel, 0.0003, 0.005)


def ui_click(vel=1.0):
    n = secs(0.07)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 1650 * t) * np.exp(-t / 0.006)
    snap = highpass(rng.standard_normal(n) * np.exp(-t / 0.0015), 2500)
    low = np.sin(2 * np.pi * 380 * t) * np.exp(-t / 0.012) * 0.5
    return fade((body * 0.6 + snap * 0.5 + low) * vel, 0.0002, 0.01)


def tap(vel=1.0):
    n = secs(0.09)
    t = np.arange(n) / SR
    body = np.sin(2 * np.pi * 520 * t) * np.exp(-t / 0.014)
    snap = bandpass(rng.standard_normal(n) * np.exp(-t / 0.003), 800, 4000) * 0.35
    return fade((body + snap) * vel, 0.0003, 0.01)


def key_click(vel=1.0):
    n = secs(0.05)
    t = np.arange(n) / SR
    f = rng.uniform(2200, 3400)
    sig = bandpass(rng.standard_normal(n) * np.exp(-t / 0.0035), 1500, 7000) * 0.8
    sig += np.sin(2 * np.pi * f * t) * np.exp(-t / 0.004) * 0.25
    return fade(sig * vel, 0.0002, 0.006)


def pop(pitch=0, vel=1.0):
    n = secs(0.16)
    t = np.arange(n) / SR
    base = 520 * 2 ** (pitch * 2 / 12)
    f = base * (1 + 0.9 * np.exp(-t / 0.018))
    sig = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t / 0.045)
    return fade(sig * vel, 0.0005, 0.02)


# ---------------------------------------------------------------- effetti spaziali

def reverb_ir(seconds=2.6, damp=4500, pre=0.018):
    n = secs(seconds)
    t = np.arange(n) / SR
    irs = []
    for ch in range(2):
        noise = rng.standard_normal(n)
        env = np.exp(-t / (seconds / 6.9))
        ir = noise * env
        # Le code si scuriscono: miscela di versioni filtrate.
        dark = lowpass(ir, damp * 0.35)
        bright = lowpass(ir, damp)
        mix = bright * np.exp(-t / 0.35) + dark * (1 - np.exp(-t / 0.35))
        mix = np.concatenate([np.zeros(secs(pre + 0.004 * ch)), mix])[:n]
        irs.append(mix / np.sqrt(np.sum(mix ** 2)))
    return np.stack(irs)


def convolve(x, ir):
    n = x.shape[-1] + ir.shape[-1] - 1
    size = 1 << int(np.ceil(np.log2(n)))
    out = []
    for ch in range(2):
        src = x[ch] if x.ndim == 2 else x
        y = np.fft.irfft(np.fft.rfft(src, size) * np.fft.rfft(ir[ch], size), size)[: x.shape[-1]]
        out.append(y)
    return np.stack(out)


def delay(x, time, feedback=0.4, taps=5, pingpong=True):
    out = x.copy()
    d = secs(time)
    for k in range(1, taps + 1):
        g = feedback ** k
        shifted = np.zeros_like(x)
        if d * k < x.shape[-1]:
            shifted[:, d * k:] = x[:, : x.shape[-1] - d * k]
        if pingpong and k % 2 == 1:
            shifted = shifted[::-1]
        out += shifted * g
    return out


# ---------------------------------------------------------------- mix

class Track:
    def __init__(self, length):
        self.buf = np.zeros((2, length))

    def add(self, sig, at, gain=1.0, pan=0.5):
        start = secs(at)
        if start >= self.buf.shape[1]:
            return
        if sig.ndim == 1:
            sig = np.stack([sig * np.cos(pan * np.pi / 2), sig * np.sin(pan * np.pi / 2)]) * np.sqrt(2)
        end = min(self.buf.shape[1], start + sig.shape[1])
        if start < 0:
            sig = sig[:, -start:]
            start = 0
        self.buf[:, start:end] += sig[:, : end - start] * gain


def db(x):
    return 10 ** (x / 20.0)


def sidechain(length, kicks, depth=0.55, release=0.22):
    g = np.ones(length)
    t = np.arange(secs(0.6)) / SR
    shape = 1 - depth * np.where(t < 0.008, t / 0.008, np.exp(-(t - 0.008) / release))
    for k in kicks:
        s = secs(k)
        e = min(length, s + len(shape))
        if s < length:
            g[s:e] = np.minimum(g[s:e], shape[: e - s])
    return g


PROG = [
    {"bass": 31, "pad": [59, 62, 66, 69, 74], "arp": [67, 71, 74, 78, 81, 83]},  # Gmaj9
    {"bass": 33, "pad": [61, 64, 66, 71, 76], "arp": [69, 73, 76, 78, 81, 83]},  # A6/9
    {"bass": 30, "pad": [57, 61, 64, 69, 73], "arp": [66, 69, 73, 76, 78, 81]},  # F#m7
    {"bass": 35, "pad": [57, 62, 66, 69, 73], "arp": [66, 69, 71, 74, 78, 81]},  # Bm9
]
TONIC = {"bass": 26, "pad": [54, 57, 61, 64, 69, 76], "arp": [66, 69, 73, 76, 78, 81]}  # Dmaj9

ARP = [0, 2, 4, 2, 1, 3, 5, 3, 0, 2, 4, 5, 3, 1, 4, 2]


def build(cues, duration):
    total = duration + 0.6
    n = secs(total)
    bars = int(np.ceil(duration / BAR))

    # Sezioni del brano (in secondi).
    def section(t):
        if t < 4.0:
            return "intro"
        if t < 22.0:
            return "main"
        if t < 32.0:
            return "tech"
        if t < 42.0:
            return "main2"
        if t < 46.0:
            return "break"
        if t < 52.0:
            return "main2"
        if t < 56.0:
            return "peak"
        return "outro"

    pads = Track(n)
    arps = Track(n)
    bass = Track(n)
    drums = Track(n)
    bells = Track(n)
    fx = Track(n)
    ui = Track(n)
    kicks = []

    for b in range(bars + 1):
        t0 = b * BAR
        if t0 >= min(duration + 0.5, 62.0):
            break
        sec = section(t0)
        if sec == "outro":
            chord = PROG[(b - int(56.0 / BAR)) % 4] if t0 < 60.0 else TONIC
        else:
            chord = PROG[b % 4]
        last = t0 >= 60.0

        # Pad: sempre, più aperto nelle sezioni piene.
        bright = {"intro": 0.25, "main": 0.6, "tech": 0.5, "main2": 0.65, "break": 0.45, "peak": 0.8, "outro": 0.55}[sec]
        dur = BAR + 0.9 if not last else total - t0
        for i, m in enumerate(chord["pad"]):
            pads.add(pad_note(midi_hz(m), dur, bright=bright), t0, gain=0.42 * (0.85 if i else 1.0))
        if b % 2 == 0 and sec in ("main", "main2", "peak", "outro", "break"):
            pads.add(pad_note(midi_hz(chord["pad"][0] - 12), dur, bright=0.2, voices=3), t0, gain=0.25)

        # Basso: nota tenuta + rimbalzo in levare.
        if sec in ("main", "tech", "main2", "peak"):
            root = midi_hz(chord["bass"] + 12)
            bass.add(bass_note(root / 2, BEAT * 1.4), t0, gain=0.32)
            bass.add(bass_note(root / 2, BEAT * 1.4), t0 + 2 * BEAT, gain=0.26)
            for s in (2, 6, 10, 14):
                bass.add(bass_note(root, STEP * 1.6), t0 + s * STEP, gain=0.34)
        elif sec == "outro" and t0 < 60.0:
            bass.add(bass_note(midi_hz(chord["bass"] + 12) / 2, BAR * 0.9), t0, gain=0.26)
        elif last and t0 < 62.0:
            bass.add(bass_note(midi_hz(TONIC["bass"] + 12), 3.0), t0, gain=0.24)

        # Arpeggio a sedicesimi.
        if sec != "intro" or t0 >= 0:
            for s in range(16):
                ts = t0 + s * STEP
                if ts >= duration - 0.3:
                    break
                if sec == "outro" and ts >= 60.0 and s % 2:
                    continue
                note = chord["arp"][ARP[s] % len(chord["arp"])]
                if sec == "tech":
                    note = chord["arp"][ARP[(s * 3) % 16] % len(chord["arp"])] + (12 if s % 4 == 3 else 0)
                vel = 0.75 if s % 4 == 0 else 0.5 if s % 2 == 0 else 0.38
                if sec == "intro":
                    vel *= 0.5 + 0.5 * (ts / 4.0)
                bright = 0.62 if sec in ("intro", "break") else 0.82
                arps.add(pluck(midi_hz(note), 0.55, bright=bright), ts, gain=vel * 0.5, pan=0.5 + 0.25 * np.sin(s * 0.9))

        # Batteria.
        if sec in ("main", "tech", "main2", "peak"):
            four = sec in ("tech", "peak") or t0 >= 16.0
            for s in range(16):
                ts = t0 + s * STEP
                if ts >= duration:
                    break
                if s in (0, 8) or (four and s in (4, 12)):
                    drums.add(kick(1.0 if s in (0, 8) else 0.85), ts, gain=0.62)
                    kicks.append(ts)
                if s in (4, 12):
                    drums.add(clap(), ts, gain=0.5, pan=0.5)
                if s in (2, 6, 10, 14):
                    drums.add(hat(0.9, open_=(s == 14 and sec in ("peak", "main2"))), ts, gain=0.55, pan=0.62)
                elif s % 2 == 1:
                    drums.add(hat(0.45), ts, gain=0.28, pan=0.4)
                if sec in ("tech", "main2", "peak"):
                    drums.add(shaker(0.7 if s % 2 else 1.0), ts + 0.006, gain=0.42, pan=0.3)
        elif sec == "break":
            for s in range(16):
                ts = t0 + s * STEP
                if s in (2, 6, 10, 14):
                    drums.add(hat(0.6), ts, gain=0.36, pan=0.62)
                if s in (0,) and t0 >= 44.0:
                    drums.add(kick(0.6, 0.4), ts, gain=0.45)
                    kicks.append(ts)
        elif sec == "outro" and t0 < 60.0:
            for s in (0, 8):
                drums.add(kick(0.7, 0.5), t0 + s * STEP, gain=0.4)
                kicks.append(t0 + s * STEP)
            for s in (2, 6, 10, 14):
                drums.add(hat(0.5), t0 + s * STEP, gain=0.3, pan=0.62)

        # Campane nei momenti chiave.
        if sec in ("tech",) and b % 2 == 0:
            for i, m in enumerate([chord["arp"][2] + 12, chord["arp"][4] + 12]):
                bells.add(bell(midi_hz(m), 2.2, 1.6), t0 + i * BEAT * 1.5, gain=0.16, pan=0.3 + 0.4 * i)
        if sec == "peak":
            bells.add(bell(midi_hz(chord["arp"][3] + 12), 2.4, 2.0), t0, gain=0.18, pan=0.6)

    # Salita nell'intro e prima dei rientri.
    for start, end in ((1.0, 4.0), (43.0, 46.0), (54.5, 56.0)):
        sw = noise_sweep(end - start, 300, 9000, kind="band", rise=True)
        fx.add(sw * 0.22, start, pan=0.5)
        # nota che sale
        m = np.arange(secs(end - start)) / SR
        f = 220 * 2 ** (2 * m / (end - start))
        tone = np.sin(2 * np.pi * np.cumsum(f) / SR) * (m / (end - start)) ** 2 * 0.08
        fx.add(fade(tone, 0.01, 0.02), start)

    # Effetti dal video.
    for c in cues:
        t = c["time"]
        kind = c["type"]
        if kind == "drop":
            fx.add(impact(1.2), t, gain=0.7)
            fx.add(hat(1.0, open_=True), t, gain=0.25)
        elif kind == "hit":
            fx.add(impact(0.8), t, gain=0.45)
        elif kind in ("whoosh", "sweep"):
            dur = c.get("dur", 0.9)
            sig = whoosh(dur)
            lead = dur * 0.45
            fx.add(sig, t - lead * 0.4, gain=0.42 if kind == "whoosh" else 0.36)
        elif kind == "click":
            ui.add(ui_click(), t, gain=0.5, pan=0.55)
        elif kind == "tap":
            ui.add(tap(), t, gain=0.75, pan=0.5)
        elif kind == "key":
            ui.add(key_click(rng.uniform(0.6, 1.0)), t, gain=0.13, pan=rng.uniform(0.42, 0.58))
        elif kind == "pop":
            ui.add(pop(c.get("pitch", 0)), t, gain=0.24, pan=0.5 + 0.08 * (c.get("pitch", 0) % 3 - 1))
        elif kind == "tick":
            ui.add(tick(c.get("pitch", 0)), t, gain=0.12, pan=0.55)
        elif kind == "ripple":
            for k in range(int(c.get("count", 6))):
                ui.add(pop(k % 5, 0.8), t + k * c.get("gap", 0.08), gain=0.2, pan=0.35 + 0.3 * (k % 3) / 2)
        elif kind == "shimmer":
            for k, m in enumerate([86, 90, 93, 97]):
                bells.add(bell(midi_hz(m), 1.6, 1.2), t + k * 0.06, gain=0.07, pan=0.3 + 0.13 * k)
        elif kind == "success":
            for k, m in enumerate([81, 86]):
                bells.add(bell(midi_hz(m), 2.0, 1.4), t + k * 0.11, gain=0.14, pan=0.45 + 0.1 * k)
        elif kind == "chime":
            for k, m in enumerate([74, 78, 81, 85, 88]):
                bells.add(bell(midi_hz(m), 3.4, 1.8), t + k * 0.07, gain=0.11, pan=0.3 + 0.1 * k)
        elif kind == "rise":
            fx.add(noise_sweep(0.8, 600, 7000, kind="band", rise=True) * 0.14, t - 0.3)
        elif kind == "cut":
            fx.add(noise_sweep(0.35, 2000, 9000, kind="high", rise=True) * 0.25, t - 0.33)
            fx.add(hat(1.0, open_=True), t, gain=0.2)

    # Spazio e dinamica.
    ir_big = reverb_ir(3.2, 5200)
    ir_small = reverb_ir(1.4, 7000)
    length = n

    sc = sidechain(length, kicks, depth=0.5, release=0.2)
    sc_light = sidechain(length, kicks, depth=0.25, release=0.18)

    pads_buf = pads.buf * sc_light
    pads_buf = highpass(pads_buf[0], 140)[None, :], highpass(pads_buf[1], 140)[None, :]
    pads_buf = np.concatenate(pads_buf)
    # L'intro si apre piano.
    pads_buf[0] = stft_sweep(pads_buf[0], lambda t: 500 + 6000 * min(1, max(0, (t - 0.5) / 3.6)) ** 2)
    pads_buf[1] = stft_sweep(pads_buf[1], lambda t: 500 + 6000 * min(1, max(0, (t - 0.5) / 3.6)) ** 2)

    arps_buf = delay(arps.buf, BEAT * 0.75, feedback=0.32, taps=4) * sc
    arps_buf = np.stack([highpass(arps_buf[ch], 220) for ch in range(2)])
    # Filtro dell'arpeggio: chiuso nell'intro, apertura progressiva, scuro nella pausa.
    def arp_cut(t):
        if t < 4.0:
            return 600 + 3800 * (t / 4.0) ** 2
        if 42.0 <= t < 46.0:
            return 1400 + 4000 * ((t - 42.0) / 4.0) ** 3
        if t >= 60.0:
            return 5200 - 3000 * min(1, (t - 60.0) / 3.0)
        return 6500
    arps_buf = np.stack([stft_sweep(arps_buf[ch], arp_cut) for ch in range(2)])

    bass_buf = bass.buf * sc
    bass_buf = np.stack([lowpass(bass_buf[ch], 900) for ch in range(2)])
    mono_bass = bass_buf.mean(axis=0)
    bass_buf = np.stack([mono_bass, mono_bass])

    drums_buf = drums.buf
    bells_buf = bells.buf
    fx_buf = fx.buf
    ui_buf = ui.buf

    music = pads_buf * db(-12) + arps_buf * db(-9) + bass_buf * db(-11) + drums_buf * db(-9) + bells_buf * db(-10)
    send = pads_buf * db(-14) * 0.55 + arps_buf * db(-12) * 0.5 + bells_buf * db(-11) * 0.8 + drums_buf * db(-8) * 0.06
    wet = convolve(send, ir_big)
    music_bus = music + wet * 0.55

    fx_gain = db(-3.5)
    ui_gain = db(-2.5)
    fx_wet = convolve(fx_buf * fx_gain * 0.45 + ui_buf * ui_gain * 0.16, ir_small)
    sfx_bus = fx_buf * fx_gain + ui_buf * ui_gain + fx_wet * 0.5

    # La musica si abbassa un poco sotto gli effetti (inviluppo a blocchi di 5 ms).
    block = secs(0.005)
    mono = np.abs(sfx_bus).mean(axis=0)
    nb = len(mono) // block
    env = np.sqrt(np.mean(mono[: nb * block].reshape(nb, block) ** 2, axis=1))
    smooth = np.zeros_like(env)
    level = 0.0
    for i, v in enumerate(env):
        coef = 0.55 if v > level else 0.035
        level += (v - level) * coef
        smooth[i] = level
    thr = np.percentile(smooth[smooth > 1e-5], 90) if np.any(smooth > 1e-5) else 1.0
    duck_blocks = 1.0 - 0.32 * np.clip(smooth / (thr + 1e-9), 0, 1)
    duck = np.repeat(duck_blocks, block)
    duck = np.concatenate([duck, np.full(length - len(duck), duck[-1] if len(duck) else 1.0)])[:length]

    mix = music_bus * duck + sfx_bus

    # Rapporto effetti/musica nella banda 1,5-6 kHz, per controllo.
    def band(sig):
        return bandpass(sig.mean(axis=0), 1500, 6000)
    mb = band(music_bus * duck)
    sb = band(sfx_bus)
    report = []
    for c in cues:
        if c["type"] in ("key",):
            continue
        a = secs(c["time"])
        b = a + secs(c.get("dur", 0.12) if c["type"] in ("whoosh", "sweep") else 0.08)
        if b <= a or b > length:
            continue
        rm = np.sqrt(np.mean(mb[a:b] ** 2)) + 1e-9
        rs = np.sqrt(np.mean(sb[a:b] ** 2)) + 1e-9
        report.append((c["time"], c["type"], 20 * np.log10(rs / rm)))
    global LAST_REPORT
    LAST_REPORT = report

    # Fine: dissolvenza dopo l'ultimo accordo.
    t = np.arange(length) / SR
    tail = np.clip((t - (duration - 2.2)) / 2.2, 0, 1)
    mix *= (1 - tail) ** 2

    mix -= mix.mean(axis=1, keepdims=True)
    # Ripulisce il sub e dà presenza alle medio-alte (ascolto da telefono).
    def master_eq(f):
        f = np.maximum(f, 1e-3)
        hp = 1.0 / np.sqrt(1.0 + (34.0 / f) ** 6)
        low_shelf = 1.0 - 0.3 / (1.0 + (f / 110.0) ** 2)
        presence = 1.0 + 0.35 * np.exp(-0.5 * (np.log2(f / 3200.0) / 0.9) ** 2)
        air = 1.0 + 0.25 / (1.0 + (9000.0 / f) ** 2)
        return hp * low_shelf * presence * air
    mix = np.stack([fft_filter(mix[ch], master_eq) for ch in range(2)])
    peak = np.max(np.abs(mix))
    mix = mix / peak * 0.85
    mix = np.tanh(mix * 1.15) / np.tanh(1.15)
    return mix


def write_wav(path, x):
    x = np.clip(x, -1, 1)
    data = (x.T * (2 ** 23 - 1)).astype(np.int32)
    raw = bytearray()
    flat = data.reshape(-1)
    b = flat.astype("<i4").tobytes()
    # 24 bit: tre byte bassi di ogni campione a 32 bit.
    arr = np.frombuffer(b, dtype=np.uint8).reshape(-1, 4)[:, :3]
    raw = arr.tobytes()
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(3)
        w.setframerate(SR)
        w.writeframes(raw)


def loudnorm(src, dst, target=-14.0, peak=-1.0):
    """Normalizza a -14 LUFS (YouTube, Instagram, TikTok) in due passate con ffmpeg."""
    import subprocess

    first = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(src), "-af",
         f"loudnorm=I={target}:TP={peak}:LRA=9:print_format=json", "-f", "null", "-"],
        capture_output=True, text=True, check=True,
    ).stderr
    stats = json.loads(first[first.rindex("{"): first.rindex("}") + 1])
    flt = (
        f"loudnorm=I={target}:TP={peak}:LRA=9:"
        f"measured_I={stats['input_i']}:measured_TP={stats['input_tp']}:"
        f"measured_LRA={stats['input_lra']}:measured_thresh={stats['input_thresh']}:"
        f"offset={stats['target_offset']}:linear=true:print_format=summary,"
        "alimiter=limit=0.89:attack=3:release=60:level=disabled"
    )
    subprocess.run(
        ["ffmpeg", "-hide_banner", "-y", "-i", str(src), "-af", flt, "-ar", str(SR), "-c:a", "pcm_s24le", str(dst)],
        capture_output=True, text=True, check=True,
    )
    return stats


def main():
    fmt = sys.argv[1] if len(sys.argv) > 1 else "landscape"
    data = json.loads((CACHE / f"cues-{fmt}.json").read_text())
    mix = build(data["cues"], float(data["duration"]))
    raw = CACHE / f"{fmt}-raw.wav"
    write_wav(raw, mix)
    out = CACHE / f"{fmt}.wav"
    if "--report" in sys.argv:
        for t, kind, ratio in LAST_REPORT:
            print(f"  {t:6.2f} {kind:8s} effetti/musica {ratio:+5.1f} dB")
    stats = loudnorm(raw, out)
    print(f"{out} · {mix.shape[1] / SR:.1f} s · ingresso {stats['input_i']} LUFS")


if __name__ == "__main__":
    main()
