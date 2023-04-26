import * as THREE from 'three';

// Points

const UNIT_X = new THREE.Vector3(1, 0, 0);
const UNIT_Y = new THREE.Vector3(0, 1, 0);
const UNIT_Z = new THREE.Vector3(0, 0, 1);

function radians(degrees) {
	return degrees * Math.PI / 180;
}

// 2D Shapes

function triangle90(width, height) {
	const shape = new THREE.Shape();
	shape.moveTo(0, 0);
	shape.lineTo(width, 0);
	shape.lineTo(0, height);
	shape.lineTo(0, 0);
	return shape;
}

// 3D Shapes

function prism(shape, depth) {
	const settings = {
		depth: depth,
		bevelEnabled: false,
	};
	return new THREE.ExtrudeGeometry(shape, settings);
}

// Transformations

function setRotation(geometry, xDegrees, yDegrees, zDegrees) {
	const xRadians = radians(xDegrees);
	const yRadians = radians(yDegrees);
	const zRadians = radians(zDegrees);
	geometry.setRotationFromEuler(new THREE.Euler(xRadians, yRadians, zRadians, 'ZYX'));
}

export {
	radians,
	triangle90,
	prism,
	setRotation,
}
