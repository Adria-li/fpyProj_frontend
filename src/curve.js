import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// 初始化变量
let t = 0;
let speed = 0;
const deltaT = 0.01; // 时间增量
const k = 1; // 曲率系数
const maxSpeed = 0.05; // 最大速度
const minSpeed = 0.01; // 最小速度
const gravity = -0.1; // 重力加速度

// 创建场景
const scene = new THREE.Scene();

// 创建相机
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 20, 50); // 将相机位置向后移动
camera.lookAt(0, 0, 0); // 确保相机朝向场景中心

// 创建渲染器
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// 创建轨道控制器
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 启用阻尼效果
controls.dampingFactor = 0.25;
controls.screenSpacePanning = false;
controls.maxPolarAngle = Math.PI / 2;

// 调整控制点以使轨迹更接近圆形
const radius = 20;
const numPoints = 8;
const angleStep = (2 * Math.PI) / numPoints;

const controlPoints = [];
for (let i = 0; i < numPoints; i++) {
    const angle = i * angleStep;
    const x = radius * Math.cos(angle);
    const z = radius * Math.sin(angle); // 将 y 改为 z
    const y = 0; // 保持在同一平面上
    controlPoints.push(new THREE.Vector3(x, y, z));
}
// 添加少许上下变换
const heightVariation = 5; // 高度变化幅度
for (let i = 0; i < controlPoints.length; i++) {
    controlPoints[i].y = (Math.random() - 0.5) * heightVariation; // 将 z 改为 y
}


// 定义缩放函数
function scaleControlPoints(points, scale) {
    return points.map(point => point.clone().multiplyScalar(scale));
}

// 缩放控制点
const scaledControlPoints = scaleControlPoints(controlPoints, 1); // 例如，按1.5倍缩放

// 创建 CatmullRomCurve3 对象
const curve = new THREE.CatmullRomCurve3(scaledControlPoints, true); // 设置 closed 参数为 true

// 创建曲线的路径表示
const points = curve.getPoints(100); // 增加点的数量以提高曲线的平滑度
const geometry = new THREE.BufferGeometry().setFromPoints(points);
const material = new THREE.LineBasicMaterial({ color: 0xff0000 });
const curveObject = new THREE.Line(geometry, material);
scene.add(curveObject);

// 创建物体
const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const boxMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
const object = new THREE.Mesh(boxGeometry, boxMaterial);
scene.add(object);
// 添加轴辅助线
const axesHelper = new THREE.AxesHelper(1); // 参数为轴的长度
scene.add(axesHelper);
// 动画函数
function animate() {
    requestAnimationFrame(animate);

    // 获取当前和下一点位置
    const currentPoint = curve.getPointAt(t);
    const nextPoint = curve.getPointAt((t + deltaT) % 1);

    // 计算当前切线向量
    const tangent = new THREE.Vector3().subVectors(nextPoint, currentPoint).normalize();
    const nextTangent = curve.getTangent((t + deltaT) % 1).normalize();

    // 估算曲率，并以曲率为基础计算加速度
    const curvature = tangent.angleTo(nextTangent) / deltaT;
    const acceleration = k * curvature;

    // 计算重力在当前速度方向上的分量
    const gravityEffect = gravity * Math.sin(tangent.angleTo(new THREE.Vector3(0, 0, -1)));

    // 更新速度大小
    speed += (acceleration + gravityEffect) * deltaT;

    // 限制速度在上下限之间
    speed = Math.max(minSpeed, Math.min(maxSpeed, speed));

    // 更新位置参数 t
    t = (t + speed * deltaT) % 1; // 确保 t 在 [0,1] 范围内

    // 更新物体位置和方向
    object.position.set(currentPoint.x, currentPoint.y, currentPoint.z);
    object.lookAt(currentPoint.clone().add(tangent)); // 将物体朝向速度方向

    controls.update(); // 更新控制器
    renderer.render(scene, camera);
}

// 启动动画
animate();