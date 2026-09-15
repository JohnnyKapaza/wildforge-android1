(function(){
'use strict';

var boot=window.WildforgeBoot||null;
if(boot&&boot.safeMode){
  boot.ready('Veilige spelkern gereed');
  return;
}

try{
if(boot)boot.stage('Cinematische engine laden…',52);

var sleep=function(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});};
var phaseToken=0;

Object.assign(HEROES[0],{name:'Vexa',title:'Maansnijder',passive:'De eerste aanval per beurt doet +3 schade.'});
Object.assign(HEROES[1],{name:'Myr',title:'Amberlichtwever',passive:'Iedere derde Vaardigheid geneest 2 HP.'});
Object.assign(HEROES[2],{name:'Korr',title:'Runekoning',passive:'Behoud maximaal 5 Block tussen beurten.'});
Object.assign(HEROES[3],{name:'Zhar',title:'Goudvlam',passive:'Iedere vierde kaart kost 0 Energie.'});

Object.keys(CARDS).forEach(function(id){
  var c=CARDS[id];
  if(c.hero===3){
    c.n=c.n.replace(/^Vonk/,'Vlam').replace(/^Brouw/,'Smeul').replace(/^Inkt/,'As').replace(/^Chaos/,'Goud');
  }
});

function refreshRoster(){
  var host=$('heroes');
  if(!host)return;
  host.innerHTML=HEROES.map(function(h,i){
    return '<button class="hero v6-hero" onclick="start('+i+')" aria-label="Speel als '+h.name+'">'+
      '<div class="hero-art hs'+i+'"><span class="hero-aura"></span></div>'+
      '<div class="hero-copy"><small>VERBONDENE '+(i+1)+'</small><h3>'+h.name+'</h3><b>'+h.title+'</b><p>'+h.passive+'</p><span class="hero-start">KIES '+h.name.toUpperCase()+' →</span></div>'+
    '</button>';
  }).join('');
}
refreshRoster();

function combatAlive(){
  return G&&G.fight&&document.getElementById('combat').classList.contains('active');
}
function heroMaxEnergy(f){
  return 4+((typeof has==='function'&&has('energy')&&f.turn===1)?1:0);
}
function intentKind(e,f){
  if(!e||e.hp<=0)return 'dead';
  return e.a[(f.turn-1)%e.a.length][1];
}
function floatFx(target,textValue,kind){
  var layer=$('fxLayer');
  if(!layer)return;
  var rect=target&&target.getBoundingClientRect?target.getBoundingClientRect():{left:innerWidth/2,top:innerHeight/2,width:0,height:0};
  var n=document.createElement('span');
  n.className='float-fx '+(kind||'damage');
  n.textContent=textValue;
  n.style.left=(rect.left+rect.width/2)+'px';
  n.style.top=(rect.top+Math.max(18,rect.height*.38))+'px';
  layer.appendChild(n);
  setTimeout(function(){n.remove();},1000);
}
function impact(target,kind){
  if(!target)return;
  target.classList.remove('v6-impact','v6-block','v6-heal');
  void target.offsetWidth;
  target.classList.add(kind==='block'?'v6-block':kind==='heal'?'v6-heal':'v6-impact');
}
function banner(textValue,kind){
  var layer=$('fxLayer');
  if(!layer)return;
  var n=document.createElement('div');
  n.className='turn-banner '+(kind||'');
  n.textContent=textValue;
  layer.appendChild(n);
  setTimeout(function(){n.remove();},1050);
}
async function motion(target,cls,ms){
  if(!target)return sleep(ms||240);
  target.classList.remove(cls);
  void target.offsetWidth;
  target.classList.add(cls);
  await sleep(ms||240);
  target.classList.remove(cls);
}
function setBusy(value){
  if(!G||!G.fight)return;
  G.fight.busy=!!value;
  var combat=$('combat');
  if(combat)combat.classList.toggle('v6-busy',!!value);
}

var baseCardHTML=cardHTML;
cardHTML=function(id,i,playable,price){
  var c=realCard(id),up=id.endsWith('+');
  var powerDiscount=!!(G&&G.relics&&c.t==='power'&&typeof has==='function'&&has('power'));
  var cost=Math.max(0,c.c-(powerDiscount?1:0));
  var free=!!(playable&&G&&G.fight&&HEROES[G.hero].kind==='chaos'&&(G.fight.played+1)%4===0);
  var dis=!!(playable&&G&&G.fight&&!free&&cost>G.fight.energy);
  var drag=playable?'data-index="'+i+'" data-type="'+c.t+'" data-aoe="'+!!c.fx.aoe+'" role="button" aria-label="'+c.n+': '+c.d+'"':'';
  var glyph=c.t==='attack'?(c.fx.aoe?'✦':'⚔'):c.t==='skill'?(c.fx.block?'⬡':'◈'):'✺';
  return '<div class="card '+c.t+' '+(up?'upgraded ':'')+(dis?'disabled ':'')+(playable&&SELECTED===i?'selected ':'')+'" '+drag+' '+(playable?'onclick="play('+i+')"':'')+'>'+
    '<div class="card-art"><span>'+glyph+'</span><i></i></div>'+
    '<span class="cost">'+(free?0:cost)+'</span>'+
    '<h4>'+c.n+(up?' +':'')+'</h4><p>'+c.d+'</p>'+
    (price?'<span class="price">'+price+' ◈</span>':'')+
    '<em>'+(c.t==='attack'?'AANVAL':c.t==='skill'?'VAARDIGHEID':'KRACHT')+'</em>'+
  '</div>';
};

var baseRender=renderCombat;
renderCombat=function(){
  baseRender();
  if(!G||!G.fight)return;
  var f=G.fight;
  $('playerSprite').className='sprite hero-combat-art hs'+G.hero;
  $('energy').textContent=f.energy+' / '+heroMaxEnergy(f);
  $('combatName').textContent=HEROES[G.hero].name+' · '+HEROES[G.hero].title;
  $('playerName').textContent=HEROES[G.hero].name;
  $('combat').classList.toggle('v6-busy',!!f.busy);
  $('endTurn').disabled=!!f.busy;
  f.enemies.forEach(function(e,i){
    var unit=$('enemy'+i);
    if(!unit)return;
    var intent=unit.querySelector('.intent');
    if(intent)intent.classList.add('intent-'+intentKind(e,f));
    var sprite=unit.querySelector('.enemy-sprite');
    if(sprite){
      sprite.className='enemy-sprite enemy-v6 e'+(e.s%12);
      sprite.setAttribute('aria-label',e.n);
    }
  });
  document.querySelectorAll('#hand .card').forEach(function(card,index){
    card.style.setProperty('--fan',String(index-(f.hand.length-1)/2));
  });
};

var baseDamageEnemy=damageEnemy;
damageEnemy=function(e,n,i){
  var before=e.hp;
  var target=$('enemy'+i);
  baseDamageEnemy(e,n,i);
  var dealt=Math.max(0,before-e.hp);
  if(dealt){
    floatFx(target,'−'+dealt,'damage');
    impact(target,'damage');
  }else{
    floatFx(target,'BLOCK','block');
    impact(target,'block');
  }
};

var basePlay=play;
play=function(i){
  if(G&&G.fight&&G.fight.busy)return;
  return basePlay(i);
};
var baseStartDrag=startCardDrag;
startCardDrag=function(ev){
  if(G&&G.fight&&G.fight.busy)return;
  return baseStartDrag(ev);
};

var baseResolve=resolveCard;
resolveCard=async function(i,target){
  if(!G||!G.fight||G.fight.busy)return;
  target=target===undefined?0:target;
  var f=G.fight,id=f.hand[i],c=id&&realCard(id);
  if(!c)return;
  var cost=Math.max(0,c.c-(has('power')&&c.t==='power'));
  var free=HEROES[G.hero].kind==='chaos'&&(f.played+1)%4===0;
  if(!free&&cost>f.energy)return;
  setBusy(true);
  SELECTED=null;
  if(c.t==='attack'){
    await motion($('playerSprite'),'hero-lunge',c.fx.aoe?360:300);
    if(c.fx.aoe){
      document.querySelectorAll('.enemy-unit:not(.dead)').forEach(function(x){impact(x,'damage');});
    }
  }else{
    await motion($('playerSprite'),c.t==='power'?'hero-power':'hero-cast',300);
  }
  var beforeBlock=f.block,beforeHp=G.hp,beforeStr=f.str;
  baseResolve(i,target);
  if(!G||!G.fight)return;
  if(f.block>beforeBlock)floatFx($('playerSprite'),'+'+(f.block-beforeBlock)+' BLOCK','block');
  if(G.hp>beforeHp)floatFx($('playerSprite'),'+'+(G.hp-beforeHp),'heal');
  if(f.str>beforeStr)floatFx($('playerSprite'),'+'+(f.str-beforeStr)+' KRACHT','power');
  setBusy(false);
  if(combatAlive())renderCombat();
};

newTurn=function(){
  var f=G.fight;
  phaseToken++;
  f.turn++;
  f.energy=4+(has('energy')&&f.turn===1);
  f.block=HEROES[G.hero].kind==='block'?Math.min(5,f.block):0;
  f.str+=f.rage;
  f.played=0;
  f.busy=false;
  draw(5-f.hand.length+(has('draw')&&f.turn===1));
  renderCombat();
  banner('JOUW BEURT · '+f.turn,'player-turn');
};

endTurn=async function(){
  if(!G||!G.fight||G.fight.busy)return;
  SELECTED=null;
  var f=G.fight,token=++phaseToken;
  setBusy(true);
  f.discard.push.apply(f.discard,f.hand.splice(0));
  renderCombat();
  banner('VIJANDENBEURT','enemy-turn');
  await sleep(360);
  for(var pi=0;pi<f.enemies.length;pi++){
    var pe=f.enemies[pi];
    if(pe.hp>0&&pe.poison){
      var poisonHit=Math.min(pe.hp,pe.poison);
      pe.hp-=pe.poison;
      pe.poison=Math.max(0,pe.poison-1);
      floatFx($('enemy'+pi),'−'+poisonHit,'poison');
      impact($('enemy'+pi),'damage');
    }
  }
  if(f.enemies.every(function(e){return e.hp<=0;})){setBusy(false);return win();}
  renderCombat();
  for(var i=0;i<f.enemies.length;i++){
    if(token!==phaseToken)return;
    var e=f.enemies[i];
    if(e.hp<=0)continue;
    var a=e.a[(f.turn-1)%e.a.length],v=a[0],k=a[1];
    var unit=$('enemy'+i);
    if(k==='attack'){
      await motion(unit,'enemy-strike',340);
      var raw=v+e.str,hit=Math.max(0,raw-f.block);
      f.block=Math.max(0,f.block-raw);
      G.hp-=hit;
      if(hit&&f.thorns){
        e.hp-=f.thorns;
        floatFx(unit,'−'+f.thorns,'thorns');
      }
      sound('hurt');
      impact($('playerSprite'),hit?'damage':'block');
      floatFx($('playerSprite'),hit?'−'+hit:'BLOCK',hit?'damage':'block');
      if(navigator.vibrate&&hit)try{navigator.vibrate([18,25,12]);}catch(err){}
    }else{
      await motion(unit,'enemy-cast',280);
      if(k==='block'){e.block+=v;floatFx(unit,'+'+v+' BLOCK','block');}
      else if(k==='str'){e.str+=v;floatFx(unit,'+'+v+' KRACHT','power');}
      else if(k==='poison'){f.poison+=v;floatFx($('playerSprite'),'+'+v+' GIF','poison');}
      else if(k==='weak'){f.weak+=v;floatFx($('playerSprite'),'ZWAK '+v,'poison');}
      else if(k==='strAll'){
        f.enemies.filter(function(x){return x.hp>0;}).forEach(function(x){x.str+=v;});
        floatFx(unit,'ALLE +'+v,'power');
      }else if(k==='healAll'){
        f.enemies.filter(function(x){return x.hp>0;}).forEach(function(x){x.hp=Math.min(x.max,x.hp+v);});
        floatFx(unit,'ALLE +'+v,'heal');
      }else if(k==='charge'){e.block+=5;floatFx(unit,'LAADT','power');}
      else if(k==='summon'&&f.enemies.length<4){
        var s=enemyCopy(ENEMIES[G.act*24+R(8)],.55);
        f.enemies.push(Object.assign({},s,{hp:s.h,max:s.h,block:0,str:0,poison:0}));
        floatFx(unit,'ROEPT','power');
      }
    }
    renderCombat();
    await sleep(160);
    if(G.hp<=0){setBusy(false);return lose();}
    if(f.enemies.every(function(x){return x.hp<=0;})){setBusy(false);return win();}
  }
  if(f.poison){
    G.hp-=f.poison;
    floatFx($('playerSprite'),'−'+f.poison,'poison');
    impact($('playerSprite'),'damage');
    f.poison=Math.max(0,f.poison-1);
    await sleep(260);
  }
  if(f.weak)f.weak--;
  if(G.hp<=0){setBusy(false);return lose();}
  setBusy(false);
  newTurn();
};

var basePotion=usePotion;
usePotion=function(){
  if(!G||!G.fight||G.fight.busy||!G.potions)return;
  var before=G.hp;
  basePotion();
  var healed=G.hp-before;
  motion($('playerSprite'),'hero-heal',320);
  if(healed)floatFx($('playerSprite'),'+'+healed,'heal');
};

window.addEventListener('load',function(){
  refreshRoster();
  document.body.classList.add('wildforge-v6');
});

document.body.classList.add('wildforge-v6');
if(boot)boot.stage('Arena, wereldkaart en bazaar bouwen…',78);
}catch(error){
  if(boot)boot.fail(error,'De cinematische engine kon niet starten');
  else throw error;
}
})();
