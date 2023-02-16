import * as THREE from 'three';
import { SVGLoader } from './SVGLoader';
const resolutionW = 180;
const resolutionH = 150;
// import SvgFile from './data/alphachannel.svg';
let scene;
let ortho;
let canvas;
let renderer;
let bg;


main();

function main() {

    renderer = new THREE.WebGLRenderer( {canvas, alpha: true, antialia: true});
    bg = new THREE.Color(0.4, 0.4, 0.4);
    renderer.setClearColor(bg, 1);    
    renderer.setSize( resolutionW, resolutionH );
    document.body.appendChild( renderer.domElement );

    scene = new THREE.Scene();
    ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, -resolutionH/2, resolutionH/2, 1, 10000);
    //const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    ortho.position.z = 100;

    //const pgeometry = new THREE.PlaneGeometry( 180, 150 );
    //const pmaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    //const plane = new THREE.Mesh( pgeometry, pmaterial );
    //scene.add( plane );


    loadSvg();

    function animate() {
        requestAnimationFrame( animate );

        //plane.rotation.x += 0.001;
        //plane.rotation.y += 0.001;
        renderer.render( scene, ortho );
    };

    animate();
}

function loadSvg(){

    const svgMarkup = document.getElementById('svg').outerHTML;
    const loader = new SVGLoader();
    const svgData = loader.parse(svgMarkup);
    console.log(svgMarkup);
    console.log(svgData);

    const svgGroup = new THREE.Group();

    // const material = new THREE.MeshNormalMaterial();
    const material = new THREE.MeshBasicMaterial( {color: 0x111111, transparent: true, opacity:0.9, side: THREE.DoubleSide} );

    // Loop through all of the parsed paths
    svgData.paths.forEach((path, i) => {
      const shapes = SVGLoader.createShapes(path);
    
      // Each path has array of shapes
      shapes.forEach((shape, j) => {
        const geometry = new THREE.ShapeGeometry(shape);    
        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.setX(-resolutionW/2);
        mesh.position.setY(-resolutionH/2);
        svgGroup.add(mesh);
      });
    });
    
    // Add our group to the scene (you'll need to create a scene)
    scene.add(svgGroup);
}