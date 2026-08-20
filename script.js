(function(){
  const tracks = [
    { title:"Night Drive",    artist:"Rehan Qureshi",  src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { title:"Amber Skyline",  artist:"Meera Kapoor",   src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3" },
    { title:"Low Tide",       artist:"Aarav Shah",     src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3" },
    { title:"Paper Lantern",  artist:"Naina Verma",    src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3" },
    { title:"Quiet Static",   artist:"Kabir Malhotra", src:"https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3" }
  ];

  const audio      = document.getElementById('audio');
  const playBtn    = document.getElementById('playBtn');
  const playIcon   = document.getElementById('playIcon');
  const pauseIcon  = document.getElementById('pauseIcon');
  const prevBtn    = document.getElementById('prevBtn');
  const nextBtn    = document.getElementById('nextBtn');
  const trackTitle = document.getElementById('trackTitle');
  const trackArtist= document.getElementById('trackArtist');
  const discText   = document.getElementById('discText');
  const platter    = document.getElementById('platter');
  const tonearm    = document.getElementById('tonearm');
  const seekBar    = document.getElementById('seekBar');
  const seekFill   = document.getElementById('seekFill');
  const seekKnob   = document.getElementById('seekKnob');
  const curTime    = document.getElementById('curTime');
  const durTime    = document.getElementById('durTime');
  const volBar     = document.getElementById('volBar');
  const volFill    = document.getElementById('volFill');
  const volKnob    = document.getElementById('volKnob');
  const playlistEl = document.getElementById('playlist');
  const shuffleOpt = document.getElementById('shuffleOpt');
  const autoplayOpt= document.getElementById('autoplayOpt');
  const repeatOpt  = document.getElementById('repeatOpt');

  let current = 0;
  let shuffle = false;
  let autoplay = true;
  let repeat = false;
  let isSeeking = false;

  // Cache of known durations (in seconds), keyed by track index
  const durations = new Array(tracks.length).fill(null);

  function fmt(sec){
    if(sec===null || sec===undefined || !isFinite(sec)) return "--:--";
    const m = Math.floor(sec/60);
    const s = Math.floor(sec%60).toString().padStart(2,'0');
    return `${m}:${s}`;
  }

  function initials(title){
    return title.split(' ').map(w=>w[0]).join('').slice(0,3).toUpperCase();
  }

  // Preload metadata for every track up front so durations show in the
  // playlist immediately, without needing to actually play each song.
  function preloadDurations(){
    tracks.forEach((t, i)=>{
      const probe = new Audio();
      probe.preload = 'metadata';
      probe.src = t.src;
      probe.addEventListener('loadedmetadata', ()=>{
        durations[i] = probe.duration;
        const cell = playlistEl.querySelector(`[data-dur="${i}"]`);
        if(cell) cell.textContent = fmt(probe.duration);
        if(i === current && !durTime.dataset.locked){
          durTime.textContent = fmt(probe.duration);
        }
      }, { once:true });
    });
  }

  function renderPlaylist(){
    playlistEl.innerHTML = '';
    tracks.forEach((t, i)=>{
      const row = document.createElement('div');
      row.className = 'track' + (i===current ? ' playing' : '');
      const numCell = (i===current && !audio.paused)
        ? `<div class="eq"><span></span><span></span><span></span></div>`
        : (i+1).toString().padStart(2,'0');
      row.innerHTML = `
        <span class="num">${numCell}</span>
        <div class="info">
          <div class="t-title">${t.title}</div>
          <div class="t-artist">${t.artist}</div>
        </div>
        <span class="t-dur" data-dur="${i}">${fmt(durations[i])}</span>
      `;
      row.addEventListener('click', ()=> loadTrack(i, true));
      playlistEl.appendChild(row);
    });
  }

  function loadTrack(i, autoStart){
    current = (i + tracks.length) % tracks.length;
    const t = tracks[current];
    audio.src = t.src;
    trackTitle.textContent = t.title;
    trackArtist.textContent = t.artist;
    discText.textContent = initials(t.title);
    seekFill.style.width = '0%';
    seekKnob.style.left = '0%';
    curTime.textContent = '0:00';
    durTime.textContent = fmt(durations[current]);
    renderPlaylist();
    if(autoStart){
      audio.play().catch(()=>{});
    }
  }

  function setPlayingUI(playing){
    playIcon.style.display = playing ? 'none' : 'block';
    pauseIcon.style.display = playing ? 'block' : 'none';
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
    platter.classList.toggle('spinning', playing);
    tonearm.classList.toggle('down', playing);
    renderPlaylist();
  }

  playBtn.addEventListener('click', ()=>{
    if(audio.paused){ audio.play().catch(()=>{}); }
    else{ audio.pause(); }
  });

  prevBtn.addEventListener('click', ()=>{
    if(audio.currentTime > 3){ audio.currentTime = 0; return; }
    goPrev();
  });
  nextBtn.addEventListener('click', ()=> goNext());

  function pickIndexOtherThan(i){
    if(tracks.length<2) return i;
    let n;
    do{ n = Math.floor(Math.random()*tracks.length); } while(n===i);
    return n;
  }

  function goNext(){
    if(shuffle) loadTrack(pickIndexOtherThan(current), true);
    else loadTrack(current+1, true);
  }
  function goPrev(){
    if(shuffle) loadTrack(pickIndexOtherThan(current), true);
    else loadTrack(current-1, true);
  }

  audio.addEventListener('play', ()=> setPlayingUI(true));
  audio.addEventListener('pause', ()=> setPlayingUI(false));

  audio.addEventListener('loadedmetadata', ()=>{
    durations[current] = audio.duration;
    durTime.textContent = fmt(audio.duration);
    const durSpan = playlistEl.querySelector(`[data-dur="${current}"]`);
    if(durSpan) durSpan.textContent = fmt(audio.duration);
  });

  audio.addEventListener('timeupdate', ()=>{
    if(isSeeking) return;
    const pct = audio.duration ? (audio.currentTime/audio.duration)*100 : 0;
    seekFill.style.width = pct + '%';
    seekKnob.style.left = pct + '%';
    curTime.textContent = fmt(audio.currentTime);
  });

  audio.addEventListener('ended', ()=>{
    if(repeat){ audio.currentTime = 0; audio.play(); return; }
    if(autoplay){ goNext(); }
    else{ setPlayingUI(false); }
  });

  function seekTo(clientX){
    const rect = seekBar.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.min(1, Math.max(0, pct));
    seekFill.style.width = (pct*100) + '%';
    seekKnob.style.left = (pct*100) + '%';
    if(audio.duration) audio.currentTime = pct * audio.duration;
    curTime.textContent = fmt(audio.currentTime);
  }
  seekBar.addEventListener('mousedown', e=>{ isSeeking = true; seekTo(e.clientX); });
  window.addEventListener('mousemove', e=>{ if(isSeeking) seekTo(e.clientX); });
  window.addEventListener('mouseup', ()=>{ isSeeking = false; });
  seekBar.addEventListener('keydown', e=>{
    if(e.key==='ArrowRight'){ audio.currentTime = Math.min(audio.duration||0, audio.currentTime+5); }
    if(e.key==='ArrowLeft'){ audio.currentTime = Math.max(0, audio.currentTime-5); }
  });

  function setVol(clientX){
    const rect = volBar.getBoundingClientRect();
    let pct = (clientX - rect.left) / rect.width;
    pct = Math.min(1, Math.max(0, pct));
    volFill.style.width = (pct*100) + '%';
    volKnob.style.left = (pct*100) + '%';
    audio.volume = pct;
  }
  let isVolSeeking = false;
  volBar.addEventListener('mousedown', e=>{ isVolSeeking = true; setVol(e.clientX); });
  window.addEventListener('mousemove', e=>{ if(isVolSeeking) setVol(e.clientX); });
  window.addEventListener('mouseup', ()=>{ isVolSeeking = false; });
  volBar.addEventListener('keydown', e=>{
    if(e.key==='ArrowRight'){ audio.volume = Math.min(1, audio.volume+0.05); volFill.style.width=(audio.volume*100)+'%'; volKnob.style.left=(audio.volume*100)+'%'; }
    if(e.key==='ArrowLeft'){ audio.volume = Math.max(0, audio.volume-0.05); volFill.style.width=(audio.volume*100)+'%'; volKnob.style.left=(audio.volume*100)+'%'; }
  });
  audio.volume = 0.7;

  shuffleOpt.addEventListener('click', ()=>{
    shuffle = !shuffle;
    shuffleOpt.classList.toggle('active', shuffle);
  });
  autoplayOpt.addEventListener('click', ()=>{
    autoplay = !autoplay;
    autoplayOpt.classList.toggle('active', autoplay);
  });
  repeatOpt.addEventListener('click', ()=>{
    repeat = !repeat;
    repeatOpt.classList.toggle('active', repeat);
  });

  document.addEventListener('keydown', e=>{
    if(e.code === 'Space' && document.activeElement.tagName !== 'BUTTON'){
      e.preventDefault();
      playBtn.click();
    }
  });

  renderPlaylist();
  preloadDurations();
  loadTrack(0, false);
})();