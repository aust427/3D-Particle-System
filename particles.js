
var gl;
var canvas;
var shaderProgram;
var vertexPositionBuffer;

var days=0;

// holds pressed keys for input
var currentlyPressedKeys = {}

// Create a place to store sphere geometry
var sphereVertexPositionBuffer;

//Create a place to store normals for shading
var sphereVertexNormalBuffer;
var cubeVertexNormalBuffer;

//Create a place to store cube plane
var cubeVertexBuffer;
var cubeTriIndexBuffer;
var vertexColorBuffer;

// View parameters
var eyePt = vec3.fromValues(-1.3, -.4, 3.0);
var viewDir = vec3.fromValues(0.5,0.0,-1.0);
var up = vec3.fromValues(0.0,1.0,0.0);
var viewPt = vec3.fromValues(0.0,0.0,0.0);

//gravity 
g = -0.2;

//drag coefficient 
drag = 0.9;

//constant time 
var time = 0.3;

// array to hold positions of all aprticles
var pos  = [];

//arr ay to hold velocities
vel = [];

// initial number of particles
  var j = 20; 

// array of mat properties for kd
var kdarr = [];

// normals for the box
var normCube = [];

// Create the normal
var nMatrix = mat3.create();

// Create ModelView matrix
var mvMatrix = mat4.create();

//Create Projection matrix
var pMatrix = mat4.create();

var mvMatrixStack = [];

//-------------------------------------------------------------------------
function setupSphereBuffers() {
    
    var sphereSoup=[];
    var sphereNormals=[];
    var numT=sphereFromSubdivision(6,sphereSoup,sphereNormals);
    console.log("Generated ", numT, " triangles"); 
    sphereVertexPositionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);      
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereSoup), gl.STATIC_DRAW);
    sphereVertexPositionBuffer.itemSize = 3;
    sphereVertexPositionBuffer.numItems = numT*3;
    console.log(sphereSoup.length/9);
    
    // Specify normals to be able to do lighting calculations
    sphereVertexNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(sphereNormals),
                  gl.STATIC_DRAW);
    sphereVertexNormalBuffer.itemSize = 3;
    sphereVertexNormalBuffer.numItems = numT*3;
    
    console.log("Normals ", sphereNormals.length/3);     
}

//-------------------------------------------------------------------------
function drawSphere(){
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexPositionBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, sphereVertexPositionBuffer.itemSize, 
                         gl.FLOAT, false, 0, 0);

 // Bind normal buffer
 gl.bindBuffer(gl.ARRAY_BUFFER, sphereVertexNormalBuffer);
 gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 
                           sphereVertexNormalBuffer.itemSize,
                           gl.FLOAT, false, 0, 0);
 gl.drawArrays(gl.TRIANGLES, 0, sphereVertexPositionBuffer.numItems);      
}

//-------------------------------------------------------------------------
function uploadModelViewMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
}

//-------------------------------------------------------------------------
function uploadProjectionMatrixToShader() {
  gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, 
                      false, pMatrix);
}

//-------------------------------------------------------------------------
function uploadNormalMatrixToShader() {
  mat3.fromMat4(nMatrix,mvMatrix);
  mat3.transpose(nMatrix,nMatrix);
  mat3.invert(nMatrix,nMatrix);
  gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, nMatrix);
}

//----------------------------------------------------------------------------------
function mvPushMatrix() {
    var copy = mat4.clone(mvMatrix);
    mvMatrixStack.push(copy);
}


//----------------------------------------------------------------------------------
function mvPopMatrix() {
    if (mvMatrixStack.length == 0) {
      throw "Invalid popMatrix!";
    }
    mvMatrix = mvMatrixStack.pop();
}

//----------------------------------------------------------------------------------
function setMatrixUniforms() {
    uploadModelViewMatrixToShader();
    uploadNormalMatrixToShader();
    uploadProjectionMatrixToShader();
}

//----------------------------------------------------------------------------------
function degToRad(degrees) {
        return degrees * Math.PI / 180;
}

//----------------------------------------------------------------------------------
function createGLContext(canvas) {
  var names = ["webgl", "experimental-webgl"];
  var context = null;
  for (var i=0; i < names.length; i++) {
    try {
      context = canvas.getContext(names[i]);
    } catch(e) {}
    if (context) {
      break;
    }
  }
  if (context) {
    context.viewportWidth = canvas.width;
    context.viewportHeight = canvas.height;
  } else {
    alert("Failed to create WebGL context!");
  }
  return context;
}

//----------------------------------------------------------------------------------
function loadShaderFromDOM(id) {
  var shaderScript = document.getElementById(id);
  
  // If we don't find an element with the specified id
  // we do an early exit 
  if (!shaderScript) {
    return null;
  }
  
  // Loop through the children for the found DOM element and
  // build up the shader source code as a string
  var shaderSource = "";
  var currentChild = shaderScript.firstChild;
  while (currentChild) {
    if (currentChild.nodeType == 3) { // 3 corresponds to TEXT_NODE
      shaderSource += currentChild.textContent;
    }
    currentChild = currentChild.nextSibling;
  }
 
  var shader;
  if (shaderScript.type == "x-shader/x-fragment") {
    shader = gl.createShader(gl.FRAGMENT_SHADER);
  } else if (shaderScript.type == "x-shader/x-vertex") {
    shader = gl.createShader(gl.VERTEX_SHADER);
  } else {
    return null;
  }
 
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);
 
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(gl.getShaderInfoLog(shader));
    return null;
  } 
  return shader;
}

//----------------------------------------------------------------------------------
function setupShaders() {
  vertexShader = loadShaderFromDOM("shader-vs");
  fragmentShader = loadShaderFromDOM("shader-fs");
  
  shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert("Failed to setup shaders");
  }

  gl.useProgram(shaderProgram);

  shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");
  gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);

  shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
  gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);

  shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
  shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
  shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
    
  shaderProgram.uniformLightPositionLoc = gl.getUniformLocation(shaderProgram, "uLightPosition");    
  shaderProgram.uniformAmbientLightColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientLightColor");  
  shaderProgram.uniformDiffuseLightColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseLightColor");
  shaderProgram.uniformSpecularLightColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularLightColor");
    
  shaderProgram.uniformAmbientMatColorLoc = gl.getUniformLocation(shaderProgram, "uAmbientMatColor");  
  shaderProgram.uniformDiffuseMatColorLoc = gl.getUniformLocation(shaderProgram, "uDiffuseMatColor");
  shaderProgram.uniformSpecularMatColorLoc = gl.getUniformLocation(shaderProgram, "uSpecularMatColor");    
    
}


//-------------------------------------------------------------------------
function uploadLightsToShader(loc,a,d,s) {
  gl.uniform3fv(shaderProgram.uniformLightPositionLoc, loc);
  gl.uniform3fv(shaderProgram.uniformAmbientLightColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseLightColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularLightColorLoc, s);
}

//-------------------------------------------------------------------------
function uploadMaterialToShader(a,d,s) {
  gl.uniform3fv(shaderProgram.uniformAmbientMatColorLoc, a);
  gl.uniform3fv(shaderProgram.uniformDiffuseMatColorLoc, d);
  gl.uniform3fv(shaderProgram.uniformSpecularMatColorLoc, s);
}


//----------------------------------------------------------------------------------
function setupBuffers() {
    setupSphereBuffers();  
    setupCubeBuffers();
}

function setupCubeBuffers(){
cubeVertexBuffer = gl.createBuffer();

  // Select the cubeVerticesBuffer as the one to apply vertex
  // operations to from here out.
var a = 1.0;
  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);

  // Now create an array of vertices for the cube.

  var vertices = [
    // Front face
    -a, -a,  a,
     a, -a,  a,
     a,  a,  a,
    -a,  a,  a,

    // Back face
    -a, -a, -a,
    -a,  a, -a,
     a,  a, -a,
     a, -a, -a,

    // Top face
    -a,  a, -a,
    -a,  a,  a,
     a,  a,  a,
     a,  a, -a,

    // Bottom face
    -a, -a, -a,
     a, -a, -a,
     a, -a,  a,
    -a, -a,  a,

    // Right face
     a, -a, -a,
     a,  a, -a,
     a,  a,  a,
     a, -a,  a,

    // Left face
    -a, -a, -a,
    -a, -a,  a,
    -a,  a,  a,
    -a,  a, -a
  ];

  // Now pass the list of vertices into WebGL to build the shape. We
  // do this by creating a Float32Array from the JavaScript array,
  // then use it to fill the current vertex buffer.

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
    
// cubeVertexNormalBuffer = gl.createBuffer();
 //   gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
//gl.bufferData(gl.ARRAYB_BUFFER, new Float32Array(normCube), gl.STATIC_DRAW);
    
  cubeTriIndexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);

  // This array defines each face as two triangles, using the
  // indices into the vertex array to specify each triangle's
  // position.

  var cubeVertexIndices = [
    0,  1,  2,      0,  2,  3,    // front
    4,  5,  6,      4,  6,  7,    // back
    8,  9,  10,     8,  10, 11,   // top
    12, 13, 14,     12, 14, 15,   // bottom
    16, 17, 18,     16, 18, 19,   // right
    20, 21, 22,     20, 22, 23    // left
  ]

  // Now send the element array to GL

  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,
      new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
}

function drawCube(){

  // Draw the cube by binding the array buffer to the cube's vertices
  // array, setting attributes, and pushing it to GL.

  gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexBuffer);
  gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, 3, gl.FLOAT, false, 0, 0);

  // Draw the cube.
    
 // gl.bindBuffer(gl.ARRAY_BUFFER, vertexColorBuffer);
 // gl.vertexAttribPointer(shaderProgram.vertexColorAttribute, vertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);
    
 //gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexNormalBuffer);
 //gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, 3, gl.FLOAT, false, 0, 0);

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 6, gl.UNSIGNED_SHORT, 12*3);
    

  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeTriIndexBuffer);
  setMatrixUniforms();
  gl.drawElements(gl.TRIANGLES, 0, gl.UNSIGNED_SHORT, 12*4);
}
//----------------------------------------------------------------------------------
function draw() { 
    var transformVec = vec3.create();
  
    gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // We'll use perspective 
    mat4.perspective(pMatrix,degToRad(45), gl.viewportWidth / gl.viewportHeight, 0.1, 200.0);

    // We want to look down -z, so create a lookat point in that direction    
    vec3.add(viewPt, eyePt, viewDir);
    // Then generate the lookat matrix and initialize the MV matrix to that view
    mat4.lookAt(mvMatrix,eyePt,viewPt,up);    
 
    // Set up light parameters
    var Ia = vec3.fromValues(0.0,0.0,0.0);
    var Id = vec3.fromValues(1.0,1.0,1.0);
    var Is = vec3.fromValues(1.0,1.0,1.0);
    
    var lightPosEye4 = vec4.fromValues(0.0,0.0,3.0, 0.0);
    lightPosEye4 = vec4.transformMat4(lightPosEye4,lightPosEye4,mvMatrix);
    var lightPosEye = vec3.fromValues(lightPosEye4[0],lightPosEye4[1],lightPosEye4[2]);
    
    //draw Sun
    // Set up material parameters    
    var ka = vec3.fromValues(0.0,0.0,0.0);
    var ks = vec3.fromValues(0.4,0.4,0.0);
    
    // draw the particles first
    for (var i = 0; i < j; i++){
        mvPushMatrix();
        
        var kd = vec3.fromValues(kdarr[3*i],kdarr[3*i+1],kdarr[3*i+2]);
        
        vec3.set(transformVec, 0.05, 0.05, 0.05);
        mat4.scale(mvMatrix, mvMatrix,transformVec);
        
        vec3.set(transformVec, pos[3*i], pos[1+3*i], pos[2+3*i]);
        mat4.translate(mvMatrix, mvMatrix, transformVec);
        
        uploadLightsToShader(lightPosEye,Ia,Id,Is);
        uploadMaterialToShader(ka,kd,ks);
        setMatrixUniforms();
        drawSphere();
        mvPopMatrix();
    }
    
    // begin doing collision checks 
    for (var i = 0; i < j; i++){
        
        var swit = false; 
        
        var x = 3*i;
        var y = 3*i + 1;
        var z = 3*i + 2;

        // collision check formula for all six faces
        // note that the 0.05 factor is because of the scaling..
        for (var k = 0; k <6; k++){
            var n = [normCube[3*k] / 0.05, normCube[3*k+1] / 0.05, normCube[3*k+2] / 0.05];
            
            var v = [vel[x], vel[y], vel[z]];
            
            var C = [pos[x] * 0.05, pos[y] * 0.05, pos[z] * 0.05];
            var r = 0.05;
            
            // dp = plane distance
            var dp = [-1*n[0], -1*n[1], -1*n[2]];
            
            // substitute sphere coordinates for the 0s in the normal vector
            for (var l = 0; l < 3; l++){
                if (dp[l] == 0){
                    dp[l] == C[l];
                }
            }
            
            var d = distForm(C, dp);
            var rit = rdotv(n, C) - d;

            rit = rit / rdotv(n, v) ;
            var lone = r - rit;
            var ltwo = -1*r - rit;
            
            // get the time away for both sides of the sphere
            var Tplus = Math.abs(lone);
            var Tminus = Math.abs(ltwo);
            
            // take the shorter time
            t = Math.min(Tplus, Tminus);
   
            // if the shorter time is smaller than the time given...
            if (t < time){
                
                // velocity flip 
                if (k == 4 || k == 5){
                    vel[x] = -1*vel[x];
                }
                else if (k == 2 || k == 3){
                    vel[y] = -1*vel[y];
                }
                else{
                    vel[z] = -1*vel[z];
                } 
                
                swit = true;
                // position calculations 
                vel[x] = vel[x] * Math.pow(drag, t);
                pos[x] = pos[x] + vel[x]*t / 0.5 ;

                vel[y] = vel[y] * Math.pow(drag, t) + t * g;
                pos[y] = pos[y] + vel[y]*t / 0.5;

                vel[z] = vel[z] * Math.pow(drag, t);
                pos[z] = pos[z] + vel[z]*t / 0.5;

                }
             }
            
        // if true, won't tunnel under the barrier 
        if (swit == false){
            vel[x] = vel[x] * Math.pow(drag, time);
            pos[x] = pos[x] + vel[x]*time / 0.5;


            vel[y] = vel[y] * Math.pow(drag, time) + time * g;
            pos[y] = pos[y] + vel[y]*time / 0.5;

            vel[z] = vel[z] * Math.pow(drag, time);
            pos[z] = pos[z] + vel[z]*time / 0.5;
        }


        time = 0.2;

    } 
    
    // sphere generation : 10 spheres 
    if(currentlyPressedKeys[68]){
    for (var i = 0; i < 30; i++){
        
        // for random velocity directions 
          var s = Math.random();
          if (s < 0.5){
              s = -1;
          }
          pos.push(2*(Math.random() - 1));
          vel.push(2*s*Math.random());
          kdarr.push(Math.random());
        }
            j += 10;
    }

}

// calculates the dot product
// @input: two vectors that are 3D
// @output: a scalar value 
function rdotv(a, b){
    var res = a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
    return res;
}

// calculates the Manhattan distance between two points
// @input: two vectors that are 3D
// @output: a scalar value 
function distForm(a, b){
    var res = Math.pow((a[0] - b[0]), 2) + Math.pow((a[1] - b[1]), 2) + Math.pow((a[2] - b[2]), 2);
    res = Math.sqrt(res);
    return Math.abs(res);
}

//----------------------------------------------------------------------------------
function animate() {
    days=days+0.5;
}

/**
 * key being pressed down is true
 */
function handleKeyDown(event) {
currentlyPressedKeys[event.keyCode] = true;
}

/**
 * key being pressed down is false
 */
function handleKeyUp(event) {
currentlyPressedKeys[event.keyCode] = false;
}

//----------------------------------------------------------------------------------
function startup() {
  canvas = document.getElementById("myGLCanvas");
  gl = createGLContext(canvas);
  setupShaders();
  setupBuffers();
  gl.clearColor(0.0, 1.0, 1.0, 1.0);
    
  document.onkeydown = handleKeyDown;
  document.onkeyup = handleKeyUp;

    normCube = [0,  0,  1,
                 0,  0,  -1,
                 0, 1,  0,
                 0, -1,  0,
                 1,  0, 0,
                 -1,  0,  0];
    
  gl.enable(gl.DEPTH_TEST);
    
  for (var i = 0; i < 3*j; i ++){
      pos.push(2*(Math.random() - 1));
      vel.push(2*Math.random());
      kdarr.push(Math.random());
      
      var s = Math.random();
      if (s < 0.5){
          vel[i] *= -1;
      }
  }

  tick();
}

//----------------------------------------------------------------------------------
function tick() {
    requestAnimFrame(tick);
    draw();
    animate();
}
