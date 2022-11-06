attribute vec2 aTexCoord;
attribute vec3 aPosition;

// This is a varying variable, which in shader terms means that it will be passed from the vertex shader to the fragment shader
varying vec2 vTexCoord;
varying highp vec2 vVertTexCoord;

void main(void) {
      // Copy the texcoord attributes into the varying variable
  vTexCoord = aTexCoord;
   
  vec4 positionVec4 = vec4(aPosition, 1.0);
  positionVec4.xy = positionVec4.xy * 2.0 ;
  
  // if we wanted to warp the plane we'd do it here  
    
  gl_Position = positionVec4;
    
}