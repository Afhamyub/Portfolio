/* GPU energy field. The portfolio's existing render loop owns scheduling. */
window.createJourneyEnergy = function (canvas) {
  const gl=canvas.getContext('webgl',{alpha:true,antialias:false,depth:false,premultipliedAlpha:false,powerPreference:'low-power'});
  if(!gl){canvas.classList.add('energy-fallback');return {draw(){},resize(){}};}
  const vertex='attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
  const fragment=`precision mediump float;
    uniform vec2 size;uniform float time;uniform float progress;
    float light(float d,float w){return exp(-d*d/(w*w));}
    void main(){
      vec2 uv=gl_FragCoord.xy/size;float y=1.-uv.y;float x=uv.x-.5;
      float t=time*.22;
      float spine=.055*sin(y*11.+t*.63)+.018*sin(y*23.-t*.35);
      vec3 color=vec3(0.);
      for(int i=0;i<20;i++){
        float n=float(i);float phase=n*2.399;
        // Scroll winds the emerging strands into the bundle. Projecting a helix
        // gives every strand a front/back orbit, rather than a sideways wiggle.
        float tip=progress+.016*sin(phase+progress*4.);
        float formed=smoothstep(0.,.16,tip-y);
        float angle=y*43.+phase+t+progress*13.+(1.-formed)*3.4;
        float depth=.5+.5*cos(angle);
        float radius=mix(.054,.021,formed)*( .8+.2*sin(phase));
        float braid=radius*sin(angle)+.003*sin(y*79.-t*.7+phase);
        float d=abs(x-spine-braid);
        float reveal=1.-smoothstep(tip-.028,tip+.007,y);
        float width=mix(.0007,.0015,depth);
        float pulse=.64+.36*pow(.5+.5*sin(y*25.-time*.85+phase),5.);
        float strand=light(d,width)*.38+light(d,.004)*.10+light(d,.016)*.018+light(d,.035)*.005;
        float front=mix(.22,1.,depth);
        color+=mix(vec3(.40,.64,.84),vec3(.86,.94,1.),depth)*strand*pulse*front*reveal;
      }
      float ends=smoothstep(0.,.035,y)*(1.-smoothstep(.96,1.,y));
      color=vec3(1.)-exp(-color*1.7);
      gl_FragColor=vec4(color*ends,1.);
    }`;
  function compile(type,source){const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){gl.deleteShader(shader);return null;}return shader;}
  const vs=compile(gl.VERTEX_SHADER,vertex),fs=compile(gl.FRAGMENT_SHADER,fragment);
  if(!vs||!fs){canvas.classList.add('energy-fallback');return {draw(){},resize(){}};}
  const program=gl.createProgram();gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);
  if(!gl.getProgramParameter(program,gl.LINK_STATUS)){canvas.classList.add('energy-fallback');return {draw(){},resize(){}};}
  gl.useProgram(program);
  const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
  const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
  const uniforms={size:gl.getUniformLocation(program,'size'),time:gl.getUniformLocation(program,'time'),progress:gl.getUniformLocation(program,'progress')};
  let lost=false;canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();lost=true;canvas.classList.add('energy-fallback');});
  return {
    resize(){const rect=canvas.getBoundingClientRect();canvas.width=Math.max(1,Math.round(rect.width));canvas.height=Math.max(1,Math.min(1600,Math.round(rect.height)));gl.viewport(0,0,canvas.width,canvas.height);},
    draw(time,progress){if(lost)return;gl.uniform2f(uniforms.size,canvas.width,canvas.height);gl.uniform1f(uniforms.time,time*.001);gl.uniform1f(uniforms.progress,progress);gl.drawArrays(gl.TRIANGLES,0,6);}
  };
};
