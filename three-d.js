import * as THREE from 'three';

// Points

const UNIT_X = new THREE.Vector3(1, 0, 0);
const UNIT_Y = new THREE.Vector3(0, 1, 0);
const UNIT_Z = new THREE.Vector3(0, 0, 1);

function radians(degrees) {
	return degrees * Math.PI / 180;
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
	setRotation,
}
