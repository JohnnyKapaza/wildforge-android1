(function(){
'use strict';

var boot=window.WildforgeBoot||null;
if(boot&&boot.safeMode)return;

try{
if(boot)boot.stage('Nieuwe wereldroutes uitzetten…',84);
document.body.classList.add('wildforge-v7');

var ROOM_LABELS={
  '⚔':'Gevecht',
  '?':'Mysterie',
  '💰':'Winkel',
  '👹':'Elite',
  '🔥':'Rust',
  '👑':'Baas'
};

function openNodeIds(){
  if(G.row===0)return G.map.filter(function(n){return n.row===0;}).map(function(n){return n.id;});
  if(G.row===11)return ['11-0'];
  var current=G.map.find(function(n){return n.id===G.current;})||{};
  return (current.next||[]).map(function(lane){return G.row+'-'+lane;});
}

renderMap=function(){
  normalizeRun();
  show('map');
  $('mapHero').textContent=HEROES[G.hero].name+' · W'+G.asc;
  $('mapHp').textContent=G.hp+'/'+G.max;
  $('gold').textContent=G.gold;
  $('deckCount').textContent='▣ '+G.deck.length+' kaarten';
  $('actTitle').textContent='Act '+(G.act+1)+' — '+ACTS[G.act];
  $('relicStrip').textContent=G.relics.length?'✦ '+G.relics.map(function(i){return RELICS[i][0];}).join(' · '):'Nog geen relieken';

  var viewport=$('mapViewport');
  var width=Math.max(420,viewport.clientWidth||innerWidth||915);
  var height=Math.max(1180,Math.round((viewport.clientHeight||390)*3.15));
  var top=76,bottom=82,step=(height-top-bottom)/11;
  var laneX=[width*.21,width*.5,width*.79];
  var x=function(node){return node.row===11?width*.5:laneX[node.lane];};
  var y=function(row){return height-bottom-row*step;};
  var openIds=openNodeIds();

  $('mapNodes').innerHTML=G.map.map(function(node){
    var done=G.history.includes(node.id);
    var open=openIds.includes(node.id);
    var state=done?'done':open?'open':'lock';
    var label=ROOM_LABELS[node.type]||'Kamer';
    var action=open?'onclick="chooseNode(\''+node.id+'\')"':'';
    var disabled=open?'':'aria-disabled="true" tabindex="-1"';
    return '<button class="map-node '+state+' '+(node.type==='👑'?'boss ':'')+'" data-row="'+node.row+'" data-node-id="'+node.id+'" style="left:'+x(node)+'px;top:'+y(node.row)+'px" aria-label="'+label+' · verdieping '+(node.row+1)+'" '+action+' '+disabled+'><span>'+node.type+'</span><small>'+label+'</small></button>';
  }).join('');

  var lines=[];
  G.map.filter(function(node){return node.row<11;}).forEach(function(node){
    var seen={};
    node.next.forEach(function(lane){
      var target=G.map.find(function(candidate){
        return candidate.row===node.row+1&&(candidate.row===11||candidate.lane===lane);
      });
      if(!target||seen[target.id])return;
      seen[target.id]=true;
      lines.push('<line class="'+(G.history.includes(node.id)?'reached':'')+'" x1="'+x(node)+'" y1="'+y(node.row)+'" x2="'+x(target)+'" y2="'+y(target.row)+'"/>');
    });
  });

  $('mapLines').setAttribute('viewBox','0 0 '+width+' '+height);
  $('mapLines').style.width='100%';
  $('mapLines').style.height=height+'px';
  $('mapLines').innerHTML=lines.join('');
  $('mapNodes').style.width='100%';
  $('mapNodes').style.height=height+'px';
  viewport.setAttribute('data-route-direction','bottom-to-top');

  setTimeout(function(){
    var focusRow=Math.max(0,Math.min(11,G.row));
    viewport.scrollLeft=0;
    viewport.scrollTop=Math.max(0,y(focusRow)-(viewport.clientHeight||390)*.7);
  },0);
};

function shopKey(){
  return [G.act,G.pendingNode||G.current||('row-'+G.row)].join(':');
}

function eligibleShopCards(){
  return Object.keys(CARDS).filter(function(id){
    return (CARDS[id].hero===undefined&&!['slash','guard'].includes(id))||CARDS[id].hero===G.hero;
  });
}

function ensureShopStock(){
  var key=shopKey();
  if(G.shopStock&&G.shopStock.key===key)return G.shopStock;
  var pool=shuffle(eligibleShopCards().slice()).slice(0,4);
  var relicPool=RELICS.map(function(_,i){return i;}).filter(function(i){return !G.relics.includes(i);});
  G.shopStock={
    key:key,
    cards:pool.map(function(id,index){
      return {id:id,cost:54+index*9+Math.max(0,realCard(id).c-1)*7,sold:false};
    }),
    relic:relicPool.length?{id:pick(relicPool),cost:145,sold:false}:null,
    potion:{cost:42,sold:false}
  };
  save();
  return G.shopStock;
}

function shopNotice(message,tone){
  var notice=$('shopNotice');
  if(!notice)return;
  notice.textContent=message||'';
  notice.className='shop-notice '+(tone||'');
}

function renderShop(){
  var stock=ensureShopStock();
  var removeCost=75+G.removed*25;
  $('shopGold').textContent=G.gold;
  $('removeCost').textContent=removeCost;
  $('wares').innerHTML=stock.cards.map(function(offer,index){
    var card=realCard(offer.id);
    var disabled=offer.sold||G.gold<offer.cost;
    return '<article class="shop-card-slot '+(offer.sold?'sold':'')+'">'+
      '<div class="shop-item-label"><span>'+(card.t==='attack'?'AANVAL':card.t==='skill'?'VAARDIGHEID':'KRACHT')+'</span><b>'+offer.cost+' ◈</b></div>'+
      cardHTML(offer.id,0,false)+
      '<button '+(disabled?'disabled':'')+' onclick="buyShopCard('+index+')">'+(offer.sold?'UITVERKOCHT':'KOOP KAART')+'</button>'+
    '</article>';
  }).join('');

  if(stock.relic){
    var relic=RELICS[stock.relic.id];
    $('relicOffer').innerHTML='<span class="service-icon">✦</span><div><small>ZELDZAAM RELIEK</small><h3>'+relic[0]+'</h3><p>'+relic[1]+'</p></div><button '+(stock.relic.sold||G.gold<stock.relic.cost?'disabled':'')+' onclick="buyShopRelic()">'+(stock.relic.sold?'VERKOCHT':stock.relic.cost+' ◈')+'</button>';
    $('relicOffer').classList.toggle('sold',stock.relic.sold);
  }else{
    $('relicOffer').innerHTML='<span class="service-icon">✦</span><div><small>RELIEKEN</small><h3>Uitverkocht</h3><p>Je bezit alle bekende relieken.</p></div>';
  }

  var potionFull=(G.potions||0)>=3;
  $('potionOffer').innerHTML='<span class="service-icon">🧪</span><div><small>HERSTELDRANK</small><h3>Hollow-tonicum</h3><p>Geneest 14 HP in een gevecht · '+(G.potions||0)+'/3 op zak.</p></div><button '+(stock.potion.sold||potionFull||G.gold<stock.potion.cost?'disabled':'')+' onclick="buyShopPotion()">'+(stock.potion.sold?'VERKOCHT':potionFull?'TAS VOL':stock.potion.cost+' ◈')+'</button>';
  $('potionOffer').classList.toggle('sold',stock.potion.sold);
  var removal=$('removalOffer');
  if(removal)removal.classList.toggle('unavailable',G.gold<removeCost||G.deck.length<=5);
}

shop=function(){
  show('shop');
  shopNotice('De voorraad blijft hetzelfde tot je vertrekt.');
  renderShop();
};

window.buyShopCard=function(index){
  var offer=ensureShopStock().cards[index];
  if(!offer||offer.sold)return;
  if(G.gold<offer.cost)return shopNotice('Niet genoeg amber voor deze kaart.','warning');
  G.gold-=offer.cost;
  G.deck.push(offer.id);
  offer.sold=true;
  save();
  shopNotice(realCard(offer.id).n+' is aan je deck toegevoegd.','success');
  renderShop();
};

window.buyShopRelic=function(){
  var offer=ensureShopStock().relic;
  if(!offer||offer.sold)return;
  if(G.gold<offer.cost)return shopNotice('Niet genoeg amber voor dit reliek.','warning');
  G.gold-=offer.cost;
  G.relics.push(offer.id);
  offer.sold=true;
  applyRelics();
  save();
  shopNotice(RELICS[offer.id][0]+' is nu van jou.','success');
  renderShop();
};

window.buyShopPotion=function(){
  var offer=ensureShopStock().potion;
  if(offer.sold)return;
  if((G.potions||0)>=3)return shopNotice('Je kunt maximaal drie drankjes dragen.','warning');
  if(G.gold<offer.cost)return shopNotice('Niet genoeg amber voor het tonicum.','warning');
  G.gold-=offer.cost;
  G.potions=(G.potions||0)+1;
  offer.sold=true;
  save();
  shopNotice('Hollow-tonicum opgeborgen.','success');
  renderShop();
};

removeCardShop=function(){
  var cost=75+G.removed*25;
  if(G.deck.length<=5)return shopNotice('Je deck kan niet kleiner dan vijf kaarten.','warning');
  if(G.gold<cost)return shopNotice('Niet genoeg amber om een kaart te zuiveren.','warning');
  $('shopRemoveCards').innerHTML=G.deck.map(function(id,index){
    var card=realCard(id);
    return '<button class="remove-card-option '+card.t+'" onclick="removeShopCard('+index+')"><span>'+(id.endsWith('+')?'✦ ':'')+card.n+'</span><small>'+card.d+'</small></button>';
  }).join('');
  $('shopRemoveModal').hidden=false;
};

window.closeShopRemove=function(){
  $('shopRemoveModal').hidden=true;
};

window.removeShopCard=function(index){
  var cost=75+G.removed*25;
  if(index<0||index>=G.deck.length||G.deck.length<=5||G.gold<cost)return;
  var removed=realCard(G.deck[index]).n;
  G.deck.splice(index,1);
  G.gold-=cost;
  G.removed++;
  save();
  window.closeShopRemove();
  shopNotice(removed+' is uit je deck verwijderd.','success');
  renderShop();
};

var baseAdvance=advance;
advance=function(){
  if(G)delete G.shopStock;
  return baseAdvance();
};

window.addEventListener('load',function(){document.body.classList.add('wildforge-v7');});
if(boot)boot.ready('Arena, wereldkaart en bazaar gereed');
}catch(error){
  if(boot)boot.fail(error,'De vernieuwde spelwereld kon niet starten');
  else throw error;
}
})();
