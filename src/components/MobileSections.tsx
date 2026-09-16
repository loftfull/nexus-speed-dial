import { ChevronRight, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export function MobileSections({active,setActive,onClose,items}:{active:string;setActive:(s:string)=>void;onClose:()=>void;items:readonly (readonly [string, LucideIcon])[]}){return <div className="overlay mobile-sheet"><section className="mobile-sections-card glass"><header><b>Разделы и проекты</b><button aria-label="Закрыть разделы" onClick={onClose}><X/></button></header>{items.map(([label,Icon])=><button className={active===label?'active':''} key={label} onClick={()=>{setActive(label);onClose()}}><Icon size={18}/>{label}<ChevronRight size={15}/></button>)}</section></div>}
