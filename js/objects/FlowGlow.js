import { Data3DTexture } from "three";
import { RepeatWrapping } from "three";
import { RawShaderMaterial } from "three";
import { Color } from "three";
import { LinearFilter } from "three";
import { AdditiveBlending } from "three";
import { CylinderGeometry } from "three";
import { MeshBasicMaterial } from "three";
import { Mesh } from "three";
import { GLSL3 } from "three";
import { BoxGeometry } from "three";
import { RedFormat } from "three";
import { Vector3 } from "three";
import { ImprovedNoise } from "three/examples/jsm/math/ImprovedNoise";

class FlowGlow extends Mesh{
    constructor(camera){

        super();
        this.camera = camera;
        // Texture

        const size = 128;
        const data = new Uint8Array(size * size * size);

        let i = 0;
        const scale = 0.05;
        const perlin = new ImprovedNoise();
        const vector = new Vector3();

        for (let z = 0; z < size; z++) {

            for (let y = 0; y < size; y++) {

                for (let x = 0; x < size; x++) {

                    const d = 1.0 - vector.set(x, y, z).subScalar(size / 2).divideScalar(size).length();
                    data[i] = (128 + 128 * perlin.noise(x * scale / 1.5, y * scale, z * scale / 1.5)) * d * d;
                    i++;

                }

            }

        }

        const texture = new Data3DTexture(data, size, size, size);
        texture.format = RedFormat;
        texture.minFilter = LinearFilter;
        texture.magFilter = LinearFilter;
        texture.wrapR = texture.wrapS = texture.wrapT = RepeatWrapping;
        texture.unpackAlignment = 1;
        texture.needsUpdate = true;

        // Material

        const vertexShader = /* glsl */`
					in vec3 position;
					uniform mat4 modelMatrix;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					uniform vec3 cameraPos;
					out vec3 vOrigin;
					out vec3 vDirection;
					void main() {
						vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
						vOrigin = vec3( inverse( modelMatrix ) * vec4( cameraPos, 1.0 ) ).xyz;
						vDirection = position - vOrigin;
						gl_Position = projectionMatrix * mvPosition;
					}
				`;

        const fragmentShader = /* glsl */`
					precision highp float;
					precision highp sampler3D;
					uniform mat4 modelViewMatrix;
					uniform mat4 projectionMatrix;
					in vec3 vOrigin;
					in vec3 vDirection;
					out vec4 color;
					uniform vec3 base;
					uniform sampler3D map;
					uniform float threshold;
					uniform float range;
					uniform float opacity;
					uniform float steps;
					uniform float frame;
					uint wang_hash(uint seed)
					{
							seed = (seed ^ 61u) ^ (seed >> 16u);
							seed *= 9u;
							seed = seed ^ (seed >> 4u);
							seed *= 0x27d4eb2du;
							seed = seed ^ (seed >> 15u);
							return seed;
					}
					float randomFloat(inout uint seed)
					{
							return float(wang_hash(seed)) / 4294967296.;
					}
					vec2 hitBox( vec3 orig, vec3 dir ) {
						const vec3 box_min = vec3( - 0.5 );
						const vec3 box_max = vec3( 0.5 );
						vec3 inv_dir = 1.0 / dir;
						vec3 tmin_tmp = ( box_min - orig ) * inv_dir;
						vec3 tmax_tmp = ( box_max - orig ) * inv_dir;
						vec3 tmin = min( tmin_tmp, tmax_tmp );
						vec3 tmax = max( tmin_tmp, tmax_tmp );
						float t0 = max( tmin.x, max( tmin.y, tmin.z ) );
						float t1 = min( tmax.x, min( tmax.y, tmax.z ) );
						return vec2( t0, t1 );
					}
					float sample1( vec3 p ) {
						return texture( map, p ).r;
					}
					float shading( vec3 coord ) {
						float step = 0.01;
						return sample1( coord + vec3( - step ) ) - sample1( coord + vec3( step ) );
					}
					void main(){
						vec3 rayDir = normalize( vDirection );
						vec2 bounds = hitBox( vOrigin, rayDir );
						if ( bounds.x > bounds.y ) discard;
						bounds.x = max( bounds.x, 0.0 );
						vec3 p = vOrigin + bounds.x * rayDir;
						vec3 inc = 1.0 / abs( rayDir );
						float delta = min( inc.x, min( inc.y, inc.z ) );
						delta /= steps;
						// Jitter
						// Nice little seed from
						// https://blog.demofox.org/2020/05/25/casual-shadertoy-path-tracing-1-basic-camera-diffuse-emissive/
						uint seed = uint( gl_FragCoord.x ) * uint( 1973 ) + uint( gl_FragCoord.y ) * uint( 9277 ) + uint( frame ) * uint( 26699 );
						vec3 size = vec3( textureSize( map, 0 ) );
						float randNum = randomFloat( seed ) * 2.0 - 1.0;
						p += rayDir * randNum * ( 1.0 / size );
						//
						vec4 ac = vec4( base, 0.0 );
						for ( float t = bounds.x; t < bounds.y; t += delta ) {
							float d = sample1( p + 0.5 );
							d = smoothstep( threshold - range, threshold + range, d ) * opacity;
							float col = shading( p + 0.5 ) * 3.0 + ( ( p.x + p.y ) * 0.25 ) + 0.2;
							ac.rgb += ( 1.0 - ac.a ) * d * col;
							ac.a += ( 1.0 - ac.a ) * d;
							if ( ac.a >= 0.95 ) break;
							p += rayDir * delta;
						}
						color = ac;
						if ( color.a == 0.0 ) discard;
					}
				`;

        const geometry = new CylinderGeometry(0.5, 0.5, 1);
        const material = new RawShaderMaterial({
            glslVersion: GLSL3,
            blending: AdditiveBlending,
            uniforms: {
                time: { value: 0},
                base: { value: new Color(0x007fff) },
                map: { value: texture },
                cameraPos: { value: new Vector3()},
                threshold: { value: 0.25 },
                opacity: { value: 0.025 },
                range: { value: 0.1 },
                steps: { value: 32 },
                frame: { value: 0 }
            },
            vertexShader,
            fragmentShader,
            //side: THREE.BackSide,
            transparent: true
        });

        this.geometry = geometry;
        this.material = material;
        this.scale.set(10, 20, 10);

        this.update = t => {
            this.rotation.y = t * 0.25;
            material.uniforms.time.value = t;
            material.uniforms.cameraPos.value.copy(this.camera.position);
        }
    }
}
export {FlowGlow}