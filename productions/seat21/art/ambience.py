# Very soft procedural ambience bed (train hum, rail clacks, rain) for the whole song length.
# Original synthesis; no samples. Levels are baked; runtime applies music gain 0.2 on top.
import numpy as np, wave, sys
SR = 48000; DUR = 160.417917; N = int(DUR * SR) + SR
rng = np.random.default_rng(21)
t = np.arange(N) / SR
def env(points):  # piecewise-linear envelope from [(time, value)]
    ts, vs = zip(*points); return np.interp(t, ts, vs)
def lowpass(x, fc):  # first-order low-pass applied in the frequency domain
    X = np.fft.rfft(x); f = np.fft.rfftfreq(x.size, 1 / SR)
    return np.fft.irfft(X / (1 + 1j * f / fc), x.size)
def highpass(x, fc): return x - lowpass(x, fc)
white = rng.standard_normal(N)
brown = lowpass(white, 90); brown /= np.abs(brown).max()
hum = brown * 0.8 + 0.25 * np.sin(2 * np.pi * 52 * t) * (1 + 0.2 * np.sin(2 * np.pi * 0.3 * t))
rainn = highpass(lowpass(rng.standard_normal(N), 6000), 1500); rainn /= np.abs(rainn).max()
# rain droplets: sparse ticks
drops = np.zeros(N); idx = rng.integers(0, N, int(DUR * 40)); drops[idx] = rng.uniform(0.3, 1, idx.size)
drops = highpass(lowpass(drops, 5000), 2000); drops /= np.abs(drops).max()
rain = rainn * 0.7 + drops * 0.5
# rail clacks: pairs every ~1.05 s when moving
clack = np.zeros(N)
for start in np.arange(0, DUR, 1.05):
    for d in (0.0, 0.16):
        i = int((start + d) * SR); L = int(0.05 * SR)
        if i + L < N: clack[i:i + L] += rng.standard_normal(L) * np.exp(-np.arange(L) / (0.008 * SR))
clack = lowpass(clack, 1800)
# ---- scene envelopes (match the scene map) ----
hum_e = env([(0, 0.0), (7.2, 0.0), (9.5, 0.55), (11, 0.35), (13.1, 0.5), (22.4, 0.5), (23, 0.25), (26.2, 0.25), (26.8, 0.5), (28.2, 0.28),
             (80, 0.3), (80.6, 0.0), (91, 0.0), (91.6, 0.3), (132, 0.3), (132.6, 0.12), (137, 0.12), (137.6, 0.4), (156, 0.4), (160.4, 0.0), (DUR + 1, 0)])
moving = env([(0, 0), (13.1, 0), (13.2, 1), (22.4, 1), (23, 0), (26.2, 0), (26.8, 1), (65, 1), (69, 1.4), (69.5, 1), (80, 1), (80.2, 0), (91.6, 0), (91.8, 1),
              (132, 1), (132.2, 0), (138, 0), (139, 0.8), (156, 0.8), (160.4, 0), (DUR + 1, 0)])
rain_e = env([(0, 0.0), (0.8, 0.55), (13.1, 0.55), (13.3, 0.25), (28.2, 0.15), (45, 0.15), (52, 0.0), (80, 0.0), (80.5, 0.12), (91, 0.12), (91.5, 0.0),
              (124, 0.0), (125, 0.2), (132, 0.2), (132.5, 0.0), (DUR + 1, 0)])
tunnel = env([(0, 0), (65, 0), (66, 0.6), (68.6, 0.6), (69.2, 0), (DUR + 1, 0)])
brake = np.zeros(N); a, b = int(9.4 * SR), int(10.9 * SR)
seg = np.arange(b - a) / SR; brake[a:b] = np.sin(2 * np.pi * (2300 - 300 * seg) * seg) * np.sin(np.pi * seg / seg[-1]) * 0.12
mix = hum * hum_e + clack * moving * hum_e * 0.9 + rain * rain_e + brown * tunnel * 1.2 + brake
mix *= env([(0, 0), (1.2, 1), (DUR - 2, 1), (DUR, 0), (DUR + 1, 0)])
mix = mix[:int(DUR * SR)]
mix = mix / np.abs(mix).max() * 0.6
st = np.stack([mix, np.roll(mix, 37)], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype('<i2').tobytes())
print('ambience ok')
