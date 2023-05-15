import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import * as ThreeD from './three-d.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
	75, window.innerWidth / window.innerHeight, 0.1, 1000
);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const centre = new THREE.Vector3(0, 0, 0);
const points = ThreeD.regularPolygonPoints(24, [1, 1.1, 1, 0.4]);
const geometry = ThreeD.polygonGeometry(points, centre, ThreeD.AxesPlane.XY);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

camera.position.x = 0;
camera.position.y = 0;
camera.position.z = 5;

const controls = new OrbitControls(camera, renderer.domElement);

function animate() {
	renderer.render(scene, camera);
	requestAnimationFrame(animate);
}
animate();
