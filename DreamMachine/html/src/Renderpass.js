import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';


class MyRenderPass{
    
    constructor(){
        this.ENTIRE_SCENE = 0;
        this.BLOOM_SCENE = 1;
        
        this.bloomLayer = new THREE.Layers();
        this.bloomLayer.set( this.BLOOM_SCENE );
        this.darkMaterial = new THREE.MeshBasicMaterial( { color: 'black' } );
        this.materials = {};
    
        this.bloomComposer;
        this.bloomPass;
        this.finalPass;
        this.finalComposer;
    
        this.params = {
            exposure: 1,
            bloomStrength: 3,
            bloomThreshold: 0,
            bloomRadius: 0.75,
            scene: 'Scene with Glow'
        };

        console.log("constructor MyRenderPass");
        console.log(this.bloomLayer);
    }

    setupGui(gui){
        gui.add( this.params, 'scene', [ 'Scene with Glow', 'Glow only', 'Scene only' ] ).onChange( function ( value ) {

            switch ( value ) 	{
                case 'Scene with Glow':
                    bloomComposer.renderToScreen = false;
                    break;
                case 'Glow only':
                    bloomComposer.renderToScreen = true;
                    break;
                case 'Scene only':
                    break;
            }
        } );

        const folder = gui.addFolder( 'Bloom Parameters' );

        // folder.add( params, 'exposure', 0.1, 2 ).onChange( function ( value ) {
        //     renderer.toneMappingExposure = Math.pow( value, 4.0 );
        // } );

        folder.add( this.params, 'bloomThreshold', 0.0, 1.2 ).onChange( function ( value ) {
            this.bloomPass.threshold = Number( value );
        } );

        folder.add( this.params, 'bloomStrength', 0.0, 10.0 ).onChange( function ( value ) {
            this.bloomPass.strength = Number( value );
        } );

        folder.add( this.params, 'bloomRadius', 0.0, 10.0 ).step( 0.01 ).onChange( function ( value ) {
            this.bloomPass.radius = Number( value );
        } );
    }

    setupRenderPass(scene, camera, renderer, w, h){
        const renderScene = new RenderPass( scene, camera );

        this.bloomPass = new UnrealBloomPass( new THREE.Vector2( w, h ), 1.5, 0.4, 0.85 );
        this.bloomPass.threshold = this.params.bloomThreshold;
        this.bloomPass.strength  = this.params.bloomStrength;
        this.bloomPass.radius    = this.params.bloomRadius;

        this.bloomComposer = new EffectComposer( renderer );
        this.bloomComposer.renderToScreen = false;
        this.bloomComposer.addPass( renderScene );
        this.bloomComposer.addPass( this.bloomPass );
        this.bloomComposer.setSize( w, h );
        
        this.finalPass = new ShaderPass(
            new THREE.ShaderMaterial( {
                uniforms: {
                    baseTexture: { value: null },
                    bloomTexture: { value: this.bloomComposer.renderTarget2.texture }
                },
                vertexShader: document.getElementById( 'vertexshader' ).textContent,
                fragmentShader: document.getElementById( 'fragmentshader' ).textContent,
                defines: {}
            } ), 'baseTexture'
        );
        this.finalPass.needsSwap = true;
        this.finalComposer = new EffectComposer( renderer );
        this.finalComposer.setSize( w, h);
        this.finalComposer.addPass( renderScene );
        this.finalComposer.addPass( this.finalPass );
    }

    darkenNonBloomed( obj ) {
        // if ( obj.isMesh && this.bloomLayer.test( obj.layers ) === false ) {
        //     this.materials[ obj.uuid ] = obj.material;
        //     obj.material = this.darkMaterial;
        // }
    }

    restoreMaterial( obj ) {
        // if ( this.materials[ obj.uuid ] ) {
        //     obj.material = this.materials[ obj.uuid ];
        //     delete this.materials[ obj.uuid ];
        // }
    }

    renderBloom( scene, camera, mask ) {

        if ( mask === true ) {
            scene.traverse( (obj) => {
                if ( obj.isMesh && this.bloomLayer.test( obj.layers ) === false ) {
                    this.materials[ obj.uuid ] = obj.material;
                    obj.material = this.darkMaterial;
                }        
            } );

            this.bloomComposer.render();
            scene.traverse( (obj) => {
                if ( this.materials[ obj.uuid ] ) {
                    obj.material = this.materials[ obj.uuid ];
                    delete this.materials[ obj.uuid ];
                }
            } );
        } else {
            camera.layers.set( this.BLOOM_SCENE );
            this.bloomComposer.render();
            camera.layers.set( this.ENTIRE_SCENE );
        }
    }

    finalRender(){
        this.finalComposer.render();
    }


}

export default MyRenderPass;