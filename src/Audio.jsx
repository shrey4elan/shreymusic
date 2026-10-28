import {useEffect,useRef,useState} from 'react'
import cfg from './config'
import {state} from './Scene'
export const fmt=s=>isFinite(s)&&s>0?`${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`:'0:00'
export function useAudio(tracks = cfg.tracks){
  const [el]=useState(()=>{
    const e=new Audio()
    e.preload='metadata'
    e.crossOrigin='anonymous'
    return e
  })
  const g=useRef({}),want=useRef(false),n=tracks.length
  const [i,setI]=useState(0),[playing,setPl]=useState(false),[t,setT]=useState(0),[dur,setD]=useState(0),[vol,setVol]=useState(.8),[muted,setMu]=useState(false),[err,setErr]=useState(false)
  const currentTrack = tracks[i] || tracks[0]

  useEffect(()=>{
    if(!currentTrack?.src) return
    setErr(false)
    setT(0)
    setD(0)
    el.src=currentTrack.src
    el.load()
    if(want.current)el.play().catch(()=>setErr(true))

    // Spotify-like Mobile Lockscreen & Notification Controls (MediaSession API)
    if('mediaSession' in navigator){
      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentTrack.title || 'Shrey Music',
        artist: currentTrack.artist || 'Unknown Artist',
        album: currentTrack.album || 'Shrey Music',
        artwork: [
          { src: currentTrack.cover || '/images/cover-01.svg', sizes: '512x512', type: 'image/jpeg' }
        ]
      })
      navigator.mediaSession.setActionHandler('play', () => { el.play(); want.current = true; })
      navigator.mediaSession.setActionHandler('pause', () => { el.pause(); want.current = false; })
      navigator.mediaSession.setActionHandler('previoustrack', () => setI(x => (x - 1 + tracks.length) % tracks.length))
      navigator.mediaSession.setActionHandler('nexttrack', () => setI(x => (x + 1) % tracks.length))
      navigator.mediaSession.setActionHandler('seekto', (details) => { if (details.seekTime) el.currentTime = details.seekTime; })
    }
  },[currentTrack,el,tracks.length])

  useEffect(()=>{
    const h={timeupdate:()=>setT(el.currentTime),loadedmetadata:()=>setD(el.duration),play:()=>setPl(true),pause:()=>setPl(false),
      error:()=>{want.current=false;setErr(true);setPl(false)},ended:()=>setI(x=>(x+1)%Math.max(1,tracks.length))}
    Object.entries(h).forEach(([k,f])=>el.addEventListener(k,f));el.volume=.8
    return()=>Object.entries(h).forEach(([k,f])=>el.removeEventListener(k,f))},[el,tracks.length])

  const boot=()=>{if(g.current.an)return
    try{const C=new(window.AudioContext||window.webkitAudioContext)(),an=C.createAnalyser();an.fftSize=128;an.smoothingTimeConstant=.82
      C.createMediaElementSource(el).connect(an);an.connect(C.destination);g.current={C,an}}catch(e){console.warn(e)}}
  const play=()=>{boot();g.current.C?.resume();want.current=true;el.play().catch(()=>setErr(true))}  // only ever called from a click
  return {i,playing,t,dur,vol,muted,err,an:()=>g.current.an,track:currentTrack,
    toggle:()=>el.paused?play():(want.current=false,el.pause()),
    select:k=>{setI(k);play()},
    playTrack:(trackObj)=>{
      boot()
      g.current.C?.resume()
      want.current=true
      el.src=trackObj.src
      el.load()
      el.play().catch(()=>setErr(true))
    },
    next:()=>setI((i+1)%Math.max(1,tracks.length)),
    prev:()=>setI((i-1+tracks.length)%Math.max(1,tracks.length)),
    seek:v=>{el.currentTime=v},setVolume:v=>{el.volume=v;setVol(v)},toggleMute:()=>{el.muted=!el.muted;setMu(el.muted)}}
}
export function Visualizer({a}){
  const c=useRef(),r=useRef(a);r.current=a
  useEffect(()=>{const cv=c.current,x=cv.getContext('2d'),d=new Uint8Array(64);let id
    const loop=t=>{const w=cv.width=cv.clientWidth,h=cv.height=cv.clientHeight,A=r.current,an=A.an()
      if(an&&A.playing&&!state.reduced)an.getByteFrequencyData(d);else for(let k=0;k<64;k++)d[k]=18+10*Math.sin(t/900+k*.35)
      let s=0;for(let k=0;k<8;k++)s+=d[k];state.level+=(s/8/255-state.level)*.2
      const bw=w/64;x.clearRect(0,0,w,h)
      for(let k=0;k<64;k++){const v=d[k]/255*h;x.fillStyle=k%2?cfg.accent:'#49372D';x.globalAlpha=.35+d[k]/400;x.fillRect(k*bw+1,h-v,bw-2,v)}
      id=requestAnimationFrame(loop)}
    id=requestAnimationFrame(loop);return()=>cancelAnimationFrame(id)},[])
  return <canvas ref={c} className="vz" aria-hidden="true"/>
}
export function Controls({a,compact}){
  const tr=a.track || cfg.tracks[a.i] || cfg.tracks[0]
  return <div className={'ctl'+(compact?' c':'')}>
    {compact&&<b className="nm">{tr?.title}</b>}
    <button className="mag" aria-label="Previous track" onClick={a.prev}>⏮</button>
    <button className="mag play" aria-label={a.playing?'Pause':'Play'} onClick={a.toggle}>{a.playing?'❚❚':'▶'}</button>
    <button className="mag" aria-label="Next track" onClick={a.next}>⏭</button>
    <span>{fmt(a.t)}</span>
    <input type="range" aria-label="Seek" min="0" max={a.dur||0} step=".1" value={Math.min(a.t,a.dur||0)} onChange={e=>a.seek(+e.target.value)}/>
    <span>{fmt(a.dur)}</span>
    <input type="range" className="vol" aria-label="Volume" min="0" max="1" step=".01" value={a.vol} onChange={e=>a.setVolume(+e.target.value)}/>
  </div>
}
