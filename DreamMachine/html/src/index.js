import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SVGLoader } from './SVGLoader';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

const scale = 6;
const pX = 60; // pixelcount X
const pY = 30; // pixelcount Y
const tX = 3; // tiles horizontal
const tY = 5; // tiles vertical
const resolutionW = pX * tX * scale;
const resolutionH = pY * tY * scale;
let fps = 24;
let origin = 0;

let scene;
let camera;
let ortho, persp;
let controlsOrtho, controlsPersp;
let canvas;
let renderer;
let wall;
let prospects = [];
let stats;
const params = {
    camera: 'ortho',
    speed: 1
};

let pointLights = [];

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
    const gridHelper = new THREE.GridHelper( size, divisions );
    gridHelper.position.set(0,-resolutionH/2,0);

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
    gui.add( params, 'camera', [ 'perspective', 'ortho' ] );
    gui.add( params, 'speed', 0, 3);
}

function setupWall(){
     
    const geometry = new THREE.BoxGeometry( resolutionW, resolutionH, 1 );

    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, side:THREE.DoubleSide } ) ;
    
    wall = new THREE.Mesh( geometry, material );
    wall.position.set(0, 0, 300);
    wall.receiveShadow = true;
    scene.add( wall );
}

function setupProspects(){
    prospects = [];
    prospects.push( loadSvg(document.getElementById('svg0'), 0, 0, -100));
    prospects.push( loadSvg(document.getElementById('svg0'), 0, 0, -100));
    prospects.push( loadSvg(document.getElementById('svg1'), 0, 0, 100));
    prospects.push( loadSvg(document.getElementById('svg1'), 0, 0, 100));

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
    for(let i=0; i<pointLights.length; i++){
        pointLights[i].position.x = Math.sin( i * Math.PI * 0.3 + timer * 4 * (i+1)*0.2) * resolutionW/2;
        pointLights[i].position.y = Math.cos( i * Math.PI * 0.3 + timer * 2 * (i+1)*0.2) * resolutionH/2;
        pointLights[i].position.z = Math.cos( i * Math.PI * 0.3 + timer * 3 * (i+1)*0.2) * 200;
    }
}


function setupLighting(){
    // Ambient
    scene.add( new THREE.AmbientLight( 0xffffff, 0.4 ) );

    // directional
    const dirLight = new THREE.DirectionalLight( 0xffaa00, 0.5 );
    dirLight.position.set(-50, 300, 200);
    if(wall) dirLight.target = wall;
    const helper = new THREE.DirectionalLightHelper( dirLight, 5 );
    scene.add( dirLight, helper );

    // point
    pointLights = [];
    const color = [0xddff00, 0xff3333, 0xaaaaaa];
    for(let i=0; i<3; i++){
        let p = new THREE.PointLight( color[i], 1.5, 1200, 1);
        p.position.set(0, 50, -50);
        const phelper = new THREE.PointLightHelper( p, 10 );        
        scene.add( p, phelper );
        pointLights.push(p);
    }

   // set up spot light + helper
//    const spot = new THREE.SpotLight(0x00ff00, 1, 8, Math.PI / 8, 0);
//    spot.position.set(10, 20, 2);
//    const spotHelper = new THREE.SpotLightHelper(spot);
//    scene.add(spot, spotHelper);
}

function loadSvg( svgElement, x, y, z ){

    const svgMarkup = svgElement.outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);

    const svgGroup = new THREE.Group();
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    // const material = new THREE.MeshLambertMaterial( { map: texture, transparent: false, side: THREE.DoubleSide } ) ;
    const material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: false, side: THREE.DoubleSide} );

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        const geometry = new THREE.ShapeGeometry(shape);    
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setX(-resolutionW/2 + x);
        mesh.position.setY(-resolutionH/2 + y);
        mesh.position.setZ(z);
        mesh.scale.set(scale,scale,scale);
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