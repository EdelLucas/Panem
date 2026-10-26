/* PanemCraft 3D voxel world — Three.js */
(async function () {
  "use strict";
  const host=document.getElementById("world3d"),canvas=document.getElementById("worldCanvas");
  const loading=document.getElementById("worldLoading"),errorBox=document.getElementById("worldError");
  const hudTitle=document.getElementById("worldHudTitle"),hudMeta=document.getElementById("worldHudMeta");
  if(!host||!canvas)return;
  try{
    const THREE=await import("three");
    const OrbitControls=(await import("three/addons/controls/OrbitControls.js")).OrbitControls;
    const STORAGE_KEY="panemcraft.project.v2",BLOCK=8;
    const regions=[
      {id:"capitol",name:"Das Kapitol",x:0,z:0,color:"#d9bd83"},
      {id:"d1",name:"Distrikt 1",x:360,z:-260,color:"#e4d1a0"},{id:"d2",name:"Distrikt 2",x:190,z:-160,color:"#a4a99b"},
      {id:"d3",name:"Distrikt 3",x:100,z:20,color:"#8fabb0"},{id:"d4",name:"Distrikt 4",x:510,z:120,color:"#76b8bf"},
      {id:"d5",name:"Distrikt 5",x:410,z:-70,color:"#d6ba76"},{id:"d6",name:"Distrikt 6",x:40,z:190,color:"#a9b5b8"},
      {id:"d7",name:"Distrikt 7",x:-190,z:230,color:"#8fa77b"},{id:"d8",name:"Distrikt 8",x:-250,z:40,color:"#c38c87"},
      {id:"d9",name:"Distrikt 9",x:-80,z:-250,color:"#d1b45e"},{id:"d10",name:"Distrikt 10",x:180,z:320,color:"#c6a17b"},
      {id:"d11",name:"Distrikt 11",x:0,z:370,color:"#8ba66f"},{id:"d12",name:"Distrikt 12",x:-360,z:-120,color:"#ad886e"},
      {id:"d13",name:"Distrikt 13",x:-100,z:-380,color:"#8d9ca0"}
    ];
    const arenas=[{id:"arena74",name:"Arena der 74. Hungerspiele",x:95,z:105},{id:"arena75",name:"Arena der 75. Hungerspiele",x:145,z:165}];
    const fallRoutes=regions.filter(r=>r.id!=="capitol").map(r=>({from:"capitol",to:r.id,type:"Bahn",status:"planned",elements:["Bahnhof","Gleise"]}));
    function readProject(){try{const p=JSON.parse(localStorage.getItem(STORAGE_KEY)||"null");return p&&p.version===2?p:null;}catch(e){return null;}}
    let project=readProject();
    function coord(id){const r=regions.find(v=>v.id===id),saved=project&&project.coordinates&&project.coordinates[id];return saved?{x:Number(saved.x)||0,z:Number(saved.z)||0}:{x:r?r.x:0,z:r?r.z:0};}
    function dist(a,b){return Math.hypot(a.x-b.x,a.z-b.z);}
    function hash(x,z,k){const v=Math.sin(x*127.1+z*311.7+(k||0)*74.7)*43758.5453;return v-Math.floor(v);}
    function land(x,z){const a=Math.atan2(z,x),bound=1+.055*Math.sin(a*3+.4)+.032*Math.cos(a*7-.3);return Math.hypot(x/535,z/445)<bound;}
    function level(x,z){
      const hills=1.45+1.25*Math.sin(x*.022)*Math.cos(z*.026)+.9*Math.sin((x+z)*.018)+.55*Math.cos((x-z)*.037);
      const h2=6.2*Math.exp(-((x-175)**2+(z+165)**2)/12000),h13=5.2*Math.exp(-((x+110)**2+(z+360)**2)/17000);
      const h7=2*Math.exp(-((x+195)**2+(z-220)**2)/20000),farm=Math.hypot(x+80,z+250)<74||Math.hypot(x,z-370)<82;
      return Math.max(0,Math.min(9,farm?1:Math.round(hills+h2+h13+h7)));
    }
    function topY(x,z){return level(x,z)*BLOCK+BLOCK/2;}
    const scene=new THREE.Scene();scene.background=new THREE.Color("#a7c2c6");scene.fog=new THREE.Fog("#a7c2c6",1050,2350);
    const camera=new THREE.PerspectiveCamera(42,1,1,4200);camera.position.set(860,850,940);
    const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.8));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
    scene.add(new THREE.HemisphereLight("#eaf7ff","#7a765c",2.05));
    const sun=new THREE.DirectionalLight("#fff0d1",2.8);sun.position.set(-420,900,470);scene.add(sun);
    const fill=new THREE.DirectionalLight("#b9dced",.8);fill.position.set(700,360,-500);scene.add(fill);
    const ocean=new THREE.Mesh(new THREE.PlaneGeometry(3000,3000),new THREE.MeshStandardMaterial({color:"#477f94",roughness:.82}));
    ocean.rotation.x=-Math.PI/2;ocean.position.y=-2.5;scene.add(ocean);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.075;controls.minDistance=95;controls.maxDistance=1900;controls.maxPolarAngle=Math.PI*.485;controls.target.set(0,28,0);controls.update();
    const world=new THREE.Group(),terrainGroup=new THREE.Group(),districtGroup=new THREE.Group(),routeGroup=new THREE.Group(),arenaGroup=new THREE.Group(),labelGroup=new THREE.Group();
    world.add(terrainGroup,districtGroup,routeGroup,arenaGroup,labelGroup);scene.add(world);
    const pickables=[],labelObjects=[],materials={};let labelsOn=false,selectedId="capitol";
    const blockGeo=new THREE.BoxGeometry(BLOCK*.98,BLOCK,BLOCK*.98);
    function mat(name){if(!materials[name]){const color=typeof name==="string"&&name.charAt(0)==="#"?name:"#ffffff";materials[name]=new THREE.MeshStandardMaterial({color,roughness:.92,metalness:.02});}return materials[name];}
    function push(list,name,x,y,z,color,sx,sy,sz){(list[name]||(list[name]=[])).push({x,y,z,color,sx:sx||1,sy:sy||1,sz:sz||1});}
    function instances(group,list,geo){
      const dummy=new THREE.Object3D();
      Object.keys(list).forEach(name=>{const items=list[name];if(!items.length)return;const mesh=new THREE.InstancedMesh(geo||blockGeo,mat(name),items.length);
        items.forEach((v,i)=>{dummy.position.set(v.x,v.y,v.z);dummy.scale.set(v.sx,v.sy,v.sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(v.color));});
        mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;group.add(mesh);
      });
    }
    function voxelColor(type,x,z,layer){
      const n=.88+hash(Math.round(x/BLOCK),Math.round(z/BLOCK),layer)*.22;
      const base=type==="grass"?(layer>6?"#7b9180":"#80a866"):type==="dirt"?"#87694b":type==="stone"?"#888f8c":type==="sand"?"#d0bf85":type==="snow"?"#e5ece6":"#6b9b9b";
      return new THREE.Color(base).multiplyScalar(n).getStyle();
    }
    function buildTerrain(){
      const list={grass:[],dirt:[],stone:[],sand:[],snow:[]};
      for(let x=-560;x<=560;x+=BLOCK)for(let z=-480;z<=480;z+=BLOCK){
        if(!land(x,z))continue;const h=level(x,z),rad=Math.hypot(x/535,z/445);
        for(let j=0;j<=h;j++){const type=j===h?(rad>.92?"sand":h>=8?"snow":h>=7?"stone":"grass"):(j<h-2?"stone":"dirt");push(list,type,x,j*BLOCK,z,voxelColor(type,x,z,j));}
      }
      instances(terrainGroup,list,blockGeo);
      const pts=[];for(let i=0;i<=90;i++){const t=i/90,x=35+105*Math.sin(t*4.7)+25*Math.sin(t*13.2),z=-405+t*810;if(land(x,z))pts.push(new THREE.Vector3(x,topY(x,z)+1.1,z));}
      if(pts.length>2){const river=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts),150,2.7,5,false),new THREE.MeshStandardMaterial({color:"#5296a6",roughness:.28}));terrainGroup.add(river);}
    }
    function addMesh(group,geo,material,x,y,z,regionId,buildingId,clickable){
      const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;
      if(regionId)mesh.userData.regionId=regionId;if(buildingId)mesh.userData.buildingId=buildingId;
      if(clickable)pickables.push(mesh);group.add(mesh);return mesh;
    }
    function block(group,x,y,z,sx,sy,sz,color,regionId,buildingId,clickable){
      return addMesh(group,new THREE.BoxGeometry(sx,sy,sz),mat(color),x,y,z,regionId,buildingId,clickable);
    }
    function tree(group,x,z,scale){
      const y=topY(x,z),tr=block(group,x,y+5.5*scale,z,3.4*scale,11*scale,3.4*scale,"#745138",null,null,false);
      const foliage=block(group,x,y+13.5*scale,z,13*scale,10*scale,13*scale,hash(x,z,1)>.5?"#426b42":"#527d48",null,null,false);
      block(group,x+2*scale,y+19*scale,z-scale,8*scale,8*scale,8*scale,"#6b914e",null,null,false);
    }
    function buildForest(){
      const trunks=[],leaves=[],tops=[];
      for(let i=0;i<1250;i++){
        const x=-490+hash(i,8,3)*980,z=-410+hash(i,33,9)*820;
        const woodland=(x<-75&&z>60)||(x<-170&&z<110)||(x<-250&&z<-60)||(x>260&&z>35);
        if(!woodland||!land(x,z)||regions.some(r=>dist({x,z},coord(r.id))<56)||Math.hypot(x-95,z-105)<55||Math.hypot(x-145,z-165)<55)continue;
        const y=topY(x,z),s=.72+hash(i,14,1)*.56;
        push(trunks,"treeTrunk",x,y+5.2*s,z,"#79533a",s,s,s);push(leaves,"treeLeaves",x,y+13*s,z,hash(i,21,5)>.48?"#477347":"#5d8648",s,s,s);push(tops,"treeLeaves2",x+1.5*s,y+18.7*s,z-1*s,"#6b914e",s,s,s);
      }
      instances(districtGroup,trunks,new THREE.BoxGeometry(3.1,11,3.1));instances(districtGroup,leaves,new THREE.BoxGeometry(12,10,12));instances(districtGroup,tops,new THREE.BoxGeometry(8,8,8));
    }
    function label(text,x,y,z,color,regionId,arenaId){
      const c=document.createElement("canvas");c.width=512;c.height=128;const ctx=c.getContext("2d");
      ctx.fillStyle="rgba(17,22,20,.88)";ctx.strokeStyle=color||"#d9bd83";ctx.lineWidth=5;ctx.beginPath();ctx.roundRect(5,5,502,118,13);ctx.fill();ctx.stroke();
      ctx.font="bold 36px Arial,sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillStyle="#f3eddb";ctx.fillText(text,256,64,470);
      const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:true}));
      sprite.position.set(x,y,z);sprite.scale.set(Math.max(24,Math.min(65,text.length*2.35)),Math.max(6,Math.min(15,text.length*.55)),1);
      sprite.userData.regionId=regionId||null;sprite.userData.arenaId=arenaId||null;labelGroup.add(sprite);labelObjects.push(sprite);pickables.push(sprite);
    }
    function buildDistricts(){
      const buildings=project&&Array.isArray(project.buildings)?project.buildings:[];
      const palette={capitol:["#d8d6c9","#c1b89b","#847a60"],d1:["#dfd5b6","#d4c08c","#8a784e"],d2:["#8d958e","#777f79","#656c67"],d3:["#88999d","#647d83","#454f52"],d4:["#86b3b1","#628f94","#4a6d72"],d5:["#c6b47c","#a18d55","#6d674b"],d6:["#8f9999","#6f7a7b","#515d5e"],d7:["#9c7956","#785a40","#4c4f3b"],d8:["#bd918b","#9e716c","#665653"],d9:["#cbb56a","#ac914b","#6d6746"],d10:["#c5a17b","#a37f58","#685d47"],d11:["#91a874","#71874e","#4e6040"],d12:["#987458","#78553f","#4d4338"],d13:["#7e898e","#5d6a70","#3c4449"]};
      regions.forEach(r=>{const c=coord(r.id),y=topY(c.x,c.z),col=r.color;
        block(districtGroup,c.x,y+4,c.z,11,8,11,r.id==="capitol"?"#81765f":"#646e5e",r.id,null,true);
        block(districtGroup,c.x,y+11,c.z,7,6,7,col,r.id,null,true);block(districtGroup,c.x,y+16,c.z,9,3,9,r.id==="capitol"?"#f2d695":"#b8c0aa",r.id,null,true);
        label(r.id==="capitol"?"KAPITOL":r.name.toUpperCase(),c.x,y+31,c.z,col,r.id,null);
      });
      const by={};buildings.filter(b=>!String(b.id).startsWith("arena")).forEach(b=>(by[b.region]||(by[b.region]=[])).push(b));
      Object.keys(by).forEach(regionId=>{const c=coord(regionId),arr=by[regionId],pal=palette[regionId]||palette.capitol;
        arr.forEach((b,i)=>{const off=[[-32,25],[33,24],[0,-36],[-35,-34],[35,-33]][i%5],x=c.x+off[0],z=c.z+off[1],y=topY(x,z);
          const w=Math.max(13,Math.min(48,(Number(b.width)||24)*.72)),d=Math.max(13,Math.min(46,(Number(b.depth)||22)*.72)),h=Math.max(8,Math.min(37,(Number(b.height)||10)*1.15));
          block(districtGroup,x,y+1.5,z,w+5,3,d+5,pal[2],regionId,b.id,false);
          block(districtGroup,x,y+3+h/2,z,w,h,d,pal[0],regionId,b.id,true);
          block(districtGroup,x,y+h+5,z,w+2,3,d+2,pal[1],regionId,b.id,true);
          for(let f=1;f<Math.min(5,Math.floor(h/6));f++)block(districtGroup,x,y+3+f*6,z,w+.8,.7,d+.8,pal[1],regionId,b.id,false);
          const n=Math.max(2,Math.min(5,Math.floor(w/7))),floors=Math.max(1,Math.min(4,Math.floor(h/7)-1));
          for(let f=0;f<floors;f++)for(let j=0;j<n;j++){
            const wx=x-w/2+(j+.6)*w/n,wy=y+5+f*Math.min(7,h/(floors+1));
            block(districtGroup,wx,wy,z+d/2+.22,2.4,3.1,.45,"#2b4549",null,null,false);
          }
          if(b.id==="capitol-palace")[-1,0,1].forEach(t=>{const tx=x+t*w*.31;block(districtGroup,tx,y+h+11,z,w*.17,12,d*.2,"#eee7d5",regionId,b.id,true);block(districtGroup,tx,y+h+18,z,w*.19,3,d*.23,"#e2bd6e",regionId,b.id,true);});
          else if(/werk|kraft|silo|mine|schacht|fabrik/i.test(b.name)){block(districtGroup,x+w*.27,y+h+7,z-d*.2,4,12,4,pal[2],regionId,b.id,false);block(districtGroup,x+w*.27,y+h+14,z-d*.2,5,2,5,pal[1],regionId,b.id,false);}
        });
      });
    }
    function buildRoutes(){
      const routes=project&&Array.isArray(project.routes)?project.routes:fallRoutes,sleepers=[];
      routes.forEach(r=>{const a=coord(r.from),b=coord(r.to),n=Math.max(20,Math.ceil(dist(a,b)/7)),dx=b.x-a.x,dz=b.z-a.z,mag=Math.max(1,Math.hypot(dx,dz)),px=-dz/mag,pz=dx/mag,p1=[],p2=[],mid=[];
        for(let i=0;i<=n;i++){const t=i/n,x=a.x+dx*t,z=a.z+dz*t,y=topY(x,z)+2.1;
          p1.push(new THREE.Vector3(x+px*2.2,y,z+pz*2.2));p2.push(new THREE.Vector3(x-px*2.2,y+.15,z-pz*2.2));mid.push(new THREE.Vector3(x,y+.3,z));
          if(r.type!=="Straße"&&i<n&&i%3===0)sleepers.push({x,y,z,rot:Math.atan2(dx,dz)});
        }
        if(r.type==="Straße"){routeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(mid),new THREE.LineBasicMaterial({color:"#b6a884",transparent:true,opacity:.72})));}
        else{routeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p1),new THREE.LineBasicMaterial({color:r.status==="done"?"#b3d6a3":"#a9b5b5",transparent:true,opacity:.9})));routeGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(p2),new THREE.LineBasicMaterial({color:"#555f60"})));}
      });
      if(sleepers.length){const inst=new THREE.InstancedMesh(new THREE.BoxGeometry(10,1.4,3.3),mat("sleepers"),sleepers.length),d=new THREE.Object3D();
        sleepers.forEach((s,i)=>{d.position.set(s.x,s.y,s.z);d.rotation.y=s.rot;d.updateMatrix();inst.setMatrixAt(i,d.matrix);inst.setColorAt(i,new THREE.Color(i%2?"#67594a":"#796653"));});inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;routeGroup.add(inst);}
      regions.forEach(r=>{const c=coord(r.id),y=topY(c.x,c.z)+1;block(routeGroup,c.x+13,y,c.z+13,20,2.5,12,"#767f7b",r.id,null,false);block(routeGroup,c.x+13,y+2.5,c.z+13,10,2.5,4,"#d5c59a",r.id,null,false);});
    }
    function buildArenas(){
      arenas.forEach((a,i)=>{const saved=project&&project.coordinates&&project.coordinates[a.id],c=saved?coord(a.id):{x:a.x,z:a.z},y=topY(c.x,c.z);
        block(arenaGroup,c.x,y+1.5,c.z,92,3,92,i===0?"#778b4e":"#4a817c","capitol",a.id,true);
        const wall=i===0?"#8c9279":"#b9ad84";
        for(let o=-40;o<=40;o+=8){block(arenaGroup,c.x+o,y+9,c.z-40,8,14,8,wall,"capitol",a.id,true);block(arenaGroup,c.x+o,y+9,c.z+40,8,14,8,wall,"capitol",a.id,true);block(arenaGroup,c.x-40,y+9,c.z+o,8,14,8,wall,"capitol",a.id,true);block(arenaGroup,c.x+40,y+9,c.z+o,8,14,8,wall,"capitol",a.id,true);}
        if(i===0){block(arenaGroup,c.x,y+7,c.z,23,8,20,"#b39c64","capitol",a.id,true);block(arenaGroup,c.x,y+13,c.z,13,5,12,"#e4cf80","capitol",a.id,true);
          for(let k=0;k<10;k++){const ang=k*Math.PI/5;tree(arenaGroup,c.x+Math.cos(ang)*55,c.z+Math.sin(ang)*55,.9+(k%3)*.12);}
        }else{const water=new THREE.Mesh(new THREE.CylinderGeometry(21,25,2.2,16),mat("arenaWater"));water.material.color.set("#3e9eaa");water.position.set(c.x,y+3,c.z);arenaGroup.add(water);
          for(let k=0;k<12;k++){const ang=k*Math.PI/6;block(arenaGroup,c.x+Math.cos(ang)*27,y+6,c.z+Math.sin(ang)*27,8,7,8,k%2?"#b6a16d":"#527b62","capitol",a.id,true);}
          for(let k=0;k<8;k++){const ang=k*Math.PI/4;tree(arenaGroup,c.x+Math.cos(ang)*57,c.z+Math.sin(ang)*57,1.05);}
        }
        label(i===0?"ARENA · 74":"ARENA · 75",c.x,y+38,c.z,i===0?"#c5ad75":"#7cb8b6","capitol",a.id);
      });
    }
    function updateLayers(){
      const layer=document.getElementById("mapLayer")?.value||"all";
      districtGroup.visible=layer!=="arena";routeGroup.visible=layer==="all"||layer==="transport";arenaGroup.visible=layer==="all"||layer==="arena";
      labelGroup.visible=labelsOn;labelObjects.forEach(s=>{s.visible=labelsOn&&(layer==="all"||(layer==="arena"&&!!s.userData.arenaId)||(layer!=="arena"&&!s.userData.arenaId));});
    }
    buildTerrain();buildForest();buildDistricts();buildRoutes();buildArenas();updateLayers();
    const pointer=new THREE.Vector2(),raycaster=new THREE.Raycaster();
    function resize(){const w=Math.max(1,host.clientWidth),h=Math.max(1,host.clientHeight);camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h,false);}
    function focus(id){
      const r=regions.find(v=>v.id===id),a=arenas.find(v=>v.id===id);if(!r&&!a)return;
      const c=a?((project&&project.coordinates&&project.coordinates[id])?coord(id):{x:a.x,z:a.z}):coord(id),y=topY(c.x,c.z)+10;
      selectedId=id;controls.target.set(c.x,y,c.z);const offset=a?new THREE.Vector3(125,130,145):new THREE.Vector3(155,150,175);
      camera.position.set(c.x+offset.x,y+offset.y,c.z+offset.z);controls.update();
      hudTitle.textContent=(a?a.name:r.name)+" · 3D-Ansicht";hudMeta.textContent=a?"Arena ausgewählt · Mit Maus drehen und hineinzoomen":"Region ausgewählt · Gebäude, Blöcke und Infrastruktur ansehen";
    }
    function selectRegion(id){const node=document.querySelector('#regionMap [data-map-region="'+id+'"]');if(node)node.dispatchEvent(new MouseEvent("click",{bubbles:true}));else focus(id);}
    function onDocumentClick(e){
      const node=e.target.closest&&e.target.closest("[data-map-region]");if(node){focus(node.dataset.mapRegion);return;}
      const card=e.target.closest&&e.target.closest("[data-select-region]");if(card){focus(card.dataset.selectRegion);return;}
      const arena=e.target.closest&&e.target.closest("[data-arena]");if(arena)focus(arena.dataset.arena);
    }
    let downX=0,downY=0;
    canvas.addEventListener("pointerdown",e=>{downX=e.clientX;downY=e.clientY;});
    canvas.addEventListener("pointerup",e=>{
      if(Math.hypot(e.clientX-downX,e.clientY-downY)>5)return;
      const rect=canvas.getBoundingClientRect();pointer.x=((e.clientX-rect.left)/rect.width)*2-1;pointer.y=-((e.clientY-rect.top)/rect.height)*2+1;
      raycaster.setFromCamera(pointer,camera);const hits=raycaster.intersectObjects(pickables,false);
      const hit=hits.find(h=>h.object.userData.regionId||h.object.userData.arenaId);if(!hit)return;
      const data=hit.object.userData;
      if(data.arenaId){focus(data.arenaId);const n=document.querySelector('#regionMap [data-arena="'+data.arenaId+'"]');if(n)n.dispatchEvent(new MouseEvent("click",{bubbles:true}));return;}
      if(data.regionId){const b=project&&project.buildings?project.buildings.find(x=>x.id===data.buildingId):null;selectRegion(data.regionId);hudTitle.textContent=(b?b.name:(regions.find(x=>x.id===data.regionId)||{}).name||"Region")+" · 3D-Ansicht";hudMeta.textContent=b?"Bauwerk ausgewählt · Region: "+((regions.find(x=>x.id===data.regionId)||{}).name||""):"Region ausgewählt · Die Seitenleiste zeigt den Projektstatus";}
    });
    document.addEventListener("click",onDocumentClick);
    document.getElementById("worldHome").addEventListener("click",()=>{controls.target.set(0,28,0);camera.position.set(860,850,940);controls.update();hudTitle.textContent="Panem · 3D-Voxel-Welt";hudMeta.textContent="Übersicht · Wähle ein Bauwerk oder einen Distrikt zum Heranzoomen";});
    document.getElementById("worldLabels").addEventListener("click",e=>{labelsOn=!labelsOn;e.currentTarget.setAttribute("aria-pressed",String(labelsOn));e.currentTarget.textContent="Beschriftungen: "+(labelsOn?"an":"aus");updateLayers();});
    document.getElementById("mapLayer").addEventListener("change",updateLayers);
    document.querySelectorAll("[data-map-mode]").forEach(button=>button.addEventListener("click",()=>{
      const voxel=button.dataset.mapMode==="voxel";host.hidden=!voxel;document.getElementById("interactiveMap").hidden=voxel;
      document.querySelectorAll("[data-map-mode]").forEach(other=>{const active=other===button;other.classList.toggle("active",active);other.setAttribute("aria-pressed",String(active));});
      if(voxel)resize();
    }));
    document.getElementById("saveCoords").addEventListener("click",()=>{project=readProject();hudMeta.textContent="Koordinaten gespeichert · Zum Neuaufbau der Landschaft die Seite neu laden";});
    window.addEventListener("resize",resize);if("ResizeObserver" in window)new ResizeObserver(resize).observe(host);
    function animate(){requestAnimationFrame(animate);controls.update();renderer.render(scene,camera);}
    resize();animate();loading.hidden=true;
  }catch(error){console.error("PanemCraft 3D konnte nicht gestartet werden:",error);loading.hidden=true;errorBox.hidden=false;}
})();