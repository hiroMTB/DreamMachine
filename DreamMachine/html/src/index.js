import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SVGLoader } from './SVGLoader';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const globalScale = 6;
const pX = 60; // pixelcount X
const pY = 30; // pixelcount Y
const tX = 3; // tiles horizontal
const tY = 5; // tiles vertical
const resolutionW = pX * tX * globalScale;
const resolutionH = pY * tY * globalScale;
let fps = 24;
let origin = 0;
let prospect2scaleY = 0.95;

let scene;
let camera;
let ortho, persp;
let controlsOrtho, controlsPersp;
let canvas;
let renderer;
let gridHelper;

let wall;
let prospects = [];
let stats;

// color
const startTime = Date.now();

const params = {
    debug: true,
    camera: 'ortho',
    speed: 1,
    colorSpeed: 1/(23.0*60)
};

let dirLight;
let dirLightHelper;

let pointLights = [];
let pointLightHelpers = [];
let centerLights = [];
let centerLightHelpers = [];

main();

function main() {

    renderer = new THREE.WebGLRenderer( {canvas, alpha: true, antialias: true});
    const bg = new THREE.Color(0.3, 0.3, 0.3);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( resolutionW, resolutionH );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();

    // Ortho Camera
    ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, resolutionH/2, -resolutionH/2, 1, 10000);
    ortho.position.set(0, 0, -1100);
    ortho.lookAt(0,0,0);
    controlsOrtho = new OrbitControls( ortho, renderer.domElement );

    // Perspective Camera
    persp = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    controlsPersp = new OrbitControls( persp, renderer.domElement );
    
    persp.position.set( 0, 0, -1100 );
    persp.lookAt( 0, 0, 0 );
    controlsPersp.update();
    
    setupWall();
    setupProspects();

    setupLighting();    
    setupEmitter();

    const size = 1000;
    const divisions = 25;
    gridHelper = new THREE.GridHelper( size, divisions );
    // gridHelper.position.set(0,-resolutionH/2,0);

    scene.add( gridHelper );

    setupGUI();

    function animate() {

        const timer = 0.0001 * Date.now();
        requestAnimationFrame( animate );

        stats.begin();
        animateProspects();
        animateEmitter(timer);
        animateEmitterColor();

        switch ( params.camera ) {
            case 'perspective':
                camera = persp;
                break;
            case 'ortho':
                camera = ortho;
                break;
        }

        controlsPersp.update();
        controlsOrtho.update();

        renderer.render( scene, camera );
        stats.end();
    };

    animate();
}

function setupGUI(){
    stats = new Stats();
    stats.domElement.style.cssText = 'position:absolute;bottom:0px;left:0px;';
    const container = document.getElementById("container");
    container.appendChild(stats.dom);

    const gui = new GUI();
    gui.add( params, 'debug')
    .onChange(value=>{ setDebugMode(value)})
    gui.add( params, 'camera', [ 'perspective', 'ortho' ] );
    gui.add( params, 'speed', 0, 3);
    gui.add( params, 'colorSpeed', 0.000000000001, 0.001);

}

function setupWall(){
     
    const geometry = new THREE.BoxGeometry( resolutionW, resolutionH, 1 );

    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, side:THREE.DoubleSide } ) ;
    
    wall = new THREE.Mesh( geometry, material );
    wall.position.set(0, 0, 600);
    wall.receiveShadow = true;
    scene.add( wall );
}

function setupProspects(){
    prospects = [];
    prospects.push( loadSvg(document.getElementById('svg0'), 0, 0, 0, -200, 1, 1));
    prospects.push( loadSvg(document.getElementById('svg0'), 1, 0, 0, -200, 1, 1));
    prospects.push( loadSvg(document.getElementById('svg1'), 2, 0, 0,  300, 1, prospect2scaleY));
    prospects.push( loadSvg(document.getElementById('svg1'), 3, 0, 0,  300, 1, prospect2scaleY));

    for(let p of prospects){
        scene.add(p);
    }
}

function setupEmitter(){
    const geometry = new THREE.BoxGeometry( resolutionW, resolutionH, 1 );
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, opacity: 0.5, side:THREE.DoubleSide } ) ;
    
    const eScreen = new THREE.Mesh( geometry, material );
    eScreen.position.set(0, 0, 0);
    eScreen.receiveShadow = true;
    scene.add( eScreen );
}

function animateProspects(){

    origin += params.speed;
    if(origin > resolutionW){
        origin = 0;
    }

    if(prospects.length == 4){
        prospects[0].position.setX(-origin);
        prospects[1].position.setX(-origin+resolutionW);
        prospects[2].position.setX(origin);
        prospects[3].position.setX(origin-resolutionW);

    }else{
        console.error("prospects.length = " + prospects.length);
    }

}

function animateEmitter(timer){ 
    const numPL = pointLights.length; // expect 6

    for(let i=0; i<numPL/2; i++){
        const x = Math.sin( i * Math.PI * 0.3 + timer * 4 * (i+1)*0.2) * resolutionW/2;
        const y = Math.cos( i * Math.PI * 0.3 + timer * 2 * (i+1)*0.2) * resolutionH/2;
        const z = Math.cos( i * Math.PI * 0.3 + timer * 3 * (i+1)*0.2) * 200;

        pointLights[i].position.x = x;
        pointLights[i].position.y = y;
        pointLights[i].position.z = z;

        let size = resolutionW;
        
        // x: -size/2 - size/2
        // x2: 0 - size
        let x2 = x + size/2;
        if(x2<-size/2) x2 = size/2+x2;
        else if(size/2<x2) x2 = x2-size;

        if(x2 < -size/2) x2 = size/2 + x2
        pointLights[i+numPL/2].position.x =  x2;
        pointLights[i+numPL/2].position.y =  y;
        pointLights[i+numPL/2].position.z = -z;
    }
}

function setDebugMode(debug){
    
    // Helpers
    dirLightHelper.visible = debug;
    for(let h of pointLightHelpers){
        h.visible = debug;
    }

    // Grid
    gridHelper.visible = debug;
}

function setupLighting(){
    // Ambient
    // scene.add( new THREE.AmbientLight( 0xffffff, 0.4 ) );

    // point light array
    centerLights = [];
    centerLightHelpers = [];
    const nCenterLights = 12;

    // 2800K = rgb(255, 173, 94) = 0xFFAD5E
    const cColor = 0x555555;

    const step = resolutionW / (nCenterLights-1);
    for(let i=0; i<nCenterLights; i++){
        const p = new THREE.PointLight( cColor, 0.5, 800, 0.6);
        const x = -resolutionW/2 + step *i;
        p.position.set(x, 0, -30);
        
        const helper = new THREE.PointLightHelper( p, 10 );
        scene.add( p, helper );
        
        centerLights.push(p);
        centerLightHelpers.push(helper);
    }

    // point, this is actual emitters
    pointLights = [];
    pointLightHelpers = [];

    const pColor = 0xffffff;
    for(let i=0; i<6; i++){
        pointLights.push(new THREE.PointLight( pColor, 0.3, 600, 0.1));
        pointLights[i].position.set(0, 50, -50);
        

        pointLightHelpers.push(new THREE.PointLightHelper( pointLights[i], 10 ));
        scene.add( pointLights[i], pointLightHelpers[i]);
    }

   // set up spot light + helper
//    const spot = new THREE.SpotLight(0x00ff00, 1, 8, Math.PI / 8, 0);
//    spot.position.set(10, 20, 2);
//    const spotHelper = new THREE.SpotLightHelper(spot);
//    scene.add(spot, spotHelper);
}

function loadSvg( svgElement, id, x, y, z, scaleX, scaleY){

    const svgMarkup = svgElement.outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);

    const svgGroup = new THREE.Group();
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    // const material = new THREE.MeshLambertMaterial( { map: texture, transparent: false, side: THREE.DoubleSide } ) ;
    const material0 = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: false, side: THREE.DoubleSide} );
    const material1 = new THREE.MeshPhongMaterial( {color: 0x333333, transparent: false, side: THREE.DoubleSide, specular: 0xaaaaaa, shininess: 20} );

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        const geometry = new THREE.ShapeGeometry(shape);
        let mesh;
        if(id<=1){
            mesh = new THREE.Mesh(geometry, material0);
        }else{
            mesh = new THREE.Mesh(geometry, material1);
        }

        const sx = globalScale * scaleX;
        const sy = globalScale * scaleY;
        const w = resolutionW  * scaleX;
        const h = resolutionH  * scaleY;
        const centerX = -w/2;
        const centerY = -h/2;
        
        mesh.position.set(centerX+x, centerY+y, z);
        mesh.scale.set(sx, sy, globalScale);
        console.log(sx, sy, w, h, centerX, centerY);

        svgGroup.add(mesh);
      });
    });
    
    // scene.add(svgGroup);
    return svgGroup;
}


function generateTexture() {

    const canvas = document.createElement( 'canvas' );
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext( '2d' );
    const image = context.getImageData( 0, 0, 256, 256 );

    let x = 0, y = 0;

    for ( let i = 0, j = 0, l = image.data.length; i < l; i += 4, j ++ ) {
        x = j % 256;
        y = ( x === 0 ) ? y + 1 : y;
        image.data[ i ] = 255;
        image.data[ i + 1 ] = 255;
        image.data[ i + 2 ] = 255;
        image.data[ i + 3 ] = 255; //Math.floor( x ^ y );
    }

    context.putImageData( image, 0, 0 );

    return canvas;
}

function animateEmitterColor(){
    const cycleDurationFlag1 = 23*60*60 * params.colorSpeed;      // 23hrs*60mins*60secs
    const cycleDurationFlag2 = 23*60*60*5.0 * params.colorSpeed;  // 5 * 23hrs*60mins*60secs
    const cycleDurationFlag3 = 23*60*60 * params.colorSpeed;      // 23hrs*60mins*60secs
    let hl = 0;
    let hm = 60;
    let hr = 240;
  
    let saturation = 1; //               #1 = 100%
    let brightness = 1; //               #1 = 100%
    
    const progressTime = (Date.now() - startTime)/1000;
    let progressPercent = (progressTime%cycleDurationFlag1)/cycleDurationFlag1;
    let progressPercent360 = progressPercent*360;
    let value = ((hl+progressPercent360)%360)/360;
    console.log(value);
    let color1 = hsvToHEX(value, saturation, brightness);
    console.log(color1);

    progressPercent = 1.0-(progressTime%cycleDurationFlag2)/cycleDurationFlag2;
    progressPercent360 = progressPercent*360;
    value = 1.0+(((hm-progressPercent360)%360)/360);
    let color2 = hsvToHEX(value, saturation, brightness);

    progressPercent = (progressTime%cycleDurationFlag3)/cycleDurationFlag3;
    progressPercent360 = progressPercent*360;
    value = ((hr+progressPercent360)%360)/360;
    let color3 = hsvToHEX(value, saturation, brightness);

    let colors = [color1, color2, color3];

    const numPL = pointLights.length; // expect 6

    for(let i=0; i<numPL/2; i++){
        pointLights[i].color.setHex(colors[i]);
        pointLights[i+numPL/2].color.setHex(colors[i]);
    }
}

function hsvToHEX(h,s,v){
    const rgb = hsvToRgb(h,s,v);
    return rgbToHEX(rgb[0],rgb[1],rgb[2]);
}

function rgbToHEX(r,g,b){
    return "0x" + convert(r) + convert(g) + convert(b);
}

function hsvToRgb(h, s, v) {
    let r, g, b;

    let i = Math.floor(h * 6);
    let f = h * 6 - i;
    let p = v * (1 - s);
    let q = v * (1 - f * s);
    let t = v * (1 - (1 - f) * s);

    switch (i % 6) {
      case 0: r = v, g = t, b = p; break;
      case 1: r = q, g = v, b = p; break;
      case 2: r = p, g = v, b = t; break;
      case 3: r = p, g = q, b = v; break;
      case 4: r = t, g = p, b = v; break;
      case 5: r = v, g = p, b = q; break;
    }

    return [ Math.round(r * 255), Math.round(g * 255), Math.round(b * 255) ];
}

function convert(integer) {
    let str = Number(integer).toString(16);
    return str.length == 1 ? "0" + str : str;
}