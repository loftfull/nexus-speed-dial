export function normalizeSiteUrl(input:string):{url:string;domain:string}|null{
 const raw=input.trim();if(!raw)return null;if(/^(javascript|data|file|vbscript):/i.test(raw))return null;
 const candidate=/^[a-z][a-z0-9+.-]*:/i.test(raw)?raw:`https://${raw}`;
 try{const parsed=new URL(candidate);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname)return null;return{url:parsed.toString(),domain:parsed.hostname.replace(/^www\./,'')}}catch{return null}
}
