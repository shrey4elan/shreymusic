import {useEffect,useRef,useState} from 'react'
import gsap from 'gsap'
import {ScrollTrigger} from 'gsap/ScrollTrigger'
import cfg from './config'
import Scene,{state,Boundary} from './Scene'
import Desert from './Desert'
import Gallery from './Gallery'
import {useAudio,Controls,Visualizer} from './Audio'
gsap.registerPlugin(ScrollTrigger)
const hasGL=()=>{try{const c=document.createElement('canvas');return !!(c.getContext('webgl2')||c.getContext('webgl'))}catch{return false}}
const low=matchMedia('(pointer:coarse)').matches||(navigator.hardwareConcurrency||8)<=4
const S=cfg.sections, IDS=['enter','about','moments','soundtrack','world','end']

export default function App(){
  const [ready,setReady]=useState(false),[rm,setRm]=useState(matchMedia('(prefers-reduced-motion:reduce)').matches),[menu,setMenu]=useState(false),[fs,setFs]=useState(false)
  const root=useRef(),cur=useRef(),a=useAudio(),ok=useRef(hasGL()).current,tr=cfg.tracks[a.i]
  const done=()=>setTimeout(()=>setReady(true),900)
  useEffect(()=>{if(!ok)setReady(true);const t=setTimeout(()=>setReady(true),6000);return()=>clearTimeout(t)},[ok])
  useEffect(()=>{state.reduced=rm;document.documentElement.classList.toggle('rm',rm)},[rm])
  useEffect(()=>{const ctx=gsap.context(()=>{
    ScrollTrigger.create({trigger:root.current,start:'top top',end:'bottom bottom',onUpdate:s=>{state.p=s.progress}})
    if(!rm){gsap.set('.panel,.tl li',{opacity:0});ScrollTrigger.batch('.panel',{start:'top 92%',once:true,onEnter:b=>gsap.to(b,{opacity:1,stagger:.12,duration:1,ease:'power3.out'})});ScrollTrigger.batch('.tl li',{start:'top 95%',once:true,onEnter:b=>gsap.fromTo(b,{y:30,opacity:0},{y:0,opacity:1,stagger:.1,duration:.9,ease:'power3.out'})})}
    if(!rm)gsap.utils.toArray('.rv').forEach(el=>gsap.from(el,{y:70,opacity:0,duration:1.1,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 88%'}}))
  },root);return()=>ctx.revert()},[rm])
  useEffect(()=>{
    const mv=e=>{state.mx=e.clientX/innerWidth*2-1;state.my=e.clientY/innerHeight*2-1
      if(cur.current){cur.current.style.transform=`translate(${e.clientX}px,${e.clientY}px)`;cur.current.classList.toggle('on',!!e.target.closest?.('a,button,input,.hov'))}
      document.querySelectorAll('.mag').forEach(b=>{const r=b.getBoundingClientRect(),dx=e.clientX-(r.left+r.width/2),dy=e.clientY-(r.top+r.height/2)
        b.style.transform=Math.hypot(dx,dy)<90?`translate(${dx*.3}px,${dy*.3}px)`:''})}
    const kd=e=>e.key==='Escape'&&setMenu(false),f=()=>setFs(!!document.fullscreenElement)
    addEventListener('mousemove',mv);addEventListener('keydown',kd);document.addEventListener('fullscreenchange',f)
    return()=>{removeEventListener('mousemove',mv);removeEventListener('keydown',kd);document.removeEventListener('fullscreenchange',f)}},[])
  const toggleFs=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen?.()
  return <>
    <div className="cur" ref={cur} aria-hidden="true"/>
    <div className={'ld'+(ready?' hide':'')} role="status" aria-live="polite"><div><b>{cfg.nickname||cfg.name}</b><div className="bar"><span/></div></div></div>
    <Desert/><div className="veil"/>
    {ok?<Boundary fallback={<div className="fb"/>}><Scene low={low} onReady={done}/></Boundary>:<div className="fb"/>}
    <header className="nav">
      <a href="#enter" className="logo mag">{cfg.nickname||cfg.name}</a>
      <div className="tools">
        <button className="mag" aria-pressed={a.muted} onClick={a.toggleMute}>{a.muted?'Sound off':'Sound on'}</button>
        <button className="mag" aria-pressed={rm} onClick={()=>setRm(!rm)}>{rm?'Motion off':'Motion on'}</button>
        <button className="mag" onClick={toggleFs}>{fs?'Exit fullscreen':'Fullscreen'}</button>
        <button className="mag" aria-expanded={menu} onClick={()=>setMenu(!menu)}>{menu?'Close':'Menu'}</button>
      </div>
    </header>
    <nav className={'menu'+(menu?' o':'')} aria-label="Sections" aria-hidden={!menu}>
      {IDS.map(id=><a key={id} href={'#'+id} tabIndex={menu?0:-1} onClick={()=>setMenu(false)}>{S[id]}</a>)}
    </nav>
    <main ref={root}>
      <section id="enter" className="sec hero"><p className="tag">{cfg.tagline}</p><h1 className="giant">{cfg.name}</h1><span className="scroll">Scroll to explore</span></section>
      <section id="about" className="sec"><h2 className="rv">{S.about}</h2><div className="rv txt"><p className="lead"><b>{cfg.name}</b> — “{cfg.nickname}”</p><p className="lead">{cfg.bio}</p></div></section>
      <section id="moments" className="sec"><h2 className="rv">{S.moments}</h2><Gallery/></section>
      <section id="soundtrack" className="sec"><h2 className="rv">{S.soundtrack}</h2>
        <div className="deck">
          <div className="vw"><div className={'vinyl'+(a.playing?' on':'')}><i style={{backgroundImage:`url(${tr.cover})`}}/></div></div>
          <div><h3 key={tr.title} className="swap">{tr.title}<small>{tr.artist}</small></h3><Visualizer a={a}/><Controls a={a}/>
            {a.err&&<p role="alert" className="err">Can’t play “{tr.title}”. Add the file at {tr.src} (or fix the path in src/config.js).</p>}
            <ul className="tl">{cfg.tracks.map((t,k)=><li key={k}><button className={'tc hov'+(k===a.i?' act':'')} onClick={()=>a.select(k)} aria-current={k===a.i}>
              <img src={t.cover} alt="" width="48" height="48"/><b>{t.title}</b><span>{t.artist}</span><em>{t.duration}</em></button></li>)}</ul></div>
        </div></section>
      <section id="world" className="sec"><h2 className="rv">{S.world}</h2><p className="rv lead">Move your cursor. The shapes follow you, and pulse with the bass when music plays.</p></section>
      <section id="end" className="sec end"><h2 className="giant rv">{cfg.name}</h2>
        <p className="socials">{cfg.socials.map(s=><a key={s.label} className="mag" href={s.url} target="_blank" rel="noreferrer">{s.label}</a>)}</p></section>
    </main>
    <aside className="mini" aria-label="Music player"><Controls a={a} compact/></aside>
  </>
}
