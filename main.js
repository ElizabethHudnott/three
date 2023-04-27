//Version 0.151.3
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as ThreeD from './three-d.js';

const panelWidths = [9];
const images = [[]];
const sideLengths = [[(1186 / 640) / (770 / 442), 1]];
const panelAspectRatios = [Math.hypot(sideLengths[0][0], 1) * 770 / 442];
const borderColors = [['blue', 'blue']];
const alignments = [[0.5, 0.5]];

const canvases = [
	[document.createElement('CANVAS'), document.createElement('CANVAS')]
];
const lentilMeshes = [[[], []]];	// panel number, image number, slice number

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
		texture.offset.set((i * sliceWidth) / width, 0);
		texture.repeat.set(xScale, 1);
		texture.needsUpdate = true;
		textures[i] = texture;
	}
	return textures;
}

function createSlices(panelNumber, imageNumber) {
	const hypotenuse = Math.hypot(...sideLengths[panelNumber]);
	const multiplier = sideLengths[panelNumber][imageNumber] / hypotenuse;
	const aspectRatio = multiplier * panelAspectRatios[panelNumber];

	const image = images[panelNumber][imageNumber];
	const canvas = canvases[panelNumber][imageNumber];
	const meshes = lentilMeshes[panelNumber][imageNumber];
	const numSlices = meshes.length;
	const borderColor = borderColors[panelNumber][imageNumber];
	const vAlign = alignments[panelNumber][imageNumber];

	if (meshes[0].material.map !== null) {
		for (let i = 0; i < numSlices; i++) {
			const material = meshes[i].material;
			const texture = material.map;
			material.map = null;
			texture.dispose();
		}
	}

	const slices = sliceImage(canvas, image, aspectRatio, numSlices, borderColor, vAlign);
	for (let i = 0; i < numSlices; i++) {
		const material = meshes[i].material;
		material.map = slices[i];
		material.needsUpdate = true;
	}
}

function loadImage(filename, panelNumber, imageNumber) {
	imageLoader.load('./img/' + filename, function (image) {
		images[panelNumber][imageNumber] = image;
		createSlices(panelNumber, imageNumber);
	});
}

function makeLentils(panelNumber, numSlices) {
	const side1Meshes = lentilMeshes[panelNumber][0];
	const side2Meshes = lentilMeshes[panelNumber][1];
	if (numSlices === undefined) {
		numSlices = side1Meshes.length;
	}
	const panelSideLengths = sideLengths[panelNumber];
	const hypotenuse = Math.hypot(...panelSideLengths);
	const panelWidth = panelWidths[panelNumber];
	const scaledHypotenuse = panelWidth / numSlices;
	const scale = scaledHypotenuse / hypotenuse;
	const length1 = panelSideLengths[0] * scale;
	const length2 = panelSideLengths[1] * scale;
	const height = panelWidth / panelAspectRatios[panelNumber];

	for (let i = 0; i < numSlices; i++) {
		const side1Geometry = new THREE.PlaneGeometry(length1, height);
		side1Geometry.rotateY(0.25 * Math.PI);
		const positionX = i * scaledHypotenuse;
		side1Geometry.translate(positionX, 0, 0);
		const side1Material = new THREE.MeshBasicMaterial({});
		const side1Mesh = new THREE.Mesh(side1Geometry, side1Material);
		scene.add(side1Mesh);
		const side2Geometry = new THREE.PlaneGeometry(length2, height);
		side2Geometry.translate(0.5 * length2, 0, -0.5 * length1);
		side2Geometry.rotateY(-0.25 * Math.PI);
		side2Geometry.translate(positionX, 0, 0);
		const side2Material = new THREE.MeshBasicMaterial({});
		const side2Mesh = new THREE.Mesh(side2Geometry, side2Material);
		scene.add(side2Mesh);
		side1Meshes[i] = side1Mesh;
		side2Meshes[i] = side2Mesh;
	}
}

makeLentils(0, 9);
loadImage('champenois.jpg', 0, 0);
loadImage('futuristic-freeway.jpg', 0, 1);

camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement );

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}
animate();
