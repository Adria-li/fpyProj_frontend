import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader();
    }

    loadModel(path) {
        return new Promise((resolve, reject) => {
            this.loader.load(path, (gltf) => {            
                const scene = gltf.scene;

                // 遍历模型中的所有材质并设置颜色空间
                scene.traverse((child) => {
                    if (child.isMesh) {
                        if (child.material.map) {
                            child.material.map.encoding = THREE.sRGBEncoding;
                        }
                        if (child.material.emissiveMap) {
                            child.material.emissiveMap.encoding = THREE.sRGBEncoding;
                        }
                        if (child.material.map || child.material.emissiveMap) {
                            child.material.needsUpdate = true;
                        }
                    }
                });
                
                resolve(gltf.scene);
            }, undefined, (error) => {
                reject(error);
            });
        });
    }
}

export default ModelLoader;