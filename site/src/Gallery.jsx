import {useEffect,useRef,useState} from 'react'
import cfg from './config'
const Z=[50,-70,0,-130,30,-40],R=[-6,5,0,7,-4,3]
export default function Gallery(){
  const [o,setO]=useState(null),st=useRef(),cl=useRef(),P=cfg.photos,n=P.length
  const mm=e=>{const r=st.current.getBoundingClientRect(),s=st.current.style
    s.setProperty('--rx',((e.clientY-r.top)/r.height-.5)*-8+'deg');s.setProperty('--ry',((e.clientX-r.left)/r.width-.5)*10+'deg')}
  const open=o!==null
  useEffect(()=>{if(!open)return
    const k=e=>{if(e.key==='Escape')setO(null);if(e.key==='ArrowRight')setO(x=>(x+1)%n);if(e.key==='ArrowLeft')setO(x=>(x-1+n)%n)}
    addEventListener('keydown',k);cl.current?.focus();return()=>removeEventListener('keydown',k)},[open,n])
  return <div className="gal" onMouseMove={mm} onMouseLeave={()=>{st.current.style.setProperty('--rx','0deg');st.current.style.setProperty('--ry','0deg')}}>
    <div className="stage" ref={st}>
      {P.map((p,i)=><button key={i} className="panel hov" style={{'--ar':p.ratio,'--z':Z[i%6]+'px','--r':R[i%6]+'deg'}} onClick={()=>setO(i)} aria-label={'Open '+p.caption}>
        <img src={p.src} alt={p.caption} loading="lazy" onError={e=>{e.currentTarget.style.opacity=.15}}/><span>{p.caption}</span></button>)}
    </div>
    {open&&<div className="lb" role="dialog" aria-modal="true" aria-label="Photo viewer" onClick={()=>setO(null)}>
      <button ref={cl} className="x" aria-label="Close viewer" onClick={()=>setO(null)}>✕</button>
      <button className="nv pv" aria-label="Previous photo" onClick={e=>{e.stopPropagation();setO((o-1+n)%n)}}>‹</button>
      <figure onClick={e=>e.stopPropagation()}><img key={o} src={P[o].src} alt={P[o].caption}/><figcaption>{P[o].caption} — {o+1}/{n}</figcaption></figure>
      <button className="nv nx" aria-label="Next photo" onClick={e=>{e.stopPropagation();setO((o+1)%n)}}>›</button>
    </div>}
  </div>
}
