
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SVGLoader } from './SVGLoader';
import Stats from 'three/addons/libs/stats.module.js';
import { GUI } from 'three/addons/libs/lil-gui.module.min.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import hsvToHEX from './ColorConverter';
import mapVal from './Utils';

const globalScale = 1;
const params = {
    debug: false,

    // Kerim prospect rotation speed
    speed: 7.0,

    // Kerim color change speed (smaller is faster)
    colorSpeed: 1/(23.0*60),
    emitterSpeed: 0.5,

    // Kerim Bloom Parameters
    exposure: 1,
    bloomStrength: 3,
    bloomThreshold: 0,
    bloomRadius: 0.75,
    scene: 'Scene with Glow'
};

// Kerim Wall color
const wallColor = 0xFFFFFF;
const wall_z = -700;

const eScreen_z = -690;
const eScreenOpacity = 0.4;

// Kerim position P0 on z axis
const prospect0_z = 200;

// Kerim position P1 on z axis
const prospect1_z = -300;

//Kerim Centerlight parameters below
const nCenterLights= 9;
const cColor= 0x888888;
const intensity= 5;
const distance= 200;
const decay= 1.2;
const centerLight_z= -275;

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
const ledResolutionW = pX * tX;
const ledResolutionH = pY * tY;

const canvasOffsetX = (ledResolutionW*0.5)*globalScale;  // L offset + R offest
const canvasW = ledResolutionW * globalScale + canvasOffsetX;
const canvasH = ledResolutionH * globalScale;

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

let emitters =[[]];
let emitterMaterials =[];
let centerLights = [];

main();

function main() {

    renderer = new THREE.WebGLRenderer( 
        {
            canvas, 
            alpha: true,
            antialias: false,
            powerPreference: "high-performance",
            // physicallyCorrectLights: true
        }
    );
    const bg = new THREE.Color(0,0,0);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( canvasW, canvasH );    
    renderer.toneMapping = THREE.ReinhardToneMapping;
    renderer.setPixelRatio( window.devicePixelRatio );

    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.left = String(-canvasOffsetX/2) + "px";

    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    scene.traverse( disposeMaterial );
    scene.children.length = 0;

    // Ortho Camera
    ortho = new THREE.OrthographicCamera(-canvasW/2, canvasW/2, canvasH/2, -canvasH/2, 1, 3000);
    ortho.position.set(0, 0, 1100);
    ortho.lookAt(0,0,0);
    controlsOrtho = new OrbitControls( ortho, renderer.domElement );
        
    camera = ortho;

    setupRenderPass();
    setupEmitter();
    setupWall();
    setupProspects();
    setupLighting(); 
    setupGUI();

    setDebugMode(params.debug);
    render();
}

function setupRenderPass(){
    const renderScene = new RenderPass( scene, camera );

    bloomPass = new UnrealBloomPass( new THREE.Vector2( canvasW, canvasH ), 1.5, 0.4, 0.85 );
    bloomPass.threshold = params.bloomThreshold;
    bloomPass.strength = params.bloomStrength;
    bloomPass.radius = params.bloomRadius;

    bloomComposer = new EffectComposer( renderer );
    bloomComposer.renderToScreen = false;
    bloomComposer.addPass( renderScene );
    bloomComposer.addPass( bloomPass );
    bloomComposer.setSize( canvasW, canvasH );
    
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
    finalComposer.setSize( canvasW, canvasH);
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

        switch ( value )    {
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
    const geometry = new THREE.BoxBufferGeometry( canvasW, canvasH, 1 );
    const material = new THREE.MeshStandardMaterial( { color: wallColor, emissive: 0xffffff, emissiveIntensity: 0.3 } ); 

    wall = new THREE.Mesh( geometry, material );
    wall.position.set(0, 0, wall_z);
    wall.layers.disable( BLOOM_SCENE );
    scene.add( wall );    
}

function setupProspects(){
    prospects = [];
    
    {
        // prospect 0, front
        const svgTag = document.getElementById('svg0');
        const svgData = loadSvg(svgTag);
        const geoms = makeGeomFromSvgData(svgData);
        const material = new THREE.MeshBasicMaterial( {color: 0x000000, transparent: false, side: THREE.DoubleSide} );
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect0_z, 1, 1)); 
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect0_z, 1, 1));
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect0_z, 1, 1));
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect0_z, 1, 1));
    }

    {
        // prospect 1, back
        const svgTag = document.getElementById('svg1');
        const svgData = loadSvg(svgTag);
        const geoms = makeGeomFromSvgData(svgData);
        // const material = new THREE.MeshBasicMaterial( {color: 0x333333, transparent: false, side: THREE.DoubleSide} );
        const material = new THREE.MeshPhongMaterial( {color: 0x333333, transparent: false, side: THREE.DoubleSide, specular: 0x111111, shininess: 1} );
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect1_z, 1, prospect2scaleY));
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect1_z, 1, prospect2scaleY));
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect1_z, 1, prospect2scaleY));
        prospects.push(makeMeshFromGeoms(geoms, svgData, material, prospect1_z, 1, prospect2scaleY));
    }    

    for(let p of prospects){
        p.layers.disable( BLOOM_SCENE );
        // p.layers.enable( ENTIRE_SCENE );
        scene.add(p);
    }
}

function loadSvg( svgElement ){    
    const svgMarkup = svgElement.outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);
    return svgData;
}

function makeGeomFromSvgData( svgData ){
    let geoms = [];
    console.log( "  found", svgData.paths.length, "paths");

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        console.log( "    shape", j );
        const geometry = new THREE.ShapeGeometry(shape);
        geoms.push(geometry);
      });
    });
    return geoms;
}

function makeMeshFromGeoms( geoms, svgData, material, z, scaleX, scaleY ){

    const svgW = svgData.xml.width.baseVal.value;
    const svgH = svgData.xml.height.baseVal.value;

    const svgGroup = new THREE.Group();
    
    geoms.forEach((geometry, j) => {
        let mesh = new THREE.Mesh(geometry, material);
        const sx = scaleX * globalScale;
        const sy = scaleY * globalScale;
        const centerX = -svgW/2 * sx * scaleX;
        const centerY = -svgH/2 * sx * scaleY;
        
        mesh.position.set(centerX, centerY, z);
        mesh.scale.set(sx, sy, globalScale);
        // console.log(sx, sy, centerX, centerY);
        
        mesh.layers.disable( BLOOM_SCENE );
        // mesh.layers.enable( ENTIRE_SCENE );

        svgGroup.add(mesh);
    });

  return svgGroup;
}

function setupEmitter(){

    const numEmitters = 3;

    // const geometry = new THREE.IcosahedronGeometry( 14, 8 );
    const geometry = new THREE.SphereBufferGeometry( 15, 10, 10 );
    const color = new THREE.Color(0xffffff);

    
    for(let i=0; i<6; i++){
        const dummy = [];
        emitters.push( dummy );
    }

    for(let i=0; i<numEmitters; i++){
        const material = new THREE.MeshBasicMaterial( { color: color } );
        emitterMaterials.push(material);

        for(let j=0; j<6; j++){
            const sphere = new THREE.Mesh( geometry, material );
            sphere.position.set(0,0,0);
            scene.add( sphere );
            sphere.layers.enable( BLOOM_SCENE );
            emitters[j].push(sphere);
        }
    }
}

function disposeMaterial( obj ) {
    if ( obj.material ) {
        obj.material.dispose();
    }
}

function animateProspects(){

    const w = ledResolutionW*globalScale;

    origin += params.speed;
    if(origin > w){
        origin = 0;
    }
    let xpos = [0,0,0,0,0,0,0,0];
    xpos[0] = -origin;
    xpos[1] = -origin + w;
    xpos[2] = -origin + w*2;
    xpos[3] = -origin - w;

    xpos[4] =  origin;
    xpos[5] =  origin - w;
    xpos[6] =  origin - w*2;
    xpos[7] =  origin + w;

    for(let i=0; i<xpos.length; i++){
        if(i<4){
            if(xpos[i] < -w*2 ){
                xpos[i] -= w*3;
            }
        }
        if(4<=i){
            if(xpos[i] > w*2 ){
                xpos[i] += w*3;
            }
        }
    }

    for(let i=0; i<xpos.length; i++){
        prospects[i].position.setX(xpos[i]);
    }
}

function animateEmitter(timer){ 
    const num = emitters[0].length; // expect 3

    for(let i=0; i<num; i++){
        const w = ledResolutionW * globalScale;
        const x = Math.cos( i * Math.PI * 0.3 + timer * params.emitterSpeed * 2 * (i+1)*0.4) * w;
        const y = Math.sin( i * Math.PI * 0.3 + timer * params.emitterSpeed * 5 * (i+1)*0.4) * (canvasH*0.4);
        const z = Math.cos( i * Math.PI * 0.3 + timer * params.emitterSpeed * 3 * (i+1)*0.4) * 400;
        
        // emitter size mapping
        // mapVal(value, inputMin, inputMax, outputMin, outputMax, clamp) {
        const scale = mapVal(z, -400, 400, 1.0, 2.0, true);
        
        {        
            // front, main emitter
            emitters[0][i].position.set(x, y, z);
            emitters[0][i].scale.set(scale,scale,scale);
        }

        {
            // Left
            let x1 = x - w;
            emitters[1][i].position.set(x1, y, z);
            emitters[1][i].scale.set(scale,scale,scale);
        }
        
        {
            // Right
            let x2 = x + w;
            emitters[2][i].position.set(x2, y, z);
            emitters[2][i].scale.set(scale,scale,scale);
        }

        let xB = x + w/2;
        let zB = z;
        const scaleB = mapVal(-z, -300, 300, 0.5, 1.5, true);
        {
            // back side
            if(xB<-w/2) xB = w/2+xB;
            else if(w/2<xB) xB = xB - w;
            if(xB < -w/2) xB = w/2 + xB
            emitters[3][i].position.set(xB, y, zB);
            emitters[3][i].scale.set(scaleB, scaleB, scaleB);
        }
        
        {
            // back side left
            const xB2 = xB - w;
            emitters[4][i].position.set(xB2, y, zB);
            emitters[4][i].scale.set(scaleB, scaleB, scaleB);
        }
        
        {
            // back side right
            const xB3 = xB + w;
            emitters[5][i].position.set(xB3, y, zB);
            emitters[5][i].scale.set(scaleB, scaleB, scaleB);
        }
    }
}

function setDebugMode(debug){    
    debug ? gui.show() : gui.hide();
}

function setupLighting(){
    // Kerim Ambientlight everywhere
    //scene.add( new THREE.AmbientLight( 0xffffff, 2.0 ) );

    // point light array
    centerLights = [];
    const w = ledResolutionW*globalScale;

    const step = w / (nCenterLights-1);
    for(let i=0; i<nCenterLights; i++){
        const p = new THREE.PointLight( cColor, intensity, distance, decay);
        const x = -w/2 + step * i;
        p.position.set(x, 0, centerLight_z );
        centerLights.push(p);
        scene.add( p );
        // const helper = new THREE.PointLightHelper( p, 10 );
        // scene.add( helper );
    }
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

    for(let i=0; i<emitterMaterials.length; i++){
        emitterMaterials[i].color.setHex(colors[i]);
        emitterMaterials[i].color.setHex(colors[i]);
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

    // console.log("Scene polycount:", renderer.info.render.triangles)
    // console.log("Active Drawcalls:", renderer.info.render.calls)
    // console.log("Textures in Memory", renderer.info.memory.textures)
    // console.log("Geometries in Memory", renderer.info.memory.geometries)
    // console.log("Number of Triangles :", renderer.info.render.triangles);
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
