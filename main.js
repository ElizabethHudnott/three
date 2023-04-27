//Uses Three.js version 0.151.3.
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as ThreeD from './three-d.js';

// Here are some configuration parameters. More are located near the bottom of this file.

// The widths of each panel.
const panelWidths = [9];
// The relative widths of each slice within a panel, indexed by panel number and face number.
const sideLengths = [[(1186 / 640) / (770 / 442), 1]];
// The aspect ratios of each panel.
const panelAspectRatios = [Math.hypot(sideLengths[0][0], 1) * 770 / 442];
// The angle that each face forms with its neighbour, in radians.
const lentilAngles = [[0.5 * Math.PI]];
/* The colours used to add padding, if any is needed in order to cope with an image aspect
 * ratio that doesn't comply with the aspect ratio implied by sideLengths and
 * panelAspectRatios. Indexed by panel number and face number.
 */
const borderColors = [['blue', 'blue']];
/* The vertical alignment of each image within a panel when padding is needed. Indexed by
 * panel number and face number.  0 = top, 0.5 = middle, 1 = bottom */
const alignments = [[0.5, 0.5]];


// Internal data storage.

// Binary data for the source images, indexed by panel number and face number.
const images = [[]];
// Temporary working spaces for 2D drawing, indexed by panel number and face number.
const canvases = [
	[document.createElement('CANVAS'), document.createElement('CANVAS')]
];
const backsideLengths = [];
// 3D triangle meshes indexed by panel number, face number and slice number.
const lentilMeshes = [[[], []]];


const scene = new THREE.Scene();
// Use a 114 degree horizontal field of view and 60 degrees vertically.
const sceneAspect = 2 * Math.sin(ThreeD.radians(54));
const camera = new THREE.PerspectiveCamera(60, sceneAspect, 0.1, 1000);
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
	const hypotenuse = backsideLengths[panelNumber];
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

function optimizePanel2(panelNumber) {
	const panelImages = images[panelNumber];
	const image1 = panelImages[0];
	const image2 = panelImages[1];
	const aspect1 = image1.naturalWidth / image1.naturalHeight;
	const aspect2 = image2.naturalWidth / image2.naturalHeight;
	const panelSideLengths = sideLengths[panelNumber];
	let minAspect;
	if (aspect1 >= aspect2) {
		panelSideLengths[0] = aspect1 / aspect2;
		panelSideLengths[1] = 1;
		minAspect = aspect2;
	} else {
		panelSideLengths[0] = 1;
		panelSideLengths[1] = aspect2 / aspect1;
		minAspect = aspect1;
	}
	const halfAngle = 0.5 * (Math.PI - lentilAngles[panelNumber][0]);
	const cos = Math.cos(halfAngle);
	const hypotenuse = (panelSideLengths[0] + panelSideLengths[1]) * cos;
	panelAspectRatios[panelNumber] = hypotenuse * minAspect;
}

function loadImage(filename, panelNumber, imageNumber) {
	imageLoader.load('./img/' + filename, function (image) {
		images[panelNumber][imageNumber] = image;
		createSlices(panelNumber, imageNumber);
	});
}

function makeLentils2(panelNumber, numSlices) {
	const side1Meshes = lentilMeshes[panelNumber][0];
	const side2Meshes = lentilMeshes[panelNumber][1];
	if (numSlices === undefined) {
		numSlices = side1Meshes.length;
	}
	const halfAngle = 0.5 * (Math.PI - lentilAngles[panelNumber][0]);
	const cos = Math.cos(halfAngle);
	const sin = Math.sin(halfAngle);
	const panelSideLengths = sideLengths[panelNumber];
	let length1 = panelSideLengths[0];
	let length2 = panelSideLengths[1];
	const hypotenuse = (length1 + length2) * cos;
	backsideLengths[panelNumber] = hypotenuse;
	const panelWidth = panelWidths[panelNumber];
	const scaledHypotenuse = panelWidth / numSlices;
	const scale = scaledHypotenuse / hypotenuse;
	const height = panelWidth / panelAspectRatios[panelNumber];
	length1 *= scale;
	length2 *= scale;
	const vector1 = new THREE.Vector3(length1 * cos, 0, -length1 * sin);
	const vector2 = new THREE.Vector3(length2 * cos, 0, length2 * sin);
	const translateVector = vector1.clone();
	translateVector.add(vector2);
	vector1.normalize();
	vector2.normalize();
	translateVector.normalize();

	for (let i = 0; i < numSlices; i++) {
		const side1Geometry = new THREE.PlaneGeometry(length1, height);
		side1Geometry.rotateY(halfAngle);
		const translateAmount = i * scaledHypotenuse;
		const side1Material = new THREE.MeshBasicMaterial({});
		const side1Mesh = new THREE.Mesh(side1Geometry, side1Material);
		side1Mesh.translateOnAxis(translateVector, translateAmount);
		scene.add(side1Mesh);
		const side2Geometry = new THREE.PlaneGeometry(length2, height);
		side2Geometry.rotateY(-halfAngle);
		const side2Material = new THREE.MeshBasicMaterial({});
		const side2Mesh = new THREE.Mesh(side2Geometry, side2Material);
		side2Mesh.translateOnAxis(vector1, 0.5 * length1);
		side2Mesh.translateOnAxis(vector2, 0.5 * length2);
		side2Mesh.translateOnAxis(translateVector, translateAmount);
		scene.add(side2Mesh);
		side1Meshes[i] = side1Mesh;
		side2Meshes[i] = side2Mesh;
	}
}

// More configuration parameters.

// Create geometry for the first panel (Panel 0) with spaces for 2 images and 9 slices per image.
makeLentils2(0, 9);
// Load img/champenois.jpg into Panel 0, Face 0.
loadImage('champenois.jpg', 0, 0);
// Load futuristic-freeway.jpg into Panel 0, Face 1.
loadImage('futuristic-freeway.jpg', 0, 1);


// Camera, animation and UI programming.

camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement );

function animate() {
	requestAnimationFrame(animate);
	renderer.render(scene, camera);
}
animate();
