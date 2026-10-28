// ✏️ Edit everything about the site here.
export default {
  name: 'SHREY',
  nickname: 'shreyforelan',
  accent: '#B87552',            // theme accent (headlights, rings, glow)
  tagline: 'dive into music',
  bio: 'this is a testing website for a music directory.',
  carModel: null,               // e.g. '/models/car.glb' (front must face -Z, ~4 units long). null = built-in procedural car
  sections: { enter:'elaning', about:'nothing', moments:'My moments', soundtrack:'My collection', world:'My world', end:'End scene' },
  socials: [ {label:'Instagram',url:'#'}, {label:'YouTube',url:'#'}, {label:'GitHub',url:'#'} ],
  profile: '/images/photo-01.svg',
  // ratio = width/height of the image so nothing is cropped awkwardly
  photos: [
    {src:'/images/photo-01.jpg',caption:'Moment 01',ratio:'3/4'},
    {src:'/images/photo-02.jpg',caption:'Moment 02',ratio:'4/3'},
    {src:'/images/photo-03.jpg',caption:'Moment 03',ratio:'1/1'},
    {src:'/images/photo-04.jpg',caption:'Moment 04',ratio:'3/4'},
    {src:'/images/photo-05.jpg',caption:'Moment 05',ratio:'16/9'},
    {src:'/images/photo-06.jpg',caption:'Moment 06',ratio:'4/3'}
  ],
  tracks: [
    {title:'Placeholder One',artist:'bulla badmaaas',src:'/music/track-01.mp3',cover:'/images/cover-01.svg',duration:'4:27'},
    {title:'Placeholder Two',artist:'tanmay chodu',src:'/music/track-02.mp3',cover:'/images/cover-02.svg',duration:'3:15'},
    {title:'Placeholder Three',artist:'ayush ganduuu',src:'/music/track-03.mp3',cover:'/images/cover-03.svg',duration:'3:53'}
  ]
}
