main();

function main() {

    const canvas = document.querySelector('#glcanvas');
    const renderer = new THREE.WebGLRenderer( {canvas, alpha: true, antialia: true});
    const bg = new THREE.Color(0.4, 0.4, 0.4);
    renderer.setClearColor(bg, 1);
    const resolutionW = 180;
    const resolutionH = 150;

    renderer.setSize( resolutionW, resolutionH );

    const scene = new THREE.Scene();
    const ortho = new THREE.OrthographicCamera(-resolutionW/2, resolutionW/2, -resolutionH/2, resolutionH/2, 1, 10000);
    //const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );
    ortho.position.z = 100;

    const pgeometry = new THREE.PlaneGeometry( 180, 150 );
    const pmaterial = new THREE.MeshBasicMaterial( {color: 0xffff00, side: THREE.DoubleSide} );
    const plane = new THREE.Mesh( pgeometry, pmaterial );
    scene.add( plane );

    function animate() {
        requestAnimationFrame( animate );

        plane.rotation.x += 0.001;
        plane.rotation.y += 0.001;
        renderer.render( scene, ortho );
    };

    animate();
}