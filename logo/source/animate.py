# Builds website/src/assets/brand/marjan-logo-animated.svg from logo/svg/02-client-logo-lines.svg.
# Run from the repo root:  python3 logo/source/animate.py
#
# Loop: the main icon (pin, mountains, trail and plane together) breathes
# gently; the location icon over the "j" hops; a shine sweeps the
# "TRAVEL & TOURS" band. The wordmark and band rise in once on load.
import re

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

wm = subpaths('wordmark-and-plane')
plane = ''.join(sp for sp in wm if bbox(sp)[2] < 1100)
word = ''.join(sp for sp in wm if bbox(sp)[2] >= 1100)
# The pin layer has a light-blue copy of the plane from the trace: drop it.
pin = ''.join(sp for sp in subpaths('pin') if not (bbox(sp)[0] > 3800 and bbox(sp)[3] < 1000))
# The trace put three bits of the letters into the blue layers: the tip of the
# "r" and the top of the "j" (in the j-pin layer) and the bottom curve of the
# "j" (in the band layer). They belong to the navy wordmark.
jp = subpaths('j-pin')
jpin = ''.join(sp for sp in jp if bbox(sp)[3] < 2400)          # location icon only
letter_bits = [sp for sp in jp if bbox(sp)[3] >= 2400]
bp = subpaths('travel-tours-band')
letter_bits += [sp for sp in bp if bbox(sp)[3] < 3230]          # bottom of the "j"
band = ''.join(sp for sp in bp if bbox(sp)[3] >= 3230)
word += ''.join(letter_bits)

css = '''<style>
  .icon{transform-box:fill-box;transform-origin:50% 100%;animation:breathe 4s ease-in-out infinite}
  .jpin{transform-box:fill-box;transform-origin:50% 100%;animation:hop 2.4s cubic-bezier(.3,0,.3,1) infinite}
  .shine{animation:shine 6s ease-in-out infinite}
  .rise{animation:rise .9s cubic-bezier(.2,.7,.2,1) both}
  .rise.d2{animation-delay:.15s}
  @keyframes breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-40px) scale(1.03)}}
  @keyframes hop{0%,55%,100%{transform:translateY(0) scale(1,1)}12%{transform:translateY(0) scale(1.06,.92)}28%{transform:translateY(-110px) scale(.96,1.05)}44%{transform:translateY(0) scale(1.05,.94)}50%{transform:translateY(-18px)}}
  @keyframes shine{0%,60%{transform:translateX(-900px)}90%,100%{transform:translateX(4600px)}}
  @keyframes rise{from{transform:translateY(120px);opacity:0}to{transform:none;opacity:1}}
  @media (prefers-reduced-motion:reduce){.icon,.jpin,.shine,.rise{animation:none}.shine{display:none}}
</style>'''

defs2 = defs.replace('</defs>', '<linearGradient id="shine-g" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".55"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient><clipPath id="band-clip"><path d="%s"/></clipPath></defs>' % band)

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="904 80 4320 3680" role="img" aria-labelledby="t"><title id="t">Marjan Travel &amp; Tours logo</title>{defs2}{css}
<g class="icon">
  <path fill="url(#pin-gradient)" fill-rule="evenodd" d="{pin}"/>
  <path fill="url(#mountain-gradient)" fill-rule="evenodd" d="{path('mountains')}"/>
  <path fill="#011249" fill-rule="evenodd" d="{plane}"/>
</g>
<g class="rise">
  <path fill="#011249" stroke="#011249" stroke-width="5" stroke-linejoin="round" fill-rule="evenodd" d="{word}"/>
  <path class="jpin" fill="#0257C5" fill-rule="evenodd" d="{jpin}"/>
</g>
<g class="rise d2">
  <path fill="#0254C0" fill-rule="evenodd" d="{band}"/>
  <g clip-path="url(#band-clip)"><g transform="skewX(-20)"><rect class="shine" x="0" y="3100" width="700" height="600" fill="url(#shine-g)"/></g></g>
</g>
</svg>'''
open(OUT, 'w').write(svg)
print('wrote', OUT, len(svg), 'bytes')
