/* CARTRIDGE - EXPLAINER - two-part explainer (tabled sentence + rules extract).
   Extracted from Grammar/build/template.html and extended per ParserShell.spec.md
   AD-1: needSpace() is promoted here from the shell's old local
   re-implementation (template.html:1208-1211) to a required EXPLAINER
   export, so the shell's render loop never re-implements English
   typographic spacing rules itself. */
var EXPLAINER=(function(){
function esc(s){return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;");}
function clauseOf(R,ti){var best=null;R.spans.forEach(function(s){if(s.kind==="clause"&&ti>=s.start&&ti<=s.end)best=s;});return best;}
function phraseOf(R,ti){var best=null;R.spans.forEach(function(s){if((s.kind==="phrase")&&ti>=s.start&&ti<=s.end){if(!best||s.start>=best.start)best=s;}});return best;}
function funcOf(R,ti){
  var cl=null;R._clauses.forEach(function(c){if(ti>=c.start&&ti<=c.end)cl=c;});
  var t=R._toks[ti];
  if(!cl)return posShort(t);
  var role=null;
  (cl.elements||[]).forEach(function(e){
    if(e.ph&&ti>=e.ph.start&&ti<=e.ph.end)role=e.role;
    if(e.tok===ti)role=e.role;
  });
  var pos=posShort(t);
  if(role==="verb")return pos;
  if(role)return role+(t.final.pos==="noun"&&isHead(R,ti)?" (head)":"");
  return pos;
}
function isHead(R,ti){
  var p=phraseOf(R,ti);if(!p)return false;
  for(var k=p.end;k>=p.start;k--){var t=R._toks[k];if(t.isWord&&t.final.pos==="noun")return k===ti;}
  return false;
}
function posShort(t){
  var f=t.final,m={noun:"noun",verb:"verb",adjective:"modifier",adverb:"adverb",pronoun:"pronoun",preposition:"preposition",conjunction:"conjunction",determiner:"determiner",numeral:"numeral (quantifier)",particle:"particle",interjection:"interjection",punctuation:"punctuation"};
  var base=m[f.pos]||f.pos;
  if(f.pos==="verb"&&f.feat){
    if(f.feat.some(function(x){return x.indexOf("past:")===0;}))base="verb, past";
    if(f.feat.some(function(x){return x.indexOf("pp:")===0;}))base="verb, past participle";
    if(f.feat.some(function(x){return x.indexOf("ing:")===0;}))base="verb, -ing form";
    if(f.feat.indexOf("aux")>=0)base="auxiliary verb";
    if(f.feat.indexOf("modal")>=0)base="modal verb";
  }
  if(f.sub==="relative")base="relative pronoun";
  if(f.sub==="proper")base="proper noun";
  return base;
}
function shortPhrase(p){
  if(!p)return "—";
  var m={"3.1":"NP","3.2":"VP","3.3":"PP","3.4":"AdjP","3.5":"AdvP","3.7":"InfP","3.8":"GerP"};
  return m[p.id]||p.id;
}
function tables(R){
  var groups=[];
  R._clauses.forEach(function(cl){
    var ws=[];
    for(var k=cl.start;k<=cl.end;k++){var t=R._toks[k];if(t&&t.isWord)ws.push(k);}
    for(var g=0;g<ws.length;g+=8)groups.push({cl:cl,ws:ws.slice(g,g+8)});
  });
  var pal=CONFIG.clausePalette;
  var html="";
  groups.forEach(function(gr){
    var hue=pal[gr.cl.idx%pal.length];
    html+='<table class="xt"><tr><th>Word</th>';
    gr.ws.forEach(function(ti){html+="<td>"+esc(R._toks[ti].text)+"</td>";});
    html+='</tr><tr><th>Phrase</th>';
    var i=0;
    while(i<gr.ws.length){
      var p=phraseOf(R,gr.ws[i]),span=1;
      while(i+span<gr.ws.length&&phraseOf(R,gr.ws[i+span])===p)span++;
      html+='<td colspan="'+span+'" style="background:'+hue.h50+';color:'+hue.h800+';">'+esc(shortPhrase(p))+"</td>";
      i+=span;
    }
    html+='</tr><tr><th>Clause · role</th><td colspan="'+gr.ws.length+'" style="background:'+hue.h50+';color:'+hue.h800+';">'+esc(gr.cl.typeName+" ("+gr.cl.type+")"+(gr.cl.modifies?" — modifies “"+gr.cl.modifies+"”":gr.cl.dep?"":gr.cl.imperative?" — imperative, implied “you”":" — "+(gr.cl.idx===0?"main statement":"coordinated")))+"</td></tr>";
    html+='<tr><th>Function</th>';
    gr.ws.forEach(function(ti){html+="<td>"+esc(funcOf(R,ti))+"</td>";});
    html+="</tr></table>";
  });
  return html;
}
function collectIds(R){
  var ids={};
  R.summary.classifications.forEach(function(c){ids[c.id]=1;});
  R.spans.forEach(function(s){if(CONTENT[s.id])ids[s.id]=1;});
  R.findings.forEach(function(f){if(CONTENT[f.id])ids[f.id]=1;});
  R.tokens.forEach(function(t){if(t.isWord!==false&&t.tags[0]&&CONTENT[t.tags[0].id]&&["4.4.5","4.5"].indexOf(t.tags[0].id)>=0)ids[t.tags[0].id]=1;});
  return Object.keys(ids);
}
function rules(R){
  var ids=collectIds(R);
  var cats=[{k:"Sentence",test:function(id){return id.indexOf("1.")===0;}},
            {k:"Clauses",test:function(id){return id.indexOf("2.")===0;}},
            {k:"Phrases",test:function(id){return id.indexOf("3.")===0;}},
            {k:"Lexical",test:function(id){return id.indexOf("4.")===0;}},
            {k:"Conventions",test:function(id){return id.indexOf("5.")===0||id.indexOf("6.")===0;}},
            {k:"Errors flagged",test:function(id){return id.indexOf("7.")===0;}}];
  var html="";
  cats.forEach(function(cat){
    var list=ids.filter(cat.test).filter(function(id){return CONTENT[id];});
    if(!list.length)return;
    html+='<div class="cat">'+cat.k+'</div><ul>';
    list.sort().forEach(function(id){
      var c=CONTENT[id];
      html+="<li><strong>"+esc(c.n)+" ("+id.replace(/[a-z]$/,"")+")</strong> — "+esc(c.d)+(c.e?' <span class="ex">'+esc(c.e)+"</span>":"")+"</li>";
    });
    html+="</ul>";
  });
  return html;
}
function toMarkdown(R){
  var md="# "+CONFIG.name+" — explainer\n\n**Sentence:** "+R._toks.map(function(t){return t.text;}).join(" ").replace(/ ([.,;:!?])/g,"$1")+"\n\n";
  md+="**Classification:** "+R.summary.classifications.map(function(c){return c.label+" ("+c.id.replace(/[a-z]$/,"")+")";}).join(" · ")+"\n\n## The tabled sentence\n\n";
  R._clauses.forEach(function(cl){
    var ws=[];for(var k=cl.start;k<=cl.end;k++){var t=R._toks[k];if(t&&t.isWord)ws.push(k);}
    md+="| Word |"+ws.map(function(ti){return " "+R._toks[ti].text+" |";}).join("")+"\n";
    md+="|---|"+ws.map(function(){return "---|";}).join("")+"\n";
    md+="| Phrase |"+ws.map(function(ti){return " "+shortPhrase(phraseOf(R,ti))+" |";}).join("")+"\n";
    md+="| Clause |"+ws.map(function(){return " "+cl.typeName+" ("+cl.type+") |";}).join("")+"\n";
    md+="| Function |"+ws.map(function(ti){return " "+funcOf(R,ti)+" |";}).join("")+"\n\n";
  });
  md+="## Relevant rules\n\n";
  collectIds(R).sort().forEach(function(id){
    var c=CONTENT[id];if(!c)return;
    md+="- **"+c.n+" ("+id.replace(/[a-z]$/,"")+")** — "+c.d+(c.e?" _"+c.e+"_":"")+"\n";
  });
  md+="\n---\n"+CONFIG.name+" v"+CONFIG.version+" · built from "+CONFIG.builtFrom+"\n";
  return md;
}
function toText(R){
  return toMarkdown(R).replace(/[#*_|`]/g,"").replace(/\n{3,}/g,"\n\n");
}
function needSpace(a,b){
  if(!b.isWord&&".,;:!?…".indexOf(b.text)>=0)return false;
  if(!a.isWord&&"(“‘".indexOf(a.text)>=0)return false;
  return true;
}
return {tables:tables,rules:rules,toMarkdown:toMarkdown,toText:toText,funcOf:funcOf,phraseOf:phraseOf,clauseOf:clauseOf,posShort:posShort,needSpace:needSpace};
})();
