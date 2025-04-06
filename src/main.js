import * as THREE from 'three';
import ModelLoader from './ModelLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Boid from './BoidClass';

// import { rawData } from './data.js';
// import sharedData from './data.js';
// import { fetchBackendData } from './fetchData.js';
// import { fetchAndParseData } from './fetchData.js';


// // 输入的数据, 越小越有序
// const idMapping = {
//     "A": "TDSIEC20001",
//     "B": "TDSIEC10004"
// };
let rawData = {};
let backendData = {};
let normalizeLyap = {};  // 用于展示的lyap指数
let lyapExponents = {};  // 存储选定的 ID 数据
let occupancyTimeSeries = {};  // 存储选定的 ID 数据
let windowSize = 10;
let stepSize = 6;
let currentIndex = 0;  // 当前索引
const sharedData = {
    occupancyTimeSeriesUsed: {},
    rawLyap: {},
    normalizedLyap: {},
    averageAlignment: {},
    averageDistance: {}
};

async function fetchData() {
    try {
        const response = await fetch("/lyapunov_results_shift.json");

        if (!response.ok) {
            throw new Error(`HTTP 错误！状态码: ${response.status}`);
        }

        const data = await response.json();
        rawData.data = data;
        processData(data);
    } catch (error) {
        console.error("获取数据失败:", error);

        if (typeof process !== "undefined" && process.exit) {
            process.exit(1);
        }
    }
}

const idMapping = {
    "A": "TDSIEC20001",
    "B": "TDSIEC10004",
};

window.addEventListener("dataInputed", (event) => {
    const receivedData = event.detail;
    processData(receivedData);
    console.log("Backend data at this time:", backendData);
}
)

function processData(data) {
    backendData = {};
    backendData = data;
    if (!backendData) {
        console.error("后端数据为空，无法处理");
        return;
    }

    windowSize = backendData.window_size;
    stepSize = backendData.step_size;
    const results = backendData.results;

    // **动态获取所有 key**
    const allKeys = Object.keys(backendData.results);
    console.log("发现的后端 ID:", allKeys);

    sharedData.rawLyap = {};
    sharedData.normalizedLyap = {};
    sharedData.occupancyTimeSeriesUsed = {};
    sharedData.averageAlignment = {};
    sharedData.averageDistance = {};
    normalizeLyap = {};  // 用于展示的lyap指数
    lyapExponents = {};  // 存储选定的 ID 数据
    occupancyTimeSeries = {}; // 存储选定的 ID 数据
    currentIndex = 0;  // 当前索引

    // **遍历所有 key，自动填充数据**
    allKeys.forEach((key) => {
        const backendId = key;
        const normalizedExponents = results[backendId]?.normalized_lyapunov_exponents;
        const exponents = results[backendId]?.lyapunov_exponents;
        const occupancy = results[backendId]?.occupancy_time_series;

        if (normalizedExponents) normalizeLyap[key] = normalizedExponents;
        if (exponents) lyapExponents[key] = exponents;
        if (occupancy) occupancyTimeSeries[key] = occupancy;

        // **填充 sharedData**
        // dataInputs[key] = normalizeLyap[key][currentIndex];
        sharedData.rawLyap[key] = lyapExponents[key][currentIndex];
        sharedData.normalizedLyap[key] = normalizeLyap[key][currentIndex];
        sharedData.occupancyTimeSeriesUsed[key] = occupancyTimeSeries[key].slice(0, 100);
        sharedData.averageAlignment[key] = "0.00%";
        sharedData.averageDistance[key] = 0;
    });
    dataInputs['A'] = normalizeLyap[allKeys[0]][currentIndex];
    dataInputs['B'] = normalizeLyap[allKeys[1]][currentIndex];

    currentIndex++;

    console.log("提取的 normalized_lyapunov_exponents:", normalizeLyap);
    console.log("提取的 lyapunov_exponents:", lyapExponents);
    console.log("提取的 occupancy_time_series:", occupancyTimeSeries);

    // **触发数据更新事件**
    const event = new CustomEvent("dataReady", { detail: sharedData });
    window.dispatchEvent(event);
}

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0xADD8E6); // 设置背景色为淡蓝色
// document.body.appendChild(renderer.domElement);
document.getElementById('three-container').appendChild(renderer.domElement);

// 添加环境光
const ambientLight = new THREE.AmbientLight(0xffffff, 0.9); // 环境光强度
scene.add(ambientLight);

// 添加日光
const sunlight = new THREE.DirectionalLight(0xffffff, 3.0); // 日光强度
sunlight.position.set(0, 50, 50); // 日光的位置
scene.add(sunlight);

const modelPathA = '/model/brid2.glb';
const modelPathB = '/model/brid1.glb';
const boids = [];
const boidsA = [];
const boidsB = [];
for (let i = 0; i < 100; i++) {
    // 偶数Boid分为组A，奇数Boid分为组B
    const groupId = i % 2 === 0 ? 'A' : 'B';
    const modelPath = groupId === 'A' ? modelPathA : modelPathB;
    const boid = new Boid(0.8, modelPath, (mesh) => {
        scene.add(mesh);
    }, groupId); // 传入groupId
    boids.push(boid);
    if (boid.groupId === 'A') {
        boidsA.push(boid);
    } else {
        boidsB.push(boid);
    }
}

window.addEventListener("selectionUpdate", function (event) {
    console.log("Received selectionUpdate:", event.detail.selectionData);

    const selectionData = event.detail.selectionData;

    boidsA.forEach(boid => {
        boid.setSpeed(selectionData.A.speed);
        boid.setVolume(selectionData.A.volume);
        console.log(`Boid A: ${boid.speed}, ${boid.volume}`);
    });

    boidsB.forEach(boid => {
        boid.setSpeed(selectionData.B.speed);
        boid.setVolume(selectionData.B.volume);
        console.log(`Boid B: ${boid.speed}, ${boid.volume}`);
    });
});

// 实例化ModelLoader
const modelLoader = new ModelLoader();
// 定义云模型的位置和缩放
const cloudConfigs = [
    { url: '/model/cloud1.glb', position: new THREE.Vector3(5, 5, 5), scale: new THREE.Vector3(1, 1, 1) },
    { url: '/model/cloud2.glb', position: new THREE.Vector3(-10, -3, 10), scale: new THREE.Vector3(1, 1, 1) },
    { url: '/model/cloud3.glb', position: new THREE.Vector3(30, -2, -20), scale: new THREE.Vector3(1, 1, 1) },
    { url: '/model/cloud1.glb', position: new THREE.Vector3(30, -2, -20), scale: new THREE.Vector3(1, 1, 1) },
    { url: '/model/cloud2.glb', position: new THREE.Vector3(5, 5, 5), scale: new THREE.Vector3(1, 1, 1) },
    { url: '/model/cloud3.glb', position: new THREE.Vector3(-10, -3, 10), scale: new THREE.Vector3(1, 1, 1) }
];
const clouds = [];
cloudConfigs.forEach((config, index) => {
    modelLoader.loadModel(config.url).then(cloudModel => {
        cloudModel.position.copy(config.position);
        cloudModel.scale.copy(config.scale).multiplyScalar(5);
        scene.add(cloudModel);
        clouds.push(cloudModel);

        console.log('Cloud model loaded:', cloudModel);
    }).catch(error => {
        console.error('Error loading cloud model:', error);
    });
});

// 添加轴辅助线
const axesHelper = new THREE.AxesHelper(1); // 参数为轴的长度
scene.add(axesHelper);

// // 定义缩放参数
// let scale = 1; // 您可以根据需要调整这个值
// // 定义控制点
// const radius = 20;
// const numPoints = 8;
// const angleStep = (2 * Math.PI) / numPoints;
// let controlPoints = [];
// for (let i = 0; i < numPoints; i++) {
//     const angle = i * angleStep;
//     const x = radius * Math.cos(angle);
//     const z = radius * Math.sin(angle);
//     const y = (Math.random() - 0.5) * 5; // Slight height variation
//     controlPoints.push(new THREE.Vector3(x, y, z));
// }
// // 应用缩放参数
// controlPoints = controlPoints.map(point => point.clone().multiplyScalar(scale));
// // 创建 Catmull-Rom 曲线
// const curve = new THREE.CatmullRomCurve3(controlPoints);
// curve.closed = true;
// // 创建用于显示轨迹的线条
// const lineMaterial = new THREE.LineBasicMaterial({ color: 0x00ff00 });
// const lineGeometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(50));
// const pathLine = new THREE.Line(lineGeometry, lineMaterial);
// // 添加轨迹线到场景中
// scene.add(pathLine);

// 设置相机位置
camera.position.set(0, 0, 55); // 确保相机位置能够看到 Boid 对象

// 创建轨道控制器，允许自由缩放和旋转视角
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // 启用阻尼效果
controls.dampingFactor = 0.25; // 阻尼系数

// 创建一个时钟对象
const clock = new THREE.Clock();

// 函数：计算中心点（质心）
function calculateCenter(boids) {
    const center = new THREE.Vector3(0, 0, 0);
    boids.forEach(boid => {
        if (boid.isReady) {
            center.add(boid.mesh.position);
        }
    });
    center.divideScalar(boids.length);
    return center;
}

function calculateAverageDistance(boids) {
    let totalDistance = 0;
    let count = 0;

    boids.forEach(boid => {
        if (!boid.isReady) return;

        const neighbors = boid.getNeighbors(boids, boid.cohesionRadius, 7, false); 
        if (neighbors.length === 0) {
            totalDistance += boid.separationRadius; // 使用默认的 separationRadius
            console.log("没有邻居，使用默认的 separationRadius "+boid.separationRadius + " boidId: " + boid.groupId);

            count += 1;
            return;
        }

        const center = neighbors.reduce(
            (acc, neighbor) => acc.add(neighbor.mesh.position.clone()),
            new THREE.Vector3(0, 0, 0)
        ).divideScalar(neighbors.length);

        const distance = boid.mesh.position.distanceTo(center);
        totalDistance += distance;
        count += 1;
    });

    return count > 0 ? totalDistance / count : 0;
}

function calculateOverallAlignment(boids) {
    let totalAlignment = 0;
    let count = 0;

    boids.forEach(boid => {
        if (!boid.isReady) return;

        const neighbors = boid.getNeighbors(boids, boid.alignmentRadius, 7, false);
        if (neighbors.length === 0) return;

        const averageNeighborDirection = neighbors.reduce(
            (acc, neighbor) => acc.add(neighbor.direction.clone()),
            new THREE.Vector3(0, 0, 0)
        ).divideScalar(neighbors.length).normalize();

        const normalizedBoidDirection = boid.direction.clone().normalize();
        const dot = normalizedBoidDirection.dot(averageNeighborDirection);

        // Mapping the dot product to a range of 0 to 1
        // This will give a value of 0 for opposite directions and 1 for same direction
        const alignment = (dot + 1) / 2;

        totalAlignment += alignment;
        count += 1;
    });

    const averageAlignment = count > 0 ? totalAlignment / count : 0;
    const alignmentPercentage = (averageAlignment * 100).toFixed(2);

    return `${alignmentPercentage}%`;
}

const dataInputs = {
    'A': 0,
    'B': 1,
};

function backExplorationCheck() {
    let number = 0;
    boids.forEach(boid => {
        if (boid.exploringBack) number += 1;
    });
    return number < Math.floor(20 + Math.random() * 3);
}

let lastExeTime = 0;
let lastExeTime2 = 0;
const exeInterval = 5;
const dataInputInterval = 30;

// 动画循环
function animate() {
    requestAnimationFrame(animate);

    clouds.forEach((cloud, index) => {
        if (index < 3) {
            cloud.position.y += Math.sin(Date.now() * 0.001 + index) * 0.001;
            cloud.position.x += Math.cos(Date.now() * 0.0015 + index * 2) * 0.01;
        } else {
            cloud.position.x += Math.cos(Date.now() * 0.0015 + (index - 3)) * 0.001;
            cloud.position.y += Math.sin(Date.now() * 0.001 + (index - 3) * 2) * 0.01;
        }
    });

    const deltaTime = clock.getDelta();

    let backExp = false;
    const currentTime = clock.getElapsedTime();
    // Evaluation interval
    if (currentTime - lastExeTime >= exeInterval) {
        lastExeTime = currentTime;
        if (backExplorationCheck()) backExp = true;

        const allKeys = Object.keys(normalizeLyap);
        console.log("🔍 发现的后端 ID:", allKeys);

        sharedData.averageDistance[allKeys[0]] = calculateAverageDistance(boidsA);
        sharedData.averageDistance[allKeys[1]] = calculateAverageDistance(boidsB);
        sharedData.averageAlignment[allKeys[0]] = calculateOverallAlignment(boidsA);
        sharedData.averageAlignment[allKeys[1]] = calculateOverallAlignment(boidsB);

        console.log(`更新 sharedData1: ${JSON.stringify(sharedData)}`);

        const event = new CustomEvent("dataReady", { detail: sharedData });
        window.dispatchEvent(event);
    }
    // Window move interval 
    if (currentTime - lastExeTime2 >= dataInputInterval) {
        lastExeTime2 = currentTime;

        const allKeys = Object.keys(normalizeLyap);
        const validKeys = allKeys.filter(key => currentIndex < normalizeLyap[key].length);

        console.log(`ValidKeys: ${validKeys}`);
        if (validKeys.length > 0) {
            dataInputs['A'] = normalizeLyap[allKeys[0]][currentIndex];
            dataInputs['B'] = normalizeLyap[allKeys[1]][currentIndex]
            validKeys.forEach((key) => {
                sharedData.rawLyap[key] = lyapExponents[key][currentIndex];
                sharedData.normalizedLyap[key] = normalizeLyap[key][currentIndex];

                const startIndex = Math.max(0, currentIndex * 6);
                const endIndex = Math.min(occupancyTimeSeries[key].length, startIndex + 100);

                sharedData.occupancyTimeSeriesUsed[key] = occupancyTimeSeries[key].slice(startIndex, endIndex);
            });

            const event = new CustomEvent("dataReady", { detail: sharedData });
            window.dispatchEvent(event);

            currentIndex++;
        } else {
            console.log("Iteration finished, no more data to process.");
        }
    }

    // New input each time
    boids.forEach(boid => {
        const dataInput = dataInputs[boid.groupId] || 0;
        if (boid.isReady) {
            boid.updateParameters(dataInput);
            boid.update(boids, deltaTime, backExp);
        }
        if (!backExplorationCheck()) backExp = false;
    });

    controls.update();
    renderer.render(scene, camera);
}

fetchData();
animate();

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});