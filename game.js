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
    
    if (!container) {
        console.error('Container not found');
        return;
    }
    
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
    
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0x75e6ff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    
    const pointLight = new THREE.PointLight(0x6ef7d2, 1, 100);
    pointLight.position.set(0, 15, 0);
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
    
    const playBtn = document.getElementById('playBtn');
    const restartBtn = document.getElementById('restartBtn');
    
    if (playBtn) playBtn.addEventListener('click', startGame);
    if (restartBtn) restartBtn.addEventListener('click', restartGame);
    
    animate();
}

function createEnvironment() {
    // Estrellas
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
    
    // Suelo
    const groundGeometry = new THREE.PlaneGeometry(50, 50);
    const groundMaterial = new THREE.MeshPhongMaterial({
        color: 0x1d1d33,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1;
    scene.add(ground);
}

function createPlayer() {
    player = {
        position: new THREE.Vector3(0, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        mesh: null,
        isJumping: false,
        canJump: true,
    };
    
    const playerGeometry = new THREE.ConeGeometry(0.4, 1.5, 8);
    const playerMaterial = new THREE.MeshPhongMaterial({
        color: 0x75e6ff,
    });
    player.mesh = new THREE.Mesh(playerGeometry, playerMaterial);
    player.mesh.position.copy(player.position);
    scene.add(player.mesh);
    
    const glowGeometry = new THREE.IcosahedronGeometry(0.5, 3);
    const glowMaterial = new THREE.MeshPhongMaterial({
        color: 0x6ef7d2,
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    glow.position.copy(player.position);
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
        
        if (this.position.x > 20) this.position.x = 20;
        if (this.position.x < -20) this.position.x = -20;
        if (this.position.z > 20) this.position.z = 20;
        if (this.position.z < -20) this.position.z = -20;
        
        if (this.position.y <= -0.5) {
            this.position.y = -0.5;
            this.velocity.y = 0;
            this.canJump = true;
        }
        
        this.mesh.position.copy(this.position);
        this.glow.position.copy(this.position);
        
        camera.position.x = this.position.x;
        camera.position.y = this.position.y + 3;
        camera.position.z = this.position.z + 4;
        camera.lookAt(this.position.x, this.position.y + 0.5, this.position.z);
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
        position: new THREE.Vector3(
            (Math.random() - 0.5) * 35,
            2,
            (Math.random() - 0.5) * 35
        ),
        mesh: null,
        speed: config.enemySpeed * (1 + level * 0.1),
    };
    
    const enemyGeometry = new THREE.OctahedronGeometry(0.5);
    const enemyMaterial = new THREE.MeshPhongMaterial({
        color: 0xff5e7d,
    });
    enemy.mesh = new THREE.Mesh(enemyGeometry, enemyMaterial);
    enemy.mesh.position.copy(enemy.position);
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
        return distance < 1.2;
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
    player.position.set(0, 0, 0);
    player.velocity.set(0, 0, 0);
    player.canJump = true;
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

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
