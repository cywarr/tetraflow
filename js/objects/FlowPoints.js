import { BufferGeometry } from "three";
import { CanvasTexture } from "three";
import { Float32BufferAttribute } from "three";
import { AdditiveBlending } from "three";
import { PointsMaterial } from "three";
import { Vector3 } from "three";
import { Points } from "three";

class FlowPoints extends Points{
    constructor(count){
        super();
        this.uniforms = {
            time: {value: 0}
        }

        let pData = []; // size, speed
        let pts = new Array(count).fill().map(p => {
            pData.push(0.5 + Math.random() * 0.5, 1 + Math.random() * 2);
            return new Vector3().setFromCylindricalCoords(Math.pow(Math.random(), 0.5) * 5, Math.random() * Math.PI * 2, Math.random() * 20. - 10.)
        });
        let g = new BufferGeometry().setFromPoints(pts);
        g.setAttribute("pData", new Float32BufferAttribute(pData, 2));
        let m = new PointsMaterial({
            size: 0.375, 
            color: "rgb(0, 200, 255)",
            transparent: true,
            blending: AdditiveBlending,
            onBeforeCompile: shader => {
                shader.uniforms.time = this.uniforms.time;
                shader.vertexShader = /*glsl */`
                    #define ss(a, b, c) smoothstep(a, b, c)
                    uniform float time;
                    attribute vec2 pData;
                    varying float vSRatio;
                    varying float vSFrame;

                    // https://www.shadertoy.com/view/3ljcRh
                    float sdBoxFrame( vec3 p, vec3 b, float e)
                    {
                        p = abs(p  )-b;
                    vec3 q = abs(p+e)-e;

                    return min(min(
                        length(max(vec3(p.x,q.y,q.z),0.0))+min(max(p.x,max(q.y,q.z)),0.0),
                        length(max(vec3(q.x,p.y,q.z),0.0))+min(max(q.x,max(p.y,q.z)),0.0)),
                        length(max(vec3(q.x,q.y,p.z),0.0))+min(max(q.x,max(q.y,p.z)),0.0));
                    }

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
                        return vec3(vec4(vector, 1.) * rotationX(rotation.x) * rotationY(rotation.y) * rotationZ(rotation.z));
                      }

                    ${shader.vertexShader}
                `.replace(
                    /*glsl */`#include <begin_vertex>`,
                    /*glsl */`#include <begin_vertex>
                    float rRatio = 1. - pow(length(position.xz) / 5., 3.);
                    float posY = -10. + mod(-10. + position.y + (time * pData.y), 20.);
                    float sRatio = (1. - min(1., abs(posY / 10.))) * rRatio;
                    vSRatio = pow(sRatio, 1.5);
                    transformed.y = posY;
                    
                    vec3 framePos = rot3d(vec3(PI * 0.25, 0., PI * 0.25) + time, transformed - vec3(0, 4, 0));
                    float dFrame = sdBoxFrame(framePos, vec3(1.5), 0.);
                    float sFrame = ss(0.5, 0.25, dFrame);
                    sRatio = max(sRatio, sFrame);
                    vSFrame = sFrame;
                    
                    `
                ).replace(
                    /*glsl */`gl_PointSize = size;`,
                    /*glsl */`gl_PointSize = size * pData.x * sRatio;`
                );
                //console.log(shader.vertexShader);
                shader.fragmentShader = /*glsl */`
                    varying float vSRatio;
                    varying float vSFrame;
                    ${shader.fragmentShader}
                `.replace(
                    /*glsl */`vec4 diffuseColor = vec4( diffuse, opacity );`,
                    /*glsl */`   
                        vec2 uv = gl_PointCoord.xy;
                        if(length(uv - 0.5) > 0.45 || vSRatio < 0.1) discard;
                        vec2 uvCirc = (uv - 0.5) * 2.;
                        float op = pow(1. - min(length(uvCirc), 1.), 2. - vSFrame);
                        vec4 diffuseColor = vec4( mix(diffuse, vec3(0.5, 1, 1), vSFrame), op * vSRatio);
                    `
                );
                //console.log(shader.fragmentShader);
            }
        })

        this.geometry = g;
        this.material = m;
        this.update = t => {
            this.uniforms.time.value = t * 0.25;
        }
    }
}
export{FlowPoints}