import test from "node:test";
import assert from "node:assert/strict";
import { isValidPolygon, pointInPolygon, findMatchingZone } from "./delivery-geometry.mjs";
const square = [[8.99,38.70],[9.10,38.70],[9.10,38.82],[8.99,38.82]];
test("validates a polygon with geographic coordinate pairs",()=>assert.equal(isValidPolygon(square),true));
test("rejects too few points and invalid coordinate ranges",()=>{assert.equal(isValidPolygon([[0,0],[1,1]]),false);assert.equal(isValidPolygon([[91,0],[1,1],[0,0]]),false);});
test("matches a point inside a delivery territory",()=>assert.equal(pointInPolygon(9.04,38.76,square),true));
test("rejects a point outside a delivery territory",()=>assert.equal(pointInPolygon(9.5,38.76,square),false));
test("finds only active matching zones",()=>{const zones=[{id:"off",is_active:false,polygon:square},{id:"on",is_active:true,polygon:square}];assert.equal(findMatchingZone(9.04,38.76,zones).id,"on");});
