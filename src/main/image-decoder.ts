import { app, BrowserWindow, nativeImage } from "electron";
import path from "node:path";
import { keyGreenPixels } from "../shared/green-screen";
export class ImageDecoder {
  private window: BrowserWindow | null = null;
  private async ensureWindow() {
    if (!this.window) {
      this.window = new BrowserWindow({
        show: false,
        webPreferences: {
          sandbox: true,
          contextIsolation: true,
          nodeIntegration: false,
          backgroundThrottling: false,
        },
      });
      this.window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      await this.window.loadFile(
        path.join(app.getAppPath(), "templates/decoder.html"),
      );
    }
    return this.window;
  }
  async animation(
    bytes: Buffer,
    removeGreen: boolean,
  ): Promise<{
    width: number;
    height: number;
    frames: { png: string; durationMs: number }[];
  }> {
    const window = await this.ensureWindow();
    return window.webContents.executeJavaScript(`(async()=>{
      const keyGreen=${keyGreenPixels.toString()};
      const decoder=new ImageDecoder({data:Uint8Array.from(atob(${JSON.stringify(bytes.toString("base64"))}),c=>c.charCodeAt(0)),type:'image/gif',preferAnimation:true});
      try {
        await decoder.tracks.ready;
        const count=decoder.tracks.selectedTrack.frameCount;
        if(!count||count>600)throw Error('GIF phải có từ 1 đến 600 frame');
        const canvas=document.createElement('canvas');const ctx=canvas.getContext('2d',{willReadFrequently:true});
        let left=Infinity,top=Infinity,right=-1,bottom=-1;
        for(let i=0;i<count;i++){
          const {image}=await decoder.decode({frameIndex:i});
          if(image.displayWidth*image.displayHeight*count>200000000){image.close();throw Error('GIF quá lớn, hãy dùng template nhỏ hơn')}
          canvas.width=image.displayWidth;canvas.height=image.displayHeight;ctx.drawImage(image,0,0);image.close();
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
          const b=keyGreen(pixels.data,canvas.width,canvas.height,${removeGreen});
          if(b.right>=0){left=Math.min(left,b.left);top=Math.min(top,b.top);right=Math.max(right,b.right);bottom=Math.max(bottom,b.bottom)}
        }
        if(right<0)throw Error('Không còn nội dung sau khi tách nền xanh');
        left=Math.max(0,left-4);top=Math.max(0,top-4);right=Math.min(canvas.width-1,right+4);bottom=Math.min(canvas.height-1,bottom+4);
        const cropped=document.createElement('canvas');cropped.width=right-left+1;cropped.height=bottom-top+1;const out=cropped.getContext('2d');const frames=[];
        for(let i=0;i<count;i++){
          const {image}=await decoder.decode({frameIndex:i});const durationMs=Math.max(10,Math.round((image.duration||100000)/1000));
          ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(image,0,0);image.close();
          const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);keyGreen(pixels.data,canvas.width,canvas.height,${removeGreen});ctx.putImageData(pixels,0,0);
          out.clearRect(0,0,cropped.width,cropped.height);out.drawImage(canvas,left,top,cropped.width,cropped.height,0,0,cropped.width,cropped.height);
          frames.push({png:cropped.toDataURL('image/png').split(',')[1],durationMs});
        }
        return {width:cropped.width,height:cropped.height,frames};
      } finally {decoder.close()}
    })()`);
  }
  async background(bytes: Buffer, width: number, height: number, blur: number) {
    const window = await this.ensureWindow();
    const source = "data:image/png;base64," + bytes.toString("base64");
    const png: string = await window.webContents.executeJavaScript(
      "(async()=>{const image=new Image();image.src=" +
        JSON.stringify(source) +
        ";await image.decode();const width=" +
        width +
        ",height=" +
        height +
        ",blur=" +
        blur +
        ";const padding=Math.ceil(blur*3);const fitted=document.createElement('canvas');fitted.width=width;fitted.height=height;const f=fitted.getContext('2d');const scale=Math.max(width/image.naturalWidth,height/image.naturalHeight);f.drawImage(image,(width-image.naturalWidth*scale)/2,(height-image.naturalHeight*scale)/2,image.naturalWidth*scale,image.naturalHeight*scale);const c=document.createElement('canvas');c.width=width+2*padding;c.height=height+2*padding;const ctx=c.getContext('2d');if(!('filter' in ctx))throw Error('Canvas blur unavailable');ctx.filter='blur('+blur+'px)';ctx.drawImage(fitted,padding,padding);return c.toDataURL('image/png').split(',')[1];})()",
    );
    return Buffer.from(png, "base64");
  }
  async decode(bytes: Buffer, mime: string) {
    const window = await this.ensureWindow();
    const source = "data:" + mime + ";base64," + bytes.toString("base64");
    // Chromium's image decoder supports WebP and honors JPEG EXIF orientation.
    const png: string = await window.webContents.executeJavaScript(
      "new Promise((resolve,reject)=>{const image=new Image();image.onerror=()=>reject(new Error('Image decode failed'));image.onload=()=>{try{if(image.naturalWidth*image.naturalHeight>100000000)throw Error('Image exceeds 100 megapixels');const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const ctx=canvas.getContext('2d');if(!ctx)throw Error('Canvas unavailable');ctx.drawImage(image,0,0);resolve(canvas.toDataURL('image/png').split(',')[1]);}catch(error){reject(error)}};image.src=" +
        JSON.stringify(source) +
        ";})",
    );
    const result = nativeImage.createFromBuffer(Buffer.from(png, "base64"));
    if (result.isEmpty()) throw Error("Ảnh không giải mã được");
    return result;
  }
  close() {
    this.window?.destroy();
    this.window = null;
  }
}
