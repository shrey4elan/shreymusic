// ✏️ Edit everything about the site here.
export default {
  name: 'YOUR NAME',
  nickname: 'nickname',
  accent: '#B87552',            // theme accent (headlights, rings, glow)
  tagline: 'Enter my world',
  bio: 'Write two or three sentences about yourself here. Who you are, what you make, what drives you.',
  carModel: null,               // e.g. '/models/car.glb' (front must face -Z, ~4 units long). null = built-in procedural car
  sections: { enter:'Enter the world', about:'About me', moments:'My moments', soundtrack:'My soundtrack', world:'My world', end:'End scene' },
  socials: [ {label:'Instagram',url:'#'}, {label:'YouTube',url:'#'}, {label:'GitHub',url:'#'} ],
  profile: '/images/photo-01.svg',
  // ratio = width/height of the image so nothing is cropped awkwardly
  photos: [
    {src:'/images/photo-01.svg',caption:'Moment 01',ratio:'3/4'},
    {src:'/images/photo-02.svg',caption:'Moment 02',ratio:'4/3'},
    {src:'/images/photo-03.svg',caption:'Moment 03',ratio:'1/1'},
    {src:'/images/photo-04.svg',caption:'Moment 04',ratio:'3/4'},
    {src:'/images/photo-05.svg',caption:'Moment 05',ratio:'16/9'},
    {src:'/images/photo-06.svg',caption:'Moment 06',ratio:'4/3'}
  ],
  tracks: [
    {title:'Placeholder One',artist:'Artist Name',src:'/music/track-01.wav',cover:'/images/cover-01.svg',duration:'0:08'},
    {title:'Placeholder Two',artist:'Artist Name',src:'/music/track-02.wav',cover:'/images/cover-02.svg',duration:'0:08'},
    {title:'Placeholder Three',artist:'Artist Name',src:'/music/track-03.wav',cover:'/images/cover-03.svg',duration:'0:08'}
  ]
}
