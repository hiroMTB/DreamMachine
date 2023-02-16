import * as THREE from 'three';
import { SVGLoader } from './SVGLoader';
const scale = 6;
const resolutionW = 180 * scale;
const resolutionH = 150 * scale;
let scene;
let ortho;
let camera;
let canvas;
let renderer;
let bg;
let pointLight;

main();

function main() {

    renderer = new THREE.WebGLRenderer( {canvas, alpha: true} );//, antialias: true});
    bg = new THREE.Color(0.3, 0.3, 0.3);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( resolutionW, resolutionH );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, -resolutionH/2, resolutionH/2, 1, 10000);
    ortho.position.z = 100;
    
    camera = new THREE.PerspectiveCamera( 45, window.innerWidth / window.innerHeight, 1, 500 );
    camera.position.set( 0, 0, 100 );
    camera.lookAt( 0, 0, 0 );

    loadSvg();

    setupLighting();
    
    const geometry = new THREE.SphereGeometry( 10, 32, 16 );

    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true } ) ;
				
    const cube = new THREE.Mesh( geometry, material );
    cube.position.set(0, -20, -10);
    cube.receiveShadow = true;
    scene.add( cube );


    function animate() {

        const timer = 0.0001 * Date.now();
        requestAnimationFrame( animate );

        cube.rotateY(0.01);
        cube.rotateZ(0.01);
        
        pointLight.position.x = Math.sin( timer * 4 ) * 30;
        pointLight.position.y = Math.cos( timer * 2 ) * 70;
        pointLight.position.z = Math.cos( timer * 1 ) * 30;

        renderer.render( scene, ortho );
    };

    animate();
}

function setupLighting(){

    scene.add( new THREE.AmbientLight( 0x111111 ) );

    const directionalLight = new THREE.DirectionalLight( 0x0000ff, 0.25 );

    directionalLight.position.x = Math.random() - 0.5;
    directionalLight.position.y = Math.random() - 0.5;
    directionalLight.position.z = Math.random() - 0.5;
    directionalLight.position.normalize();
    scene.add( directionalLight );

    pointLight = new THREE.PointLight( 0xffcc33, 1 );
    scene.add( pointLight );

    pointLight.add( new THREE.Mesh( new THREE.SphereGeometry( 1, 8, 8 ), new THREE.MeshBasicMaterial( { color: 0xffffff } ) ) );

}

function loadSvg(){

    const svgMarkup = document.getElementById('svg').outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);
    console.log(svgMarkup);
    console.log(svgData);

    const svgGroup = new THREE.Group();
    const texture = new THREE.Texture( generateTexture() );
    texture.needsUpdate = true;
    const material = new THREE.MeshLambertMaterial( { map: texture, transparent: true, side: THREE.DoubleSide } ) ;

    //const material = new THREE.MeshBasicMaterial( {color: 0x111111, transparent: true, opacity:0.9, side: THREE.DoubleSide} );

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        const geometry = new THREE.ShapeGeometry(shape);    
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setX(-resolutionW/2);
        mesh.position.setY(-resolutionH/2);
        mesh.position.setZ(50);
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