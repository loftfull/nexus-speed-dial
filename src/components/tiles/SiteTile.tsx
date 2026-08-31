import { MoreVertical, Star } from 'lucide-react';
import { useState } from 'react';
import type { MouseEvent } from 'react';
import type { Site, TilePreset } from '../../domain/types.ts';
import { SiteIcon } from './SiteIcon.tsx';
import styles from './SiteTile.module.css';
export function SiteTile({site,mode,selected=false}:{site:Site;mode:TilePreset;selected?:boolean}){const[pressed,setPressed]=useState(false);const state=pressed?'pressed':selected?'selected':'normal';return <a className={`${styles.tile} ${styles[mode]} ${selected?styles.selected:''}`} data-testid="site-tile" data-tile-state={state} href={site.url} aria-label={site.title} onPointerDown={()=>setPressed(true)} onPointerUp={()=>setPressed(false)} onPointerCancel={()=>setPressed(false)}><button type="button" aria-label={`Меню ${site.title}`} className={styles.menu} onClick={(e:MouseEvent<HTMLButtonElement>)=>e.preventDefault()}><MoreVertical size={15}/></button>{site.favorite&&<Star className={styles.favorite} size={13} fill="currentColor"/>}<SiteIcon site={site}/><span className={styles.title}>{site.title}</span><span className={styles.subtitle}>{site.subtitle}</span><span className={styles.domain}>{site.domain}</span>{site.badge&&<em className={styles.badge}>{site.badge}</em>}</a>}
