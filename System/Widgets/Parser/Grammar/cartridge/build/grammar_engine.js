/* CARTRIDGE - ENGINE - Grammar's three-pass fuzzy grammar engine.
   Extracted verbatim from Grammar/build/template.html (pre-shell monolith).
   Pass 1 lexical, pass 2 syntactic/semantic, pass 3 conventions/errors.
   Output: ParseResult per ParserShell.spec.md section 6. */
var ENGINE = (function(){
var CLOSED = {
 det:{"a":1,"an":1,"the":1,"this":1,"that":1,"these":1,"those":1,"my":1,"your":1,"his":1,"her":1,"its":1,"our":1,"their":1,"all":1,"some":1,"any":1,"no":1,"every":1,"each":1,"both":1,"either":1,"neither":1,"few":1,"many":1,"much":1,"little":1,"several":1,"most":1,"enough":1,"another":1,"such":1},
 pron:{"i":"1sg","you":"2","he":"3sg","she":"3sg","it":"3sg","we":"1pl","they":"3pl","me":"obj","him":"obj","her":"obj","us":"obj","them":"obj","mine":1,"yours":1,"hers":1,"ours":1,"theirs":1,"myself":1,"yourself":1,"himself":1,"herself":1,"itself":1,"ourselves":1,"themselves":1,"someone":"3sg","somebody":"3sg","something":"3sg","anyone":"3sg","anybody":"3sg","anything":"3sg","everyone":"3sg","everybody":"3sg","everything":"3sg","nobody":"3sg","nothing":"3sg","one":"3sg"},
 rel:{"who":1,"whom":1,"whose":1,"which":1,"that":1},
 wh:{"what":1,"who":1,"whom":1,"whose":1,"which":1,"when":1,"where":1,"why":1,"how":1},
 prep:{"in":1,"on":1,"at":1,"by":1,"for":1,"with":1,"from":1,"to":1,"of":1,"about":1,"against":1,"between":1,"among":1,"under":1,"over":1,"through":1,"during":1,"before":1,"after":1,"above":1,"below":1,"behind":1,"beyond":1,"near":1,"without":1,"within":1,"into":1,"onto":1,"upon":1,"toward":1,"towards":1,"across":1,"along":1,"around":1,"beside":1,"besides":1,"despite":1,"except":1,"inside":1,"outside":1,"past":1,"since":1,"until":1,"unto":1,"via":1,"amid":1,"beneath":1,"underneath":1,"like":1,"unlike":1,"per":1,"off":1,"down":1,"up":1,"whence":1},
 coord:{"and":1,"but":1,"or":1,"nor":1,"yet":1,"so":1},
 subord:{"because":1,"although":1,"though":1,"while":1,"when":1,"whenever":1,"if":1,"unless":1,"until":1,"since":1,"as":1,"whereas":1,"whether":1,"whence":1,"where":1,"wherever":1,"before":1,"after":1,"once":1,"lest":1},
 aux:{"be":1,"am":1,"is":1,"are":1,"was":1,"were":1,"been":1,"being":1,"have":1,"has":1,"had":1,"do":1,"does":1,"did":1},
 modal:{"will":1,"would":1,"shall":1,"should":1,"can":1,"could":1,"may":1,"might":1,"must":1,"ought":1},
 neg:{"not":1,"never":1,"n't":1,"no":1,"nor":1},
 particle:{"up":1,"down":1,"off":1,"out":1,"on":1,"in":1,"over":1,"away":1,"back":1,"along":1},
 linking:{"be":1,"am":1,"is":1,"are":1,"was":1,"were":1,"been":1,"being":1,"seem":1,"seems":1,"seemed":1,"become":1,"became":1,"becomes":1,"appear":1,"appears":1,"appeared":1,"feel":1,"feels":1,"felt":1,"look":1,"looks":1,"looked":1,"sound":1,"sounds":1,"remain":1,"remains":1,"remained":1,"stay":1,"stays":1,"grow":1,"grew":1,"taste":1,"smell":1},
 numword:{"one":1,"two":1,"three":1,"four":1,"five":1,"six":1,"seven":1,"eight":1,"nine":1,"ten":1,"eleven":1,"twelve":1,"thirteen":1,"fourteen":1,"fifteen":1,"sixteen":1,"seventeen":1,"eighteen":1,"nineteen":1,"twenty":1,"thirty":1,"forty":1,"fifty":1,"sixty":1,"seventy":1,"eighty":1,"ninety":1,"hundred":1,"thousand":1,"million":1,"score":1,"dozen":1},
 duration:{"day":1,"days":1,"week":1,"weeks":1,"month":1,"months":1,"year":1,"years":1,"hour":1,"hours":1,"minute":1,"minutes":1,"moment":1,"moments":1,"night":1,"nights":1,"morning":1,"time":1,"times":1,"while":1,"decade":1,"decades":1,"century":1},
 interj:{"oh":1,"ah":1,"wow":1,"alas":1,"hey":1,"ouch":1,"hurrah":1,"bravo":1,"psst":1,"shh":1,"ugh":1,"yay":1}
};
function isNumeral(w){
  if(/^\d+([.,]\d+)*(st|nd|rd|th)?$/.test(w)) return true;
  if(CLOSED.numword[w]) return true;
  var parts=w.split("-");
  if(parts.length>1 && parts.every(function(p){return CLOSED.numword[p]||/^\d+$/.test(p);})) return true;
  return false;
}
function tokenize(text){
  var toks=[],re=/[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*(?:-[A-Za-zÀ-ɏ]+(?:['’][A-Za-z]+)*)*|\d+(?:[.,]\d+)*|[.,;:!?…—–\-()"'“”‘’]/g,m;
  while((m=re.exec(text))!==null){
    var t=m[0];
    toks.push({i:toks.length,text:t,start:m.index,end:m.index+t.length,isWord:/[A-Za-z\d]/.test(t),tags:[],final:null});
  }
  return toks;
}
function morph(w){
  var out=[];
  if(isNumeral(w)) out.push({pos:"numeral",conf:.92,feat:["numeral"]});
  if(/ly$/.test(w)&&w.length>3) out.push({pos:"adverb",conf:.8,feat:["-ly"]});
  if(/ing$/.test(w)&&w.length>4){
    var base=w.slice(0,-3);
    if(LEX.has(base)||LEX.has(base+"e")) out.push({pos:"verb",conf:.85,feat:["ing:"+(LEX.has(base)?base:base+"e")]});
    else out.push({pos:"verb",conf:.6,feat:["ing:?"]});
  }
  if(/ed$/.test(w)&&w.length>3){
    var b1=w.slice(0,-2),b2=w.slice(0,-1),b3=(w.length>4&&w[w.length-3]===w[w.length-4])?w.slice(0,-3):null;
    var base2=LEX.has(b1)?b1:(LEX.has(b2)?b2:(b3&&LEX.has(b3)?b3:null));
    out.push({pos:"verb",conf:base2?.85:.6,feat:["past:"+(base2||"?"),"pp:"+(base2||"?")]});
  }
  if(/s$/.test(w)&&!/ss$/.test(w)&&w.length>2){
    var sb=w.slice(0,-1),se=/es$/.test(w)?w.slice(0,-2):null,sie=/ies$/.test(w)?w.slice(0,-3)+"y":null;
    var nb=[sie,se,sb].filter(function(x){return x&&LEX.has(x);})[0];
    if(nb){
      var e=LEX.query(nb);
      if(e.pos==="noun"||e.alt.indexOf("noun")>=0) out.push({pos:"noun",conf:.85,feat:["plural","sing:"+nb]});
      if(e.pos==="verb"||e.alt.indexOf("verb")>=0) out.push({pos:"verb",conf:.75,feat:["3sg:"+nb]});
    } else out.push({pos:"noun",conf:.55,feat:["plural?"]});
  }
  if(/(er|est)$/.test(w)&&w.length>4){
    var db=w.replace(/(er|est)$/,""),dbe=db+"e";
    if(LEX.has(db)||LEX.has(dbe)) out.push({pos:"adjective",conf:.7,feat:[/er$/.test(w)?"comparative":"superlative"]});
  }
  if(/(tion|ment|ness|ity|ance|ence|ship|hood|dom)$/.test(w)) out.push({pos:"noun",conf:.75,feat:[]});
  if(/(ous|ful|less|able|ible|ive|ic|al|ish)$/.test(w)) out.push({pos:"adjective",conf:.65,feat:[]});
  return out;
}
function pass1(toks, sentenceStart){
  toks.forEach(function(t,idx){
    if(!t.isWord){ t.final={pos:"punctuation",conf:1,feat:[]}; t.tags=[t.final]; return; }
    var w=t.text.toLowerCase().replace(/’/g,"'");
    var cands=[];
    if(CLOSED.modal[w]) cands.push({pos:"verb",sub:"modal",conf:.98,feat:["modal"]});
    if(CLOSED.aux[w]) cands.push({pos:"verb",sub:"aux",conf:.97,feat:["aux"]});
    if(CLOSED.det[w]) cands.push({pos:"determiner",conf:.95,feat:[CLOSED.pron[w]?"":"det"].filter(Boolean)});
    if(CLOSED.pron[w]) cands.push({pos:"pronoun",conf:.96,feat:[String(CLOSED.pron[w])]});
    if(CLOSED.rel[w]) cands.push({pos:"pronoun",sub:"relative",conf:.9,feat:["relative"]});
    if(CLOSED.wh[w]) cands.push({pos:"pronoun",sub:"wh",conf:.85,feat:["wh"]});
    if(CLOSED.prep[w]) cands.push({pos:"preposition",conf:.94,feat:[]});
    if(CLOSED.coord[w]) cands.push({pos:"conjunction",sub:"coordinating",conf:.96,feat:["coordinating"]});
    if(CLOSED.subord[w]) cands.push({pos:"conjunction",sub:"subordinating",conf:.88,feat:["subordinating"]});
    if(CLOSED.neg[w]||w==="n't") cands.push({pos:"adverb",sub:"negation",conf:.95,feat:["negation"]});
    if(CLOSED.interj[w]) cands.push({pos:"interjection",conf:.9,feat:[]});
    if(isNumeral(w)) cands.push({pos:"numeral",conf:.93,feat:["numeral"]});
    var lx=LEX.query(w);
    if(lx){
      cands.push({pos:lx.pos,conf:.9,feat:lx.feat});
      lx.alt.forEach(function(a){ if(a) cands.push({pos:a,conf:.72,feat:lx.feat}); });
    }
    morph(w).forEach(function(c){cands.push(c);});
    if(/^[A-Z]/.test(t.text)&&idx>0&&toks[idx-1].isWord){
      cands.unshift({pos:"noun",sub:"proper",conf:.9,feat:["proper"]});
    }
    if(!cands.length){
      cands.push({pos:"noun",conf:.45,feat:["unknown"]});
      t.untagged=true;
    }
    var seen={};
    t.tags=cands.filter(function(c){var k=c.pos+(c.sub||"");if(seen[k])return false;seen[k]=1;return true;})
                .sort(function(a,b){return b.conf-a.conf;});
    t.final=t.tags[0];
  });
  for(var i=0;i<toks.length;i++){
    var t=toks[i]; if(!t.isWord) continue;
    var w=t.text.toLowerCase();
    var prev=prevWord(toks,i), next=nextWord(toks,i);
    function pick(pos,sub){var c=t.tags.filter(function(x){return x.pos===pos&&(!sub||x.sub===sub);})[0];if(c){t.final=c;return true;}return false;}
    if(prev&&(prev.final.pos==="determiner"||prev.final.pos==="numeral")){
      if(next&&hasTag(next,"noun")&&hasTag(t,"adjective")) pick("adjective");
      else if(hasTag(t,"noun")&&t.final.pos!=="noun"&&!hasTag(t,"adjective")) pick("noun");
      else if(hasTag(t,"noun")&&hasTag(t,"adjective")&&!(next&&hasTag(next,"noun"))) pick("noun");
      else if(hasTag(t,"noun")&&t.final.pos!=="adjective"&&t.final.pos!=="noun") pick("noun");
    }
    if(prev&&hasFeat(prev,"aux")&&hasTag(t,"verb")&&t.final.pos!=="verb") pick("verb");
    if(w==="to"&&next&&hasTag(next,"verb")){ t.final={pos:"particle",sub:"infinitive",conf:.9,feat:["inf-marker"]}; }
    if(w==="that"){
      if(prev&&(hasTag(prev,"noun")||prev.final.pos==="pronoun")&&next&&(hasFeat(next,"aux")||next.final.pos==="verb"||next.final.pos==="pronoun")) pick("pronoun","relative");
      else if(next&&next.final.pos==="noun") pick("determiner");
      else if(next&&hasTag(next,"determiner")) pick("conjunction","subordinating");
    }
    if(w==="who"||w==="whom"||w==="which"){
      if(prev&&hasTag(prev,"noun")) pick("pronoun","relative");
      else if(i===firstWordIdx(toks)) pick("pronoun","wh");
      else pick("pronoun","relative");
    }
    if(CLOSED.duration[w]&&prev&&prev.final.pos==="numeral"){
      t.final={pos:"noun",conf:.88,feat:["plural","duration"]};
    }
    if((w==="her"||w==="his"||w==="its"||w==="their"||w==="your"||w==="my"||w==="our")&&next&&(hasTag(next,"noun")||hasTag(next,"adjective"))) pick("determiner");
    if(w==="all"&&next&&next.final&&next.final.pos==="determiner") pick("determiner");
    if(prev&&prev.final.pos==="preposition"&&/ing$/.test(w)){
      var ingCand=t.tags.filter(function(x){return x.pos==="verb"&&x.feat.some(function(y){return y.indexOf("ing:")===0;});})[0];
      if(ingCand&&next&&(next.final.pos==="determiner"||hasTag(next,"noun")||next.final.pos==="pronoun")) t.final=ingCand;
    }
    if(t.untagged&&prev&&(prev.final.pos==="determiner"||prev.final.pos==="numeral"||prev.final.pos==="adjective")){
      t.final={pos:"noun",conf:.75,feat:["oov-context"]};
      t.oov=true; t.untagged=false;
    }
  }
  var fi=firstWordIdx(toks);
  if(fi>=0){
    var ft=toks[fi],fw=ft.text.toLowerCase(),fx=LEX.query(fw);
    var verbCand=fx&&(fx.pos==="verb"||fx.alt.indexOf("verb")>=0);
    var inflected=fx&&fx.feat.some(function(x){return /^(past:|pp:|ing:|3sg:)/.test(x);});
    var nxt=nextWord(toks,fi);
    var objLike=nxt&&(CLOSED.pron[nxt.text.toLowerCase()]||nxt.final.pos==="determiner"||hasTag(nxt,"noun")||hasTag(nxt,"adverb")||hasFeat(nxt,"negation"));
    if(verbCand&&!inflected&&!CLOSED.aux[fw]&&!CLOSED.modal[fw]&&objLike){
      ft.final={pos:"verb",sub:"imperative",conf:fx.pos==="verb"?.85:.7,feat:["base","imperative"]};
    }
    if(/^[A-Z]/.test(ft.text)&&ft.final.sub==="proper"&&ft.tags.length>1) ft.final=ft.tags.filter(function(x){return x.sub!=="proper";})[0]||ft.final;
  }
  toks.forEach(function(t){
    if(t.isWord&&/^[A-Z]/.test(t.text)&&t.i>firstWordIdx(toks)&&t.final.pos==="noun"&&!LEX.has(t.text.toLowerCase())){
      t.final={pos:"noun",sub:"proper",conf:.92,feat:["proper"]};
    }
  });
}
function hasTag(t,pos){return t.tags.some(function(x){return x.pos===pos;});}
function hasFeat(t,f){return t.final&&t.final.feat&&t.final.feat.indexOf(f)>=0;}
function prevWord(toks,i){for(var j=i-1;j>=0;j--)if(toks[j].isWord)return toks[j];return null;}
function nextWord(toks,i){for(var j=i+1;j<toks.length;j++)if(toks[j].isWord)return toks[j];return null;}
function firstWordIdx(toks){for(var j=0;j<toks.length;j++)if(toks[j].isWord)return j;return -1;}

function pass2(toks){
  var spans=[],findings=[];
  var i=0,n=toks.length;
  function tagOf(t){return t.final.pos;}
  var vgroups=[];
  i=0;
  while(i<n){
    var t=toks[i];
    if(t.isWord&&(tagOf(t)==="verb")){
      var g={start:i,end:i,toks:[t],neg:false};
      var j=i+1;
      while(j<n){
        var u=toks[j];
        if(!u.isWord){break;}
        var up=tagOf(u),uw=u.text.toLowerCase();
        if(up==="verb"||(up==="adverb"&&hasFeat(u,"negation"))||(up==="adverb"&&j+1<n&&toks[j+1].isWord&&tagOf(toks[j+1])==="verb")){
          if(hasFeat(u,"negation")) g.neg=true;
          g.toks.push(u); g.end=j; j++;
        } else break;
      }
      var verbs=g.toks.filter(function(x){return tagOf(x)==="verb";});
      if(verbs.length){ g.verbs=verbs; vgroups.push(g); }
      i=g.end+1;
    } else i++;
  }
  vgroups.forEach(function(g){
    var vs=g.verbs.map(function(v){return {w:v.text.toLowerCase(),t:v};});
    var tense=null,voice="active",modal=false,id=null;
    var ws=vs.map(function(v){return v.w;});
    function f(v,feat){return v.t.final.feat.some(function(x){return x.indexOf(feat)===0;});}
    var last=vs[vs.length-1];
    if(vs.some(function(v){return CLOSED.modal[v.w];})){ modal=true; findings.push(mkFinding("5.5.2",g,"Modal verb “"+ws.filter(function(w){return CLOSED.modal[w];})[0]+"” expresses possibility/necessity/ability.")); }
    var hasHad=ws.indexOf("had")>=0,hasHave=ws.indexOf("have")>=0||ws.indexOf("has")>=0;
    var hasBePast=ws.indexOf("was")>=0||ws.indexOf("were")>=0,hasBePres=ws.indexOf("am")>=0||ws.indexOf("is")>=0||ws.indexOf("are")>=0;
    var hasBeen=ws.indexOf("been")>=0,hasWill=ws.indexOf("will")>=0||ws.indexOf("shall")>=0;
    var lastIng=f(last,"ing:"),lastPP=f(last,"pp:")&&vs.length>1,lastPast=f(last,"past:");
    if(hasHad&&hasBeen&&lastIng){tense="past perfect progressive";id="4.3.8";}
    else if(hasHad&&lastPP){tense="past perfect";id="4.3.7";}
    else if(hasHave&&hasBeen&&lastIng){tense="present perfect progressive";id="4.3.4";}
    else if(hasHave&&lastPP){tense="present perfect";id="4.3.3";}
    else if(hasWill&&hasBeen&&lastPP){tense="future perfect";id="4.3.11";}
    else if(hasWill&&lastIng){tense="future progressive";id="4.3.10";}
    else if(hasWill){tense="future simple";id="4.3.9";}
    else if(hasBePast&&lastIng){tense="past progressive";id="4.3.6";}
    else if(hasBePres&&lastIng){tense="present progressive";id="4.3.2";}
    else if((hasBePast||hasBePres||hasBeen)&&lastPP){voice="passive";id="5.5.1";tense=hasBePast?"past simple (passive)":"present (passive)";}
    else if(lastPast||hasBePast){tense="past simple";id="4.3.5";}
    else {tense="present simple";id="4.3.1";}
    g.tense=tense; g.tenseId=id; g.voice=voice;
    if(id&&(id.indexOf("4.3")===0)&&id!=="4.3.5"&&id!=="4.3.1"){
      findings.push(mkFinding(id,g,tenseExplain(g)));
    }
    if(voice==="passive") findings.push(mkFinding("5.5.1",g,"“"+ws.join(" ")+"”: form of be + past participle — the subject receives the action."));
  });
  function tenseExplain(g){
    var ws=g.verbs.map(function(v){return v.text;}).join(" ");
    if(g.tenseId==="4.3.7") return "“"+ws+"”: “had” (auxiliary, past) + past participle matches the template had + past participle — an action completed before another past point.";
    return "“"+ws+"” matches the "+g.tense+" formation template.";
  }
  function mkFinding(id,range,explain){
    return {id:id,label:(CONTENT[id]?CONTENT[id].n:id),severity:"info",start:range.start,end:range.end,explain:explain,confidence:.85};
  }
  function inVG(idx){return vgroups.some(function(g){return idx>=g.start&&idx<=g.end;});}
  var phrases=[];
  i=0;
  while(i<n){
    var t=toks[i];
    if(!t.isWord){i++;continue;}
    var p=tagOf(t),w=t.text.toLowerCase();
    if(inVG(i)){
      var g=vgroups.filter(function(x){return i>=x.start&&i<=x.end;})[0];
      phrases.push({kind:"VP",id:"3.2",start:g.start,end:g.end,tense:g.tense,tenseId:g.tenseId,voice:g.voice,conf:.9});
      i=g.end+1;continue;
    }
    if(p==="preposition"){
      var pp={kind:"PP",id:"3.3",start:i,end:i,conf:.9,children:[]};
      var j=i+1,got=false,ger=false;
      while(j<n&&toks[j].isWord){
        var u=toks[j],up=tagOf(u);
        if(up==="determiner"||up==="numeral"||up==="adjective"){pp.end=j;j++;}
        else if(up==="verb"&&u.final.feat.some(function(x){return x.indexOf("ing:")===0;})){pp.end=j;ger=true;got=true;j++;}
        else if(up==="noun"||up==="pronoun"){pp.end=j;got=true;j++; if(j<n&&toks[j].isWord&&tagOf(toks[j])==="noun"){continue;} else break;}
        else break;
      }
      if(got){
        if(ger){pp.children.push({kind:"GerundP",id:"3.8",start:i+1,end:pp.end,conf:.85});pp.note="containing a gerund phrase (3.8)";}
        phrases.push(pp);i=pp.end+1;continue;
      }
    }
    if(p==="particle"&&t.final.sub==="infinitive"){
      var inf={kind:"InfP",id:"3.7",start:i,end:i,conf:.88};
      var j2=i+1;
      while(j2<n&&toks[j2].isWord&&(tagOf(toks[j2])==="verb"||tagOf(toks[j2])==="adverb")){inf.end=j2;j2++;}
      while(j2<n&&toks[j2].isWord&&["determiner","adjective","noun","pronoun","numeral"].indexOf(tagOf(toks[j2]))>=0){inf.end=j2;j2++;}
      phrases.push(inf);i=inf.end+1;continue;
    }
    if(p==="verb"&&t.final.feat.some(function(x){return x.indexOf("ing:")===0;})&&!inVG(i)){
      var gp={kind:"GerundP",id:"3.8",start:i,end:i,conf:.8};
      var j3=i+1;
      while(j3<n&&toks[j3].isWord&&["determiner","adjective","noun","pronoun","numeral"].indexOf(tagOf(toks[j3]))>=0){gp.end=j3;j3++;}
      phrases.push(gp);i=gp.end+1;continue;
    }
    if(p==="determiner"||p==="numeral"||p==="noun"||p==="pronoun"||(p==="adjective")){
      var np={kind:"NP",id:"3.1",start:i,end:i,conf:.9};
      var j4=i,gotN=false,onlyAdj=true;
      while(j4<n&&toks[j4].isWord){
        var u4=toks[j4],up4=tagOf(u4);
        if(up4==="determiner"||up4==="numeral"){np.end=j4;onlyAdj=false;j4++;}
        else if(up4==="adjective"){np.end=j4;j4++;}
        else if(up4==="noun"){np.end=j4;gotN=true;onlyAdj=false;j4++;}
        else if(up4==="pronoun"&&j4===np.start){np.end=j4;gotN=true;onlyAdj=false;j4++;break;}
        else break;
      }
      if(gotN||!onlyAdj){phrases.push(np);i=np.end+1;continue;}
      if(onlyAdj){phrases.push({kind:"AdjP",id:"3.4",start:np.start,end:np.end,conf:.8});i=np.end+1;continue;}
    }
    if(p==="adverb"&&!hasFeat(t,"negation")){
      var ap={kind:"AdvP",id:"3.5",start:i,end:i,conf:.85};
      var j5=i+1;
      while(j5<n&&toks[j5].isWord&&tagOf(toks[j5])==="adverb"){ap.end=j5;j5++;}
      phrases.push(ap);i=ap.end+1;continue;
    }
    i++;
  }
  var boundaries=[];
  toks.forEach(function(t,idx){
    if(!t.isWord)return;
    var w=t.text.toLowerCase(),p=tagOf(t);
    if(p==="conjunction"&&t.final.sub==="coordinating"){
      var after=toks.slice(idx+1);
      var hasSubj=false,hasVerb=false;
      for(var k=0;k<after.length&&k<8;k++){
        var a=after[k];if(!a.isWord)continue;
        var ap2=tagOf(a);
        if(!hasVerb&&(ap2==="pronoun"||ap2==="noun"||ap2==="determiner"))hasSubj=true;
        if(ap2==="verb"){hasVerb=true;break;}
      }
      if(hasSubj&&hasVerb)boundaries.push({idx:idx,type:"coord"});
    }
    if(p==="pronoun"&&t.final.sub==="relative")boundaries.push({idx:idx,type:"rel"});
    if(p==="conjunction"&&t.final.sub==="subordinating"&&idx===firstWordIdx(toks))boundaries.push({idx:idx,type:"subord-front"});
    else if(p==="conjunction"&&t.final.sub==="subordinating")boundaries.push({idx:idx,type:"subord"});
    if(t.text===","){
      var b4=prevWord(toks,idx),af=nextWord(toks,idx);
    }
  });
  toks.forEach(function(t,idx){
    if(t.text===","){
      var af=toks.slice(idx+1),hasS=false,hasV=false,brk=false;
      for(var k=0;k<af.length&&k<7;k++){
        var a=af[k];if(!a.isWord){if(a.text!=='"'&&a.text!=="'")break;else continue;}
        var ap3=tagOf(a);
        if(ap3==="conjunction"){brk=true;break;}
        if(!hasV&&(ap3==="pronoun"&&a.final.sub!=="relative"||ap3==="noun"||ap3==="determiner"))hasS=true;
        else if(ap3==="verb"&&hasS){hasV=true;break;}
        else if(ap3==="verb"&&!hasS){break;}
      }
      if(hasS&&hasV&&!brk)boundaries.push({idx:idx,type:"comma-clause"});
    }
  });
  boundaries.sort(function(a,b){return a.idx-b.idx;});
  var clauses=[],cstart=0;
  var lastEnd=n-1;
  while(lastEnd>=0&&!toks[lastEnd].isWord)lastEnd--;
  var cuts=[];
  boundaries.forEach(function(b){
    if(b.type==="coord"||b.type==="comma-clause")cuts.push({at:b.idx,keep:b.type==="comma-clause"?"left-punct":"none",b:b});
    if(b.type==="rel"||b.type==="subord")cuts.push({at:b.idx,keep:"right",b:b});
  });
  var segs=[],s=0;
  cuts.forEach(function(c){
    var endIdx=c.keep==="right"?c.at-1:c.at-1;
    if(endIdx>=s)segs.push({start:s,end:endIdx,openedBy:null});
    s=c.keep==="right"?c.at:c.at+1;
    if(segs.length&&c.keep==="right")segs[segs.length]=undefined;
    if(segs[segs.length-1]===undefined)segs.pop();
    if(c.keep==="right"){segs.push({start:c.at,end:null,openedBy:c.b.type,marker:c.at});s=null;}
  });
  segs=[];s=0;
  for(var ci=0;ci<cuts.length;ci++){
    var c=cuts[ci];
    if(c.b.type==="rel"||c.b.type==="subord"){
      if(c.at-1>=s)segs.push({start:s,end:c.at-1,dep:false});
      var endAt=lastEnd;
      for(var cj=ci+1;cj<cuts.length;cj++){if(cuts[cj].at>c.at){endAt=cuts[cj].at-1;break;}}
      segs.push({start:c.at,end:endAt,dep:true,depType:c.b.type,marker:c.at});
      s=endAt+1;
      while(ci+1<cuts.length&&cuts[ci+1].at<=endAt)ci++;
    } else {
      if(c.at-1>=s)segs.push({start:s,end:c.at-1,dep:false,joiner:c.b.type,joinAt:c.at});
      s=c.at+1;
    }
  }
  if(s<=lastEnd)segs.push({start:s,end:lastEnd,dep:false});
  segs=segs.filter(function(sg){
    for(var k=sg.start;k<=sg.end;k++)if(toks[k]&&toks[k].isWord)return true;
    return false;
  });
  segs.forEach(function(sg,si){
    var hasSubj=null,hasFin=null,vg=null;
    for(var k=sg.start;k<=sg.end;k++){
      var t2=toks[k];if(!t2||!t2.isWord)continue;
      var p2=tagOf(t2);
      if(hasFin===null&&p2==="verb"&&!hasFeat(t2,"inf-marker")){
        var g2=vgroups.filter(function(g){return k>=g.start&&k<=g.end;})[0];
        if(g2){hasFin=k;vg=g2;}
      }
      if(hasSubj===null&&hasFin===null&&(p2==="pronoun"||p2==="noun"))hasSubj=k;
    }
    var cl={start:sg.start,end:sg.end,dep:!!sg.dep,depType:sg.depType||null,subjIdx:hasSubj,finIdx:hasFin,vg:vg,idx:si};
    if(sg.dep&&sg.depType==="rel"){cl.type="2.5";cl.typeName="Relative clause";
      var pw=prevWord(toks,sg.start);cl.modifies=pw?pw.text:null;}
    else if(sg.dep&&sg.depType==="subord"){
      cl.type="2.4";cl.typeName="Adverbial clause";}
    else if(sg.dep){cl.type="2.2";cl.typeName="Dependent clause";}
    else {cl.type="2.1";cl.typeName="Independent clause";}
    if(!cl.dep&&hasSubj===null&&hasFin!==null){
      var fv=toks[hasFin];
      if(hasFeat(fv,"imperative")||(hasFin===firstWordIdx(toks)&&fv.final.feat.indexOf("base")>=0)){
        cl.imperative=true;cl.impliedSubject=true;
      }
    }
    clauses.push(cl);
  });
  if(!clauses.length&&lastEnd>=0)clauses.push({start:0,end:lastEnd,dep:false,type:"2.1",typeName:"Independent clause",idx:0,subjIdx:null,finIdx:null});
  clauses.forEach(function(cl){
    cl.elements=[];
    var linking=false,vgc=cl.vg;
    if(vgc){var mainV=vgc.verbs[vgc.verbs.length-1].text.toLowerCase();linking=!!CLOSED.linking[mainV]&&vgc.voice!=="passive";cl.linking=linking;}
    var clPhrases=phrases.filter(function(p){return p.start>=cl.start&&p.end<=cl.end;});
    cl.phrases=clPhrases;
    var vpIdx=clPhrases.findIndex(function(p){return p.kind==="VP";});
    var np1=clPhrases.filter(function(p,pi){return p.kind==="NP"&&pi<vpIdx;});
    if(np1.length)cl.elements.push({role:"subject",ph:np1[np1.length-1]});
    else if(cl.subjIdx!==null)cl.elements.push({role:"subject",tok:cl.subjIdx});
    else if(cl.imperative)cl.elements.push({role:"implied subject (you)",implied:true});
    if(vpIdx>=0)cl.elements.push({role:"verb",ph:clPhrases[vpIdx]});
    var post=clPhrases.slice(vpIdx+1);
    var postNPs=post.filter(function(p){return p.kind==="NP"||p.kind==="GerundP";});
    if(linking&&postNPs.length){cl.elements.push({role:"subject complement",ph:postNPs[0]});postNPs=postNPs.slice(1);}
    else if(postNPs.length){
      var first=postNPs[0];
      var isDur=false;
      for(var k=first.start;k<=first.end;k++){var tw=toks[k];if(tw&&tw.isWord&&CLOSED.duration[tw.text.toLowerCase()])isDur=true;}
      if(isDur){first.adverbialNP=true;first.tent=true;first.conf=.6;cl.elements.push({role:"adverbial (duration — tentative)",ph:first});}
      else{
        cl.elements.push({role:"direct object",ph:first});
        if(postNPs[1]){
          if(cl.imperative||(cl.vg&&["make","made","call","called","name","named","elect","elected","crown","crowned","consider"].indexOf(cl.vg.verbs[cl.vg.verbs.length-1].text.toLowerCase())>=0)){
            cl.elements[cl.elements.length-1].role="direct object";
            cl.elements.push({role:"object complement",ph:postNPs[1]});
          } else {
            cl.elements[cl.elements.length-1].role="indirect object";
            cl.elements.push({role:"direct object",ph:postNPs[1]});
          }
        }
      }
      postNPs=postNPs.slice(cl.elements.filter(function(e){return e.role.indexOf("object")>=0;}).length);
    }
    post.filter(function(p){return p.kind==="PP"||p.kind==="AdvP";}).forEach(function(p){cl.elements.push({role:"adverbial",ph:p});});
  });
  var indep=clauses.filter(function(c){return !c.dep;}).length;
  var dep=clauses.filter(function(c){return c.dep;}).length;
  var structId=indep>1?(dep>0?"1.4":"1.2"):(dep>0?"1.3":"1.1");
  var lastTok=toks[toks.length-1];
  var endP=lastTok&&!lastTok.isWord?lastTok.text:".";
  var purposeId="1.7d";
  if(endP==="?")purposeId="1.7i";
  else if(endP==="!")purposeId="1.7e";
  if(clauses.some(function(c){return c.imperative;})&&endP!=="?")purposeId="1.7m";
  var tagQ=false;
  if(endP==="?"){
    for(var q=toks.length-1;q>=2;q--){
      if(toks[q].text===","){
        var aftQ=toks.slice(q+1).filter(function(x){return x.isWord;});
        if(aftQ.length>=2&&aftQ.length<=3&&(CLOSED.aux[aftQ[0].text.toLowerCase()]||CLOSED.modal[aftQ[0].text.toLowerCase()]||aftQ[0].text.toLowerCase().indexOf("n't")>=0)){tagQ=true;purposeId="1.7t";}
        break;
      }
    }
  }
  return {vgroups:vgroups,phrases:phrases,clauses:clauses,findings:findings,structId:structId,purposeId:purposeId,tagQ:tagQ};
}

function pass3(toks,p2){
  var f=[];
  function words(){return toks.filter(function(t){return t.isWord;});}
  p2.clauses.forEach(function(cl){
    if(cl.dep||!cl.vg)return;
    var subjTok=null;
    var se=cl.elements.filter(function(e){return e.role==="subject";})[0];
    if(se&&se.ph){for(var k=se.ph.end;k>=se.ph.start;k--){if(toks[k].isWord&&(toks[k].final.pos==="noun"||toks[k].final.pos==="pronoun")){subjTok=toks[k];break;}}}
    else if(se&&se.tok!==undefined&&se.tok!==null)subjTok=toks[se.tok];
    if(!subjTok)return;
    var fin=cl.vg.verbs[0],fw=fin.text.toLowerCase(),sw=subjTok.text.toLowerCase();
    var person=CLOSED.pron[sw];
    var subjNum=(person==="3pl"||person==="1pl"||hasFeat(subjTok,"plural"))?"plural":"singular";
    var ok=true,how="";
    if(fw==="was"||fw==="is"||fw==="am"||/s$/.test(fw)&&fin.final.feat.some(function(x){return x.indexOf("3sg:")===0;})){
      ok=(subjNum==="singular");how="“"+subjTok.text+"” is "+(person||"3rd-person")+" "+subjNum+"; “"+fin.text+"” is a singular verb form — "+(ok?"number and person match.":"MISMATCH.");
    } else if(fw==="were"||fw==="are"){
      ok=(subjNum==="plural"||sw==="you");how="“"+subjTok.text+"” is "+subjNum+"; “"+fin.text+"” is a plural/2nd-person form — "+(ok?"they agree.":"MISMATCH.");
    } else {how="“"+subjTok.text+"” ("+subjNum+") with “"+fin.text+"” — no agreement conflict detected.";}
    f.push({id:"5.1.1",label:CONTENT["5.1.1"].n,severity:ok?"check":"flag",start:cl.start,end:cl.end,explain:how,confidence:ok?.85:.8});
  });
  var indepCls=p2.clauses.filter(function(c){return !c.dep&&c.finIdx!==null;});
  if(indepCls.length>=2){
    for(var ii=0;ii<indepCls.length-1;ii++){
      var a=indepCls[ii],b=indepCls[ii+1];
      var between=toks.slice(a.end+1,b.start).filter(function(t){return !t.isWord;}).map(function(t){return t.text;});
      var wordsBetween=toks.slice(a.end+1,b.start).filter(function(t){return t.isWord;});
      var hasConj=wordsBetween.some(function(t){return t.final.pos==="conjunction";});
      if(!hasConj){
        if(between.indexOf(",")>=0&&between.indexOf(";")<0&&between.indexOf(":")<0&&between.indexOf("—")<0){
          f.push({id:"7.4",label:"Comma splice",severity:"flag",start:a.start,end:b.end,explain:"Two independent clauses are joined by only a comma. Fix with a period, a semicolon, or a comma + coordinating conjunction (and, but, so).",confidence:.85});
        } else if(!between.length){
          f.push({id:"7.4",label:"Fused sentence",severity:"flag",start:a.start,end:b.end,explain:"Two independent clauses run together with no punctuation. Fix with a period, a semicolon, or a comma + coordinating conjunction.",confidence:.75});
        } else if(between.indexOf(";")>=0||between.indexOf(":")>=0||between.indexOf("—")>=0){
          f.push({id:"1.5",label:CONTENT["1.5"].n,severity:"info",start:a.start,end:b.end,explain:"Independent clauses joined by punctuation ("+between.filter(function(x){return ";:—".indexOf(x)>=0;})[0]+") without a coordinating conjunction.",confidence:.85});
        }
      }
    }
  }
  if(!p2.clauses.some(function(c){return !c.dep&&(c.finIdx!==null||c.imperative);})){
    var w0=words();
    if(w0.length){
      f.push({id:"7.5",label:CONTENT["7.5"].n,severity:"flag",start:0,end:toks.length-1,explain:"No independent clause with a finite verb was found — this reads as a fragment (a dependent clause or phrase punctuated as a sentence).",confidence:.75});
    }
  }
  (function(){
    var listItems=[],cur=null;
    for(var k=0;k<toks.length;k++){
      var t=toks[k];
      if(t.isWord){
        var wG=t.text.toLowerCase(),bG=wG.slice(0,-3);
        var isGer=/ing$/.test(wG)&&wG.length>4&&t.tags.some(function(x){return x.pos==="verb";})&&
          (LEX.has(bG)||LEX.has(bG+"e")||(bG.length>2&&bG[bG.length-1]===bG[bG.length-2]&&LEX.has(bG.slice(0,-1))));
        var isInf=t.final.sub==="infinitive";
        if(isGer)listItems.push({idx:k,form:"gerund",word:t.text});
        if(isInf&&nextWord(toks,k))listItems.push({idx:k,form:"infinitive",word:"to "+nextWord(toks,k).text});
      }
    }
    if(listItems.length>=2){
      var near=[];
      for(var li=0;li<listItems.length;li++){
        var span=toks.slice(listItems[li].idx, listItems[li+1]?listItems[li+1].idx:listItems[li].idx+4);
        near.push(listItems[li]);
      }
      var forms={};near.forEach(function(x){forms[x.form]=1;});
      var hasComma=toks.some(function(t){return t.text===",";});
      if(Object.keys(forms).length>1&&hasComma&&near.length>=3){
        f.push({id:"7.6",label:CONTENT["7.6"].n,severity:"flag",start:near[0].idx,end:near[near.length-1].idx+1,
          explain:"This list mixes forms: "+near.map(function(x){return "“"+x.word+"” ("+x.form+")";}).join(", ")+". Parallel structure (rule 5.3.1) wants one form throughout — e.g. all gerunds.",confidence:.8});
      }
    }
  })();
  for(var k=0;k<toks.length-2;k++){
    var t=toks[k];
    if(t.isWord&&t.text.toLowerCase()==="between"){
      var seq=toks.slice(k+1,k+6).filter(function(x){return x.isWord;});
      if(seq.length>=3&&seq[1].text.toLowerCase()==="and"&&seq[2].text==="I"){
        f.push({id:"7.9",label:CONTENT["7.9"].n,severity:"flag",start:k,end:k+4,explain:"“between you and I” — a preposition takes the objective case: “between you and me”.",confidence:.9});
      }
    }
    if(t.isWord&&(t.text.toLowerCase()==="me")&&k===firstWordIdx(toks)){
      var nx=nextWord(toks,k);
      if(nx&&nx.text.toLowerCase()==="and")f.push({id:"7.9",label:CONTENT["7.9"].n,severity:"flag",start:k,end:k+2,explain:"“Me and …” as a subject — subjects take the subjective case: “X and I …”.",confidence:.85});
    }
  }
  for(var k2=0;k2<toks.length-1;k2++){
    var t3=toks[k2];
    if(!t3.isWord)continue;
    var w3=t3.text.toLowerCase().replace(/’/g,"'");
    var nx3=nextWord(toks,k2);
    if(w3==="it's"&&nx3&&nx3.final.pos==="noun"&&!nx3.final.feat.length){
      f.push({id:"7.10",label:CONTENT["7.10"].n,severity:"flag",start:k2,end:k2+1,explain:"“it's” = “it is”. Before a noun you likely want the possessive “its” (no apostrophe). Test: “it is "+nx3.text+"” — if that fails, use “its”.",confidence:.7});
    }
    if((w3==="more"||w3==="most")&&nx3&&nx3.final.feat&&(nx3.final.feat.indexOf("comparative")>=0||nx3.final.feat.indexOf("superlative")>=0)){
      f.push({id:"7.11",label:CONTENT["7.11"].n,severity:"flag",start:k2,end:k2+1,explain:"“"+t3.text+" "+nx3.text+"” doubles the degree marker — use “"+nx3.text+"” or “"+t3.text+" + base form”, not both.",confidence:.85});
    }
  }
  (function(){
    var negs=words().filter(function(t){return hasFeat(t,"negation")||["nothing","nobody","nowhere","none"].indexOf(t.text.toLowerCase())>=0;});
    var realNegs=negs.filter(function(t){return t.text.toLowerCase()!=="no"||true;});
    if(realNegs.length>=2){
      var hasNt=realNegs.some(function(t){return /n't|not/.test(t.text.toLowerCase());});
      var hasNo=realNegs.some(function(t){return ["nothing","nobody","nowhere","none","no"].indexOf(t.text.toLowerCase())>=0;});
      if(hasNt&&hasNo)f.push({id:"5.6.2",label:CONTENT["5.6.2"].n,severity:"flag",start:realNegs[0].i,end:realNegs[realNegs.length-1].i,explain:"Two negatives ("+realNegs.map(function(t){return "“"+t.text+"”";}).join(" + ")+") make a non-standard positive in standard English.",confidence:.7});
    }
    var nots=words().filter(function(t){return ["not","n't","never"].indexOf(t.text.toLowerCase())>=0;});
    if(nots.length===1&&realNegs.length===1)f.push({id:"5.6.1",label:CONTENT["5.6.1"].n,severity:"info",start:nots[0].i,end:nots[0].i,explain:"Negation with “"+nots[0].text+"”"+(words().some(function(t){return ["do","does","did"].indexOf(t.text.toLowerCase())>=0;})?" using do-support (auxiliary do carries the tense so not can attach).":"."),confidence:.85});
  })();
  (function(){
    var fwIdx=firstWordIdx(toks);
    if(fwIdx>=0){
      var fw2=toks[fwIdx];
      if(/^[a-z]/.test(fw2.text))f.push({id:"6.4",label:CONTENT["6.4"].n,severity:"flag",start:fwIdx,end:fwIdx,explain:"A sentence begins with a capital letter — “"+fw2.text+"” is lowercase.",confidence:.9});
    }
    words().forEach(function(t){if(t.text==="i")f.push({id:"6.4",label:CONTENT["6.4"].n,severity:"flag",start:t.i,end:t.i,explain:"The pronoun “I” is always capitalised.",confidence:.95});});
  })();
  (function(){
    var coords=words().filter(function(t){return t.final.pos==="conjunction"&&t.final.sub==="coordinating";});
    if(coords.length>=3)f.push({id:"5.8.1",label:CONTENT["5.8.1"].n,severity:"info",start:coords[0].i,end:coords[coords.length-1].i,explain:coords.length+" coordinating conjunctions in close succession — deliberate repetition creating rhythm or magnitude.",confidence:.75});
  })();
  (function(){
    var w1=words()[0];
    if(w1&&w1.text.toLowerCase()==="there"){
      var nx4=nextWord(toks,w1.i);
      if(nx4&&["was","were","is","are","be"].indexOf(nx4.text.toLowerCase())>=0)f.push({id:"5.3.4",label:CONTENT["5.3.4"].n,severity:"info",start:w1.i,end:nx4.i,explain:"“There” is a dummy subject; the notional subject follows the verb and controls agreement.",confidence:.9});
    }
    for(var q2=0;q2<toks.length-2;q2++){
      if(toks[q2].isWord&&toks[q2].text.toLowerCase()==="if"){
        var seq2=toks.slice(q2+1,q2+4).filter(function(x){return x.isWord;});
        if(seq2.length>=2&&["i","he","she","it"].indexOf(seq2[0].text.toLowerCase())>=0&&seq2[1].text.toLowerCase()==="were")
          f.push({id:"5.7.1",label:CONTENT["5.7.1"].n,severity:"info",start:q2,end:q2+2,explain:"“if "+seq2[0].text+" were” — the subjunctive uses “were” for hypothetical situations regardless of subject number.",confidence:.85});
      }
    }
  })();
  p2.clauses.forEach(function(cl){
    if(cl.imperative)f.push({id:"5.7.6",label:CONTENT["5.7.6"].n,severity:"info",start:cl.start,end:cl.end,explain:"Begins with a base-form verb and has no expressed subject — an imperative with implied “you” (see 5.3.2 elliptical subjects).",confidence:.85});
  });
  toks.forEach(function(t){
    if(t.untagged)f.push({id:"4.1n",label:"Untagged word",severity:"flag",start:t.i,end:t.i,explain:"“"+t.text+"” was not found in the lexicon and matched no morphological pattern — tagged as a noun at low confidence.",confidence:.4});
    else if(t.oov)f.push({id:"4.1n",label:"Out-of-vocabulary word",severity:"info",start:t.i,end:t.i,explain:"“"+t.text+"” is not in the 20,000-word lexicon; its position (after a determiner/modifier) implies a noun, so it was tagged noun from context.",confidence:.75});
  });
  return f;
}

function parse(text){
  var toks=tokenize(text);
  var wc=toks.filter(function(t){return t.isWord;}).length;
  if(wc>CONFIG.cap)return {meta:{asset:CONFIG.name,version:CONFIG.version,cap:CONFIG.cap,wordCount:wc,overCap:true}};
  pass1(toks);
  var p2=pass2(toks);
  var f3=pass3(toks,p2);
  var findings=p2.findings.concat(f3);
  var result={
    meta:{asset:CONFIG.name,version:CONFIG.version,cap:CONFIG.cap,wordCount:wc,overCap:false,lexiconMode:LEX.morphOnly?"morphology-only (embedded db failed to load)":"embedded SQLite"},
    tokens:toks.map(function(t){return {i:t.i,text:t.text,start:t.start,end:t.end,isWord:t.isWord,
      tags:[{id:posId(t.final),label:posLabel(t),confidence:t.final.conf,sub:t.final.sub||null,feat:t.final.feat||[]}]};}),
    spans:[],findings:findings,
    summary:{classifications:[{id:p2.structId,label:CONTENT[p2.structId].n},{id:p2.purposeId,label:CONTENT[p2.purposeId].n}],counts:{words:wc,clauses:p2.clauses.length,independent:p2.clauses.filter(function(c){return !c.dep;}).length,dependent:p2.clauses.filter(function(c){return c.dep;}).length,phrases:p2.phrases.length}},
    _clauses:p2.clauses,_phrases:p2.phrases,_toks:toks
  };
  p2.clauses.forEach(function(cl,ci){
    result.spans.push({start:cl.start,end:cl.end,id:cl.type,label:cl.typeName+(cl.modifies?" — modifies “"+cl.modifies+"”":""),kind:"clause",confidence:.85,clauseIdx:ci,imperative:!!cl.imperative});
  });
  p2.phrases.forEach(function(p){
    result.spans.push({start:p.start,end:p.end,id:p.id,label:phraseLabel(p),kind:"phrase",confidence:p.conf,tent:!!p.tent,note:p.note||null,adverbialNP:!!p.adverbialNP});
    (p.children||[]).forEach(function(c){result.spans.push({start:c.start,end:c.end,id:c.id,label:phraseLabel(c),kind:"phrase-inner",confidence:c.conf});});
  });
  return result;
}
function posId(fin){
  var m={noun:"4.1n",verb:"4.1v",adjective:"4.1adj",adverb:"4.1adv",pronoun:"4.1pron",preposition:"4.1prep",conjunction:"4.1conj",determiner:"4.1det",interjection:"4.1int",numeral:"4.4.5",particle:"4.5",punctuation:"6.1"};
  return m[fin.pos]||"4.1n";
}
function posLabel(t){
  var f=t.final;
  if(f.pos==="punctuation")return "punctuation";
  var bits=[f.pos];
  if(f.sub)bits.push(f.sub);
  var feats=(f.feat||[]).filter(function(x){return x&&x.indexOf(":")<0&&["det"].indexOf(x)<0;});
  if(feats.length)bits.push(feats.join(", "));
  var deriv=(f.feat||[]).filter(function(x){return x.indexOf(":")>0;}).map(function(x){var p=x.split(":");return {past:"past of",pp:"past participle of",ing:"-ing form of","3sg":"3rd-sg of",sing:"plural of"}[p[0]]?({past:"past of",pp:"past participle of",ing:"-ing form of","3sg":"3rd-sg of",sing:"plural of"}[p[0]]+" “"+p[1]+"”"):null;}).filter(Boolean);
  if(deriv.length)bits.push(deriv[0]);
  return bits.join(" · ");
}
function phraseLabel(p){
  var names={NP:"Noun phrase (3.1)",VP:"Verb phrase (3.2)",PP:"Prepositional phrase (3.3)",AdjP:"Adjective phrase (3.4)",AdvP:"Adverb phrase (3.5)",InfP:"Infinitive phrase (3.7)",GerundP:"Gerund phrase (3.8)"};
  var l=names[p.kind]||p.kind;
  if(p.tense)l+=" — "+p.tense;
  if(p.adverbialNP)l+=" — adverbial, duration (tentative)";
  if(p.note)l+=" — "+p.note;
  return l;
}
return {parse:parse,tokenize:tokenize,CLOSED:CLOSED};
})();
