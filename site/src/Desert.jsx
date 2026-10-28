import {useEffect} from 'react'
// Pure SVG/CSS desert: sky, sun, 3 parallax dune layers and a walking camel. No external assets.
const D=[['d1','#E2CBA0','#D2B488','M0 150 C180 90 340 140 520 110 C720 75 900 150 1120 105 C1260 80 1360 110 1440 95 L1440 400 L0 400Z','M0 400 L0 190 C260 150 420 230 640 190 C860 150 1000 230 1440 170 L1440 400Z'],
 ['d2','#D2B07E','#C49A6C','M0 170 C240 90 420 200 680 130 C900 70 1120 190 1440 120 L1440 400 L0 400Z','M0 400 L0 230 C300 170 520 270 800 200 C1040 140 1240 230 1440 190 L1440 400Z'],
 ['d3','#C49A6C','#A9714A','M0 120 C220 60 460 170 720 100 C980 40 1200 150 1440 90 L1440 400 L0 400Z','M0 400 L0 200 C260 150 520 250 800 180 C1040 120 1260 210 1440 160 L1440 400Z']]
function Camel(){return <div className="camelwrap"><svg viewBox="0 0 240 170" aria-hidden="true"><g className="cbody">
  <path className="leg b" fill="#6B5240" d="M122 84 L134 84 L132 120 L135 158 L124 158 L125 124Z"/>
  <path className="leg a" fill="#6B5240" d="M86 84 L98 84 L96 120 L99 158 L88 158 L89 124Z"/>
  <path fill="#49372D" d="M60 70 Q58 48 90 48 L135 50 Q160 52 158 74 Q156 92 130 92 L85 92 Q60 92 60 70Z"/>
  <path fill="#49372D" d="M80 52 Q92 14 112 28 Q125 40 128 52Z"/>
  <path fill="#B87552" d="M92 50 L130 52 L128 76 L92 74Z"/><path d="M92 64 L129 65" stroke="#D4AD72" strokeWidth="3" fill="none"/>
  <path fill="#49372D" d="M140 58 Q158 56 166 34 Q170 24 178 22 L190 26 Q186 40 176 52 Q168 78 150 86Z"/>
  <path fill="#49372D" d="M176 20 Q196 14 214 26 Q218 32 212 36 Q196 36 182 34Z"/><path fill="#49372D" d="M180 20 L184 9 L189 20Z"/>
  <path d="M60 66 Q48 74 50 98" stroke="#49372D" strokeWidth="4" fill="none" strokeLinecap="round"/>
  <path className="leg a" fill="#49372D" d="M134 84 L146 84 L144 120 L147 158 L136 158 L137 124Z"/>
  <path className="leg b" fill="#49372D" d="M72 84 L84 84 L82 120 L85 158 L74 158 L75 124Z"/>
</g></svg><div className="shadow"/></div>}
export default function Desert(){
  useEffect(()=>{let t;const f=()=>{cancelAnimationFrame(t);t=requestAnimationFrame(()=>document.documentElement.style.setProperty('--sy',scrollY))}
    addEventListener('scroll',f,{passive:true});return()=>{removeEventListener('scroll',f);cancelAnimationFrame(t)}},[])
  const dune=([c,a,b,p,s])=><svg key={c} className={'dn '+c} viewBox="0 0 1440 400" preserveAspectRatio="none"><defs><linearGradient id={'g'+c} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={a}/><stop offset="1" stopColor={b}/></linearGradient></defs><path d={p} fill={`url(#g${c})`}/><path d={s} fill="rgba(73,55,45,.09)"/></svg>
  return <div className="desert" aria-hidden="true"><div className="sun"/>{dune(D[0])}{dune(D[1])}<Camel/>{dune(D[2])}</div>
}
