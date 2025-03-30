import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 启用阻尼效果
controls.dampingFactor = 0.25; // 阻尼系数
controls.screenSpacePanning = false; // 禁用屏幕空间平移

// 创建粒子
const particles = [];
const particleCount = 100;
const cubeSize = 50; // 立方体的大小

for (let i = 0; i < particleCount; i++) {
    const geometry = new THREE.OctahedronGeometry(1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const octahedron = new THREE.Mesh(geometry, material);

    octahedron.position.set(Math.random() * 50 - 25, Math.random() * 50 - 25, Math.random() * 50 - 25);
    
    const angle = Math.random() * 2 * Math.PI;
    const speed = Math.random() * 0.2 + 0.05; // 随机速度大小
    octahedron.velocity = new THREE.Vector3(Math.cos(angle), Math.sin(angle), Math.sin(angle)).multiplyScalar(speed); // 初始速度
    
    // 设置随机的圆弧半径
    octahedron.userData.radius = Math.random() * 50 + 10; // 随机半径

    // 计算八面体的两个最长顶点向量
    const direction = directionCal(geometry);
    octahedron.userData.direction = direction;

    scene.add(octahedron);
    particles.push(octahedron);
}

camera.position.z = 100;

// 渲染循环
function animate() {
    requestAnimationFrame(animate);

    particles.forEach(particle => {
        const neighbors = particles.filter(neighbor => particle !== neighbor && particle.position.distanceTo(neighbor.position) < 50); // 定义邻居
        align(particle, neighbors);
        separate(particle, neighbors);
        cohesion(particle, neighbors);
    
        particle.position.add(particle.velocity);
    
        // 检查粒子是否接近立方体边缘，并反转速度向量
        if (Math.abs(particle.position.x) > cubeSize / 2) {
            particle.velocity.x = -particle.velocity.x;
        }
        if (Math.abs(particle.position.y) > cubeSize / 2) {
            particle.velocity.y = -particle.velocity.y;
        }
        if (Math.abs(particle.position.z) > cubeSize / 2) {
            particle.velocity.z = -particle.velocity.z;
        }
    
        // 更新速度以实现圆弧运动
        const angle = Math.atan2(particle.velocity.y, particle.velocity.x) + (0.01 / particle.userData.radius); // 每帧增加一个小角度，使用随机半径
        particle.velocity.set(Math.cos(angle), Math.sin(angle), Math.sin(angle)).multiplyScalar(particle.velocity.length());
    
        // 更新八面体的旋转，使其与速度向量对齐
        const axis = new THREE.Vector3().crossVectors(particle.userData.direction, particle.velocity).normalize();
        const angleBetween = particle.userData.direction.angleTo(particle.velocity);
        particle.quaternion.setFromAxisAngle(axis, angleBetween);
    });

    controls.update();
    renderer.render(scene, camera);
}

animate();

function directionCal(geometry) {
    const vertices = geometry.attributes.position;
    let maxDistance = 0;
    let vertex1 = new THREE.Vector3();
    let vertex2 = new THREE.Vector3();
    let tempVertex1 = new THREE.Vector3();
    let tempVertex2 = new THREE.Vector3();

    for (let j = 0; j < vertices.count; j++) {
        tempVertex1.set(vertices.getX(j), vertices.getY(j), vertices.getZ(j));
        for (let k = j + 1; k < vertices.count; k++) {
            tempVertex2.set(vertices.getX(k), vertices.getY(k), vertices.getZ(k));
            const distance = tempVertex1.distanceTo(tempVertex2);
            if (distance > maxDistance) {
                maxDistance = distance;
                vertex1.copy(tempVertex1);
                vertex2.copy(tempVertex2);
            }
        }
    }

    return new THREE.Vector3().subVectors(vertex2, vertex1).normalize();
}

function align(particle, neighbors) {
    let avgDirection = new THREE.Vector3();
    neighbors.forEach(neighbor => {
        avgDirection.add(neighbor.velocity);
    });
    if (neighbors.length > 0) {
        avgDirection.divideScalar(neighbors.length);
        avgDirection.normalize();
        //TODO: 调整插值因子
        particle.velocity.lerp(avgDirection, 0.1); 
    }
}

function separate(particle, neighbors) {
    let avoid = new THREE.Vector3();
    neighbors.forEach(neighbor => {
        const distance = particle.position.distanceTo(neighbor.position);
        if (distance < 5) { // 调整分离距离
            let diff = new THREE.Vector3().subVectors(particle.position, neighbor.position);
            diff.normalize();
            diff.divideScalar(distance);
            avoid.add(diff);
        }
    });
    particle.velocity.add(avoid);
}

function cohesion(particle, neighbors) {
    let centerOfMass = new THREE.Vector3();
    neighbors.forEach(neighbor => {
        centerOfMass.add(neighbor.position);
    });
    if (neighbors.length > 0) {
        centerOfMass.divideScalar(neighbors.length);
        let directionToCenter = new THREE.Vector3().subVectors(centerOfMass, particle.position);
        particle.velocity.lerp(directionToCenter, 0.1); // 调整插值因子
    }
}

