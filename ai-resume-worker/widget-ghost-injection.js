(function(){
  if(location.pathname.replace(/\/$/,'')!=='/ai-resume') return;
  var DATA_URL='https://raw.githubusercontent.com/highnoonoffice/hno-skills/main/data/resume-qa.json';
  var WORKER_URL='https://REPLACE-WITH-YOUR-WORKER-SUBDOMAIN.workers.dev/chat';
  var STOPWORDS=['a','an','the','is','are','was','were','does','did','do','what','who','how','of','to','in','on','for','and','or','has','have','had','about','with','joseph','josephs','his','him','he'];
  var qa=null,loading=false;
  function tokenize(s){return (s||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(function(t){return t.length>1 && STOPWORDS.indexOf(t)===-1;});}
  function scoreEntry(qt,e){var p=tokenize(e.question+' '+(e.aliases||[]).join(' '));var tg=tokenize((e.tags||[]).join(' '));var sc=0;qt.forEach(function(t){if(p.indexOf(t)>-1)sc+=3;else if(tg.indexOf(t)>-1)sc+=1;});return sc;}
  function renderChips(){var w=document.getElementById('jv-ask-chips');if(!qa||!w)return;var el=qa.filter(function(e){return (e.tags||[]).indexOf('meta')===-1;});for(var x=el.length-1;x>0;x--){var y=Math.floor(Math.random()*(x+1));var tmp=el[x];el[x]=el[y];el[y]=tmp;}var pk=el.slice(0,4);w.innerHTML='';pk.forEach(function(e){var c=document.createElement('div');c.className='jv-chip';c.textContent=e.question;c.addEventListener('click',function(){document.getElementById('jv-ask-input').value=e.question;ask();});w.appendChild(c);});}
  function load(){if(qa||loading)return Promise.resolve();loading=true;return fetch(DATA_URL).then(function(r){return r.json();}).then(function(d){qa=d;loading=false;renderChips();}).catch(function(){loading=false;qa=[];});}

  function ask(){
    var i=document.getElementById('jv-ask-input');
    var ab=document.getElementById('jv-ask-answer');
    var q=(i.value||'').trim();
    if(!q)return;
    ab.style.display='block';
    ab.innerHTML='Thinking…';
    load().then(function(){
      var qt=tokenize(q);
      var scored=(qa||[]).map(function(e){return {e:e,s:scoreEntry(qt,e)};}).filter(function(x){return x.s>0;});
      scored.sort(function(a,b){return b.s-a.s;});
      var top5=scored.slice(0,5).map(function(x){return x.e;});
      function done(){ if(ab.scrollIntoView)ab.scrollIntoView({behavior:'smooth',block:'nearest'}); }
      if(top5.length===0){
        ab.innerHTML='I don\'t have that in Joseph\'s resume yet. Try asking about his role at Thomson Reuters, his AI work, his education, or his published writing.';
        done();
        return;
      }
      var context=top5.map(function(e){return {question:e.question,answer:e.answer};});
      fetch(WORKER_URL,{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({question:q,context:context})
      }).then(function(r){
        if(r.status===429){
          return r.json().then(function(d){ ab.innerHTML=(d&&d.answer)||'Slow down, try again in a few minutes.'; });
        }
        if(!r.ok){
          ab.innerHTML='Couldn\'t reach the assistant. Try again in a moment.';
          return;
        }
        return r.json().then(function(d){ ab.innerHTML=(d&&d.answer)||'Couldn\'t reach the assistant. Try again in a moment.'; });
      }).catch(function(){
        ab.innerHTML='Couldn\'t reach the assistant. Try again in a moment.';
      }).then(done);
    });
  }

  function build(){var mount=document.querySelector('.post-content, .gh-content, article');if(!mount) return;if(document.getElementById('jv-ask-resume')) return;var wrap=document.createElement('div');wrap.id='jv-ask-resume';wrap.innerHTML='<div id="jv-ask-title">Ask This Resume</div><div id="jv-ask-row"><input id="jv-ask-input" type="text" placeholder="ask a question about Joseph\'s career" autocomplete="off"><button id="jv-ask-btn" type="button">Ask</button></div><div id="jv-ask-chips"></div><div id="jv-ask-answer"></div>';mount.insertBefore(wrap, mount.firstChild);document.getElementById('jv-ask-btn').addEventListener('click',ask);document.getElementById('jv-ask-input').addEventListener('keydown',function(e){if(e.key==='Enter')ask();});load();}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',build);
  else build();
})();
