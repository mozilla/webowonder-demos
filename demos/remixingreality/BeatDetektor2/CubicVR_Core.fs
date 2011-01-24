#ifdef GL_ES
precision highp float;
#endif

uniform vec3 mDiff;

varying vec3 vNormal;
varying vec2 vTextureCoord;
varying vec3 o_norm;

#if hasColorMap
	uniform sampler2D colorMap;
#endif

#if hasBumpMap
	varying vec3 eyeVec; 
	// varying vec3 u;
	uniform sampler2D bumpMap;
#endif


#if hasEnvSphereMap
	uniform sampler2D envSphereMap;
//	uniform float envAmount;
#if hasNormalMap
 	varying vec3 u;
#else
	varying vec2 vEnvTextureCoord;
#endif
#endif

#if hasNormalMap
	uniform sampler2D normalMap;
#endif

uniform mat4 uOMatrix;


#if lightPoint||lightDirectional||lightSpot||lightArea
	uniform vec3 lDiff;
	uniform vec3 lSpec;
	uniform float lInt;
	uniform float lDist;
	uniform vec3 lAmb;
	uniform vec3 lPos;

	uniform vec3 mSpec;
	uniform float mShine;
#endif

#if lightDirectional||lightSpot||lightArea
	uniform vec3 lDir;
#endif

varying vec3 camPos;
varying vec3 v_n;
varying vec3 g_norm;
varying vec4 vPosition;

void main(void) 
{
	vec3 n;
	vec3 view_norm;
	vec4 color;

#if hasBumpMap
  float height = texture2D(bumpMap, vTextureCoord.xy).r;  
  float v = (height) * 0.05 - 0.04; // * scale and - bias 
  vec3 eye = normalize(eyeVec); 
  vec2 texCoord = vTextureCoord.xy + (eye.xy * v);
#else
	vec2 texCoord = vTextureCoord;
#endif


#if hasNormalMap
 		vec3 bumpNorm = vec3(texture2D(normalMap, texCoord));

#if hasEnvSphereMap
		view_norm = normalize(((bumpNorm-0.5)*2.0));
#endif
		bumpNorm = (uOMatrix * vec4(normalize(((bumpNorm)*2.0)),0.0)).xyz; 
		
		n = normalize(vNormal+normalize(bumpNorm));
//		n = normalize(vNormal);
		
#else
		n = normalize(vNormal);
		view_norm = normalize(v_n);
#endif


#if hasColorMap
	color = texture2D(colorMap, vec2(texCoord.s, texCoord.t));
#else
	color = vec4(1.0,1.0,1.0,1.0);
#endif

float envAmount = 0.6;

#if hasEnvSphereMap
#if hasNormalMap
	vec3 r = reflect( u, view_norm );
	float m = 2.0 * sqrt( r.x*r.x + r.y*r.y + (r.z+1.0)*(r.z+1.0) );

	vec3 coord;
	coord.s = r.x/m + 0.5;
	coord.t = r.y/m + 0.5;
	
	// #if hasReflectionMap
	// 	color += texture2D( envSphereMap, coord.st) * texture2D( reflectionMap, texCoord);
	// #else
		color = color*(1.0-envAmount) + texture2D( envSphereMap, coord.st) * envAmount;//envAmount;
	// #endif

#else
	// #if hasReflectionMap
	// 	color += texture2D( envSphereMap, gl_TexCoord[1].st) * texture2D( reflectionMap, texCoord);
	// #else
	 	color = color*(1.0-envAmount) + texture2D( envSphereMap, vEnvTextureCoord)*envAmount;
	// #endif
#endif

#endif


#if lightPoint
	vec3 halfV,viewV,ldir;
	float NdotL,NdotHV;

	vec3 lightPos = lPos;
	vec3 lightDir = lPos-vPosition.xyz;
//	vec3 halfVector = normalize(lightDir-camPos);
	float dist = length(lightDir);

	// compute the dot product between normal and normalized lightdir 
	NdotL = max(dot(n,normalize(lightDir)),0.0);

	vec3 lit = vec3(0,0,0);

	if (NdotL > 0.0) 
	{
		// basic diffuse
		float distSqr = dot(lightDir, lightDir);
		float att = clamp(((lDist-dist)/lDist)*lInt, 0.0, lInt);			
//		color.rgb = att * (lDiff * NdotL);
		
		lit = att * NdotL * lDiff;

		// specular highlight
		// halfV = normalize(halfVector);
		// NdotHV = max(dot(n,halfV),0.0);
		// color += att * specVal * lSpec * pow(NdotHV,1.0);
	}
	
	color.rgb *= lit;
#endif

#if lightDirectional

	float NdotL,NdotHV;

	vec3 lightDir;
	vec3 halfVector;
	vec3 lit = lAmb;

	lightDir = normalize(lDir);
	halfVector = normalize((normalize(-camPos)+normalize(lightDir)).xyz);

	NdotL = max(dot(n,lightDir),0.0);

	if (NdotL > 0.0) 
	{
		lit += lInt * mDiff * lDiff * NdotL;		
	}

	NdotHV = max(dot(n, halfVector),0.0001);

	lit += mSpec * lSpec * pow(NdotHV,mShine);
	
	color.rgb *= lit;
#endif

gl_FragColor = color;

//gl_FragColor = vec4(1.0,0.0,1.0,0.0);

}