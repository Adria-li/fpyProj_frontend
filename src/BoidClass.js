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
                this[param] = this.lerp(min, max, factor); 
            }
        }
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

    smoothDirection(targetDirection) {
        const lerpFactor = this.speed > this.maxSpeed * 0.5 ? 0.1 : 0.5; 
        this.direction.lerp(targetDirection, lerpFactor).normalize();
    }

    // 更新位置
    update(boids, deltaTime, exploringStatus) {
        // Sphere boundary settings
        const sphereCenter = new THREE.Vector3(0, 0, 0); 
        const sphereRadius = 50; 
        const thresholdRadius = sphereRadius * 0.9; 
        const distanceToCenter = this.mesh.position.distanceTo(sphereCenter);
        const normalizedDistance = distanceToCenter / sphereRadius; 
        const boundaryFactor = 1.0 - Math.pow(Math.max(0, normalizedDistance - 0.4), 2);

        this.adjustDirection(0.05);

        const separationA = this.separation(boids);
        const alignmentA = this.alignment(boids).multiplyScalar(boundaryFactor);
        const cohesionA = this.cohesion(boids).multiplyScalar(boundaryFactor);
        const targetDirection = new THREE.Vector3().addVectors(this.direction, separationA).add(alignmentA).add(cohesionA);//还未最终决定，没有归一化

        // Calculate the acceleration based on the forces
        const separationAEffect = separationA.dot(this.direction);
        const alignmentAEffect = alignmentA.dot(this.direction);
        const cohesionAEffect = cohesionA.dot(this.direction);

        this.acceleration += (separationAEffect + alignmentAEffect + cohesionAEffect);

        // Calculate the backward exploration force first
        const backForce = this.backExploration(exploringStatus);
        const forontForce = this.frontAttraction();
        targetDirection.add(forontForce).add(backForce); 
        this.acceleration += forontForce.dot(this.direction) + backForce.dot(this.direction); 
        // Back exploration boid dynamicaly move forward
        if (this.mesh.position.z < this.backBoundary * 0.5) {
            this.exploringBack = false;// Status change, reset to false
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

        targetDirection.normalize();
        this.smoothDirection(targetDirection);

        if (this.acceleration > 5) { this.acceleration = 5; }
        // Update speed based on acceleration
        this.speed += this.acceleration * deltaTime;
        this.speed = Math.max(this.minSpeed, Math.min(this.maxSpeed, this.speed));

        // Hight limit
        if (this.mesh.position.y > 20) {
            this.direction.y -= (this.mesh.position.y - 20) * 0.1; 
        } else if (this.mesh.position.y < -20) {
            this.direction.y += (-20 - this.mesh.position.y) * 0.1;
        }

        // Calculate the new position based on speed and direction
        const displacement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        if (this.mesh) {
            this.mesh.position.add(displacement);
        }
        this.acceleration = 0;

        // todo: delete arrowHelper
        // Update arrow helper position and direction
        this.arrowHelper.setDirection(this.direction);
        this.arrowHelper.position.copy(this.mesh.position);

        // Control the wing flapping
        const wingAngle = Math.sin(Date.now() * 0.005) * Math.PI / 6; 
        this.flapWings(wingAngle);

        // Set the model's rotation direction
        const up = new THREE.Vector3(0, 1, 0); 
        const right = new THREE.Vector3().crossVectors(up, this.direction).normalize(); 
        const adjustedUp = new THREE.Vector3().crossVectors(this.direction, right).normalize(); 

        if (this.mesh) {
            const targetQuaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), this.direction);
            this.mesh.quaternion.copy(targetQuaternion);
            this.mesh.up.copy(adjustedUp); 
            this.mesh.lookAt(this.mesh.position.clone().add(this.direction));
        }
    }

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

    flapWings(angle) {
        if (this.leftWing && this.rightWing) {
            // Set the rotation of the wings based on the angle
            this.leftWing.rotation.z = Math.PI / 2 + angle; 
            this.rightWing.rotation.z = -Math.PI / 2 - angle; 
        }
    }

    adjustDirection(lerpFactor = 0.1) {
        const angle = THREE.MathUtils.degToRad(Math.random() * 10 - 5); 
        const axis = new THREE.Vector3(
            Math.random() * 2 - 1,
            Math.random() * 2 - 1,
            Math.random() * 2 - 1
        ).normalize(); 

        const quaternion = new THREE.Quaternion().setFromAxisAngle(axis, angle);
        const targetDirection = this.direction.clone().applyQuaternion(quaternion).normalize();

        // Smoothly interpolate between the current direction and the target direction
        this.direction.lerp(targetDirection, lerpFactor).normalize();
    }

    getNeighbors(boids, radius, maxNeighbors = 7, includeOtherGroups = false) {
        const distances = [];

        for (const otherBoid of boids) {
            if (otherBoid !== this) { 
                const distance = this.mesh.position.distanceTo(otherBoid.mesh.position);
                if (distance < radius) {  // Find Boids in the radius range
                    if (includeOtherGroups || otherBoid.groupId === this.groupId) { 
                        distances.push({ boid: otherBoid, distance: distance });
                    }
                }
            }
        }

        // Get the nearest 7 neighbors
        distances.sort((a, b) => a.distance - b.distance);
        return distances.slice(0, maxNeighbors).map(entry => entry.boid);
    }

    separation(boids) {
        const sameGroupNeighbors = this.getNeighbors(boids, this.separationRadius, 7, false); // 只获取同组
        const otherGroupNeighbors = this.getNeighbors(boids, this.separationRadius, 5, true); // 获取异组

        const sepVector = new THREE.Vector3();

        // Spearation between same group boids
        for (const neighbor of sameGroupNeighbors) {
            const distance = this.mesh.position.distanceTo(neighbor.mesh.position);
            if (distance > 0) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, neighbor.mesh.position);
                diff.divideScalar(distance); // The closer the neighbor, the stronger the force
                sepVector.add(diff.multiplyScalar(this.separationStrength));
            }
        }

        // Spearation between other group boids
        for (const neighbor of otherGroupNeighbors) {
            const distance = this.mesh.position.distanceTo(neighbor.mesh.position);
            if (distance > 0) {
                const diff = new THREE.Vector3().subVectors(this.mesh.position, neighbor.mesh.position);
                diff.divideScalar(distance);
                sepVector.add(diff.multiplyScalar(this.interGroupSeparationStrength)); 
            }
        }

        return sepVector;
    }

    alignment(boids) {
        const sameGroupNeighbors = this.getNeighbors(boids, this.alignmentRadius, 7, false);
        const alVector = new THREE.Vector3();

        if (sameGroupNeighbors.length === 0) return alVector; // No direction change if no neighbors

        // Calulate average direction
        sameGroupNeighbors.forEach(neighbor => {
            alVector.add(neighbor.direction);
        });
        alVector.divideScalar(sameGroupNeighbors.length); 
        return alVector.multiplyScalar(this.alignmentStrength);
    }

    cohesion(boids) {
        const neighbors = this.getNeighbors(boids, this.cohesionRadius, 7, false);
        const coVector = new THREE.Vector3();

        if (neighbors.length === 0) return coVector;

        neighbors.forEach(neighbor => {
            coVector.add(neighbor.mesh.position);
        });

        coVector.divideScalar(neighbors.length); // Calculate average position of neighbors
        const steer = new THREE.Vector3().subVectors(coVector, this.mesh.position);
        return steer.multiplyScalar(this.cohesionStrength);
    }

    frontAttraction() {
        if (this.exploringBack) {
            return new THREE.Vector3(0, 0, 0);
        }

        const attractionZ = 80; 
        let attractionStrength = 0.3; 

        const xBias = this.groupId === 'A' ? -1 : 1; 

        if (this.mesh.position.z > 0) {
            // Front area: 10% chance to trigger forward attraction
            if (Math.random() < 0.1) {
                const distanceZ = attractionZ - this.mesh.position. z;
                const toFront = new THREE.Vector3(
                    xBias * (Math.random() * 5 + 3), 
                    (Math.random() - 0.5) * 2,
                    Math.abs(Math.random()) * distanceZ 
                );
                return toFront.multiplyScalar(attractionStrength);
            }
        } else if (this.mesh.position.z < this.backBoundary * 0.5) {
            // Back area: 80% chance to trigger forward attraction
            if (Math.random() < 0.8) {
                const distanceZ = attractionZ - this.mesh.position.z;
                const toFront = new THREE.Vector3(
                    xBias * (Math.random() * 5 + 3), 
                    (Math.random() - 0.5) * 2,
                    Math.abs(Math.random()) * distanceZ
                );
                return toFront.multiplyScalar(attractionStrength);
            }
        }

        return new THREE.Vector3(0, 0, 0);
    }

    // Some boids will explore backward
    backExploration(exploringStatus) {
        if (this.exploringBack) {
            const randomBack = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                -Math.abs(Math.random()) 
            );
            return randomBack.multiplyScalar(0.2); 
        }

        if (!exploringStatus) {
            return new THREE.Vector3(0, 0, 0); 
        }

        if (Math.random() < 0.1) { 
            this.exploringBack = true;

            const randomBack = new THREE.Vector3(
                (Math.random() - 0.5) * 2,
                (Math.random() - 0.5) * 2,
                -Math.abs(Math.random()) 
            );
            return randomBack.multiplyScalar(0.3); 
        }
        return new THREE.Vector3(0, 0, 0); 
    }
}

export default Boid;
