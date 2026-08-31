import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalStorageAdapter } from './localStorageAdapter.ts';

test('invalid JSON returns fallback instead of throwing', () => { const storage={getItem:()=>'{bad json',setItem:()=>{},removeItem:()=>{}}; const adapter=createLocalStorageAdapter(storage); assert.deepEqual(adapter.get('x',{safe:true}),{safe:true}); });
test('set and remove delegate to browser storage', () => { const values=new Map<string,string>(); const storage={getItem:(k:string)=>values.get(k)??null,setItem:(k:string,v:string)=>values.set(k,v),removeItem:(k:string)=>values.delete(k)}; const adapter=createLocalStorageAdapter(storage); adapter.set('nexus',{enabled:true}); assert.deepEqual(adapter.get('nexus',null),{enabled:true}); adapter.remove('nexus'); assert.equal(adapter.get('nexus','fallback'),'fallback'); });
