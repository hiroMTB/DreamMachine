import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';
import { SVGLoader } from './SVGLoader';

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

const params = {
    debug: true,
    camera: 'ortho',
    speed: 1
};

let dirLight;
let dirLightHelper;

let pointLights = [];
let pointLightHelpers = [];

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
    prospects.push( loadSvg(document.getElementById('svg1'), 2, 0, 0,  200, 1, prospect2scaleY));
    prospects.push( loadSvg(document.getElementById('svg1'), 3, 0, 0,  200, 1, prospect2scaleY));

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
    scene.add( new THREE.AmbientLight( 0xffffff, 0.4 ) );

    // directional
    dirLight = new THREE.DirectionalLight( 0xcccccc, 0.5 );
    dirLight.position.set(0, 500, 300);
    if(wall) dirLight.target = wall;
    dirLightHelper = new THREE.DirectionalLightHelper( dirLight, 5 );
    
    scene.add( dirLight, dirLightHelper );

    // point, this is actual emitters
    pointLights = [];
    const color = [0xff5912, 0xffd712, 0xff8400];
    for(let i=0; i<6; i++){
        const p = new THREE.PointLight( color[i%3], 1.0, 600, 1);
        p.position.set(0, 50, -50);
        
        const helper = new THREE.PointLightHelper( p, 10 );        
        scene.add( p, helper );
        
        pointLights.push(p);
        pointLightHelpers.push(helper);
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