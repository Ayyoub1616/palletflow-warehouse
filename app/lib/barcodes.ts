import type { BarcodeRule, Location, Pallet } from './types';

export const defaultBarcodeRule:BarcodeRule={articleLength:12,unitsFromEnd:3,unitsLength:2};
const ruleKey='palletflow-barcode-rule';
export function readBarcodeRule():BarcodeRule{
  if(typeof localStorage==='undefined')return defaultBarcodeRule;
  try{const value=JSON.parse(localStorage.getItem(ruleKey)||'{}') as Partial<BarcodeRule>;return {articleLength:Number(value.articleLength)||12,unitsFromEnd:Number(value.unitsFromEnd)||3,unitsLength:Number(value.unitsLength)||2}}catch{return defaultBarcodeRule}
}
export function saveBarcodeRule(rule:BarcodeRule){localStorage.setItem(ruleKey,JSON.stringify(rule));window.dispatchEvent(new Event('palletflow-rule-change'))}

export function parseBoxBarcode(raw:string,rule:BarcodeRule=defaultBarcodeRule){
  const code=raw.trim().toUpperCase();
  const start=code.length-rule.unitsFromEnd;
  const unitsText=start>=0?code.slice(start,start+rule.unitsLength):'';
  const units=/^\d+$/.test(unitsText)?Number(unitsText):0;
  return {code,mocacota:code.slice(0,rule.articleLength),units,valid:code.length>=Math.max(rule.articleLength,rule.unitsFromEnd)&&units>0};
}

export type PickLine={pallet:Pallet;location?:Location;units:number};
export function planPallets(pallets:Pallet[],locations:Location[],query:string,needed:number):{lines:PickLine[];total:number;missing:number}{
  const needle=query.trim().toLowerCase();
  const candidates=pallets.filter(p=>p.status!=='extraido'&&p.units>0&&(!needle||[p.mocacota,p.article,p.color,p.size,p.tone].some(v=>v?.toLowerCase().includes(needle))));
  candidates.sort((a,b)=>b.units-a.units||a.number-b.number);
  const picked:Pallet[]=[];let total=0;
  for(const pallet of candidates){if(total>=needed)break;picked.push(pallet);total+=pallet.units;}
  return {lines:picked.map(pallet=>({pallet,location:locations.find(l=>l.id===pallet.locationId),units:pallet.units})),total,missing:Math.max(0,needed-total)};
}
