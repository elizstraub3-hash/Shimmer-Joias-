import subprocess, numpy as np, sys, math
from PIL import Image, ImageDraw, ImageFont, ImageFilter
W,H,FPS=1080,1920,30
D='/tmp/claude-0/-home-user-Shimmer-Joias-/84d3b82d-a30e-5c41-beef-b02958a47f21/scratchpad/'
TEXT = sys.argv[1]=='text'; OUT=sys.argv[2]
PREVIEW = len(sys.argv)>3
GRADE="hqdn3d=0:0:2.5:2.5,scale=1080:1920:flags=lanczos,eq=contrast=1.07:saturation=1.14:gamma=1.02,colorbalance=rh=0.025:bh=-0.03:rm=0.012:bm=-0.012,unsharp=5:5:0.35"
def clip(src,ss,n):
    p=subprocess.run(['ffmpeg','-v','error','-ss',str(ss),'-i',D+'work/'+src,'-frames:v',str(n),'-vf',GRADE,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    a=np.frombuffer(p.stdout,np.uint8).reshape(-1,H,W,3); assert len(a)==n,(src,len(a)); return a
def zoom(fr,z,cx=.5,cy=.5):
    if abs(z-1)<1e-4: return fr
    w,h=W/z,H/z; x0=(W-w)*cx; y0=(H-h)*cy
    return np.asarray(Image.fromarray(fr).resize((W,H),Image.BICUBIC,box=(x0,y0,x0+w,y0+h)))
# ---------- segments
SEG=[('sr_0284.mp4',0.5,105),('sr_0283.mp4',0.2,108),('sr_0283.mp4',6.6,96),('sr_0285.mp4',0.1,138)]
NE=165
TR=[('wipe',18,1),('flash',14,0),('wipe',18,-1),('flash',16,0)]
starts=[0]; lens=[s[2] for s in SEG]+[NE]
for i,t in enumerate(TR): starts.append(starts[-1]+lens[i]-t[1])
TOTAL=starts[-1]+NE
still=Image.open(D+'work/still_graded.png').convert('RGB')
def still_frame(k):
    u=k/(NE-1); z=1.0+0.09*u; sw,sh=still.size
    w,h=sw/z,sh/z; x0=(sw-w)/2; y0=(sh-h)*0.42
    return np.asarray(still.resize((W,H),Image.LANCZOS,box=(x0,y0,x0+w,y0+h)))
# ---------- sprites / particles
rng=np.random.default_rng(7)
GOLD=np.array([255,206,120],np.float32)
def sprite(r,star):
    s=int(r*6)|1; y,x=np.mgrid[:s,:s].astype(np.float32)-s//2
    d=np.hypot(x,y); a=np.exp(-(d/r)**2*1.6)+0.35*np.exp(-(d/(r*2.6))**2)
    if star:
        a+=0.9*np.exp(-np.abs(y)/(r*0.16))*np.exp(-np.abs(x)/(r*1.9))+0.9*np.exp(-np.abs(x)/(r*0.16))*np.exp(-np.abs(y)/(r*1.9))
    return np.clip(a,0,1.6)
SPR={(r,st):sprite(r,st) for r in (3,5,8,12) for st in (0,1)}
def add(buf,cx,cy,r,st,amp):
    sp=SPR[(r,st)]; s=sp.shape[0]; x0=int(cx)-s//2; y0=int(cy)-s//2
    xa,ya=max(x0,0),max(y0,0); xb,yb=min(x0+s,W),min(y0+s,H)
    if xa>=xb or ya>=yb: return
    buf[ya:yb,xa:xb]+=sp[ya-y0:yb-y0,xa-x0:xb-x0]*amp
NP=70
P=dict(x=rng.uniform(0,W,NP),y=rng.uniform(0,H,NP),v=rng.uniform(25,70,NP),ph=rng.uniform(0,6.28,NP),
       r=rng.choice([3,3,5,5,8],NP),st=rng.integers(0,2,NP),sw=rng.uniform(10,40,NP),tw=rng.uniform(2,5,NP))
def ambient(buf,t,dens):
    n=int(NP*dens)
    for i in range(n):
        y=(P['y'][i]+P['v'][i]*t)%(H+60)-30; x=P['x'][i]+P['sw'][i]*math.sin(t*0.7+P['ph'][i])
        tw=0.5+0.5*math.sin(t*P['tw'][i]+P['ph'][i]); add(buf,x,y,int(P['r'][i]),int(P['st'][i]),0.75*tw**2)
WN=260
WP=dict(d=rng.uniform(-0.09,0.09,WN),u=rng.uniform(0,1,WN),r=rng.choice([3,5,5,8,12],WN),st=rng.integers(0,2,WN),ph=rng.uniform(0,6.28,WN))
yy,xx=np.mgrid[:H,:W].astype(np.float32); 
def wipe(a,b,p,dirn,buf):
    # diagonal coordinate 0..1
    dcoord=(yy/H*0.82+xx/W*0.18) if dirn>0 else (1-(yy/H*0.82+(1-xx/W)*0.18))
    e=-0.12+1.24*(p*p*(3-2*p))
    m=np.clip((e-dcoord)/0.07+0.5,0,1)[...,None]
    out=a*(1-m)+b*m
    glow=np.exp(-((dcoord-e)/0.045)**2)*0.85*math.sin(math.pi*p)**0.6
    buf+=glow
    for i in range(WN):
        dc=e+WP['d'][i]; 
        if not 0<=dc<=1: continue
        u=WP['u'][i]
        # invert coordinate → position
        if dirn>0: y=(dc-0.18*u)/0.82*H; x=u*W
        else: y=((1-dc)-0.18*(1-u))/0.82*H; x=u*W
        tw=0.5+0.5*math.sin(p*20+WP['ph'][i]); add(buf,x,y,int(WP['r'][i]),int(WP['st'][i]),1.3*tw*math.sin(math.pi*p)**0.5*(1-abs(WP['d'][i])/0.09))
    return out
def flash(a,b,p,buf):
    e=p*p*(3-2*p)
    za=zoom(a,1+0.22*e**1.5); zb=zoom(b,1+0.22*(1-e)**1.5)
    out=za.astype(np.float32)*(1-e)+zb.astype(np.float32)*e
    k=math.sin(math.pi*p)**2
    cy,cx=H*0.45,W*0.5
    buf+=k*0.75*np.exp(-(((xx-cx)/(W*0.75))**2+((yy-cy)/(H*0.5))**2))
    return out
# vignette
vig=1-0.20*np.clip((((xx-W/2)/(W*0.72))**2+((yy-H/2)/(H*0.62))**2),0,1.2)[...,None]
# ---------- text layers
def text_layer(lines,ycenter,scrim_strength=0.5):
    img=Image.new('RGBA',(W,H),(0,0,0,0)); 
    sh=Image.new('L',(W,H),0); ds=ImageDraw.Draw(sh); d=ImageDraw.Draw(img)
    y=ycenter; items=[]
    for txt,font,size,track,fill in lines:
        f=ImageFont.truetype(font,size)
        if 'wght' in font:
            try: f.set_variation_by_axes([700])
            except Exception as ex: pass
        if track:
            wtot=sum(f.getlength(c) for c in txt)+track*(len(txt)-1)
        else: wtot=f.getlength(txt)
        items.append((txt,f,size,track,fill,wtot))
    for txt,f,size,track,fill,wtot in items:
        x=(W-wtot)/2
        if txt=='—':
            d.line([(W/2-90,y+10),(W/2+90,y+10)],fill=fill,width=2); ds.line([(W/2-90,y+12),(W/2+90,y+12)],fill=200,width=3); y+=46; continue
        if track:
            for c in txt:
                ds.text((x,y+4),c,font=f,fill=255); d.text((x,y),c,font=f,fill=fill); x+=f.getlength(c)+track
        else:
            ds.text((x,y+6),txt,font=f,fill=255); d.text((x,y),txt,font=f,fill=fill)
        y+=int(size*1.15)
    # gold gradient on glyphs
    a=np.asarray(img).astype(np.float32); al=a[...,3:]/255
    g=np.linspace(0,1,H,dtype=np.float32)[:,None,None]
    band=(np.asarray(img)[...,3]>0).any(1); ys=np.where(band)[0]
    if len(ys):
        g=np.clip((np.arange(H,dtype=np.float32)-ys[0])/(ys[-1]-ys[0]+1),0,1)[:,None,None]
    c1=np.array([255,236,178],np.float32); c2=np.array([226,172,84],np.float32)
    rgb=c1*(1-g)+c2*g
    shadow=np.asarray(sh.filter(ImageFilter.GaussianBlur(14))).astype(np.float32)[...,None]/255
    shadow=np.clip(shadow*1.5,0,1)*0.75
    return rgb*np.ones((H,W,1),np.float32),al,shadow
GV=D+'dl/gv.ttf'; CG=D+'dl/cg.ttf'
if TEXT:
    T1=text_layer([('Boas Festas',GV,165,0,(255,255,255,255))],1310)
    T2=text_layer([('Boas Festas',GV,175,0,(255,255,255,255)),('—',CG,10,0,(240,200,120,255)),('FELIZ NATAL & PRÓSPERO ANO NOVO',CG,40,6,(255,255,255,255))],760)
scrim_bot=np.clip((yy-H*0.52)/(H*0.48),0,1)[...,None]**1.4
def apply_text(f,T,a,scr,uni=False):
    if a<=0: return f
    rgb,al,shd=T
    f=f*(1-scr*a*(1 if uni else scrim_bot))
    f=f*(1-shd*a)
    return f*(1-al*a)+rgb*al*a
def ease(x): x=min(max(x,0),1); return x*x*(3-2*x)
# ---------- render
cmd=['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-',
     '-vf','noise=alls=5:allf=t','-c:v','libx264','-profile:v','high','-crf','17','-preset','slow','-pix_fmt','yuv420p',
     '-colorspace','bt709','-color_primaries','bt709','-color_trc','bt709','-movflags','+faststart','-an',OUT]
enc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
clips=[clip(*s) for s in SEG]
def seg_frame(i,k):
    return clips[i][k] if i<4 else still_frame(k)
for n in range(TOTAL):
    if PREVIEW and n%3: continue
    t=n/FPS
    act=[i for i in range(5) if starts[i]<=n<starts[i]+lens[i]]
    buf=np.zeros((H,W),np.float32)
    if len(act)==2:
        i,j=act; typ,dur,dr=TR[i]; p=(n-starts[j]+0.5)/dur
        a=seg_frame(i,n-starts[i]); b=seg_frame(j,n-starts[j])
        f=wipe(a.astype(np.float32),b.astype(np.float32),p,dr,buf) if typ=='wipe' else flash(a,b,p,buf)
    else:
        f=seg_frame(act[0],n-starts[act[0]]).astype(np.float32)
    f=f*vig
    dens=0.45+0.55*max(1-t/2.5, ease((n-starts[4])/30)) if True else 1
    ambient(buf,t,min(max(dens,0.45),1))
    if TEXT:
        a1=ease((t-0.35)/0.6)*(1-ease((t-2.55)/0.45)); f=apply_text(f,T1,a1,0.38)
        te=(n-starts[4])/FPS; a2=ease((te-0.9)/0.8); f=apply_text(f,T2,a2,0.58,True)
    f=f+buf[...,None]*GOLD*0.9   # additive gold
    # fades
    fi=ease(n/10); fo=ease((TOTAL-1-n)/14)
    f=np.clip(f,0,255)*fi*fo
    enc.stdin.write(f.astype(np.uint8).tobytes())
enc.stdin.close(); enc.wait(); print('ok',OUT,TOTAL,TOTAL/FPS)
