import assert from "node:assert";
import {
  sizeKeyOf, sizeLabel, isShipsNow, deriveFacets,
  filterItems, sortItems, applyFilterSort, hasActiveFilters,
} from "./lib/instock.ts";

const sku = (o:any) => ({ slug:"s", name:"Stick", description:"", category:"FULL_STICK", priceCents:9900, inStock:true, ...o });
const items = [
  sku({ slug:"sr-85-p92", name:"Senior 85 P92", sizingTier:"SENIOR", priceCents:9900, stockCount:4, fixed:{flex:85,curve:"P92",hand:"Right",color:"Black"} }),
  sku({ slug:"sr-75-p28", name:"Senior 75 P28", sizingTier:"SENIOR", priceCents:8900, stockCount:0, fixed:{flex:75,curve:"P28",hand:"Left",color:"Red"} }),
  sku({ slug:"jr-50-p92", name:"Junior 50 P92", sizingTier:"JR", priceCents:6900, stockCount:2, fixed:{flex:50,curve:"P92",hand:"Right",color:"Black"} }),
  sku({ slug:"goalie-1", name:"Goalie Foam Core", category:"GOALIE", priceCents:7900, stockCount:1, fixed:{hand:"Right",color:"Green"} }),
];
const S = (a:any[]) => a.map(i=>i.slug);
let n=0; const ok=(d:string,c:boolean)=>{assert(c,"FAIL: "+d); n++;};

ok("sizeKeyOf tier", sizeKeyOf(items[0])==="SENIOR");
ok("sizeKeyOf goalie", sizeKeyOf(items[3])==="GOALIE");
ok("sizeKeyOf none", sizeKeyOf(sku({sizingTier:undefined}))===undefined);
ok("sizeLabel", sizeLabel("SENIOR")==="Senior" && sizeLabel("X")==="X");
ok("isShipsNow", isShipsNow(items[0]) && !isShipsNow(items[1]) && !isShipsNow(sku({stockCount:undefined})));

const f = deriveFacets(items);
ok("facet sizes", JSON.stringify(f.sizes)===JSON.stringify(["GOALIE","JR","SENIOR"]));
ok("facet flexes", JSON.stringify(f.flexes)===JSON.stringify([50,75,85]));
ok("facet curves", JSON.stringify(f.curves)===JSON.stringify(["P28","P92"]));
ok("facet hands", JSON.stringify(f.hands)===JSON.stringify(["Left","Right"]));
ok("facet colors", JSON.stringify(f.colors)===JSON.stringify(["Black","Green","Red"]));
ok("facet price bounds", f.priceMin===6900 && f.priceMax===9900);
const e = deriveFacets([]);
ok("facet empty", e.sizes.length===0 && e.priceMin===0 && e.priceMax===0);

ok("filter size", JSON.stringify(S(filterItems(items,{size:"SENIOR"})))===JSON.stringify(["sr-85-p92","sr-75-p28"]));
ok("filter flex", JSON.stringify(S(filterItems(items,{flex:"50"})))===JSON.stringify(["jr-50-p92"]));
ok("filter curve", JSON.stringify(S(filterItems(items,{curve:"P92"})))===JSON.stringify(["sr-85-p92","jr-50-p92"]));
ok("filter hand", JSON.stringify(S(filterItems(items,{hand:"Left"})))===JSON.stringify(["sr-75-p28"]));
ok("filter color", JSON.stringify(S(filterItems(items,{color:"Green"})))===JSON.stringify(["goalie-1"]));
ok("filter shipsNowOnly", JSON.stringify(S(filterItems(items,{shipsNowOnly:true})))===JSON.stringify(["sr-85-p92","jr-50-p92","goalie-1"]));
ok("filter AND", JSON.stringify(S(filterItems(items,{size:"SENIOR",curve:"P92"})))===JSON.stringify(["sr-85-p92"]));

ok("sort price-asc", JSON.stringify(S(sortItems(items,"price-asc")))===JSON.stringify(["jr-50-p92","goalie-1","sr-75-p28","sr-85-p92"]));
ok("sort price-desc first", S(sortItems(items,"price-desc"))[0]==="sr-85-p92");
ok("sort flex-asc missing-last", JSON.stringify(S(sortItems(items,"flex-asc")))===JSON.stringify(["jr-50-p92","sr-75-p28","sr-85-p92","goalie-1"]));
ok("sort flex-desc missing-last", JSON.stringify(S(sortItems(items,"flex-desc")))===JSON.stringify(["sr-85-p92","sr-75-p28","jr-50-p92","goalie-1"]));
ok("sort name", JSON.stringify(S(sortItems(items,"name")))===JSON.stringify(["goalie-1","jr-50-p92","sr-75-p28","sr-85-p92"]));
const shipsOrder = S(sortItems(items,"ships"));
ok("sort ships out-last", shipsOrder[shipsOrder.length-1]==="sr-75-p28");
ok("sort ships cheapest-among-instock", JSON.stringify(shipsOrder.slice(0,3))===JSON.stringify(["jr-50-p92","goalie-1","sr-85-p92"]));
const before = S(items); sortItems(items,"price-desc"); ok("no mutation", JSON.stringify(S(items))===JSON.stringify(before));

ok("applyFilterSort", JSON.stringify(S(applyFilterSort(items,{size:"SENIOR"},"price-asc")))===JSON.stringify(["sr-75-p28","sr-85-p92"]));
ok("hasActiveFilters", !hasActiveFilters({}) && hasActiveFilters({size:"SENIOR"}) && hasActiveFilters({shipsNowOnly:true}));

console.log(`ALL ${n} ASSERTIONS PASSED`);
