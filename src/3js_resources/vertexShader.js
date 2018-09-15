uniform vec3 viewVector;
uniform float c;
uniform float p;
varying float intensity;

void main() {
	vec3 vNormal1 = normalize( normalMatrix * normal );
	vec3 vNormal2 = normalize( normalMatrix * viewVector );
	intensity = pow( c - dot(vNormal1, vNormal2), p );

	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}