W=[190,120,110,140,130,110,110]; RH=46; M=20; TOP=20
X=[M]; 
for w in W: X.append(X[-1]+w)
A=["1 onion","2 garlic","dash olive oil","curry paste","4 little celery sticks","2 medium carrots"]
B=["Roughly chop","Crush",None,None,"Roughly chop","Roughly chop"]
o=[]
def rect(c0,r0,c1,r1,cls): o.append(f'<rect class="{cls}" x="{X[c0]}" y="{TOP+r0*RH}" width="{X[c1+1]-X[c0]}" height="{(r1-r0+1)*RH}"/>')
def text(c0,r0,c1,r1,lines,cls="t"):
    cx=(X[c0]+X[c1+1])/2; cy=TOP+(r0+r1+1)*RH/2
    n=len(lines); y0=cy-(n-1)*9
    for i,l in enumerate(lines): o.append(f'<text class="{cls}" x="{cx}" y="{y0+i*18+5}" text-anchor="middle">{l}</text>')
for r in range(6):
    rect(0,r,0,r,"ing"); text(0,r,0,r,[A[r]],"t b")
    if B[r]: rect(1,r,1,r,"prep"); text(1,r,1,r,[B[r]])
    else: rect(1,r,1,r,"blank")
    rect(2,r,2,r,"blank") if r>=2 else None
    rect(3,r,3,r,"blank") if r>=4 else None
rect(2,0,2,1,"step"); text(2,0,2,1,["Blend 5 sec,","speed 6"])
rect(3,0,3,3,"step"); text(3,0,3,3,["Add oil + paste;","cook 3 min,","100°C, speed 1"])
rect(4,0,4,5,"step"); text(4,0,4,5,["Add celery +","carrot; blend","5 sec, speed 6"])
rect(5,0,5,5,"step"); text(5,0,5,5,["Cook 7 min,","100°C,","speed 1"])
rect(6,0,6,5,"dish"); text(6,0,6,5,["Curry","stock base"],"t b")
H=TOP+6*RH
w=X[-1]+M
svg=f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {H+70}" width="{w}" role="img" aria-label="Curry stock base, tabular recipe">
<title>Curry stock base — tabular recipe</title>
<style>
:root{{--bg:#fbfaf7;--ink:#1f1f1c;--rule:#8a8577;--ing:#f1eee6;--prep:#fbfaf7;--step:#e8efe6;--dish:#f6e7c8;--mute:#6b675c}}
@media (prefers-color-scheme:dark){{:root{{--bg:#1b1b19;--ink:#ecebe6;--rule:#77736a;--ing:#26261f;--prep:#1b1b19;--step:#243027;--dish:#3b3220;--mute:#a5a194}}}}
svg{{background:var(--bg)}}
rect{{stroke:var(--rule);stroke-width:1}}
.ing{{fill:var(--ing)}} .prep,.blank{{fill:var(--prep)}} .step{{fill:var(--step)}} .dish{{fill:var(--dish);stroke-width:1.6}}
.t{{font:14px Georgia,'Times New Roman',serif;fill:var(--ink)}} .b{{font-weight:bold}}
.cap{{font:italic 13px Georgia,serif;fill:var(--mute)}}
</style>
<rect x="0" y="0" width="{w}" height="{H+70}" style="fill:var(--bg);stroke:none"/>
{chr(10).join(o)}
<text class="cap" x="{M}" y="{H+30}">= Curry stock base (Thermomix) · about 10 min of machine time · curry paste quantity not given</text>
<text class="cap" x="{M}" y="{H+50}">Ingredients in order of first use; each step spans the rows it combines. Soup version: flavouring replaces the paste.</text>
</svg>'''
open("curry-stock-base.svg","w").write(svg)
