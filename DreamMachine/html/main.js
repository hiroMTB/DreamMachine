import * as THREE from "./three.module.js";
import { SVGLoader } from "./SVGLoader.js";
const resolutionW = 180;
const resolutionH = 150;
const filename = 'data/alphachannel.svg';
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

    loadSvg(filename);

    function animate() {
        requestAnimationFrame( animate );

        //plane.rotation.x += 0.001;
        //plane.rotation.y += 0.001;
        renderer.render( scene, ortho );
    };

    animate();
}

function loadSvg(filename){

    const loader = new SVGLoader();
    loader.load(
        'data/alphachannel.svg',
        function( data ) {
            const paths = data.paths;
            const group = new THREE.Group();
            
            for(let i=0; i<paths.length; i++){
                const path = paths[i];
                const material = new THREE.MeshBasicMaterial({
                    color: path.color,
                    side: THREE.DoubleSide,
                    depthWrite: false
                });
            

                const shapes = SVGLoader.createShapes(path);

                for ( let j = 0; j < shapes.length; j ++ ) {
                    const shape = shapes[ j ];
                    const geometry = new THREE.ShapeGeometry( shape );
                    const mesh = new THREE.Mesh( geometry, material );
                    group.add( mesh );
                }
            }
            scene.add(group);
        }
    )
}