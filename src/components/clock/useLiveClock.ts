import { useEffect, useState } from 'react';
import { formatClock } from './clockModel.ts';
export function useLiveClock(){const [now,setNow]=useState(()=>new Date());useEffect(()=>{const id=window.setInterval(()=>setNow(new Date()),15000);return()=>window.clearInterval(id)},[]);return formatClock(now)}
