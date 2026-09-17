import { useEffect, useRef, useState } from 'react';
import { Check, ExternalLink, MoreVertical, Pencil, Star, Trash2 } from 'lucide-react';
import type { SiteRecord as Site } from '../domain/types';
import '../styles.css';
import '../actions.css';

export function SiteTile({site,selected,onSelect,onFav,onToast,onEdit,onDelete,onOpen,onDragStart,onDragEnd,onDrop,selectionMode,selectedMany,onToggleSelect,showDescription=true,showDomain=false,showNotifications=true,allowRemotePreview=true}:{site:Site;selected:boolean;onSelect:()=>void;onFav:()=>void;onToast:(x:string)=>void;onEdit:()=>void;onDelete:()=>void;onOpen:()=>void;onDragStart:()=>void;onDragEnd:()=>void;onDrop:()=>void;selectionMode:boolean;selectedMany:boolean;onToggleSelect:()=>void;showDescription?:boolean;showDomain?:boolean;showNotifications?:boolean;allowRemotePreview?:boolean}){
  const previewMode=document.documentElement.dataset.tileMode==='preview'||document.documentElement.dataset.tileMode==='screenshot';
  const [menuOpen,setMenuOpen]=useState(false);
  const menuRef=useRef<HTMLDivElement>(null);
  const toggleRef=useRef<HTMLButtonElement>(null);

  useEffect(()=>{
    if(!menuOpen)return;
    const onPointerDown=(event:PointerEvent)=>{ if(!menuRef.current?.contains(event.target as Node))setMenuOpen(false); };
    const onKeyDown=(event:KeyboardEvent)=>{ if(event.key==='Escape')setMenuOpen(false); };
    document.addEventListener('pointerdown',onPointerDown);
    document.addEventListener('keydown',onKeyDown);
    return ()=>{ document.removeEventListener('pointerdown',onPointerDown); document.removeEventListener('keydown',onKeyDown); };
  },[menuOpen]);

  // Every menu item acts on the tile, never on the card underneath it.
  const run=(action:()=>void)=>(event:React.MouseEvent)=>{ event.stopPropagation(); setMenuOpen(false); action(); };

  return <article draggable onDragStart={event=>{event.dataTransfer.setData('nexus-site',site.id||site.domain);onDragStart()}} onDragEnd={onDragEnd} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.stopPropagation();onDrop()}} className={'site-card glass '+(selected?'is-selected ':'')+(menuOpen?'menu-open':'')} role="button" tabIndex={0} aria-label={`Сайт ${site.title}`} onClick={()=>{if(selectionMode){onToggleSelect();return}onSelect();onOpen()}} onDoubleClick={()=>{if(!selectionMode)onOpen()}} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();if(selectionMode)onToggleSelect();else onOpen()}}}>
    {previewMode&&<div className="tile-preview">{(site.screenshotUrl||allowRemotePreview)&&<img src={site.screenshotUrl||('https://image.thum.io/get/width/900/crop/420/https://'+site.domain)} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display='none'}}/>}<span>{site.screenshotUrl||allowRemotePreview?'PREVIEW':'Локальный preview отключён'}</span></div>}
    {selectionMode&&<button className={'card-select '+(selectedMany?'active':'')} onClick={e=>{e.stopPropagation();onToggleSelect()}} aria-label="Выбрать сайт">{selectedMany?<Check size={13}/>:null}</button>}
    <div className="card-top">
      <div className="site-icon" style={{background:site.color}} aria-hidden="true"><span>{site.icon}</span></div>
      <div className="card-top-right">
        {site.favorite&&<span className="card-fav" title="В избранном"><Star size={15} fill="currentColor"/></span>}
        <div className="card-menu" ref={menuRef} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape'&&menuOpen){setMenuOpen(false);toggleRef.current?.focus()}}}>
          <button type="button" ref={toggleRef} className="card-menu-toggle" aria-haspopup="menu" aria-expanded={menuOpen} aria-label={`Действия: ${site.title}`} title="Действия" onClick={e=>{e.stopPropagation();setMenuOpen(open=>!open)}}><MoreVertical size={16}/></button>
          {menuOpen&&<div className="card-menu-list glass" role="menu" aria-label={`Действия: ${site.title}`}>
            <button type="button" role="menuitem" onClick={run(onOpen)}><ExternalLink size={15}/>Открыть</button>
            <button type="button" role="menuitem" onClick={run(onFav)}><Star size={15} fill={site.favorite?'currentColor':'none'}/><span className="menu-label-wide">{site.favorite?'Убрать из избранного':'Добавить в избранное'}</span><span className="menu-label-narrow">{site.favorite?'Убрать из избранного':'В избранное'}</span></button>
            <button type="button" role="menuitem" onClick={run(onEdit)}><Pencil size={15}/>Редактировать</button>
            <button type="button" role="menuitem" className="card-menu-danger" onClick={run(()=>{if(confirm('Удалить сайт?'))onDelete()})}><Trash2 size={15}/>Удалить</button>
          </div>}
        </div>
      </div>
    </div>
    <div className="site-copy"><h3>{site.title}</h3>{showDescription&&<p>{site.desc}</p>}{showDomain&&<span>{site.domain}</span>}{site.note&&<small className="note-preview">{site.note}</small>}</div>
    {showNotifications&&site.badge&&<em className="badge">{site.badge}</em>}
  </article>;
}
