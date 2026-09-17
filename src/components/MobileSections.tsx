import { ChevronRight, X } from 'lucide-react';
import type { ComponentType } from 'react';

type SectionIcon = ComponentType<{ size?: number }>;

export function MobileSections({active,setActive,onClose,onSelect,items}:{active:string;setActive:(s:string)=>void;onClose:()=>void;onSelect?:(s:string)=>void;items:readonly (readonly [string, SectionIcon])[]}){
 const select=(label:string)=>{
  if(onSelect) onSelect(label);
  else if(label==='Настройки') window.dispatchEvent(new KeyboardEvent('keydown',{key:',',ctrlKey:true,bubbles:true}));
  else setActive(label);
  onClose();
 };
 return <div className="overlay mobile-sheet"><section className="mobile-sections-card glass"><header><b>Разделы и проекты</b><button aria-label="Закрыть разделы" onClick={onClose}><X/></button></header>{items.map(([label,Icon])=><button className={active===label?'active':''} key={label} onClick={()=>select(label)}><Icon size={18}/>{label}<ChevronRight size={15}/></button>)}</section></div>
}
