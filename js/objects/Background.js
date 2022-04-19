import { SphereGeometry } from "three";
import { ShaderMaterial } from "three";
import { BackSide } from "three";
import { Mesh } from "three";
import fBm from "../shaders/fbm.glsl";

class Background extends Mesh{
    constructor(){
        let g = new SphereGeometry(1, 72, 36);
        let m = new ShaderMaterial({
            //wireframe: true,
            side: BackSide,
            uniforms: {time: {value: 0}},
            vertexShader: /*glsl */`
                varying vec3 vPos;
                varying vec2 vUv;
                void main(){
                    vec4 pos =  modelMatrix * vec4(position, 1);
                    vUv = uv;
                    vPos = position.xyz;
                    gl_Position = projectionMatrix * viewMatrix * pos;
                }
                `,
            fragmentShader: /*glsl */`
                #define ss(a, b, c) smoothstep(a, b, c)
                #define PI 3.1415926
                #define PI2 PI*2.
                uniform float time;
                varying vec3 vPos;
                varying vec2 vUv;
                ${fBm}
                float tri(vec2 uv){
                float a = atan(uv.x,uv.y)+PI;
                float r = PI2/3.;
                float d = cos(floor(.5+a/r)*r-a)*length(uv);
                    return d;
                }
                float random (in vec2 st) {
                    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
                }
                mat2 rot(float a){
                    float c = cos(a);
                    float s = sin(a);
                    return mat2(c, -s, s, c);
                }
                void main(){
                    //vec3 col = vec3(0, 0.19, 0.25);
                    vec3 col = vec3(0, 0.08, 0.12);
                    
                    vec2 uv = (vUv * 2. - 1.) * vec2(2., 1.) * 10.;
                    vec2 uvFract = fract(uv) * 2. - 1.;
                    vec2 uvId = floor(uv);
                    float rand = random(uvId);
                    float rotFact = rand < 0.5 ? 1. : -1.;
                    float sclRand = random(vec2(uvId.x, rand));
                    float sclFact = sclRand * 0.5 + 1.;
                    vec2 uvFractRot = rot(rand * PI2 + time * rotFact * (rand * 0.5 + 0.5) * 0.5) * (uvFract * sclFact);
                    float tl = step(-1., uvId.y) - step(0., uvId.y); // line of tris
                    float rotTri = tri(uvFractRot);
                    float halfWidt = 0.025;
                    float hollowTri = ss(0.5 - halfWidt, 0.5, rotTri) - ss(0.5, 0.5 + halfWidt, rotTri);
                    col = mix(col, col + 0.05, hollowTri * tl);
                    
                    float fn = fbm(vPos * 10. - vec3(0, time, 0) * 0.5);
                    fn *= ss(0.25, -0.5, vPos.y);
                    
                    col = mix(col, col + 0.1, fn);
                    gl_FragColor = vec4(col, 1);
                }
                `
        })
        super(g, m);
        this.scale.setScalar(3000);
        this.update = t =>{
            this.material.uniforms.time.value = t;
        }
    }
}
export {Background}