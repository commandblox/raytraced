var targetFps = 60;
var canvas;
var ctx;

var running = true;
var prevTime = Date.now();

var elapsedTime = 0;
var startTime;

var currentFrame = [];

var width = 192;
var height = 108;

var camera = {
    x: 96, 
    y: 54
}


function distance(x1,y1,x2,y2) { 
    if(!x2) x2=0; 
    if(!y2) y2=0;
    return Math.sqrt((x2-x1)*(x2-x1)+(y2-y1)*(y2-y1)); 
}

function getMousePos(evt) {
    var rect = canvas.getBoundingClientRect(), // abs. size of element
    scaleX = width / rect.width,    // relationship bitmap vs. element for x
    scaleY = height / rect.height;  // relationship bitmap vs. element for y

    return {
        x: (evt.clientX - rect.left) * scaleX,   // scale mouse coordinates after they have
        y: (evt.clientY - rect.top) * scaleY     // been adjusted to be relative to element
    }
}

class Color {
    r;g;b;

    constructor(r, g, b) {
        this.r = r;
        this.g = g;
        this.b = b;
    }
}

class Pixel {
    color;
    reflective;reflectAngle;reflectRandom = 0;
    opacity;warp = 0;
    constructor(color, reflective, opacity) {
        this.color = color;
        this.reflective = reflective;
        this.opacity = opacity;
    }
    evaluateRay(ray) {
        ray.strength *= 1 - this.opacity;
        ray.speed    *= 1 - this.warp;

        if (ray.strength <= 0.001) {
            ray.running = false;
        } else {
            if (this.reflective) {
                let randomWarp = 0;
                if (this.reflectRandom != 0) {randomWarp = (Math.random() - 0.5) * this.reflectRandom;}
                ray.direction -= this.reflectAngle + randomWarp;
                ray.direction = -ray.direction;
                ray.direction += this.reflectAngle - randomWarp;
            } else {
                ray.color = this.color;
            }
        }
    }
}

class Ray {
    color;
    x;y;direction;startDirection
    strength = 1;speed = 1;
    running = true;distanceTravelled = 0;
    constructor(x, y, direction, color) {
        this.x = x;
        this.y = y;
        this.direction = direction;
        this.startDirection = direction;
        this.color = color;
    }

    getColor() {
        let color = this.color;
        color.r *= this.strength;
        color.g *= this.strength;
        color.b *= this.strength;
        return color;
    }

    tickRay() {
        this.x += Math.sin(this.direction) * this.speed;
        this.y += Math.cos(this.direction) * this.speed;
        this.distanceTravelled += 1;
        getOccupancy(this.x, this.y).evaluateRay(this);
    }
}

function onWindowResize() {
    let width = window.innerWidth * 0.7;
    let height = width * (9/16)
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
}

function onLoad() {
    canvas = document.getElementById("canvas");
    onWindowResize();
    window.onresize = onWindowResize; 
    
    ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    startTime = Date.now();
    canvas.onmousemove = function(evt) {
        var pos = getMousePos(evt);
        camera.x = pos.x;
        camera.y = pos.y;
    }
}

function gameTick() {
    elapsedTime = Date.now() - startTime;
    drawFrame(Date.now() - prevTime);
    prevTime = startTime;

    if (running) {
        setTimeout(gameTick, 1/targetFps - (Date.now() - prevTime));
    }
}

function getColor(x, y, deltaTime) {
    return colorAvg(currentFrame[x][y]);
}

function drawFrame(deltaTime) {
    ctx.clearRect(0, 0, width, height);

    for (let x = 0; x < width; x++) {
        currentFrame[x] = [];
        for (let y = 0; y < height; y++) {
            currentFrame[x][y] = [];
        }
    }

    raytrace();

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            setPixel(x, y, getColor(x, y));
        } 
    }
}

function raytrace() {
    for (let x = 0; x < canvas.width; x++) {
        shootRay(x, 0)
        shootRay(x, height - 1)
      }
      for (let y = 0; y < canvas.height; y++) {
        shootRay(0, y)
        shootRay(width - 1, y)
      }
}

function colorAvg(colors) {
    let colorSum = new Color(0, 0, 0);
    colors.forEach(color => {
        colorSum.r += color.r;
        colorSum.g += color.g;
        colorSum.b += color.b;
    });
    colorSum.r /= colors.length;
    colorSum.g /= colors.length;
    colorSum.b /= colors.length;
    return colorSum;
}

function setPixel(x, y, color) {
    ctx.fillStyle = `rgb(${color.r} ${color.g} ${color.b})`
    ctx.fillRect(x, y, 1, 1);
}

function addColor(x, y, color) {
    currentFrame[Math.floor(x)][Math.floor(y)].push(color);
}

function shootRay(x, y) {
    let ray = new Ray(camera.x, camera.y, Math.atan2(x - camera.x, y - camera.y), new Color(0, 0, 0));
    while (true) {
        let point = pointFromAngle(camera.x, camera.y, ray.startDirection, ray.distanceTravelled);
        if (ray.running && isInArea(0, 0, width, height, point.x, point.y)) {
            ray.tickRay();
            addColor(point.x, point.y, ray.getColor());
        } else {break}
    }
}

function pointFromAngle(x, y, angle, distance) {
    var result = {};

    result.x = Math.sin(angle) * distance + x;
    result.y = Math.cos(angle) * distance + y;

    return result;
}

function getOccupancy(x, y) {
    let pixel = new Pixel(new Color(127, 127, 127), false, 0);

    if (isInArea(20, 20, 20, 20, x, y)) {
        pixel.opacity = 0.2;
        pixel.color = new Color(20, 120, 220);
    }
    if (x > 80) {
        pixel.reflective = true;
        pixel.reflectAngle = 0;
        pixel.opacity = 0.1;
    }
    return pixel;
}
9
function isInArea(ax, ay, aw, ah, x, y) {
    return x > ax && y > ay && x < (ax + aw) && y < (ay + ah)
}

window.onload = () => {
    onLoad();
    gameTick();
}