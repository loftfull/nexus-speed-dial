import { useEffect, useState } from 'react';
import { LoaderCircle, X } from '../app/icons.generated';
import type { SiteRecord as Site } from '../domain/types';
import { normalizeSiteAddress } from '../domain/siteUtils';
import { useFocusTrap } from '../hooks/useFocusTrap';

export function AddSiteModal({onClose,onSave,existing,categories,groups=[],allowRemoteMetadata=false,allowRemotePreview=true}:{onClose:()=>void;onSave:(site:Site)=>void;existing?:Site;categories:{id:string;name:string}[];groups?:{id:string;name:string;categoryId:string}[];allowRemoteMetadata?:boolean;allowRemotePreview?:boolean}){
  const [title,setTitle]=useState(existing?.title||'');
  const [domain,setDomain]=useState(existing?.url||existing?.domain||'');
  const [desc,setDesc]=useState(existing?.desc||'');
  const [categoryId,setCategoryId]=useState(existing?.categoryId||categories[0]?.id||'');const [groupId,setGroupId]=useState(existing?.groupId||'');const groupOptions=groups.filter(group=>group.categoryId===categoryId);
  const [note,setNote]=useState(existing?.note||'');
  const [tags,setTags]=useState((existing?.tags||[]).join(', '));
  const [color,setColor]=useState(existing?.color||'#2f7cf6');
  const [titleTouched,setTitleTouched]=useState(Boolean(existing?.title));
  const [descTouched,setDescTouched]=useState(Boolean(existing?.desc));
  const [loading,setLoading]=useState(false);
  const [loaded,setLoaded]=useState(false);
  const dialogRef=useFocusTrap<HTMLFormElement>(true);

  useEffect(()=>{
    if(existing||!allowRemoteMetadata||domain.trim().length<4)return;
    const address=normalizeSiteAddress(domain);
    if(!address)return;
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{
      setLoading(true);setLoaded(false);
      try{
        const response=await fetch(`https://api.microlink.io?url=${encodeURIComponent(address.url)}`,{signal:controller.signal});
        if(!response.ok)throw new Error('metadata unavailable');
        const result=await response.json();
        const data=result.data||{};
        if(!titleTouched&&data.title)setTitle(String(data.title).trim());
        if(!descTouched&&data.description)setDesc(String(data.description).trim());
        setLoaded(true);
      }catch{setLoaded(false)}finally{setLoading(false)}
    },650);
    return()=>{window.clearTimeout(timer);controller.abort()};
  },[domain,existing,titleTouched,descTouched,allowRemoteMetadata]);

  const [error,setError]=useState('');const submit=(e:React.FormEvent)=>{e.preventDefault();const address=normalizeSiteAddress(domain);if(!title.trim()||!domain.trim())return;if(!address){setError('Введите корректный http(s)-адрес, например example.com/docs');return}setError('');onSave({...existing,id:existing?.id||`site-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,title:title.trim(),domain:address.domain,url:address.url,desc:desc.trim()||'Сохранённый сайт',note:note.trim(),tags:tags.split(',').map(tag=>tag.trim()).filter(Boolean),color,icon:title.trim()[0].toUpperCase(),categoryId,groupId:groupId||undefined,category:categories.find(item=>item.id===categoryId)?.name||existing?.category||'Без категории',screenshotUrl:existing?.screenshotUrl||(allowRemotePreview?`https://image.thum.io/get/width/900/crop/420/${address.url}`:undefined)})};
  return <div className="overlay"><form ref={dialogRef} className="site-form glass" role="dialog" aria-modal="true" aria-labelledby="site-form-title" onSubmit={submit}><header><div><span className="eyebrow">БЫСТРЫЙ ДОСТУП</span><h2 id="site-form-title">{existing?'Редактировать сайт':'Добавить сайт'}</h2><p>Сохраните любимый сайт в одну плитку</p></div><button type="button" className="close" onClick={onClose}><X/></button></header><label>Название<input autoFocus value={title} onChange={e=>{setTitleTouched(true);setTitle(e.target.value)}} placeholder="Например, Linear"/></label><label>Адрес сайта<input value={domain} aria-invalid={!!error} aria-describedby={error?'site-domain-error':undefined} onChange={e=>{setDomain(e.target.value);setLoaded(false);setError('')}} placeholder="linear.app"/></label>{error&&<small id="site-domain-error" className="form-error" role="alert">{error}</small>}{loading&&<small className="metadata-status"><LoaderCircle size={12}/> Загружаем данные сайта…</small>}{loaded&&!loading&&<small className="metadata-status ready">Данные сайта подгружены</small>}<label>Категория<select value={categoryId} onChange={e=>{setCategoryId(e.target.value);setGroupId('')}}>{categories.length?categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>):<option value="">Нет категорий</option>}</select></label><label>Группа<select value={groupId} onChange={e=>setGroupId(e.target.value)} disabled={!groupOptions.length}><option value="">{groupOptions.length?'Без группы':'Групп нет'}</option>{groupOptions.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label><label>Описание<input value={desc} onChange={e=>{setDescTouched(true);setDesc(e.target.value)}} placeholder="Короткое описание"/></label><label>Заметка<input value={note} onChange={e=>setNote(e.target.value)} placeholder="Личная заметка (необязательно)"/></label><label>Теги<input value={tags} onChange={e=>setTags(e.target.value)} placeholder="дизайн, работа, важное"/></label><label>Цвет иконки<div className="form-colors">{['#2f7cf6','#885cf6','#e95674','#ef9e35','#22a87c','#1c9dbb'].map(c=><button type="button" key={c} className={color===c?'active':''} style={{background:c}} onClick={()=>setColor(c)}/>)}</div></label><footer><button type="button" className="reset" onClick={onClose}>Отмена</button><button className="save" type="submit" disabled={!title.trim()||!domain.trim()}>{existing?'Сохранить':'Добавить сайт'}</button></footer></form></div>
}
