import { InstancedBufferGeometry } from "three";
import { Vector3 } from "three";
import { LineBasicMaterial } from "three";
import { InstancedBufferAttribute } from "three";
import { ArcCurve } from "three";
import { BufferGeometry } from "three";
import { Line } from "three";

class FlowCircles extends Line{
    constructor(){
        super();
        this.uniforms = {
            time: {value: 0}
        }

        let pts = new ArcCurve(0, 0, 1, 0, Math.PI * 2).getSpacedPoints(6);

        const MAX_COUNT = 100;
        let circle = new BufferGeometry().setFromPoints(pts);
        circle.rotateX(-Math.PI * 0.5);
        let g = new InstancedBufferGeometry().copy(circle);
        g.instanceCount = MAX_COUNT;

        let v3 = new Vector3();
        let instPos = [];
        let instData = []; // scale, speed
        let instRot = []; //3
        let instRotSpeed = []; //3
        for(let i = 0; i < MAX_COUNT; i++){
            let posRand = Math.random() < 0.25;
            v3.setFromCylindricalCoords(Math.random() * 1.5, Math.random() * Math.PI * 2, Math.random() * 100 - 50);
            if (posRand) {
                instPos.push(0, Math.random() * 100 - 50, 0);
                instData.push(2.5, 1);
                instRot.push(0, 0, 0);
                instRotSpeed.push(0, 0, 0);
            } else {
                instPos.push(v3.x, v3.y, v3.z);
                instData.push(Math.random() * 0.5 + 0.1, 2);
                v3.randomDirection().multiplyScalar(Math.PI * 2);
                instRot.push(v3.x, v3.y, v3.z);
                v3.randomDirection().multiplyScalar(Math.PI * 2 * (Math.random() * 0.125 + 0.125));
                instRotSpeed.push(v3.x, v3.y, v3.z);
            }
        }
        g.setAttribute("instPos", new InstancedBufferAttribute(new Float32Array(instPos), 3));
        g.setAttribute("instData", new InstancedBufferAttribute(new Float32Array(instData), 2));
        g.setAttribute("instRot", new InstancedBufferAttribute(new Float32Array(instRot), 3));
        g.setAttribute("instRotSpeed", new InstancedBufferAttribute(new Float32Array(instRotSpeed), 3));

        let m = new LineBasicMaterial({
            color: 0x7fffff,
            onBeforeCompile: shader => {
                shader.uniforms.time = this.uniforms.time;
                shader.vertexShader = /*glsl */`
                    uniform float time;
                    attribute vec3 instPos;
                    attribute vec2 instData;
                    attribute vec3 instRot;
                    attribute vec3 instRotSpeed;

                    mat4 rotationX( in float angle ) {
                    return mat4(	1.0,		0,			0,			0,
                            0, 	cos(angle),	-sin(angle),		0,
                            0, 	sin(angle),	 cos(angle),		0,
                            0, 			0,			  0, 		1);
                    }

                    mat4 rotationY( in float angle ) {
                    return mat4(	cos(angle),		0,		sin(angle),	0,
                                0,		1.0,			 0,	0,
                            -sin(angle),	0,		cos(angle),	0,
                                0, 		0,				0,	1);
                    }

                    mat4 rotationZ( in float angle ) {
                    return mat4(	cos(angle),		-sin(angle),	0,	0,
                            sin(angle),		cos(angle),		0,	0,
                                0,				0,		1,	0,
                                0,				0,		0,	1);
                    }
                    
                    vec3 rot3d(vec3 rotation, vec3 vector){
                    return vec3( vec4(vector, 1.) * rotationX(rotation.x) * rotationY(rotation.y) * rotationZ(rotation.z) );
                    }
                      
                    ${shader.vertexShader}
                `.replace(
                    /*glsl */`#include <begin_vertex>`,
                    /*glsl */`#include <begin_vertex>
                        vec3 iPos = instPos;
                        iPos.y = 50. - mod(50. - iPos.y - (time * instData.y), 100.);
                        vec3 rotPos = rot3d(instRot + (instRotSpeed * time), position * instData.x);
                        transformed = rotPos + iPos;
                    
                    `
                );
                //console.log(shader.vertexShader);
            }
        })

        this.geometry = g;
        this.material = m;

        this.update = t => {
            this.uniforms.time.value = t * 0.5;
        }
    }
}
export{FlowCircles}