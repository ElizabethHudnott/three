//Version 0.151.3
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as ThreeD from './three-d.js';

const panelWidths = [9];
const panelAspectRatios = [1.5];
const numbersOfSlices = [9];
const images = [[]];
const sideLengths = [[1, 1]];
const borderColors = [['#ff00ff']];
const alignments = [[0.5]];

const canvases = [[document.createElement('CANVAS')]];
const prismFaces = [];
const lentils = [];

const scene = new THREE.Scene();
// 114 degree horizontal field of view by 60 degree vertical
const sceneAspect = 2 * Math.sin(ThreeD.radians(54));
const camera = new THREE.PerspectiveCamera(60, sceneAspect, 0.1, 1000 );
const renderer = new THREE.WebGLRenderer({
	canvas: document.getElementById('three'),
	antialias: true,
});

function resize() {
	const availableWidth = window.innerWidth;
	const availableHeight = window.innerHeight;
	let width = Math.round(availableHeight * sceneAspect);
	let height = availableHeight;
	if (width > availableWidth) {
		width = availableWidth;
		height = Math.round(width / sceneAspect);
	}
	renderer.setSize(width, height);
}
resize();
window.addEventListener('resize', resize);
document.body.appendChild(renderer.domElement);

const imageLoader = new THREE.ImageLoader();

function sliceImage(canvas, image, aspectRatio, numSlices, borderColor, vAlign) {
	const sourceWidth = image.naturalWidth;
	const sourceHeight = image.naturalHeight;
	let width, sliceWidth, imageWidth, leftClip, leftPad;
	if (aspectRatio > sourceWidth / sourceHeight) {
		sliceWidth = Math.round(aspectRatio * sourceHeight / numSlices);
		width = sliceWidth * numSlices;
		imageWidth = sourceWidth;
		leftClip = 0;
		leftPad = Math.trunc(0.5 * (width - imageWidth));
	} else {
		sliceWidth = Math.trunc(sourceWidth / numSlices);
		width = sliceWidth * numSlices;
		imageWidth = width;
		leftClip = Math.trunc(0.5 * (sourceWidth - imageWidth));
		leftPad = 0;
	}
	const height = Math.round(width / aspectRatio);
	const topPad = Math.trunc(vAlign * (height - sourceHeight));
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext('2d');
	context.fillStyle = borderColor;
	context.fillRect(0, 0, width, topPad);	// Top
	context.fillRect(0, topPad, leftPad, height - topPad);	// Left
	context.fillRect(leftPad + imageWidth, topPad, leftPad + 1, height - topPad);	// Right
	context.fillRect(leftPad, topPad + sourceHeight, imageWidth, height - topPad - sourceHeight);	// Bottom
	context.drawImage(image, leftClip, 0, imageWidth, sourceHeight, leftPad, topPad, imageWidth, sourceHeight);

	const textures = new Array(numSlices);
	const xScale = sliceWidth / width;
	for (let i = 0; i < numSlices; i++) {
		const texture = new THREE.CanvasTexture(canvas);
		texture.offset.setX((i * sliceWidth) / width);
		texture.repeat.setX(xScale);
		texture.flipY = false;
		textures[i] = texture;
	}
	// y-scale needs to equal the aspect ratio of the surface (a)
	// y-offset needs to equal 1 - a
	return textures;
}

function createSlices(panelNumber, imageNumber) {
	const hypotenuse = Math.hypot(...sideLengths[panelNumber]);
	const multiplier = sideLengths[panelNumber][imageNumber] / hypotenuse;
	const aspectRatio = multiplier * panelAspectRatios[panelNumber];

	const image = images[panelNumber][imageNumber];
	const canvas = canvases[panelNumber][imageNumber];
	const numSlices = numbersOfSlices[panelNumber];
	const borderColor = borderColors[panelNumber][imageNumber];
	const vAlign = alignments[panelNumber][imageNumber];

	const slices = sliceImage(canvas, image, aspectRatio, numSlices, borderColor, vAlign);
	lentil.material = new THREE.MeshBasicMaterial({map: slices[3]});
}

function loadImage(filename, panelNumber, imageNumber) {
	imageLoader.load('./img/' + filename, function (image) {
		images[panelNumber][imageNumber] = image;
		createSlices(panelNumber, imageNumber);
	});
}

function getLentilAspect(panelNumber) {
	const panelSideLengths = sideLengths[panelNumber];
	const hypotenuse = Math.hypot(...panelSideLengths);
	const panelWidth = panelWidths[panelNumber];
	const scaledHypotenuse = panelWidth / numbersOfSlices[panelNumber];
	const scale = scaledHypotenuse / hypotenuse;
	const length1 = panelSideLengths[0] * scale;
	const length2 = panelSideLengths[1] * scale;
	const height = panelWidth / panelAspectRatios[panelNumber];
	return height / length1;
}

const triangle = ThreeD.triangle90(1, 1);
let a = getLentilAspect(0);
const geometry = ThreeD.prism(triangle, a);
const material = new THREE.MeshBasicMaterial({color: 0x000000});
const lentil = new THREE.Mesh(geometry, material);
ThreeD.setRotation(lentil, -90, 45, 0);
loadImage('champenois.jpg', 0, 0);
scene.add(lentil);

camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement );

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}
animate();
