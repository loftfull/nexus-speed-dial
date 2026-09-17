import { useEffect, useState } from 'react';
import { LoaderCircle, X } from 'lucide-react';
import type { SiteRecord as Site } from '../domain/types';

export function AddSiteModal({onClose,onSave,existing,categories}:{onClose:()=>void;onSave:(site:Site)=>void;existing?:Site;categories:string[]}){
  const [title,setTitle]=useState(existing?.title||'');
  const [domain,setDomain]=useState(existing?.domain||'');
  const [desc,setDesc]=useState(existing?.desc||'');
  const [category,setCategory]=useState(existing?.category||categories[0]||'Личное');
  const [note,setNote]=useState(existing?.note||'');
  const [tags,setTags]=useState((existing?.tags||[]).join(', '));
  const [color,setColor]=useState(existing?.color||'#2f7cf6');
  const [titleTouched,setTitleTouched]=useState(Boolean(existing?.title));
  const [descTouched,setDescTouched]=useState(Boolean(existing?.desc));
  const [loading,setLoading]=useState(false);
  const [loaded,setLoaded]=useState(false);

  useEffect(()=>{
    if(existing||domain.trim().length<4)return;
    const clean=domain.trim().replace(/^https?:\/\//,'').split('/')[0];
    if(!clean.includes('.'))return;
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setLoaded(false);
      try{
        const response=await fetch(`https://api.microlink.io?url=${encodeURIComponent(`https://${clean}`)}`,{signal:controller.signal});
        if(!response.ok)throw new Error('metadata unavailable');
        const result=await response.json();
        const data=result.data||{};
        if(!titleTouched&&data.title)setTitle(String(data.title).trim());
        if(!descTouched&&data.description)setDesc(String(data.description).trim());
        setLoaded(true);
      }catch{setLoaded(false)}finally{setLoading(false)}
    },650);
    return()=>{window.clearTimeout(timer);controller.abort()};
  },[domain,existing,titleTouched,descTouched]);

  const submit=(e:React.FormEvent)=>{e.preventDefault();const clean=domain.replace(/^https?:\/\//,'').split('/')[0];if(!title.trim()||!clean)return;onSave({...existing,title:title.trim(),domain:clean,desc:desc.trim()||'Сохранённый сайт',note:note.trim(),tags:tags.split(',').map(tag=>tag.trim()).filter(Boolean),color,icon:title.trim()[0].toUpperCase(),category,screenshotUrl:existing?.screenshotUrl||`https://image.thum.io/get/width/900/crop/420/https://${clean}`})};
  return <div className="overlay"><form className="site-form glass" role="dialog" aria-modal="true" aria-labelledby="site-form-title" onSubmit={submit}><header><div><span className="eyebrow">БЫСТРЫЙ ДОСТУП</span><h2 id="site-form-title">{existing?'Редактировать сайт':'Добавить сайт'}</h2><p>Сохраните любимый сайт в одну плитку</p></div><button type="button" className="close" onClick={onClose}><X/></button></header><label>Название<input autoFocus value={title} onChange={e=>{setTitleTouched(true);setTitle(e.target.value)}} placeholder="Например, Linear"/></label><label>Адрес сайта<input value={domain} onChange={e=>{setDomain(e.target.value);setLoaded(false)}} placeholder="linear.app"/>{loading&&<small className="metadata-status"><LoaderCircle size={12}/> Загружаем данные сайта…</small>}{loaded&&!loading&&<small className="metadata-status ready">Данные сайта подгружены</small>}</label><label>Категория<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></label><label>Описание<input value={desc} onChange={e=>{setDescTouched(true);setDesc(e.target.value)}} placeholder="Короткое описание"/></label><label>Заметка<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Личная заметка (необязательно)"/></label><label>Теги<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="дизайн, работа, важное"/></label><label>Цвет иконки<div className="form-colors">{['#2f7cf6','#885cf6','#e95674','#ef9e35','#22a87c','#1c9dbb'].map(c=><button type="button" key={c} className={color===c?'active':''} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></label><footer><button type="button" className="reset" onClick={onClose}>Отмена</button><button className="save" type="submit" disabled={!title.trim()||!domain.trim()}>{existing?'Сохранить':'Добавить сайт'}</button></footer></form></div>
}
