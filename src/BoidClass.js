import * as THREE from 'three';
import ModelLoader from './ModelLoader.js';

class Boid {

    constructor(size, modelPath, onLoadCallback, groupId = '0') {
        this.parameterRanges = {
            separationRadius: { min: 2, max: 6 },
            separationStrength: { min: 0.1, max: 0.5 },

            alignmentRadius: { min: 4, max: 6 },
            alignmentStrength: { min: 0.05, max: 0.3 },

            cohesionRadius: { min: 4, max: 6 },
            cohesionStrength: { min: 0.05, max: 0.3 }
        };
        this.scaledRanges = JSON.parse(JSON.stringify(this.parameterRanges));
        // 初始参数
        this.groupId = groupId; // 添加组特征
        this.separationRadius = 1;  // 20到30之间
        this.separationStrength = 0.1; // 0.01到0.05之间
        this.interGroupSeparationStrength = 0.3; // 异组分离力强度
        this.alignmentRadius = 2;   // 50到70之间
        this.alignmentStrength = 0.05; // 0.02到0.1之间
        this.cohesionRadius = 3;    // 70到100之间
        this.cohesionStrength = 0.03;  // 0.01到0.05之间
        this.followStrength = 0.15;  // 0.005到0.02之间
        this.folloR = 4;

        this.frontAttractor = new THREE.Vector3(0, 0, 80); // 前方吸引点
        this.backBoundary = -60; // 后方的边界

        this.size = size;
        this.t = 0;
        this.speed = 7;
        this.maxSpeed = 10;
        this.minSpeed = 5;
        this.acceleration = 0;

        this.a = new THREE.Vector3(0, 0, 0);
        this.boundarySize = 20;
        this.modelLoader = new ModelLoader();

        // 探索状态
        this.exploringBack = false;

        // 设置方向和辅助箭头
        const dir = new THREE.Vector3(0, 0, 1);
        this.direction = dir.clone().normalize();
        const origin = new THREE.Vector3(0, 0, 0);
        const length = 1;
        const hex = groupId === 'A' ? 0x0000ff : groupId === 'B' ? 0xffff00 : 0xffffff; // 根据组设置箭头颜色
        this.arrowHelper = new THREE.ArrowHelper(dir, origin, length, hex);

        this.isReady = false; 
        this.mesh = null;
        // 加载模型
        this.modelLoader.loadModel(modelPath).then((model) => {
            this.mesh = model;
            
            console.log('Model loaded:', this.mesh); // 调试信息
            this.mesh.scale.set(this.size, this.size, this.size); // 调整缩放比例
            this.mesh.position.set(
                -Math.random() * this.boundarySize - this.boundarySize,
                -Math.random() * this.boundarySize - this.boundarySize,
                -Math.random() * this.boundarySize - this.boundarySize
            ); // 随机设置初始位置

            // 获取翅膀骨骼
            this.leftWing = this.mesh.getObjectByName('L_w');
            this.rightWing = this.mesh.getObjectByName('R_w');

            // 调用回调函数并传递mesh
            if (onLoadCallback) {
                onLoadCallback(this.mesh);
            }
            this.isReady = true;
        }).catch((error) => {
            console.error('Error loading model:', error);
        });
    }

    updateParameters(dataInput) {
        const factor = Math.min(Math.max(dataInput, 0.0), 1.0);

        for (const param in this.scaledRanges) {
            const { min, max } = this.scaledRanges[param];
            if (param === 'separationRadius') {
                this.separationRadius = this.lerp(max, min, factor);
            } else if (param === 'separationStrength') {
                this.separationStrength = this.lerp(max, min, factor);
            } else {
                this[param] = this.lerp(min, max, factor); // 计算新的参数值
            }

            // console.log(`Updated parameter ${param}: ${this[param]}`);
        }
        // console.log('Updated parameters:', this);
    }


    lerp(min, max, factor) {
        return min + (max - min) * (1.0 - factor);
    }

    // 更新所有 Boid 位置
    static updateAll(boids, deltaTime) {
        // const leader = Boid.findLeader(boids);
        for (const boid of boids) {
            if (boid.mesh) {
                boid.update(boids, deltaTime);
            }
        }
    }

    // 平滑方向变化
    smoothDirection(targetDirection) {
        const lerpFactor = this.speed > this.maxSpeed * 0.5 ? 0.1 : 0.5; // 根据速度调整插值因子
        this.direction.lerp(targetDirection, lerpFactor).normalize();
    }

    // 更新位置
    update(boids, deltaTime, exploringStatus) {
        // 定义球体的中心和半径
        const sphereCenter = new THREE.Vector3(0, 0, 0); // 球体中心
        const sphereRadius = 50; // 球体半径
        const thresholdRadius = sphereRadius * 0.9; // 临界半径（小于球体半径）

        // 计算到球心的距离
        const distanceToCenter = this.mesh.position.distanceTo(sphereCenter);
        const normalizedDistance = distanceToCenter / sphereRadius; // 归一化距离（0 ~ 1）
        // 计算边界影响因子 boundaryFactor（靠近边界时逐渐衰减规则力）
        const boundaryFactor = 1.0 - Math.pow(Math.max(0, normalizedDistance - 0.4), 2);

        // 随机调整方向向量
        this.adjustDirection(0.05);

        const separationA = this.separation(boids);
        const alignmentA = this.alignment(boids).multiplyScalar(boundaryFactor);
        const cohesionA = this.cohesion(boids).multiplyScalar(boundaryFactor);
        const targetDirection = new THREE.Vector3().addVectors(this.direction, separationA).add(alignmentA).add(cohesionA);//还未最终决定，没有归一化

        // 计算加速度
        const separationAEffect = separationA.dot(this.direction);
        const alignmentAEffect = alignmentA.dot(this.direction);
        const cohesionAEffect = cohesionA.dot(this.direction);

        this.acceleration += (separationAEffect + alignmentAEffect + cohesionAEffect);

        // 先计算后方再计算前方
        const backForce = this.backExploration(exploringStatus);
        // this.acceleration += backForce.dot(this.direction);
        // targetDirection.add(backForce);
        const forontForce = this.frontAttraction();
        // this.acceleration += forontForce.dot(this.direction);
        // targetDirection.add(forontForce);
        targetDirection.add(forontForce).add(backForce); // 加上前方吸引力和后方探索力
        this.acceleration += forontForce.dot(this.direction) + backForce.dot(this.direction); // 前方吸引力和后方探索力对加速度的影响
        // console.log(`当前位置 Z: ${this.mesh.position.z} boundary: ${this.backBoundary *0.8}`);
        //后方boid动态回归前方
        if (this.mesh.position.z < this.backBoundary * 0.5) {
            this.exploringBack = false;// 状态变更，受前方吸引力影响
            // console.log(`ExploringBack状态变更为 false，当前位置 Z: ${this.mesh.position.z}`);
        }

        // 检查是否接近球体边界
        // const distanceToCenter = this.mesh.position.distanceTo(sphereCenter);
        if (distanceToCenter > thresholdRadius) {
            // 计算指向球心的加速度
            const toCenter = new THREE.Vector3().subVectors(sphereCenter, this.mesh.position).normalize();
            const weight = Math.min(1, (distanceToCenter - thresholdRadius) / (sphereRadius - thresholdRadius)); // 权重随距离增加
            const inwardAcceleration = toCenter.multiplyScalar(this.maxSpeed * weight * 0.5); // 加速度大小根据权重调整，同时加上整个加速度对整体的影响大小
            targetDirection.add(inwardAcceleration).normalize(); // 加速度方向对目标方向的影响
            this.acceleration += inwardAcceleration.dot(this.direction);
        }

        // 使用平滑过渡函数来调整方向
        targetDirection.normalize();
        this.smoothDirection(targetDirection);

        if (this.acceleration > 5) { this.acceleration = 5; }
        // 更新速度
        this.speed += this.acceleration * deltaTime;
        this.speed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.speed));

        // 限制高度
        if (this.mesh.position.y > 20) {
            this.direction.y -= (this.mesh.position.y - 20) * 0.1; // 逐渐拉回
        } else if (this.mesh.position.y < -20) {
            this.direction.y += (-20 - this.mesh.position.y) * 0.1;
        }

        // 计算位移
        const displacement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        if (this.mesh) {
            this.mesh.position.add(displacement);
        }
        this.acceleration = 0;

        // todo: 最后将回删除辅助箭头
        // 更新箭头辅助对象的位置和方向
        this.arrowHelper.setDirection(this.direction);
        this.arrowHelper.position.copy(this.mesh.position);

        // 控制翅膀煽动
        const wingAngle = Math.sin(Date.now() * 0.005) * Math.PI / 6; // 根据时间计算翅膀煽动的角度，范围为 -30 到 30 度
        this.flapWings(wingAngle);

        // 确保模型的“上”方向不变：避免千纸鹤出现倒立的情况
        const up = new THREE.Vector3(0, 1, 0); // 世界的“上”方向
        const right = new THREE.Vector3().crossVectors(up, this.direction).normalize(); // 计算右方向
        const adjustedUp = new THREE.Vector3().crossVectors(this.direction, right).normalize(); // 调整后的“上”方向

        // 使用调整后的“上”方向来设置模型朝向
        if (this.mesh) {
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.direction);
            this.mesh.quaternion.copy(targetQuaternion);
            this.mesh.up.copy(adjustedUp); // 确保模型的“上”方向一致
            this.mesh.lookAt(this.mesh.position.clone().add(this.direction));
        }
    }

    // 设置速度
    setSpeed(factor) {
        this.speed = 7 * factor;
        this.maxSpeed = 10 * factor;
        this.minSpeed = 5 * factor;
    }

    setVolume(factor) {
        this.mesh.scale.set(this.size * factor, this.size * factor, this.size * factor);
        for (const param in this.parameterRanges) {
            this.scaledRanges[param].min = this.parameterRanges[param].min * factor;
            this.scaledRanges[param].max = this.parameterRanges[param].max * factor;
        }

    }

    // // 设置方向
    // setDirection(x, y, z) {
    //     this.direction.set(x, y, z).normalize();
    // }

    flapWings(angle) {
        if (this.leftWing && this.rightWing) {
            //设置初始位置，使两个翅膀围绕水平面旋转
            this.leftWing.rotation.z = Math.PI / 2 + angle; // 初始角度为 90 度
            this.rightWing.rotation.z = -Math.PI / 2 - angle; // 初始角度为 270 度
        }
    }

    // 随机调整方向向量，并使其平滑过渡
    adjustDirection(lerpFactor = 0.1) {
        // 生成一个随机角度，最多偏离当前方向10度
        const angle = THREE.MathUtils.degToRad(Math.random() * 10 - 5); // 随机角度在-5到5度之间
        const axis = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize(); // 随机轴

        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const targetDirection = this.direction.clone().applyQuaternion(quaternion).normalize();

        // 平滑地插值到目标方向
        this.direction.lerp(targetDirection, lerpFactor).normalize();
    }

    // 获取同组邻居
    // getNeighbors(boids, radius) {
    //     const neighbors = [];
    //     for (const otherBoid of boids) {
    //         if (otherBoid !== this && otherBoid.groupId === this.groupId) { // 只处理同组Boid
    //             const distance = this.mesh.position.distanceTo(otherBoid.mesh.position);
    //             if (distance < radius) {
    //                 neighbors.push(otherBoid);
    //             }
    //         }
    //     }
    //     return neighbors;
    // }
    getNeighbors(boids, radius, maxNeighbors = 7, includeOtherGroups = false) {
        const distances = [];

        for (const otherBoid of boids) {
            if (otherBoid !== this) { // 不计算自己
                const distance = this.mesh.position.distanceTo(otherBoid.mesh.position);
                if (distance < radius) {  // 先筛选出半径范围内的 Boid
                    if (includeOtherGroups || otherBoid.groupId === this.groupId) {  // 是否包含异组
                        distances.push({ boid: otherBoid, distance: distance });
                    }
                }
            }
        }

        // 按距离排序，取最近的 maxNeighbors 个
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, maxNeighbors).map(entry => entry.boid);
    }

    separation(boids, sphereCenter) {
        // 获取同组和异组的邻居
        const sameGroupNeighbors = this.getNeighbors(boids, this.separationRadius, 7, false); // 只获取同组
        const otherGroupNeighbors = this.getNeighbors(boids, this.separationRadius, 5, true); // 获取异组

        const sepVector = new THREE.Vector3();

        // 处理同组分离
        for (const neighbor of sameGroupNeighbors) {
            const distance = this.mesh.position.distanceTo(neighbor.mesh.position);
            if (distance > 0) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, neighbor.mesh.position);
                diff.divideScalar(distance); // 越近分离力越大
                sepVector.add(diff.multiplyScalar(this.separationStrength));
            }
        }

        // 处理异组分离（较弱）
        for (const neighbor of otherGroupNeighbors) {
            const distance = this.mesh.position.distanceTo(neighbor.mesh.position);
            if (distance > 0) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, neighbor.mesh.position);
                diff.divideScalar(distance);
                sepVector.add(diff.multiplyScalar(this.interGroupSeparationStrength)); // 异组分离力较弱
            }
        }

        return sepVector;
    }

    alignment(boids) {
        // 仅获取同组的最近 7 个邻居
        const sameGroupNeighbors = this.getNeighbors(boids, this.alignmentRadius, 7, false);
        const alVector = new THREE.Vector3();

        if (sameGroupNeighbors.length === 0) return alVector; // 没有邻居时不改变方向

        // 计算同组邻居的平均方向
        sameGroupNeighbors.forEach(neighbor => {
            alVector.add(neighbor.direction);
        });
        alVector.divideScalar(sameGroupNeighbors.length); // 计算平均方向
        return alVector.multiplyScalar(this.alignmentStrength);
    }

    // 聚合规则
    cohesion(boids) {
        // const distanceToCenter = this.mesh.position.distanceTo(sphereCenter);
        const neighbors = this.getNeighbors(boids, this.cohesionRadius, 7, false);
        const coVector = new THREE.Vector3();
        // this.cohesionStrength = this.exploringBack ? this.cohesionStrength * 0.7 : this.cohesionStrength; // 探索后方时聚合力减弱

        if (neighbors.length === 0) return coVector;

        neighbors.forEach(neighbor => {
            coVector.add(neighbor.mesh.position);
        });

        coVector.divideScalar(neighbors.length); // 计算质心
        const steer = new THREE.Vector3().subVectors(coVector, this.mesh.position);
        return steer.multiplyScalar(this.cohesionStrength);
    }

    frontAttraction() {
        if (this.exploringBack) {
            return new THREE.Vector3(0, 0, 0);
        }

        const attractionZ = 80; // 目标吸引位置 Z 轴
        let attractionStrength = 0.3; // 吸引力强度

        // 计算 X 轴方向偏移（A 组向左，B 组向右）
        const xBias = this.groupId === 'A' ? -1 : 1; // A 组 (-1) 偏左，B 组 (1) 偏右
        // console.log(`xBias: ${xBias}, groupId: ${this.groupId}`);

        if (this.mesh.position.z > 0) {
            // 前方区域：10% 概率触发向前吸引力
            if (Math.random() < 0.1) {
                const distanceZ = attractionZ - this.mesh.position.z;
                const toFront = new THREE.Vector3(
                    xBias * (Math.random() * 5 + 3), // 方向偏移，A 组左，B 组右
                    (Math.random() - 0.5) * 2,
                    Math.abs(Math.random()) * distanceZ // 向前吸引
                );
                // console.log(` ${this.mesh.position.z}`);
                return toFront.multiplyScalar(attractionStrength);
            }
        } else if (this.mesh.position.z < this.backBoundary * 0.5) {
            // 后方区域：80% 概率触发向前吸引力
            if (Math.random() < 0.8) {
                const distanceZ = attractionZ - this.mesh.position.z;
                const toFront = new THREE.Vector3(
                    xBias * (Math.random() * 5 + 3), // 方向偏移
                    (Math.random() - 0.5) * 2,
                    Math.abs(Math.random()) * distanceZ
                );
                return toFront.multiplyScalar(attractionStrength);
            }
        }

        // 默认无吸引力
        return new THREE.Vector3(0, 0, 0);
    }

    // // 部分boid会像后方探索
    backExploration(exploringStatus) {
        if (this.exploringBack) {
            const randomBack = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                -Math.abs(Math.random()) // 强制朝向后方
            );
            return randomBack.multiplyScalar(0.2); // 后方探索强度
        }

        if (!exploringStatus) {
            return new THREE.Vector3(0, 0, 0); // 默认无探索力
        }

        if (Math.random() < 0.1) { // 10% 概率触发后方探索
            this.exploringBack = true;// 开始探索，不受前方吸引力影响
            // console.log(`ExploringBack状态变更为 true，当前位置 Z: ${this.mesh.position.z}`);
            // this.alignmentStrength *= 0.7;

            const randomBack = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                -Math.abs(Math.random()) // 强制朝向后方
            );
            return randomBack.multiplyScalar(0.3); // 后方探索强度
        }
        return new THREE.Vector3(0, 0, 0); // 默认无探索力
    }
}

export default Boid;
