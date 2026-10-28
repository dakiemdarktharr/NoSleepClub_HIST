import { describe, expect, it } from 'vitest';
import { TransitPlanner, walkingKey } from '../src/maps/transit';
import { verifyJourney } from '../src/maps/verifyJourney';
import { serviceTiming, isCommuterLine } from '../src/maps/service';
import { distance } from '../src/maps/geo';
import type { Place, RoadRoute, TransitLine, TransitNetwork, TransitStop } from '../src/maps/types';

const point = (id: string, lon: number, lat = 10.8): TransitStop => ({ id, name: id, lon, lat, kind: 'bus', address: 'Address ' + id });
const a = point('A', 106.6), b = point('B', 106.63), c = point('C', 106.66), d = point('D', 106.69);
const line = (code: string, stops: TransitStop[], minutes = 10, headway = 10, kind: 'bus' | 'metro' = 'bus'): TransitLine => ({ id: code, code, name: code, headsign: stops.at(-1)!.name, kind, stops: stops.map(s => s.id), shape: stops.map(s => [s.lat, s.lon]), runningMinutes: minutes, headwayMinutes: [headway, headway] });
const network = (stops: TransitStop[], lines: TransitLine[]): TransitNetwork => ({ stops, lines, updatedAt: '2026-10-29T00:00:00Z', sources: [] });
const road = (from: Place, to: Place, seconds?: number, meters = distance(from, to)): RoadRoute => ({ meters, seconds: seconds ?? meters / 1.35, coordinates: [[from.lat, from.lon], [to.lat, to.lon]], instructions: [{ text: 'Walk to ' + to.name, meters, type: 1 }], provider: 'test fixture' });

describe('estimated transit time, not distance preference', () => {
  it('chooses a faster transfer over a slower direct service', () => {
    const planner = new TransitPlanner(network([a,b,c], [line('slow', [a,c], 60), line('01',[a,b],5),line('02',[b,c],5)]));
    const result = planner.find(a,c)!;
    expect(result.legs.filter(l=>l.line).map(l=>l.line!.code)).toEqual(['01','02']);
    expect(result.seconds).toBeCloseTo(1260, 4);
  });
  it('includes expected waiting, so an infrequent express can lose to a regular service', () => {
    const result = new TransitPlanner(network([a,c], [line('express',[a,c],5,60),line('regular',[a,c],15,4)])).find(a,c)!;
    expect(result.legs.find(l=>l.line)?.line?.code).toBe('regular');
    expect(result.seconds).toBeCloseTo(1050,4);
  });
  it('uses street shape distance before search, including a large detour', () => {
    const detour = line('detour',[a,c]); delete detour.runningMinutes;
    detour.shape = [[a.lat,a.lon],[11.1,106.62],[c.lat,c.lon]];
    const direct = line('direct',[a,c]); delete direct.runningMinutes;
    expect(new TransitPlanner(network([a,c],[detour,direct])).find(a,c)!.legs.find(l=>l.line)?.line?.code).toBe('direct');
  });
  it('keeps direction, boarding/alighting stations and one boarding for a multi-stop metro ride', () => {
    const result = new TransitPlanner(network([a,b,c], [line('1',[a,b,c],20,8,'metro')])).find(a,c)!;
    const ride = result.legs.find(l=>l.line)!;
    expect([ride.kind,ride.line!.code,ride.from.name,ride.to.name,ride.stopCount,result.boardings]).toEqual(['metro','1','A','C',2,1]);
    expect(ride.seconds).toBeCloseTo(1200,4); expect(result.seconds).toBeCloseTo(1620,4);
    expect(new TransitPlanner(network([a,b,c],[line('1',[a,b,c],20,8,'metro')])).find(c,a)).toBeNull();
  });
  it('does not restrict access to the nearest twelve stops', () => {
    const near = Array.from({length:13},(_,i)=>point('near'+i,106.6+(i+1)*.0002));
    const express = point('express',106.607);
    const result = new TransitPlanner(network([a,...near,express,c], [line('fast',[express,c],5)])).find(a,c)!;
    expect(result.legs.find(l=>l.line)?.from.id).toBe('express');
  });
  it('refuses a journey requiring more than two transfers', () => {
    const e=point('E',106.72), stops=[a,b,c,d,e];
    expect(new TransitPlanner(network(stops,stops.slice(0,-1).map((s,i)=>line('L'+i,[s,stops[i+1]])))).find(a,e)).toBeNull();
  });
  it('retains ordered geometry through a loop with a repeated stop', () => {
    const loop=line('loop',[a,b,a,c],40,10);
    const result=new TransitPlanner(network([a,b,c],[loop])).find(b,c)!;
    const ride=result.legs.find(l=>l.line)!;
    expect([ride.boardIndex,ride.alightIndex,ride.stopCount]).toEqual([1,3,2]);
    expect(ride.coordinates).toContainEqual([a.lat,a.lon]);
    expect(ride.meters).toBeGreaterThan(distance(b,c)*2);
  });
  it('matches an independent exhaustive oracle on 100 small directed networks', () => {
    let seed=17; const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/2**32;};
    for(let sample=0;sample<100;sample++){
      const stops=[a,b,c,d], lines:TransitLine[]=[];
      for(let i=0;i<4;i++)for(let j=0;j<4;j++)if(i!==j&&random()<.65)lines.push(line(`${i}-${j}`,[stops[i],stops[j]],1+Math.floor(random()*50),2+Math.floor(random()*40)));
      let minimum=Infinity;
      const visit=(id:string,seconds:number,boards:number)=>{if(id===d.id&&boards)minimum=Math.min(minimum,seconds);if(boards===3)return;for(const l of lines.filter(l=>l.stops[0]===id))visit(l.stops[1],seconds+l.runningMinutes!*60+l.headwayMinutes![0]*30+30,boards+1);};
      visit(a.id,0,0); const result=new TransitPlanner(network(stops,lines)).find(a,d);
      if(minimum===Infinity)expect(result).toBeNull();else expect(result?.seconds).toBeCloseTo(minimum,4);
    }
  });
});

describe('verified walking costs and re-ranking', () => {
  const s1=point('S1',106.6005),s2=point('S2',106.602);
  const data=network([s1,s2,c],[line('01',[s1,c],10),line('02',[s2,c],10)]);
  it('searches again after a walking detour, instead of accepting the first feasible result', async () => {
    const planner=new TransitPlanner(data);let calls=0;
    const result=await verifyJourney(async options=>{calls++;return planner.find(a,c,options);},async(from,to)=>road(from,to,to.id===s1.id?1000:200),a,c);
    expect(result.legs.find(l=>l.line)?.line?.code).toBe('02');expect(calls).toBeGreaterThan(1);expect(result.optimality).toBe('model');
    expect(result.legs.find(l=>l.kind==='walk')?.instructions?.[0].text).toContain('S2');
  });
  it('blocks an inaccessible transfer and tries a different service', async () => {
    const planner=new TransitPlanner(data);
    const result=await verifyJourney(async options=>planner.find(a,c,options),async(from,to)=>road(from,to,undefined,to.id===s1.id?1500:distance(from,to)),a,c);
    expect(result.legs.find(l=>l.line)?.line?.code).toBe('02');
  });
  it('labels a bounded search as best checked instead of claiming optimality', async () => {
    const planner=new TransitPlanner(data);
    const result=await verifyJourney(async options=>planner.find(a,c,options),async(from,to)=>road(from,to,1000),a,c,undefined,1);
    expect(result.optimality).toBe('checked');expect(result.legs.find(l=>l.line)?.line?.code).toBe('01');
  });
  it('keeps walking-resource alternatives which an ordinary single-label Dijkstra loses', () => {
    const x=point('X',106.6005), mid=point('MID',106.63), end=point('END',106.66), destination=point('dest',106.6605);
    const planner=new TransitPlanner(network([a,x,mid,end],[line('walkHeavy',[x,mid],1),line('lessWalk',[a,mid],15),line('final',[mid,end],5)]));
    const result=planner.find(a,destination,{walking:{[walkingKey(a,x)]:{meters:1300,seconds:10},[walkingKey(end,destination)]:{meters:1300,seconds:1000}}})!;
    expect(result.legs.find(l=>l.line)?.line?.code).toBe('lessWalk');
  });
  it('cannot bypass the final total walking budget using verified road detours', async () => {
    const origin=point('origin',106.5995), destination=point('dest',106.6605), planner=new TransitPlanner(network([a,c],[line('01',[a,c])]));
    await expect(verifyJourney(async options=>planner.find(origin,destination,options),async(from,to)=>road(from,to,1000,1300),origin,destination)).rejects.toThrow('Chưa tìm thấy tuyến');
  });
});

describe('published service summary ingestion', () => {
  it('uses only current matching directions and records ranges without inventing departures', () => {
    const rows=[{RouteVarId:1,IsCurrent:true,Headway:'8 - 20',RunningTime:'40 - 50',OperationTime:'05:00 - 22:00'}, {RouteVarId:1,IsCurrent:false,Headway:'1'}, {RouteVarId:2,IsCurrent:true,Headway:'2'}];
    expect(serviceTiming(rows,{RouteVarId:1,RunningTime:40},1)).toMatchObject({runningMinutes:40,headwayMinutes:[8,20],serviceHours:'05:00 - 22:00'});
    expect(serviceTiming([],{RouteVarId:1},1)).not.toHaveProperty('headwayMinutes');
  });
  it('excludes school-only, sightseeing and waterbus codes from regular bus/metro routing', () => {
    for(const code of ['HS-01','DL01','SWB1'])expect(isCommuterLine(code)).toBe(false);
    for(const code of ['01','D4','MRT1','163D'])expect(isCommuterLine(code)).toBe(true);
  });
});
