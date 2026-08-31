import { useMemo, useState } from 'react';
import type { Site } from '../../domain/types.ts';
import styles from './SiteTile.module.css';
const palette=['#2f7cf6','#11a683','#e14b45','#6f5ee7','#ef9d27','#202124'];
function colorFor(text:string){let sum=0;for(const ch of text)sum=(sum+ch.charCodeAt(0))%997;return palette[sum%palette.length]}
export function SiteIcon({site}:{site:Site}){const[broken,setBroken]=useState(false);const letter=useMemo(()=>site.title.trim().slice(0,2).toUpperCase(),[site.title]);if(site.iconUrl&&!broken)return <img className={styles.iconImage} src={site.iconUrl} alt="" onError={()=>setBroken(true)}/>;return <span className={styles.iconFallback} data-testid="site-icon-fallback" style={{background:colorFor(site.domain)}}>{letter}</span>}
