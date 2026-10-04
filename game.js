let scene, camera, renderer;
let player, enemies = [];
let keys = {};
let gameRunning = false;
let score = 0;
let lives = 3;
let level = 1;
let spawnRate = 2;

const config = {
    playerSpeed: 0.3,
    jumpForce: 0.8,
    gravity: 0.02,
    enemySpeed: 0.15,
};

function init() {
    const container = document.getElementById('container');
    
    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020612, 0.003);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 1, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x020612);
    renderer.shadowMap.enabled = true;
    container.appendChild(renderer.domElement);
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x75e6ff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x6ef7d2, 0.5, 100);
    pointLight.position.set(0, 10, 0);
    scene.add(pointLight);
    
    createEnvironment();
    createPlayer();
    
    window.addEventListener('keydown', (e) => {
        keys[e.key.toLowerCase()] = true;
        if (e.key === ' ') {
            e.preventDefault();
            if (!gameRunning) startGame();
            else player.jump();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key.toLowerCase()] = false;
    });
    
    window.addEventListener('resize', onWindowResize);
    
    document.getElementById('playBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', restartGame);
    
    animate();
}

function createEnvironment() {
    const starGeometry = new THREE.BufferGeometry();
    const starCount = 500;
    const posArray = new Float32Array(starCount * 3);
    
    for (let i = 0; i < starCount * 3; i += 3) {
        posArray[i] = (Math.random() - 0.5) * 200;
        posArray[i + 1] = (Math.random() - 0.5) * 200;
        posArray[i + 2] = (Math.random() - 0.5) * 200;
    }
    
    starGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));
    const starMaterial = new THREE.PointsMaterial({
        size: 0.5,
        color: 0xffffff,
        sizeAttenuation: true,
    });
    
    const starField = new THREE.Points(starGeometry, starMaterial);
    scene.add(starField);
    
    const groundGeometry = new THREE.PlaneGeometry(40, 40);
    const groundMaterial = new THREE.MeshStandardMaterial({
        color: 0x1d1d33,
        metalness: 0.3,
        roughness: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
}

function createPlayer() {
    player = {
        position: new THREE.Vector3(0, 1, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        mesh: null,
        isJumping: false,
        health: 3,
        canJump: false,
    };
    
    const playerGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    const playerMaterial = new THREE.MeshStandardMaterial({
        color: 0x75e6ff,
        emissive: 0x3ad5ff,
        emissiveIntensity: 0.3,
        metalness: 0.8,
        roughness: 0.2,
    });
    player.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
    player.mesh.position.copy(player.position);
    player.mesh.castShadow = true;
    scene.add(player.mesh);
    
    const glowGeometry = new THREE.IcosahedronGeometry(0.5, 4);
    const glowMaterial = new THREE.MeshStandardMaterial({
        color: 0x6ef7d2,
        emissive: 0x6ef7d2,
        emissiveIntensity: 0.5,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(player.position);
    glow.castShadow = true;
    scene.add(glow);
    
    player.glow = glow;
    
    player.update = function() {
        this.velocity.y -= config.gravity;
        
        const moveSpeed = config.playerSpeed;
        if (keys['w'] || keys['arrowup']) this.position.z -= moveSpeed;
        if (keys['s'] || keys['arrowdown']) this.position.z += moveSpeed;
        if (keys['a'] || keys['arrowleft']) this.position.x -= moveSpeed;
        if (keys['d'] || keys['arrowright']) this.position.x += moveSpeed;
        
        this.position.add(this.velocity);
        
        if (this.position.x > 18) this.position.x = 18;
        if (this.position.x < -18) this.position.x = -18;
        if (this.position.z > 18) this.position.z = 18;
        if (this.position.z < -18) this.position.z = -18;
        
        if (this.position.y <= 0.75) {
            this.position.y = 0.75;
            this.velocity.y = 0;
            this.canJump = true;
        }
        
        this.mesh.position.copy(this.position);
        this.glow.position.copy(this.position);
        
        camera.position.x = this.position.x;
        camera.position.y = this.position.y + 1.5;
        camera.position.z = this.position.z + 3;
        camera.lookAt(this.position.x, this.position.y, this.position.z - 5);
    };
    
    player.jump = function() {
        if (this.canJump) {
            this.velocity.y = config.jumpForce;
            this.canJump = false;
        }
    };
}

function createEnemy() {
    const enemy = {
        position: new THREE.Vector3((Math.random() - 0.5) * 30, 1, (Math.random() - 0.5) * 30),
        mesh: null,
        health: 1,
        speed: config.enemySpeed * (1 + level * 0.1),
    };
    
    const enemyGeometry = new THREE.OctahedronGeometry(0.5);
    const enemyMaterial = new THREE.MeshStandardMaterial({
        color: 0xff5e7d,
        emissive: 0xff5e7d,
        emissiveIntensity: 0.4,
        metalness: 0.6,
        roughness: 0.4,
    });
    enemy.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemy.mesh.position.copy(enemy.position);
    enemy.mesh.castShadow = true;
    scene.add(enemy.mesh);
    
    enemy.update = function() {
        const direction = new THREE.Vector3().subVectors(player.position, this.position).normalize();
        this.position.addScaledVector(direction, this.speed);
        this.mesh.position.copy(this.position);
        this.mesh.rotation.x += 0.05;
        this.mesh.rotation.y += 0.08;
    };
    
    enemy.checkCollision = function() {
        const distance = this.position.distanceTo(player.position);
        return distance < 1;
    };
    
    enemies.push(enemy);
}

function update() {
    if (!gameRunning) return;
    
    player.update();
    
    for (let i = enemies.length - 1; i >= 0; i--) {
        enemies[i].update();
        
        if (enemies[i].checkCollision()) {
            scene.remove(enemies[i].mesh);
            enemies.splice(i, 1);
            lives--;
            document.getElementById('lives').textContent = lives;
            
            if (lives <= 0) {
                endGame();
                return;
            }
        }
    }
    
    if (Math.random() < spawnRate * 0.01) {
        createEnemy();
    }
    
    score += level;
    document.getElementById('score').textContent = Math.floor(score);
    
    if (score % 500 === 0 && score > 0) {
        level++;
        spawnRate *= 1.1;
        document.getElementById('level').textContent = level;
    }
}

function animate() {
    requestAnimationFrame(animate);
    update();
    renderer.render(scene, camera);
}

function startGame() {
    gameRunning = true;
    document.getElementById('menu').classList.remove('visible');
    document.getElementById('gameOver').classList.remove('visible');
    score = 0;
    lives = 3;
    level = 1;
    spawnRate = 2;
    enemies.forEach(e => scene.remove(e.mesh));
    enemies = [];
    player.position.set(0, 1, 0);
    player.velocity.set(0, 0, 0);
    document.getElementById('score').textContent = '0';
    document.getElementById('lives').textContent = '3';
    document.getElementById('level').textContent = '1';
}

function endGame() {
    gameRunning = false;
    document.getElementById('finalScore').textContent = `Puntuación Final: ${Math.floor(score)} | Nivel: ${level}`;
    document.getElementById('gameOver').classList.add('visible');
}

function restartGame() {
    startGame();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('load', init);
