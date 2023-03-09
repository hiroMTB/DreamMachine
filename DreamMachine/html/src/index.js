import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SVGLoader } from './SVGLoader';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { hsvToHEX } from './ColorConverter';

const globalScale = 1;

const ENTIRE_SCENE = 0, BLOOM_SCENE = 1;

const bloomLayer = new THREE.Layers();
bloomLayer.set( BLOOM_SCENE );
const darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
const materials = {};

let bloomComposer;
let bloomPass;
let finalPass;
let finalComposer;

const pX = 64; // pixelcount X
const pY = 32; // pixelcount Y
const tX = 4; // tiles horizontal
const tY = 7; // tiles vertical
const resolutionW = pX * tX * globalScale;
const resolutionH = pY * tY * globalScale;
let origin = 0;
let prospect2scaleY = 0.95;

let scene;
let camera;
let ortho;
let controlsOrtho;
let canvas;
let renderer;
let gridHelper;

let wall;
let prospects = [];
let stats;

// color
const startTime = Date.now();

let gui;
const params = {
    debug: false,
    camera: 'ortho',
    speed: 0.5,
    colorSpeed: 1/(23.0*60),

    exposure: 1,
    bloomStrength: 4,
    bloomThreshold: 0,
    bloomRadius: 1,
    scene: 'Scene with Glow'
};

let emitters =[];
let centerLights = [];
// let centerLightHelpers = [];

main();

function main() {

    renderer = new THREE.WebGLRenderer( 
        {
            canvas, 
            alpha: true,
            antialias: true,
            powerPreference: "high-performance",
            // physicallyCorrectLights: true    
        }
    );
    const bg = new THREE.Color(0,0,0);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( resolutionW, resolutionH );    
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.setPixelRatio( window.devicePixelRatio );

    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.traverse( disposeMaterial );
    scene.children.length = 0;

    // Ortho Camera
    ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, resolutionH/2, -resolutionH/2, 1, 3000);
    ortho.position.set(0, 0, 1100);
    ortho.lookAt(0,0,0);
    controlsOrtho = new OrbitControls( ortho, renderer.domElement );
        
    camera = ortho;

    setupRenderPass();
    setupEmitter();
    setupWall();
    setupProspects();
    setupLighting();  

    if(0){
        const size = 1000;
        const divisions = 25;
        gridHelper = new THREE.GridHelper( size, divisions );
        // gridHelper.position.set(0,-resolutionH/2,0);
        scene.add( gridHelper );
        gridHelper.layers.disable( BLOOM_SCENE );
    }
    setupGUI();

    setDebugMode(params.debug);
    render();
}

function setupRenderPass(){
    const renderScene = new RenderPass( scene, camera );

    bloomPass = new UnrealBloomPass( new THREE.Vector2( resolutionW, resolutionH ), 1.5, 0.4, 0.85 );
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    bloomComposer = new EffectComposer( renderer );
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass( renderScene );
    bloomComposer.addPass( bloomPass );
    bloomComposer.setSize( resolutionW, resolutionH );
    
    finalPass = new ShaderPass(
        new THREE.ShaderMaterial( {
            uniforms: {
                baseTexture: { value: null },
                bloomTexture: { value: bloomComposer.renderTarget2.texture }
            },
            vertexShader: document.getElementById( 'vertexshader' ).textContent,
            fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
            defines: {}
        } ), 'baseTexture'
    );
    finalPass.needsSwap = true;

    finalComposer = new EffectComposer( renderer );
    finalComposer.setSize( resolutionW, resolutionH);
    finalComposer.addPass( renderScene );
    finalComposer.addPass( finalPass );
}

function setupGUI(){
    stats = new Stats();
    stats.domElement.style.cssText = 'position:absolute;bottom:0px;left:0px;';
    const container = document.getElementById("container");
    container.appendChild(stats.dom);

    gui = new GUI();
    gui.add( params, 'debug')
    .onChange(value=>{ setDebugMode(value)})
    gui.add( params, 'speed', 0, 3);
    gui.add( params, 'colorSpeed', 0.000000000001, 0.001);


    gui.add( params, 'scene', [ 'Scene with Glow', 'Glow only', 'Scene only' ] ).onChange( function ( value ) {

        switch ( value ) 	{
            case 'Scene with Glow':
                bloomComposer.renderToScreen = false;
                break;
            case 'Glow only':
                bloomComposer.renderToScreen = true;
                break;
            case 'Scene only':
                // nothing to do
                break;
        }
        //render();
    } );

    const folder = gui.addFolder( 'Bloom Parameters' );

    folder.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {
        renderer.toneMappingExposure = Math.pow( value, 4.0 );
        //render();
    } );

    folder.add( params, 'bloomThreshold', 0.0, 1.2 ).onChange( function ( value ) {
        bloomPass.threshold = Number( value );
        // render();
    } );

    folder.add( params, 'bloomStrength', 0.0, 10.0 ).onChange( function ( value ) {
        bloomPass.strength = Number( value );
        // render();
    } );

    folder.add( params, 'bloomRadius', 0.0, 10.0 ).step( 0.01 ).onChange( function ( value ) {
        bloomPass.radius = Number( value );
        // render();
    } );
}

function setupWall(){
     
    const geometry = new THREE.BoxGeometry( resolutionW, resolutionH, 1 );
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    // const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, side:THREE.DoubleSide } ) ;
    const material = new THREE.MeshBasicMaterial( { color: 0x111111 } );

    wall = new THREE.Mesh( geometry, material );
    wall.position.set(0, 0, -700);
    // wall.matrixAutoUpdate = false;
    // wall.receiveShadow = true;
    wall.layers.disable( BLOOM_SCENE );
    wall.layers.enable( ENTIRE_SCENE );
    scene.add( wall );
}

function setupProspects(){
    prospects = [];
    prospects.push( loadSvg(document.getElementById('svg0'), 0, 0, 0,  200, 1, 1));
    prospects.push( loadSvg(document.getElementById('svg0'), 1, 0, 0,  200, 1, 1));
    prospects.push( loadSvg(document.getElementById('svg1'), 2, 0, 0,  -300, 1, prospect2scaleY));
    prospects.push( loadSvg(document.getElementById('svg1'), 3, 0, 0,  -300, 1, prospect2scaleY));

    for(let p of prospects){
        p.layers.disable( BLOOM_SCENE );
        p.layers.enable( ENTIRE_SCENE );
        scene.add(p);
    }
}

function setupEmitter(){

    // const geometry = new THREE.IcosahedronGeometry( 14, 8 );
    const geometry = new THREE.SphereBufferGeometry( 16, 10, 10 );
    const color = new THREE.Color(0xffffff);
    for(let i=0; i<6; i++){
        const material = new THREE.MeshBasicMaterial( { color: color } );
        const sphere = new THREE.Mesh( geometry, material );
        sphere.position.set(0,0,0);
        scene.add( sphere );
        sphere.layers.enable( BLOOM_SCENE );
        emitters.push(sphere);
    }

    {
        const geometry = new THREE.BoxBufferGeometry( resolutionW, resolutionH, 1 );
        const texture = new THREE.Texture( generateTexture() );
        texture.needsUpdate = true;
        //  const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, opacity: 0.3, side:THREE.DoubleSide } ) ;        
        const material = new THREE.MeshBasicMaterial( { color: 0x333333, transparent: true, opacity: 0.3 } );

        const eScreen1 = new THREE.Mesh( geometry, material );
        eScreen1.position.set(0, 0, -600);
        eScreen1.receiveShadow = true;
        eScreen1.layers.disable( BLOOM_SCENE );
        eScreen1.layers.enable( ENTIRE_SCENE );
        scene.add( eScreen1 );
    }
}

function disposeMaterial( obj ) {
    if ( obj.material ) {
        obj.material.dispose();
    }
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
    const numPL = emitters.length; // expect 6

    for(let i=0; i<numPL/2; i++){
        const x = Math.cos( i * Math.PI * 0.3 + timer * 0.05 * 2 * (i+1)*0.4) * resolutionW/2;
        const y = Math.sin( i * Math.PI * 0.3 + timer * 0.05 * 5 * (i+1)*0.4) * resolutionH/2;
        const z = Math.cos( i * Math.PI * 0.3 + timer * 0.05 * 3 * (i+1)*0.4) * 500;

        emitters[i].position.x = x;
        emitters[i].position.y = y;
        emitters[i].position.z = z;

        let size = resolutionW;
        
        // x: -size/2 - size/2
        // x2: 0 - size
        let x2 = x + size/2;
        if(x2<-size/2) x2 = size/2+x2;
        else if(size/2<x2) x2 = x2-size;

        if(x2 < -size/2) x2 = size/2 + x2
        emitters[i+numPL/2].position.x =  x2;
        emitters[i+numPL/2].position.y =  y;
        emitters[i+numPL/2].position.z = -z;
    }
}

function setDebugMode(debug){
    
    // Helpers
    // for(let h of centerLightHelpers){
    //     h.visible = debug;
    // }

    debug ? gui.show() : gui.hide();
}

function setupLighting(){
    // Ambient
    scene.add( new THREE.AmbientLight( 0xffffff, 0.05 ) );

    // point light array
    centerLights = [];
    // centerLightHelpers = [];
    const nCenterLights = 5;

    // 2800K = rgb(255, 173, 94) = 0xFFAD5E
    const cColor = 0xffffff;

    const step = resolutionW / (nCenterLights-1);
    for(let i=0; i<nCenterLights; i++){
        const p = new THREE.PointLight( cColor, 3, 300, 3.5);
        const x = -resolutionW/2 + step * i;
        p.position.set(x, 0, -500);
        centerLights.push(p);

        // const helper = new THREE.PointLightHelper( p, 10 );
        // scene.add( p, helper );
        // centerLightHelpers.push(helper);
    }
}

function loadSvg( svgElement, id, x, y, z, scaleX, scaleY){

    const svgMarkup = svgElement.outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);
    
    const svgW = svgData.xml.width.baseVal.value;
    const svgH = svgData.xml.height.baseVal.value;
    console.log( "svg", id, svgW, "x", svgH);

    const svgGroup = new THREE.Group();
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    // const material = new THREE.MeshLambertMaterial( { map: texture, transparent: false, side: THREE.DoubleSide } ) ;
    const material0 = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: false, side: THREE.DoubleSide} );
    const material1 = new THREE.MeshPhongMaterial( {color: 0xffffff, transparent: false, side: THREE.DoubleSide, specular: 0xaaaaaa, shininess: 20} );

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

        const sx = scaleX * globalScale;
        const sy = scaleY * globalScale;
        const centerX = -svgW/2 * sx;
        const centerY = -svgH/2 * sx;
        
        mesh.position.set(centerX+x, centerY+y, z);
        mesh.scale.set(sx, sy, globalScale);
        console.log(sx, sy, centerX, centerY);
        
        mesh.layers.disable( BLOOM_SCENE );
        mesh.layers.enable( ENTIRE_SCENE );

        svgGroup.add(mesh);
      });
    });
    
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

function changeEmitterColor(){
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
    let color1 = hsvToHEX(value, saturation, brightness);

    progressPercent = 1.0-(progressTime%cycleDurationFlag2)/cycleDurationFlag2;
    progressPercent360 = progressPercent*360;
    value = 1.0+(((hm-progressPercent360)%360)/360);
    let color2 = hsvToHEX(value, saturation, brightness);

    progressPercent = (progressTime%cycleDurationFlag3)/cycleDurationFlag3;
    progressPercent360 = progressPercent*360;
    value = ((hr+progressPercent360)%360)/360;
    let color3 = hsvToHEX(value, saturation, brightness);

    let colors = [color1, color2, color3];

    const numPL = emitters.length; // expect 6

    for(let i=0; i<numPL/2; i++){
        emitters[i].material.color.setHex(colors[i]);
        emitters[i+numPL/2].material.color.setHex(colors[i]);
    }
}

function render() {

    const timer = 0.0001 * Date.now();
    requestAnimationFrame( render );

    stats.begin();
    animateProspects();
    animateEmitter(timer);
    changeEmitterColor();

    controlsOrtho.update();

    switch ( params.scene ) {

        case 'Scene only':
            renderer.render( scene, camera );
            break;
        case 'Glow only':
            renderBloom( false );
            break;
        case 'Scene with Glow':
        default:
            // render scene with bloom
            renderBloom( true );

            // render the entire scene, then render bloom scene on top
            finalComposer.render();
            break;

    }
    //renderer.render( scene, camera );
    stats.end();
};

function renderBloom( mask ) {

    if ( mask === true ) {
        scene.traverse( darkenNonBloomed );
        bloomComposer.render();
        scene.traverse( restoreMaterial );
    } else {
        camera.layers.set( BLOOM_SCENE );
        bloomComposer.render();
        camera.layers.set( ENTIRE_SCENE );
    }
}

function darkenNonBloomed( obj ) {
    if ( obj.isMesh && bloomLayer.test( obj.layers ) === false ) {
        materials[ obj.uuid ] = obj.material;
        obj.material = darkMaterial;
    }
}

function restoreMaterial( obj ) {
    if ( materials[ obj.uuid ] ) {
        obj.material = materials[ obj.uuid ];
        delete materials[ obj.uuid ];
    }
}
