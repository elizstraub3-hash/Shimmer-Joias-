import sys, time, subprocess, numpy as np, torch, torch.nn as nn, torch.nn.functional as F
torch.set_num_threads(4)
class SRVGG(nn.Module):
    def __init__(s, nf=64, nc=32, up=4):
        super().__init__(); s.up=up
        L=[nn.Conv2d(3,nf,3,1,1), nn.PReLU(nf)]
        for _ in range(nc): L+=[nn.Conv2d(nf,nf,3,1,1), nn.PReLU(nf)]
        L.append(nn.Conv2d(nf,3*up*up,3,1,1)); s.body=nn.ModuleList(L); s.ps=nn.PixelShuffle(up)
    def forward(s,x):
        o=x
        for l in s.body: o=l(o)
        return s.ps(o)+F.interpolate(x,scale_factor=s.up,mode='nearest')
def load():
    m=SRVGG(); sd=torch.load(sys.argv[1] if False else W,map_location='cpu',weights_only=True)
    m.load_state_dict(sd.get('params',sd)); return m.eval().to(memory_format=torch.channels_last)
W='/tmp/claude-0/-home-user-Shimmer-Joias-/84d3b82d-a30e-5c41-beef-b02958a47f21/scratchpad/dl/w.pth'
def run(src,dst,w,h,extra_in=[],maxf=None,fps='30'):
    m=load()
    dec=subprocess.Popen(['ffmpeg','-v','error',*extra_in,'-i',src,'-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE)
    enc=subprocess.Popen(['ffmpeg','-v','error','-y','-f','rawvideo','-pix_fmt','rgb24','-s',f'{w*4}x{h*4}','-r',fps,'-i','-','-c:v','libx264','-crf','10','-preset','fast','-pix_fmt','yuv420p',dst],stdin=subprocess.PIPE)
    n=0;t=time.time()
    with torch.inference_mode():
        while True:
            b=dec.stdout.read(w*h*3)
            if len(b)<w*h*3: break
            x=torch.from_numpy(np.frombuffer(b,np.uint8).reshape(h,w,3).copy()).permute(2,0,1)[None].float().div(255).contiguous(memory_format=torch.channels_last)
            y=m(x).clamp(0,1).mul(255).round().byte()[0].permute(1,2,0).contiguous().numpy()
            enc.stdin.write(y.tobytes()); n+=1
            if n%50==0: print(src[-12:],n,round((time.time()-t)/n,2),'s/f',flush=True)
            if maxf and n>=maxf: break
    enc.stdin.close(); enc.wait(); dec.kill(); print('done',dst,n,flush=True)
if __name__=='__main__':
    run(sys.argv[1],sys.argv[2],int(sys.argv[3]),int(sys.argv[4]),maxf=int(sys.argv[5]) if len(sys.argv)>5 else None,extra_in=sys.argv[6:])
