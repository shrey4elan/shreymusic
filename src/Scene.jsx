import {Canvas,useFrame,useThree,useLoader} from '@react-three/fiber'
import {Component,Suspense,useEffect,useMemo,useRef} from 'react'
import * as THREE from 'three'
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js'
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js'
import cfg from './config'

const {PI,sin}=Math
export const state={p:0,sp:0,mx:0,my:0,level:0,v:0,reduced:false}
export class Boundary extends Component{
  state={e:false}
  static getDerivedStateFromError(){return{e:true}}
  componentDidCatch(e){console.warn('3D fallback:',e)}
  render(){return this.state.e?this.props.fallback:this.props.children}
}

// car path keyframes: [progress, x, z, yaw]  (yaw PI = facing camera, 0 = driving away)
const KEYS=[[0,0,-45,PI],[.12,0,-8,PI],[.28,3,-7,PI/2],[.42,-2,-9,PI*.15],[.55,0,-12,0],[.72,-3.5,-16,0],[.88,2,-20,0],[1,0,-80,0]]
const ss=t=>t*t*(3-2*t), cl=(t,a=0,b=1)=>Math.min(b,Math.max(a,t))
function key(p){let i=0;while(i<KEYS.length-2&&p>KEYS[i+1][0])i++;const a=KEYS[i],b=KEYS[i+1],t=ss(cl((p-a[0])/(b[0]-a[0])));return[1,2,3].map(j=>a[j]+(b[j]-a[j])*t)}

const sil=new THREE.MeshStandardMaterial({color:'#d9c9ab',metalness:1,roughness:.22})
function Procedural({wheels}){
  return <group>
    <mesh position={[0,.5,0]} material={sil}><boxGeometry args={[1.9,.45,4.3]}/></mesh>
    <mesh position={[0,.95,.3]}><boxGeometry args={[1.5,.42,1.9]}/><meshStandardMaterial color="#0b0c0f" metalness={1} roughness={.05}/></mesh>
    <mesh position={[0,.62,-1.9]} rotation={[.25,0,0]} material={sil}><boxGeometry args={[1.8,.12,1.2]}/></mesh>
    {[-.6,.6].map(x=><mesh key={x} position={[x,.6,-2.16]}><boxGeometry args={[.45,.1,.04]}/><meshBasicMaterial color="#fff" toneMapped={false}/></mesh>)}
    <mesh position={[0,.65,2.16]}><boxGeometry args={[1.6,.07,.04]}/><meshBasicMaterial color="#ff1020" toneMapped={false}/></mesh>
    {[[-1,-1.35],[1,-1.35],[-1,1.35],[1,1.35]].map(([s,z],k)=>
      <group key={k} position={[s*.95,.38,z]} ref={e=>{wheels.current[k]=e}}>
        <mesh rotation={[0,0,PI/2]}><cylinderGeometry args={[.38,.38,.3,24]}/><meshStandardMaterial color="#0a0a0a" roughness={.8}/></mesh>
        <mesh position={[s*.18,0,0]}><boxGeometry args={[.05,.42,.07]}/><meshStandardMaterial color="#aaa" metalness={1} roughness={.2}/></mesh>
      </group>)}
    <pointLight position={[0,.7,-4]} intensity={25} distance={14}/>
    <pointLight position={[0,.7,3.5]} intensity={10} distance={8} color="#ff1020"/>
  </group>
}
function Model({url}){const g=useLoader(GLTFLoader,url);return <primitive object={g.scene}/>}
function Env(){
  const {gl,scene}=useThree()
  useEffect(()=>{const p=new THREE.PMREMGenerator(gl),t=p.fromScene(new RoomEnvironment(),.04).texture
    scene.environment=t;scene.environmentIntensity=.5
    return()=>{scene.environment=null;t.dispose();p.dispose()}},[gl,scene])
  return null
}
const G=[<icosahedronGeometry args={[1,0]}/>,<torusKnotGeometry args={[.7,.25,64,8]}/>,<octahedronGeometry args={[1]}/>,<torusGeometry args={[.8,.3,12,32]}/>,<dodecahedronGeometry args={[.9]}/>]
const FL=[[-5.5,3,-10],[5.5,2,-12],[-4.5,5,-16],[5,4.2,-18],[0,6.2,-14]]

function World({low}){
  const car=useRef(),wheels=useRef([]),rings=useRef([]),marks=useRef([]),pts=useRef(),fl=useRef([]),idle=useRef(0),last=useRef(0)
  const N=low?14:24,SP=5,L=N*SP,NP=low?150:300,tmp=useMemo(()=>new THREE.Vector3(),[])
  const acc=useMemo(()=>new THREE.Color(cfg.accent),[]),blue=useMemo(()=>new THREE.Color('#D4AD72'),[])
  const pos=useMemo(()=>{const a=new Float32Array(NP*3);for(let i=0;i<NP;i++){a[i*3]=(Math.random()-.5)*16;a[i*3+1]=Math.random()*6;a[i*3+2]=8-Math.random()*L}return a},[NP,L])
  useFrame((s,dt)=>{
    dt=cl(dt,.001,.05);const k=1-Math.exp(-dt*3),pp=state.sp
    state.sp+=(state.p-state.sp)*k;const p=state.sp
    state.v+=(Math.abs(p-pp)/dt-state.v)*.1
    idle.current+=state.reduced?0:dt*4
    const tr=p*260+idle.current,d=tr-last.current;last.current=tr
    rings.current.forEach((e,i)=>e&&(e.position.z=8-L+((i*SP+tr)%L)))
    marks.current.forEach((e,i)=>e&&(e.position.z=8-L+((i*SP+2.5+tr)%L)))
    wheels.current.forEach(w=>w&&(w.rotation.x-=d*2.6+dt*(state.reduced?0:6)))
    const [x,z,ry]=key(p),c=s.camera
    car.current.position.set(x+state.mx*.3,0,z);car.current.rotation.y=ry;car.current.rotation.z=sin(s.clock.elapsedTime*.9)*.01
    c.position.x+=(sin(p*5)*2.5+state.mx*.9-c.position.x)*k
    c.position.y+=(1.5+1.1*sin(p*3)**2-state.my*.3-c.position.y)*k
    c.position.z+=(8-3*sin(p*PI)-c.position.z)*k
    c.lookAt(tmp.set(x*.6,.9,z*.7));c.fov=48+Math.min(14,state.v*60);c.updateProjectionMatrix()
    const a=pts.current.geometry.attributes.position
    for(let i=0;i<NP;i++){let q=a.array[i*3+2]+d+dt*(state.reduced?0:3);if(q>8)q-=L;if(q<8-L)q+=L;a.array[i*3+2]=q}
    a.needsUpdate=true
    const e=ss(cl((p-.64)/.08))*(1-ss(cl((p-.9)/.06)))
    fl.current.forEach((f,i)=>{if(!f)return;f.scale.setScalar(e*(1+state.level*.6)*.9);f.rotation.x+=dt*.5;f.rotation.y+=dt*(.4+state.mx*(i%2?1:-1))})
  })
  return <>
    <mesh rotation={[-PI/2,0,0]} position={[0,0,-30]}><planeGeometry args={[16,140]}/><meshStandardMaterial color="#5a4636" metalness={.3} roughness={.6} transparent opacity={.6}/></mesh>
    {Array.from({length:N},(_,i)=><mesh key={'r'+i} ref={e=>{rings.current[i]=e}} position={[0,2.2,0]}><torusGeometry args={[5.5,.06,6,48]}/><meshBasicMaterial color={i%3?acc:blue} toneMapped={false}/></mesh>)}
    {Array.from({length:N},(_,i)=><mesh key={'m'+i} ref={e=>{marks.current[i]=e}} position={[0,.02,0]} rotation={[-PI/2,0,0]}><planeGeometry args={[.14,2]}/><meshBasicMaterial color="#F2E8D5"/></mesh>)}
    <group ref={car}>
      {cfg.carModel?<Boundary fallback={<Procedural wheels={wheels}/>}><Suspense fallback={<Procedural wheels={wheels}/>}><Model url={cfg.carModel}/></Suspense></Boundary>:<Procedural wheels={wheels}/>}
    </group>
    <points ref={pts}><bufferGeometry><bufferAttribute attach="attributes-position" count={NP} array={pos} itemSize={3}/></bufferGeometry><pointsMaterial size={.06} color="#FAF5EC" transparent opacity={.6}/></points>
    {FL.map(([x,y,z],i)=><mesh key={i} ref={e=>{fl.current[i]=e}} position={[x,y,z]} scale={0}>{G[i]}
      {i%2?<meshStandardMaterial color={acc} emissive={acc} emissiveIntensity={.8} metalness={.6} roughness={.3}/>:<meshStandardMaterial color="#DCC6A0" metalness={1} roughness={.15}/>}</mesh>)}
  </>
}
export default function Scene({low,onReady}){
  return <Canvas className="cv" dpr={[1,low?1.25:2]} gl={{antialias:!low,alpha:true,powerPreference:'high-performance'}} camera={{fov:50,position:[0,1.6,8],near:.1,far:120}} onCreated={onReady}>
    <fog attach="fog" args={['#E3CFA8',12,70]}/><Env/>
    <ambientLight intensity={.2}/><directionalLight position={[4,6,5]} intensity={1.4}/>
    <pointLight position={[0,4,-6]} intensity={40} distance={30} color={cfg.accent}/>
    <World low={low}/>
  </Canvas>
}
