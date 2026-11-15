(() => {
  'use strict';
  // Ball physics: fixed floor line, preset bounce heights, side walls only.
  const G=1800;            // gravity, px/s²
  const FLOOR_GAP=96;      // preset floor: distance from viewport bottom to floor line, px
  const HOP=90;            // first bounce height after landing, px
  const HOP_DECAY=.5;      // each bounce reaches this fraction of the previous height
  const MIN_HOP=4;         // below this the ball stops bouncing and rolls
  const WALL=.73;          // left/right wall restitution
  function floorY(height,r){return Math.max(r,height-r-Math.min(FLOOR_GAP,height*.25));}
  function launch(body,hop=HOP){body.hop=hop;body.vy=0;body.sleeping=false;return body;}
  function advance(body,seconds,width,height){
    const r=body.r||11,minX=Math.min(r,width/2),maxX=Math.max(minX,width-r),floor=floorY(height,r);
    body.x=Math.max(minX,Math.min(maxX,body.x));body.y=Math.max(r,Math.min(floor,body.y));
    if(body.sleeping){body.y=floor;body.vx=0;body.vy=0;return body;}
    const duration=Math.max(0,Math.min(seconds,.1)),steps=Math.max(1,Math.ceil(duration/(1/240))),dt=duration/steps;
    for(let i=0;i<steps;i++){
      body.vx*=Math.exp(-.16*dt);body.x+=body.vx*dt;
      if(body.x<minX){body.x=minX+(minX-body.x);body.vx=Math.abs(body.vx)*WALL;}
      if(body.x>maxX){body.x=maxX-(body.x-maxX);body.vx=-Math.abs(body.vx)*WALL;}
      const grounded=body.y>=floor&&body.vy===0&&!((body.hop??0)>=MIN_HOP);
      if(!grounded){
        body.vy+=G*dt;body.y+=body.vy*dt;
        if(body.y>=floor){
          body.y=floor;body.vx*=.92;
          const hop=body.hop??HOP;
          if(hop>=MIN_HOP){body.vy=-Math.sqrt(2*G*hop);body.hop=hop*HOP_DECAY;}else body.vy=0;
        }
      }else{
        body.vx*=Math.exp(-2.5*dt);
        if(Math.abs(body.vx)<7){body.vx=0;body.sleeping=true;break;}
      }
      body.x=Math.max(minX,Math.min(maxX,body.x));body.y=Math.max(r,Math.min(floor,body.y));
    }
    return body;
  }
  function releaseVelocity(samples,now){
    const recent=samples.filter(s=>now-s.t<=130);if(recent.length<2)return {vx:0,vy:0};
    const a=recent[0],b=recent[recent.length-1],dt=(b.t-a.t)/1000;if(dt<.008)return {vx:0,vy:0};
    return {vx:Math.max(-1500,Math.min(1500,(b.x-a.x)/dt)),vy:Math.max(-1500,Math.min(1500,(b.y-a.y)/dt))};
  }
  globalThis.YuanYuanPhysics={advance,launch,floorY,releaseVelocity,HOP,FLOOR_GAP};
})();
