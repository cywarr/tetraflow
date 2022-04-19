import { LineBasicMaterial } from "three";
import { Float32BufferAttribute } from "three";
import { Vector3 } from "three";
import { BufferGeometry } from "three";
import { LineSegments } from "three";

class FlowLines extends LineSegments{
    constructor(){
        super();
        const MAX_COUNT = 250;
        let pts = [];
        let segs = []; //2 - dir, len, speed
        let transp = []; // phase, speed
        for(let i = 0; i < MAX_COUNT; i++){
            let rand = 1 - Math.pow(Math.random(), 2);
            let v = new Vector3().setFromCylindricalCoords(rand * 2, Math.PI * 2 * Math.random(), (Math.random() - 0.5) * 100);
            pts.push(v, v.clone());
            
            let randLim = Math.random() < 0.25;
            let len = randLim ? Math.random() + 5 : Math.random() + 0.5;
            let speed = randLim ? 1 : 3;
            segs.push(-1, len, speed, 1, len, speed);
            let tRand = Math.random();
            let tPhase = tRand * Math.PI * 2;
            let tSpeed = tRand * (randLim ? 5 : 10);
            transp.push(tPhase, tSpeed, tPhase, tSpeed);
        }
        let g = new BufferGeometry().setFromPoints(pts);
        g.setAttribute("segs", new Float32BufferAttribute(segs, 3));
        g.setAttribute("transp", new Float32BufferAttribute(transp, 2));
        this.uniforms = {
            time: {value: 0}
        }
        let m = new LineBasicMaterial({
            color: "rgb(0, 255, 255)",
            transparent: true,
            onBeforeCompile: shader => {
                shader.uniforms.time = this.uniforms.time;
                shader.vertexShader = /*glsl*/`
                    uniform float time;
                    attribute vec3 segs;
                    attribute vec2 transp;
                    varying vec2 vTransp;
                    ${shader.vertexShader}
                `.replace(
                    /*glsl*/`#include <begin_vertex>`,
                    /*glsl*/`#include <begin_vertex>

                        float posY = 50. - mod(50. - position.y - (time * segs.z), 100.);
                        transformed.y = posY + segs.x * segs.y;
                        vTransp = transp;
                    `
                );
                //console.log(shader.vertexShader);
                shader.fragmentShader = /*glsl */`
                    uniform float time;
                    varying vec2 vTransp;
                    ${shader.fragmentShader}
                `.replace(
                    /*glsl */`vec4 diffuseColor = vec4( diffuse, opacity );`,
                    /*glsl */`
                    float op = pow(sin(vTransp.x + time * vTransp.y) * 0.5 + 0.5, 4.);
                    vec4 diffuseColor = vec4( diffuse, op );
                    `
                );
                //console.log(shader.fragmentShader);
            } 
        });
        this.geometry = g;
        this.material = m;
        this.update = t => {
            this.uniforms.time.value = t;
        }
    }
}
export {FlowLines}