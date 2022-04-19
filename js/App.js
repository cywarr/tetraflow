import * as THREE from "three";
import {OrbitControls} from "three/examples/jsm/controls/OrbitControls";
import { SuperFlow } from "./objects/SuperFlow";
import * as Tone from "tone";
import { Ambient } from "./sound/ambient";

const startButton = document.getElementById('startButton');
startButton.addEventListener('click', async () => {
    await Tone.start();
    console.log("audio is ready");
    new Ambient();
    init();
});

//init();
function init(){
    const overlay = document.getElementById('overlay');
    overlay.remove();
    const tf = document.getElementById("TetraFlow");
    tf.style.display = "block";

    let scene = new THREE.Scene();
    let camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 1, 5000);
    camera.position.set(0, 2.5, 12).setLength(17);
    let renderer = new THREE.WebGLRenderer({antialias: true});
    renderer.setSize(innerWidth, innerHeight);
    //renderer.setClearColor(0x003040);
    document.body.appendChild(renderer.domElement);
    window.addEventListener("resize", event => {
        camera.aspect = innerWidth / innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(innerWidth, innerHeight);
    })

    let controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableDamping = true;
    controls.minPolarAngle = Math.PI * 0.25;
    controls.maxPolarAngle = Math.PI * 0.75;
    controls.minDistance = 10;
    controls.maxDistance = 20;

    let light = new THREE.PointLight(0x7fffff, 1.0);
    scene.add(light, new THREE.AmbientLight(0xffffff, 0.375));

    let superFlow = new SuperFlow(camera);
    scene.add(superFlow);
    
    let clock = new THREE.Clock();

    renderer.setAnimationLoop(() => {
        let t = clock.getElapsedTime();
        controls.update();
        superFlow.update(t);
        renderer.render(scene, camera);
    })
}