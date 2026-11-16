# Builds website/src/assets/brand/marjan-logo-animated.svg from logo/svg/02-client-logo-lines.svg.
# Run from the repo root:  python3 logo/source/animate.py
#
# Loop (8 s): the plane orbits the big pin (passing behind it, then in front),
# glides back to its place and rests; the big pin floats gently; the small pin
# over the "j" hops; a shine sweeps the "TRAVEL & TOURS" band.
import math, re

SRC = 'logo/svg/02-client-logo-lines.svg'
OUT = 'website/src/assets/brand/marjan-logo-animated.svg'
s = open(SRC).read()
defs = re.search(r'<defs>.*?</defs>', s, re.S).group(0)

def path(pid):
    return re.search(r'id="%s"[^>]* d="([^"]+)"' % pid, s).group(1)

def subpaths(pid):
    return [x for x in re.split(r'(?=M)', path(pid)) if x.strip()]

def bbox(sp):
    n = list(map(float, re.findall(r'-?\d+\.?\d*', sp)))
    xs, ys = n[0::2], n[1::2]
    return min(xs), max(xs), min(ys), max(ys)

# Plane = the two navy sub-shapes in the top right of the wordmark layer.
wm = subpaths('wordmark-and-plane')
plane = ''.join(sp for sp in wm if bbox(sp)[2] < 1100)
word = ''.join(sp for sp in wm if bbox(sp)[2] >= 1100)
# The pin layer contains a light-blue copy of the plane: drop it.
pin = ''.join(sp for sp in subpaths('pin') if not (bbox(sp)[0] > 3800 and bbox(sp)[3] < 1000))
# Small pin over the "j": outer shape + hole move; the two fragments below stay.
jp = subpaths('j-pin')
jpin = ''.join(sp for sp in jp if bbox(sp)[3] < 2400)
jrest = ''.join(sp for sp in jp if bbox(sp)[3] >= 2400)
band = path('travel-tours-band')

# ---- Plane orbit -----------------------------------------------------------
LOOP = 8.0            # seconds per cycle
ORBIT = 3.6           # seconds spent flying; the rest is the plane resting
REST = (4196, 701)    # plane centre at rest
# Closed loop of waypoints around the big pin (centre ~3340,1250), starting at
# the plane's resting spot and leaving/arriving along its heading.
WAY = [REST, (4750, 230), (3500, -60), (2050, 380), (1900, 1350),
       (2850, 1720), (3800, 1380)]
BACK = (1, 4)         # waypoints 1..3 are the far side (behind the pin)

def catmull(pts, t):
    n = len(pts)
    seg = min(int(t * n), n - 1)
    u = t * n - seg
    p0, p1, p2, p3 = (pts[(seg + k - 1) % n] for k in range(4))
    def c(a, b, c_, d):
        return 0.5 * ((2 * b) + (-a + c_) * u + (2 * a - 5 * b + 4 * c_ - d) * u * u + (-a + 3 * b - 3 * c_ + d) * u ** 3)
    return c(p0[0], p1[0], p2[0], p3[0]), c(p0[1], p1[1], p2[1], p3[1]), seg

def ease(t):  # smooth start and a long, gentle arrival
    return 4 * t ** 3 if t < .5 else 1 - (-2 * t + 2) ** 3 / 2

HEADING = math.degrees(math.atan2(-530, 600))  # plane's nose direction at rest
N = 90
frames, prev_ang, unwrap = [], None, 0.0
for i in range(N + 1):
    t = ease(i / N)
    x, y, seg = catmull(WAY, t % 1.0 if i < N else 0.0)
    x2, y2, _ = catmull(WAY, (t + 0.004) % 1.0)
    ang = math.degrees(math.atan2(y2 - y, x2 - x))
    if prev_ang is not None:
        d = ang - prev_ang
        if d > 180: unwrap -= 360
        if d < -180: unwrap += 360
    prev_ang = ang
    rot = ang + unwrap - HEADING
    # depth: smaller at the far side, a touch bigger in front
    depth = (y - (-60)) / (1720 - (-60))
    scale = 0.62 + 0.5 * depth
    behind = BACK[0] <= seg < BACK[1]
    frames.append((i / N, x - REST[0], y - REST[1], rot, scale, behind))
# Make the loop land exactly at rest, with no leftover spin.
total_rot = frames[-1][3]
frames = [(p, dx, dy, r - total_rot * p if False else r, sc, b) for p, dx, dy, r, sc, b in frames]
spin = round(total_rot / 360) * 360
frames[-1] = (1.0, 0, 0, spin, 1.0, False)

def kf(name, front):
    out = []
    for p, dx, dy, r, sc, b in frames:
        pct = p * ORBIT / LOOP * 100
        vis = 1 if (b != front) else 0
        out.append(f'{pct:.2f}%{{transform:translate({dx:.0f}px,{dy:.0f}px) rotate({r:.1f}deg) scale({sc:.3f});opacity:{vis}}}')
    out.append(f'100%{{transform:rotate({spin}deg);opacity:{1 if front else 0}}}')
    return f'@keyframes {name}{{' + ''.join(out) + '}'

css = f'''<style>
  .float{{animation:float 4s ease-in-out infinite}}
  .plane{{transform-box:fill-box;transform-origin:50% 50%;animation:var(--a) {LOOP}s linear infinite}}
  .plane.front{{--a:orbit-front}}
  .plane.back{{--a:orbit-back;opacity:0}}
  .jpin{{transform-box:fill-box;transform-origin:50% 100%;animation:hop 2s cubic-bezier(.3,0,.3,1) infinite}}
  .shine{{animation:shine {LOOP}s ease-in-out infinite}}
  .rise{{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}}
  .rise.d2{{animation-delay:.15s}}
  @keyframes float{{0%,100%{{transform:translateY(0)}}50%{{transform:translateY(-45px)}}}}
  @keyframes hop{{0%,55%,100%{{transform:translateY(0) scale(1,1)}}12%{{transform:translateY(0) scale(1.06,.92)}}28%{{transform:translateY(-110px) scale(.96,1.05)}}44%{{transform:translateY(0) scale(1.05,.94)}}50%{{transform:translateY(-18px)}}}}
  @keyframes shine{{0%,60%{{transform:translateX(-900px)}}90%,100%{{transform:translateX(4600px)}}}}
  @keyframes rise{{from{{transform:translateY(120px);opacity:0}}to{{transform:none;opacity:1}}}}
  {kf('orbit-front', True)}
  {kf('orbit-back', False)}
  @media (prefers-reduced-motion:reduce){{.float,.plane,.jpin,.shine,.rise{{animation:none}}.plane.back,.shine{{display:none}}}}
</style>'''

defs2 = defs.replace('</defs>', '<linearGradient id="shine-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="band-clip"><path d="%s"/></clipPath></defs>' % band)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="904 -460 4320 4220" role="img" aria-labelledby="t"><title id="t">Marjan Travel &amp; Tours logo</title>{defs2}{css}
<g class="float">
  <path class="plane back" fill="#011249" fill-rule="evenodd" d="{plane}"/>
  <path fill="url(#pin-gradient)" fill-rule="evenodd" d="{pin}"/>
  <path fill="url(#mountain-gradient)" fill-rule="evenodd" d="{path('mountains')}"/>
</g>
<g class="rise">
  <path fill="#011249" fill-rule="evenodd" d="{word}"/>
  <path fill="#0257C5" fill-rule="evenodd" d="{jrest}"/>
  <path class="jpin" fill="#0257C5" fill-rule="evenodd" d="{jpin}"/>
</g>
<g class="rise d2">
  <path fill="#0254C0" fill-rule="evenodd" d="{band}"/>
  <g clip-path="url(#band-clip)"><g transform="skewX(-20)"><rect class="shine" x="0" y="3100" width="700" height="600" fill="url(#shine-g)"/></g></g>
</g>
<g class="float"><path class="plane front" fill="#011249" fill-rule="evenodd" d="{plane}"/></g>
</svg>'''
open(OUT, 'w').write(svg)
print('wrote', OUT, len(svg), 'bytes; final spin', spin)
