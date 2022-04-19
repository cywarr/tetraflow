import { InstancedBufferAttribute } from "three";
import { BufferGeometry } from "three";
import { BufferAttribute } from "three";
import { RepeatWrapping } from "three";
import { RGBAFormat } from "three";
import { MeshLambertMaterial } from "three";
import { DoubleSide } from "three";
import { FloatType } from "three";
import { LinearFilter } from "three";
import { DataTexture } from "three";
import { Color } from "three";
import { Vector3 } from "three";
import { InstancedBufferGeometry } from "three";
import { Mesh } from "three";
import { FlowCurve } from "./FlowCurve";

class FlowTetrahedrons extends Mesh{
    constructor( count ){
        super();
        this.data = new Float32Array(1024 * 4 * 4);
        this.tex = new DataTexture(this.data, 1024, 4, RGBAFormat, FloatType);
        this.tex.magFilter = LinearFilter;
        this.tex.wrapS = RepeatWrapping;
        this.tex.wrapY = RepeatWrapping;
        //this.tex.needsUpdate = true;
        this.uniforms = {
            time: {value: 0},
            spatialTex: {value: this.tex}
        }
        this.curve = new FlowCurve(this.data);
        this.tex.needsUpdate = true;
        let g = setGeometry(count);
        let m = setMaterial(this.uniforms);
        m.extensions = {derivatives: true};
        this.geometry = g;
        this.material = m;
        this.update = t =>{
          this.uniforms.time.value = t;
          //this.curve.update(t);
          //this.tex.needsUpdate = true;
        }
        function setMaterial(uniforms){
            return new MeshLambertMaterial({
                vertexColors: true,
                wireframe: false,
                side: DoubleSide,
                onBeforeCompile: shader => {
                    shader.uniforms.time = uniforms.time;
                    shader.uniforms.spatialTex = uniforms.spatialTex;
                    shader.vertexShader = /*glsl*/`
                      uniform float time;
                      uniform sampler2D spatialTex;
                      
                      attribute float initPos;
                      attribute vec4 posShift;
                      attribute vec3 rot;
                      attribute vec3 rotShift;
                      attribute vec3 center;
                      attribute float bloomable;
                      
                      varying vec3 vCenter;
                      varying float vBloomable;
                      varying float vTBloom;
                      varying float vDist;
                      
                      struct splineData {
                        vec3 point;
                        vec3 binormal;
                        vec3 normal;
                      };
                      
                      splineData getSplineData(float t){
                        float step = 1. / 4.;
                        float halfStep = step * 0.5;
                        splineData sd;
                        sd.point    = texture2D(spatialTex, vec2(t, step * 0.5)).rgb;
                        sd.binormal = texture2D(spatialTex, vec2(t, step * 1.5)).rgb;
                        sd.normal   = texture2D(spatialTex, vec2(t, step * 2.5)).rgb;
                        return sd;
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

                      mat2 rot2d(in float a) {
                        float c = cos(a);
                        float s = sin(a);
                        return mat2(c, -s, s, c);
                      }
                      
                      vec3 rot3d(vec3 rotation, vec3 vector){
                        return vec3(vec4(vector, 1.) * rotationX(rotation.x) * rotationY(rotation.y) * rotationZ(rotation.z));
                      }
                      
                      ${shader.vertexShader}
                    `.replace(
                                        /*glsl*/`#include <beginnormal_vertex>`,
                                        /*glsl*/`#include <beginnormal_vertex>
                        vec3 totalRot = rot + (rotShift * time * 5.);
                        objectNormal = rot3d(totalRot, normal);
                      `
                                    ).replace(
                                        /*glsl*/`#include <begin_vertex>`,
                                        /*glsl*/`#include <begin_vertex>
                        float t = initPos + time * 0.005;
                        
                        float tBloom = pow(sin((t - time * 0.075) * PI2 * 3.) * 0.5 + 0.5, 0.9);
                        vTBloom = tBloom;
                        vec3 pShift = posShift.xyz;
                        pShift.xy = rot2d(-time * 0.17) * posShift.xy;
                        vec3 shiftPos = pShift * (posShift.w + tBloom * bloomable * 0.25);
                        transformed = rot3d(totalRot, position);
                        transformed += objectNormal * tBloom * bloomable * 0.25;

                        splineData spline = getSplineData(t);
                        vec3 P = spline.point;
                        vec3 B = spline.binormal;
                        vec3 N = spline.normal;

                        transformed += P + (N * shiftPos.x) + (B * shiftPos.y);
                        
                        vCenter = center;
                        vBloomable = bloomable;
                        vDist = posShift.w;
                      `
                    );
                    //console.log(shader.vertexShader);
                  shader.fragmentShader = /*glsl*/`
                      #define ss(a, b, c) smoothstep(a, b, c)
                      uniform float time;
                      varying vec3 vCenter;
                      varying float vBloomable;
                      varying float vTBloom;
                      varying float vDist;
                      ${shader.fragmentShader}
                    `.replace(
                        /*glsl*/`#include <dithering_fragment>`,
                        /*glsl*/`#include <dithering_fragment>
                        
                        float thickness = 1.5;
                        vec3 afwidth = fwidth( vCenter.xyz );
                        vec3 edge3 = smoothstep( ( thickness - 1.0 ) * afwidth, thickness * afwidth, vCenter.xyz );
                        float edge = (1.0 - min( min( edge3.x, edge3.y ), edge3.z )) * vBloomable * vTBloom;
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(1, 0.125, 0) * 0.75, ss(0.5, 0., vDist) * (1. - vTBloom)); // spline core
                        gl_FragColor.rgb = mix(gl_FragColor.rgb, vec3(0, 1, 1), edge);
                      `
                    );
                    //console.log(shader.fragmentShader);
                }
            });

        }
        function setGeometry(count) {
            var pts = [
                // https://en.wikipedia.org/wiki/Tetrahedron#Coordinates_for_a_regular_tetrahedron
                new Vector3(Math.sqrt(8 / 9), 0, -(1 / 3)),
                new Vector3(-Math.sqrt(2 / 9), Math.sqrt(2 / 3), -(1 / 3)),
                new Vector3(-Math.sqrt(2 / 9), -Math.sqrt(2 / 3), -(1 / 3)),
                new Vector3(0, 0, 1)
            ];

            var faces = [
                // triangle soup
                pts[0].clone(),
                pts[2].clone(),
                pts[1].clone(),
                pts[0].clone(),
                pts[1].clone(),
                pts[3].clone(),
                pts[1].clone(),
                pts[2].clone(),
                pts[3].clone(),
                pts[2].clone(),
                pts[0].clone(),
                pts[3].clone()
            ];

            var geom = new BufferGeometry().setFromPoints(faces);
            geom.rotateX(-Math.PI * 0.5);
            geom.computeVertexNormals();

            geom.scale(0.1, 0.1, 0.1);
            setupAttributes(geom);

            let g = new InstancedBufferGeometry().copy(geom);
            g.instanceCount = count;
            setupInstancedAttributes(g, count);

            return g;

            function setupInstancedAttributes(g, MAX_COUNT){
                let v3 =new Vector3();
                let posShift = []; //3(dir) + 1(dist) = 4
                let rot = []; //3
                let rotShift = []; //3
                let initPos = []; // 1
                let c = new Color();
                let c1 = new Color(0, 0.175, 0.25);
                let c2 = new Color(0, 0.175, 0.25).addScalar(0.25);
                let colors = []; //3 
                let bloomable = []; //1
                for (let i = 0; i < MAX_COUNT; i++) {
                    let r = 1.5;
                    v3.randomDirection().setZ(0);
                    //v3.setX(v3.x - (r * 0.5));
                    posShift.push(v3.x, v3.y, v3.z, Math.random() * r);
                    v3.randomDirection().multiplyScalar(Math.PI);
                    rot.push(v3.x, v3.y, v3.z);
                    v3.randomDirection().multiplyScalar(Math.PI * 0.1 * Math.random() + 0.01);
                    rotShift.push(v3.x, v3.y, v3.z);
                    initPos.push(Math.random());
                    let rand = 1 - Math.pow(Math.random(), 2);
                    c.lerpColors(c1, c2, rand);
                    colors.push(c.r, c.g, c.b);
                    bloomable.push(rand < 0.25 ? 1 : 0);
                }
                g.setAttribute("initPos", new InstancedBufferAttribute(new Float32Array(initPos), 1));
                g.setAttribute("posShift", new InstancedBufferAttribute(new Float32Array(posShift), 4));
                g.setAttribute("rot", new InstancedBufferAttribute(new Float32Array(rot), 3));
                g.setAttribute("rotShift", new InstancedBufferAttribute(new Float32Array(rotShift), 3));
                g.setAttribute("color", new InstancedBufferAttribute(new Float32Array(colors), 3));
                g.setAttribute("bloomable", new InstancedBufferAttribute(new Float32Array(bloomable), 1));
            }

            function setupAttributes(geometry) {

                const vectors = [
                    new Vector3(1, 0, 0),
                    new Vector3(0, 1, 0),
                    new Vector3(0, 0, 1)
                ];

                const position = geometry.attributes.position;
                const centers = new Float32Array(position.count * 3);

                for (let i = 0, l = position.count; i < l; i++) {

                    vectors[i % 3].toArray(centers, i * 3);

                }

                geometry.setAttribute('center', new BufferAttribute(centers, 3));

            }
        }
    }
}
export {FlowTetrahedrons}