/* Shared parser for published, PUBLIC-only CSV files. Keep private spreadsheets private. */
window.DIDARPublicCSV = (() => {
  'use strict';
  function parse(text) {
    const input=String(text||'').replace(/^\uFEFF/,'');let quoted=false,cell='',row=[],rows=[];
    for(let i=0;i<input.length;i++){
      const c=input[i];
      if(c==='"'){
        if(quoted && input[i+1]==='"'){cell+='"';i++;}
        else if(!quoted && cell!==''){cell+='"';}
        else quoted=!quoted;
      } else if(c===','&&!quoted){row.push(cell);cell='';}
      else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&input[i+1]==='\n')i++;row.push(cell);cell='';if(row.some(x=>x.trim()))rows.push(row);row=[];}
      else cell+=c;
    }
    if(quoted)throw Error('Unclosed CSV quote');row.push(cell);if(row.some(x=>x.trim()))rows.push(row);
    const head=(rows.shift()||[]).map(x=>x.trim().replace(/^\uFEFF/,''));
    if(new Set(head).size!==head.length)throw Error('Duplicate CSV headers');
    return rows.map(cells=>Object.fromEntries(head.map((key,i)=>[key,(cells[i]||'').trim()])));
  }
  const published=value=>['yes','true','1','published','approved'].includes(String(value||'').trim().toLowerCase());
  const https=value=>{try{const u=new URL(String(value||''));return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}};
  const image=(value,prefix)=>{
    const t=String(value||'').trim();if(!t)return '';
    if(/^https:\/\//i.test(t))return https(t);
    if(/^assets\/[a-zA-Z0-9/_-]+\.(?:png|jpg|jpeg|webp|avif|svg)$/i.test(t)&&!t.includes('..')&&!t.includes('//'))return prefix+t;
    return '';
  };
  const elt=(name,cls,txt)=>{const e=document.createElement(name);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  async function load(root,configPath,localPath){
    let target='';try{const cfg=await fetch(root+configPath,{cache:'no-store'});if(cfg.ok){const c=await cfg.json();target=https(c.public_csv_url);}}catch(_){/* no config: use local */}
    const urls=target?[target,root+localPath]:[root+localPath];let error;
    for(const url of urls){try{const res=await fetch(url,{cache:'no-store'});if(!res.ok)throw Error('HTTP '+res.status);return parse(await res.text());}catch(e){error=e;}}
    throw error||Error('CSV unavailable');
  }
  return {parse,published,https,image,elt,load};
})();
