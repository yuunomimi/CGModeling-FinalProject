//24FI021 大内侑
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import * as TWEEN from "@tweenjs/tween.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";

class ThreeJSContainer {
    private scene!: THREE.Scene;
    private light!: THREE.Light;
    private cloud!: THREE.Points[];
    private group: TWEEN.Group = new TWEEN.Group();
    private floor!: THREE.Points;
    private rains!: THREE.Points[];
    private rainVelocities!: THREE.Vector3[][];

    constructor() {

    }

    // 画面部分の作成(表示する枠ごとに)*
    public createRendererDOM = (width: number, height: number, cameraPos: THREE.Vector3) => {
        const renderer = new THREE.WebGLRenderer();
        renderer.setSize(width, height);
        renderer.setClearColor(new THREE.Color(0x000000));
        renderer.shadowMap.enabled = true; //シャドウマップを有効にする

        //カメラの設定
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
        camera.position.copy(cameraPos);
        camera.lookAt(new THREE.Vector3(0, 0, 0));

        const orbitControls = new OrbitControls(camera, renderer.domElement);
        orbitControls.target.set(0, 4, 0);

        this.createScene();
        // 毎フレームのupdateを呼んで，render
        // reqestAnimationFrame により次フレームを呼ぶ
        const render: FrameRequestCallback = (_time) => {
            orbitControls.update();

            renderer.render(this.scene, camera);
            requestAnimationFrame(render);
        }
        requestAnimationFrame(render);

        renderer.domElement.style.cssFloat = "left";
        renderer.domElement.style.margin = "10px";
        return renderer.domElement;
    }

    // シーンの作成(全体で1回)
    private createScene = async () => {
        this.scene = new THREE.Scene();

        const getHumanPositions = (objFilePath: string): Promise<THREE.Vector3[]> => {
            return new Promise((resolve) => {
                const humanPositions: THREE.Vector3[] = [];
                const objLoader = new OBJLoader();
                objLoader.load(objFilePath, (obj) => {
                    obj.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const positionAttribute = child.geometry.getAttribute('position');
                            for (let i = 0; i < positionAttribute.count; i += 20) { // 20個ごとにサンプリングして間引く
                                const vector = new THREE.Vector3();
                                vector.fromBufferAttribute(positionAttribute, i);
                                vector.multiplyScalar(5); // スケールを調整
                                humanPositions.push(vector);
                            }
                        }
                    });
                    resolve(humanPositions);
                });
            });
        }

        const getCatPositions = (objFilePath: string): Promise<THREE.Vector3[]> => {
            return new Promise((resolve) => {
                const catPositions: THREE.Vector3[] = [];
                const objLoader = new OBJLoader();
                objLoader.load(objFilePath, (obj) => {
                    obj.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            const positionAttribute = child.geometry.getAttribute('position');
                            for (let i = 0; i < positionAttribute.count; i += 50) { // 50個ごとにサンプリングして間引く
                                const vector = new THREE.Vector3();
                                vector.fromBufferAttribute(positionAttribute, i);
                                vector.multiplyScalar(0.1); // スケールを調整
                                catPositions.push(vector);
                            }
                        }
                    });
                    resolve(catPositions);
                });
            });
        }

        const hexChar = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];
        const generateSprite = (n: number) => {
            //新しいキャンバスの作成
            const canvas = document.createElement('canvas');
            canvas.width = 16;
            canvas.height = 16;

            //円形のグラデーションの作成
            const context = canvas.getContext('2d')!;
            const gradient = context.createRadialGradient(canvas.width / 2, canvas.height / 2, 0, canvas.width / 2, canvas.height / 2, canvas.width / 2);
            gradient.addColorStop(0, 'rgba(255,255,255,1)');
            gradient.addColorStop(1, 'rgba(0,0,0,1)');

            context.fillStyle = gradient;
            context.font = "16px Arial";
            const randomChar = hexChar[n];
            context.fillText(randomChar, 4, 16, canvas.width);
            //テクスチャの生成
            const texture = new THREE.Texture(canvas);
            texture.needsUpdate = true;
            return texture;
        }

        const createParticles = (humanPositions: THREE.Vector3[], catPositions: THREE.Vector3[]) => {
            const particleNum = 10000; // パーティクルの数
            const positions = new Float32Array(particleNum * 3);
            for (let i = 0; i < particleNum; i++) {
                positions[i * 3] = 0;
                positions[i * 3 + 1] = 0;
                positions[i * 3 + 2] = 0;
            }

            const geometry: THREE.BufferGeometry[] = [];
            const material: THREE.PointsMaterial[] = [];
            for (let i = 0; i < 16; i++) {
                geometry[i] = new THREE.BufferGeometry();
                material[i] = new THREE.PointsMaterial({
                    color: 0xffffff66,
                    size: 0.3,
                    transparent: true,
                    blending: THREE.AdditiveBlending,
                    depthWrite: false,
                    map: generateSprite(i)
                });
                const positions = new Float32Array(Math.floor(particleNum / 16) * 3);
                for (let j = 0; j < Math.floor(particleNum / 16); j++) {
                    positions[j * 3] = 0;
                    positions[j * 3 + 1] = 0;
                    positions[j * 3 + 2] = 0;
                }
                geometry[i].setAttribute('position', new THREE.BufferAttribute(positions, 3));
            }

            //THREE.Pointsの作成
            this.cloud = [];
            for (let i = 0; i < 16; i++) {
                this.cloud[i] = new THREE.Points(geometry[i], material[i]);
            }
            //シーンへの追加
            for (let i = 0; i < 16; i++) {
                this.scene.add(this.cloud[i]);
            }

            const sphere = new THREE.SphereGeometry(2, 20, 20);

            const spherePos = sphere.getAttribute("position");

            for (let i = 0; i < particleNum; ++i) {

                const sphereIndex = i % spherePos.count;
                const humanIndex = i % humanPositions.length;
                const catIndex = i % catPositions.length;

                const sphereX = spherePos.getX(sphereIndex);
                const sphereY = spherePos.getY(sphereIndex) + 4; // 上に移動
                const sphereZ = spherePos.getZ(sphereIndex);

                const humanX = humanPositions[humanIndex].x;
                const humanY = humanPositions[humanIndex].y;
                const humanZ = humanPositions[humanIndex].z;

                const catX = catPositions[catIndex].x;
                const catY = catPositions[catIndex].y;
                const catZ = catPositions[catIndex].z;

                // tweeninfoの作成
                const tweeninfo = { positionX: sphereX, positionY: sphereY, positionZ: sphereZ };

                // Tweenでパラメータの更新の際に呼び出される関数の作成
                const updatePosition = () => {
                    const cloudIndex = i % 16;
                    const geometry = this.cloud[cloudIndex].geometry as THREE.BufferGeometry;
                    const positions = geometry.getAttribute('position');
                    positions.setX(Math.floor(i / 16), tweeninfo.positionX);
                    positions.setY(Math.floor(i / 16), tweeninfo.positionY);
                    positions.setZ(Math.floor(i / 16), tweeninfo.positionZ);
                    positions.needsUpdate = true;
                };

                // Twennの作成（球面上への遷移と、原点への遷移を作る）

                const sphereTween = new TWEEN.Tween(tweeninfo)
                    .to({ positionX: sphereX, positionY: sphereY, positionZ: sphereZ }, 1000)
                    .easing(TWEEN.Easing.Quartic.InOut)
                    .onUpdate(updatePosition);

                const waitTween1 = new TWEEN.Tween(tweeninfo)
                    .delay(2000)
                    .to({}, 1000)

                const humanTween = new TWEEN.Tween(tweeninfo)
                    .to({ positionX: humanX, positionY: humanY, positionZ: humanZ }, 1000)
                    .easing(TWEEN.Easing.Quartic.InOut)
                    .onUpdate(updatePosition);

                const waitTween2 = new TWEEN.Tween(tweeninfo)
                    .delay(2000)
                    .to({}, 1000)

                const catTween = new TWEEN.Tween(tweeninfo)
                    .to({ positionX: catX, positionY: catY, positionZ: catZ }, 1000)
                    .easing(TWEEN.Easing.Quartic.InOut)
                    .onUpdate(updatePosition);

                const waitTween3 = new TWEEN.Tween(tweeninfo)
                    .delay(2000)
                    .to({}, 1000)

                // アニメーションのループの作成
                sphereTween.chain(waitTween1);
                waitTween1.chain(humanTween);
                humanTween.chain(waitTween2);
                waitTween2.chain(catTween);
                catTween.chain(waitTween3);
                waitTween3.chain(sphereTween);
                // アニメーションの実行
                humanTween.start();
                this.group.add(sphereTween);
                this.group.add(waitTween1);
                this.group.add(humanTween);
                this.group.add(waitTween2);
                this.group.add(catTween);
                this.group.add(waitTween3);
            }
        }

        const humanPositions = await getHumanPositions("./BaseHuman.obj");
        const catPositions = await getCatPositions("./Cat.obj");
        createParticles(humanPositions, catPositions);

        const createPoints = (geom: THREE.BufferGeometry) => {
            geom.deleteAttribute('uv');
            const material = new THREE.PointsMaterial({
                color: 0xffffff,
                size: 0.1,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                map: generateSprite(0)
            });
            return new THREE.Points(geom, material);
        }

        this.floor = createPoints(new THREE.RingGeometry(1, 8, 64, 20));
        this.floor.rotation.x = -Math.PI / 2;
        this.scene.add(this.floor);

        this.rainVelocities = [];
        const createRain = (n: number) => {
            //ジオメトリの作成
            const geometry = new THREE.BufferGeometry();
            //マテリアルの作成
            const material = new THREE.PointsMaterial({
                color: 0xffffff66,
                size: 0.3,
                transparent: true,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
                map: generateSprite(n)
            });
            const particleNum = 100; // パーティクルの数
            const positions = new Float32Array(particleNum * 3);
            let particleIndex = 0;
            this.rainVelocities[n] = [];
            const x = 10 * Math.cos((n / 16) * 2 * Math.PI);
            const z = 10 * Math.sin((n / 16) * 2 * Math.PI);
            for (let i = 0; i < particleNum; i++) {
                positions[particleIndex++] = x;
                positions[particleIndex++] = (Math.random() - 0.1) * 20;
                positions[particleIndex++] = z;
                this.rainVelocities[n].push(new THREE.Vector3(0, -0.2, 0));
            }
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            //THREE.Pointsの作成
            this.rains[n] = new THREE.Points(geometry, material);
            //シーンへの追加
            this.scene.add(this.rains[n]);
        }
        this.rains = [];
        for (let i = 0; i < 16; i++) {
            createRain(i);
        }

        //ライトの設定
        this.light = new THREE.DirectionalLight(0xffffff);
        const lvec = new THREE.Vector3(1, 1, 1).normalize();
        this.light.position.set(lvec.x, lvec.y, lvec.z);
        this.scene.add(this.light);

        // 毎フレームのupdateを呼んで，更新
        // reqestAnimationFrame により次フレームを呼ぶ]
        const timer = new THREE.Timer();
        const update: FrameRequestCallback = (_time) => {
            timer.update();
            const deltaTime = timer.getDelta();
            for (let n = 0; n < 16; n++) {
                const geom = this.rains[n].geometry as THREE.BufferGeometry;
                const positions = geom.getAttribute('position');
                this.rainVelocities[n].forEach((value, index) => {
                    positions.setX(index, positions.getX(index) + value.x * deltaTime);
                    positions.setY(index, positions.getY(index) + value.y * deltaTime);
                    if (positions.getY(index) < -5) positions.setY(index, 5);
                    positions.setZ(index, positions.getZ(index) + value.z * deltaTime);
                });
                positions.needsUpdate = true;
            }

            requestAnimationFrame(update);
            for (let i = 0; i < 16; i++) {
                this.cloud[i].rotation.y += 0.01; // パーティクルの回転を追加
            }
            this.group.update();
        }
        requestAnimationFrame(update);
    }
}

window.addEventListener("DOMContentLoaded", init);

function init() {
    const container = new ThreeJSContainer();

    const viewport = container.createRendererDOM(960, 720, new THREE.Vector3(5, 5, 10));
    document.body.appendChild(viewport);
}
