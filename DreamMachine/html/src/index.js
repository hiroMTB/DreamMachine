import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { SVGLoader } from './SVGLoader';
import Stats from 'three/addons/libs/stats.module.js';

const scale = 6;
const resolutionW = 180 * scale;
const resolutionH = 150 * scale;
let scene;
let ortho;
let camera;
let canvas;
let renderer;
let bg;
let emitter;
let wall;
let stats;

main();

function main() {

    renderer = new THREE.WebGLRenderer( {canvas, alpha: true, antialias: true});
    bg = new THREE.Color(0.1, 0.1, 0.1);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( resolutionW, resolutionH );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, resolutionH/2, -resolutionH/2, 1, 10000);
    ortho.position.set(0, 0, -1100);
    ortho.lookAt(0,0,0);

    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 10000 );
    const controls = new OrbitControls( camera, renderer.domElement );
    
    camera.position.set( 0, 0, -1100 );
    //controls.update() must be called after any manual changes to the camera's transform
    controls.update();
    camera.lookAt( 0, 0, 0 );
    
    setupWall();
    loadSvg(document.getElementById('svg'));

    setupLighting();    
    setupEmitter();

    const size = 100;
    const divisions = 10;
    const gridHelper = new THREE.GridHelper( size, divisions );
    scene.add( gridHelper );

    stats = new Stats();
    const container = document.getElementById("container");
    container.appendChild(stats.dom);

    function animate() {

        const timer = 0.0001 * Date.now();
        requestAnimationFrame( animate );

        stats.begin();
        animateEmitter(timer);
        renderer.render( scene, camera );
        // renderer.render( scene, ortho );
        stats.end();
    };

    animate();
}

function setupWall(){
     
    const geometry = new THREE.BoxGeometry( resolutionW, resolutionH, 1 );

    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, side:THREE.DoubleSide } ) ;
    
    wall = new THREE.Mesh( geometry, material );
    wall.position.set(0, 0, 100);
    wall.receiveShadow = true;
    scene.add( wall );
}

function setupEmitter(){
    const geometry = new THREE.SphereGeometry( 3, 32, 16 );
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true } ) ;
	material.emissive = new THREE.Color(255,5,5);
    material.emissiveIntensity = 10;

    emitter = new THREE.Mesh( geometry, material );
    emitter.position.set(0, 0, 0);
    scene.add( emitter );
}

function animateEmitter(timer){        
    emitter.position.x = Math.sin( timer * 4 ) * 30 * 0.3 * scale;
    emitter.position.y = Math.cos( timer * 2 ) * 70 * 0.3 * scale;
    emitter.position.z = Math.cos( timer * 1 ) * 30 * 0.3 * scale;
}


function setupLighting(){
    // Ambient
    scene.add( new THREE.AmbientLight( 0xffffff, 0.4 ) );

    // directional
    const dirLight = new THREE.DirectionalLight( 0xffaa00, 0.25 );
    dirLight.position.set(-50, 50, 0);
    if(wall) dirLight.target = wall;
    const helper = new THREE.DirectionalLightHelper( dirLight, 5 );
    scene.add( dirLight, helper );

    // point
    const pointLight = new THREE.PointLight( 0xddff00, 0.5, 400, 4);
    pointLight.position.set(0, 50, 0);
    const phelper = new THREE.PointLightHelper( pointLight, 5 );
    scene.add( pointLight, phelper );

   // set up spot light + helper
//    const spot = new THREE.SpotLight(0x00ff00, 1, 8, Math.PI / 8, 0);
//    spot.position.set(10, 20, 2);
//    const spotHelper = new THREE.SpotLightHelper(spot);
//    scene.add(spot, spotHelper);
}

function loadSvg( svgElement ){

    const svgMarkup = svgElement.outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);
    console.log(svgMarkup);
    console.log(svgData);

    const svgGroup = new THREE.Group();
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    // const material = new THREE.MeshLambertMaterial( { map: texture, transparent: false, side: THREE.DoubleSide } ) ;
    const material = new THREE.MeshBasicMaterial( {color: 0x111111, transparent: false, side: THREE.DoubleSide} );

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        const geometry = new THREE.ShapeGeometry(shape);    
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setX(-resolutionW/2);
        mesh.position.setY(-resolutionH/2);
        mesh.position.setZ(-100);
        mesh.scale.set(scale,scale,scale);
        svgGroup.add(mesh);
      });
    });
    
    // Add our group to the scene (you'll need to create a scene)
    scene.add(svgGroup);
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