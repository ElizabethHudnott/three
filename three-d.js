import * as THREE from 'three';

const AxesPlane = Object.freeze({
	XY: 6,
	XZ: 5,
	YZ: 3,
});


// Utilities

function gcd(a, b) {
	while (b !== 0) {
		[a, b] = [b, a % b];
	}
	return a;
}

// Points

function radians(degrees) {
	return degrees * Math.PI / 180;
}

/** Detect and remove co-linear points;
 */
function removeColinear(points) {
	const numPoints = points.length >> 1;
	if (numPoints <= 1) {
		return points;
	}

	let prevX = points[0];
	let prevY = points[1];
	let x = points[2];
	let y = points[3];
	const newPoints = [prevX, prevY];

	for (let i = 1; i < numPoints; i++) {
		const nextIndex = 2 * ((i + 1) % numPoints);
		const nextX = points[nextIndex];
		const nextY = points[nextIndex + 1];
		if (
			(x !== prevX || y !== prevY) &&
			(nextIndex !== 0 || nextX !== x || nextY !== y)
		) {
			const m1 = (y - prevY) / (x - prevX);
			const m2 = (nextY - y) / (nextX - x);
			if (m1 !== m2) {
				newPoints.push(x, y);
			}
		}
		prevX = x;
		prevY = y;
		x = nextX;
		y = nextY;
	}
	return new Float32Array(newPoints);
}

function regularPolygonPoints(
	numSides, radii, stretch = 1, rotation = 0, turnThrough = 2 * Math.PI
) {
	let points, divisor, index;
	if (turnThrough === 2 * Math.PI) {
		points = new Float32Array(2 * numSides);
		divisor = numSides;
		index = 0;
	} else {
		points = new Float32Array(2 * (numSides + 1));
		divisor = numSides - 1;
		index = 2;
	}
	const numRadii = radii.length;
	for (let i = 0; i < numSides; i++) {
		const angle = -(turnThrough * i / divisor + rotation);
		const radius = radii[i % numRadii];
		const x = stretch * radius * Math.sin(angle);
		const y = radius * Math.cos(angle);
		points[index] = x;
		index++;
		points[index] = y;
		index++;
	}
	return points;
}

/**
 * @param {number} dilation Between -1 and 1.
 */
function starPolygonPoints(
	numSides, starFactor, radius, dilation = 0,	rotation = 0, includedSides = numSides
) {
	if (starFactor % numSides <= 1) {
		return regularPolygonPoints(numSides, [radius], 1, rotation);
	}

	let radius2;
	if (numSides / starFactor === 2) {
		radius2 = 0;
	} else {
		// x11 = 0, y11 = 1, i.e. first line, first point
		// c1 = 1
		let angle = -2 * Math.PI * starFactor / numSides;
		const x12 = Math.sin(angle);
		const y12 = Math.cos(angle);
		const m1 = (y12 - 1) / x12;
		angle = -2 * Math.PI / numSides;
		const x21 = Math.sin(angle);
		const y21 = Math.cos(angle);
		angle = -2 * Math.PI * (1 + starFactor) / numSides;
		const x22 = Math.sin(angle);
		const y22 = Math.cos(angle);
		const m2 = (y22 - y21) / (x22 - x21);
		const c2 = y21 - m2 * x21;
		// m1 * intersectionX + c1 = m2 * intersectionX + c2		(same y-coordinate)
		const intersectionX = (c2 - 1) / (m1 - m2);
		const intersectionY = m1 * intersectionX + 1;
		// Then by Pythagoras.
		radius2 = radius * Math.hypot(intersectionX, intersectionY);
	}

	if (dilation >= 0) {
		radius2 = radius * dilation + radius2 * (1 - dilation);
	} else {
		radius2 = radius2 * (1 + dilation);
	}

	let points, index;
	if (includedSides === numSides) {
		points = new Float32Array(4 * numSides);
		index = 0;
	} else {
		points = new Float32Array(4 * includedSides + 2);
		const angle = -(2 * Math.PI * (numSides - 0.5) / numSides + rotation);
		points[0] = radius2 * Math.sin(angle);
		points[1] = radius2 * Math.cos(angle);
		index = 2;
	}

	for (let i = 0; i < numSides; i++) {
		const angle1 = -(2 * Math.PI * i / numSides + rotation);
		const x1 = radius * Math.sin(angle1);
		const y1 = radius * Math.cos(angle1);
		const angle2 = -(2 * Math.PI * (i + 0.5) / numSides + rotation);
		const x2 = radius2 * Math.sin(angle2);
		const y2 = radius2 * Math.cos(angle2);
		points[index] = x1;
		points[index + 1] = y1;
		points[index + 2] = x2;
		points[index + 3] = y2;
		index += 4;
	}
	return points;
}

function cyclicPoints(angles, radius1, radius2 = radius1) {
	const numSides = angles.length;
	const points = new Float32Array(2 * numSides);
	let index = 0;
	for (let i = 0; i < numSides; i++) {
		const angle = -angles[i];
		const x = radius1 * Math.sin(angle);
		const y = radius2 * Math.cos(angle);
		points[index] = x;
		index++;
		points[index] = y;
		index++;
	}
	return points;
}

function tangentialPolygonPoints(angles, radius1, radius2 = radius1) {

}

function parallelPolylinePoints(points, translateX, translateY, scaleX = 1, scaleY = 1) {
	const numPoints = points.length >> 1;
	const polygonPoints = new Float32Array(4 * numPoints);
	for (let i = 0; i < numPoints; i++) {
		let index = 2 * i;
		const x = points[index];
		polygonPoints[index] = x;
		index++;
		const y = points[index];
		polygonPoints[index] = y;
		index = 2 * (2 * numPoints - 1 - i);
		const x2 = x * scaleX + translateX;
		const y2 = y * scaleY + translateY;
		polygonPoints[index] = x2;
		polygonPoints[index + 1] = y2;
	}
	return removeColinear(polygonPoints);
}

function parallelPolylinePoints2(
	points, translateY, centreDeltaX1, centreDeltaX2 = centreDeltaX1, mirrored = true
) {
	const numPoints = points.length >> 1;
	const polygonPoints = new Float32Array(4 * numPoints + 4);
	const scaleY = mirrored ? -1 : 1;
	let index;
	for (let i = 0; i < numPoints; i++) {
		index = 2 * i;
		const x = points[index];
		polygonPoints[index] = x;
		index++;
		const y = points[index];
		polygonPoints[index] = y;
		index = 2 * (2 * numPoints - i);
		const y2 = y * scaleY + translateY;
		polygonPoints[index] = x;
		polygonPoints[index + 1] = y2;
	}
	index = 2 * numPoints;
	polygonPoints[index] = points[index - 2] + centreDeltaX1;
	const middleY = 0.5 * translateY;
	polygonPoints[index + 1] = middleY;
	index = 4 * numPoints + 2;
	polygonPoints[index] = points[0] + centreDeltaX2;
	polygonPoints[index + 1] = middleY;
	return removeColinear(polygonPoints);
}

/**Rotates a polyline about (0, 0) and joins the two polylines together.
 * @param {number} centreR1 The radius at the angle halfway between the two endpoints, or
 * undefined to join the endpoints using a straight line.
 */
function rotatedPolylinePoints(points, angle, centreR1, centreR2, mirrored = true) {
	const numPoints = points.length >> 1;
	const polygonPoints = new Float32Array(4 * numPoints + 4);
	const scaleTheta = mirrored ? -1 : 1;
	let index;
	for (let i = 0; i < numPoints; i++) {
		index = 2 * i;
		const x = points[index];
		polygonPoints[index] = x;
		index++;
		const y = points[index];
		polygonPoints[index] = y;
		index = 2 * (2 * numPoints - i);
		const radius = Math.hypot(x, y);
		const theta = Math.atan2(y, x);
		const theta2 = angle + scaleTheta * theta;
		polygonPoints[index] = radius * Math.cos(theta2);
		polygonPoints[index + 1] = radius * Math.sin(theta2);
	}
	index = 2 * numPoints;
	const cos = Math.cos(0.5 * angle);
	const sin = Math.sin(0.5 * angle);
	if (centreR1 === undefined) {
		polygonPoints[index] = polygonPoints[index - 2];
		polygonPoints[index + 1] = polygonPoints[index - 1];
	} else {
		polygonPoints[index] = centreR1 * cos;
		polygonPoints[index + 1] = centreR1 * sin;
	}
	index = 4 * numPoints + 2;
	if (centreR2 === undefined) {
		polygonPoints[index] = polygonPoints[0];
		polygonPoints[index + 1] = polygonPoints[1];
	} else {
		polygonPoints[index] = centreR2 * cos;
		polygonPoints[index + 1] = centreR2 * sin;
	}
	return removeColinear(polygonPoints);
}

function polarToRectPoints(angles, radii) {
	const numSides = angles.length;
	const points = new Float32Array(2 * numSides);
	let index = 0;
	for (let i = 0; i < numSides; i++) {
		const angle = -angles[i];
		const radius = radii[i] ?? radii[0];
		const x = radius * Math.sin(angle);
		const y = radius * Math.cos(angle);
		points[index] = x;
		index++;
		points[index] = y;
		index++;
	}
	return points;
}

function points2DTo3D(relativePoints, centre, orientation, extraPoints = 0) {
	const numPoints = relativePoints.length >> 1;
	const vertices = new Float32Array(3 * (numPoints + 1 + extraPoints));
	switch (orientation) {
	case AxesPlane.XY:
		for (let i = 0; i < numPoints; i++) {
			const offset2 = i << 1;
			const offset3 = offset2 + i;
			vertices[offset3] = relativePoints[offset2] + centre.x;
			vertices[offset3 + 1] = relativePoints[offset2 + 1] + centre.y;
			vertices[offset3 + 2] = centre.z;
		}
		break;
	case AxesPlane.XZ:
		for (let i = 0; i < numPoints; i++) {
			const offset2 = i << 1;
			const offset3 = offset2 + i;
			vertices[offset3] = relativePoints[offset2] + centre.x;
			vertices[offset3 + 1] = centre.y;
			vertices[offset3 + 2] = -relativePoints[offset2 + 1] + centre.z;
		}
		break;
	default:
		for (let i = 0; i < numPoints; i++) {
			const offset2 = i << 1;
			const offset3 = offset2 + i;
			vertices[offset3] = centre.x;
			vertices[offset3 + 1] = relativePoints[offset2 + 1] + centre.y;
			vertices[offset3 + 2] = -relativePoints[offset2] + centre.z;
		}
	}

	// Compute centroid
	let totalX = 0, totalY = 0, totalZ = 0;
	let offset = 0;
	for (let i = 0; i < numPoints; i++) {
		totalX += vertices[offset];
		totalY += vertices[offset + 1];
		totalZ += vertices[offset + 2];
		offset += 3;
	}
	vertices[offset] = totalX / numPoints;
	vertices[offset + 1] = totalY / numPoints;
	vertices[offset + 2] = totalZ / numPoints;
	return vertices;
}

// Transformations

function setRotation(geometry, xDegrees, yDegrees, zDegrees) {
	const xRadians = radians(xDegrees);
	const yRadians = radians(yDegrees);
	const zRadians = radians(zDegrees);
	geometry.setRotationFromEuler(new THREE.Euler(xRadians, yRadians, zRadians, 'ZYX'));
}


// Geometries

function polygonGeometry(relativePoints, centre, orientation) {
	const numPoints = relativePoints.length >> 1;
	const vertices = points2DTo3D(relativePoints, centre, orientation);

	const faces = new Array(3 * numPoints);
	for (let i = 0; i < numPoints; i++) {
		const offset = 3 * i;
		faces[offset] = i;
		faces[offset + 1] = (i + 1) % numPoints;
		faces[offset + 2] = numPoints;
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setIndex(faces);
	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
	return geometry;
}


// Meshes

/**
 * @param {number} [vertexAlignedToApex] Selects the nth and n+1th vertices from the polygon.
 * @param {number} [apexVertexInterpolation] How far to move along the line between the two
 * selected vertices (between 0 and 1).
 * @param {number} [obliqueness] How much to shift the apex away from the centre of the polygon
 * and towards the selected edge.
 */
function pyramid(
	polygonPoints, centre, orientation, height, hasBase = true, materials = [],
	vertexAlignedToApex = 0, apexVertexInterpolation = 0.5, obliqueness = 0
) {

}

export {
	AxesPlane,
	gcd,
	radians,
	removeColinear,
	regularPolygonPoints,
	starPolygonPoints,
	cyclicPoints,
	polarToRectPoints,
	parallelPolylinePoints,
	parallelPolylinePoints2,
	rotatedPolylinePoints,
	setRotation,
	polygonGeometry,
}
