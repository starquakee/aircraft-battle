// 游戏主类
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        
        // 游戏状态
        this.gameRunning = false;
        this.gameStarted = false;
        this.gamePaused = false; // 新增暂停状态
        this.difficulty = 'normal'; // 默认难度为普通
        this.twoPlayerMode = false; // 双人模式开关
        this.score = 0;
        // 玩家属性（固定为100，不受难度影响）
        this.health = 100;
        this.maxHealth = 100;
        this.weaponLevel = 1;
        this.gameStartTime = 0;
        this.gameTime = 0;
        this.lastScoreSecond = 0; // 用于跟踪每秒自动得分
        this.scoreTimer = 0; // 用于跟踪每秒自动得分的计时器
        this.pauseStartTime = 0; // 用于记录游戏暂停的时间点
        
        // 游戏对象数组
        this.bullets = [];
        this.enemies = [];
        this.powerUps = [];
        this.enemyBullets = [];
        this.particles = [];
        
        // 创建玩家飞机
        this.player = new Player(this.width / 2, this.height - 120);
        this.player2 = null; // 第二个玩家
        
        // 键盘输入状态
        this.keys = {};
        
        // 游戏计时器
        this.enemySpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        this.shootTimer = 0;
        this.shootTimer2 = 0;
        this.bossSpawnTimer = 0;
        
        // 音频
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = 0.3;
        
        // 音效管理系统
        this.soundManager = new SoundManager();
        
        // 时间戳记录（用于deltaTime计算）
        this.lastTime = 0;
        this.deltaTime = 0;
        this.targetFPS = 60; // 目标帧率
        
        // 能量系统
        this.energy = 0; // 当前能量值
        this.maxEnergy = 100; // 最大能量值
        this.energyChargeRate = 10; // 击中敌机时的充能量（已改为固定1点）
        this.energyBurstActive = false; // 能量爆发是否激活
        this.energyBurstTimer = 0; // 能量爆发计时器
        this.energyBurstCooldown = 2000; // 能量爆发冷却时间（毫秒）
        this.energyBurstCooldownTimer = 0; // 能量爆发冷却计时器
        
        this.init();
    }
    
    init() {
        // 绑定键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            // 空格键激活能量爆发
            if (e.key === ' ' && this.gameStarted && this.gameRunning && !this.gamePaused) {
                this.activateEnergyBurst();
                e.preventDefault(); // 防止页面滚动
            }
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        // 点击开始游戏
        this.canvas.addEventListener('click', () => {
            if (!this.gameStarted) {
                this.startGame();
            }
        });
        
        // 开始游戏循环
        this.gameLoop();
    }
    
    startGame() {
        this.gameStarted = true;
        this.gameRunning = true;
        this.gamePaused = false; // 确保游戏开始时不是暂停状态

        // 重置游戏状态
        this.score = 0;
        this.weaponLevel = 1;
        this.scoreTimer = 0; // 重置计分计时器，确保立即开始计分
        this.gameTime = 0;

        // 玩家血量固定为100，不受难度影响
        this.health = 100;
        this.maxHealth = 100;

        // 重置能量系统
        this.energy = 0;
        this.energyBurstActive = false;
        this.energyBurstTimer = 0;
        this.energyBurstCooldownTimer = 0;

        // 重置玩家武器等级
        this.player.weaponLevel = 1;

        // 如果是双人模式，创建第二个玩家
        if (this.twoPlayerMode) {
            this.player2 = new Player(this.width / 2 + 30, this.height - 120, true);
        }

        // 在所有状态重置后再设置游戏开始时间
        this.gameStartTime = Date.now();

        this.bgMusic.play().catch(e => console.log('音频播放失败:', e));
    }
    
    // 设置难度模式
    setDifficulty(difficulty) {
        this.difficulty = difficulty;
        
        // 更新UI按钮状态
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.classList.toggle('active', 
                (btn.textContent === '简单' && difficulty === 'easy') ||
                (btn.textContent === '普通' && difficulty === 'normal') ||
                (btn.textContent === '困难' && difficulty === 'hard')
            );
        });
    }
    
    toggleTwoPlayerMode() {
        this.twoPlayerMode = !this.twoPlayerMode;
        
        // 更新UI按钮状态
        const btn = document.getElementById('twoPlayerBtn');
        if (btn) {
            btn.classList.toggle('active', this.twoPlayerMode);
            btn.textContent = this.twoPlayerMode ? '双人模式 (开启)' : '双人模式';
        }
    }
    
    gameLoop(currentTime) {
        // 计算时间差（秒）
        if (this.lastTime === 0) {
            this.lastTime = currentTime;
            this.deltaTime = 1/60; // 设置默认的deltaTime，避免第一帧为0
        } else {
            this.deltaTime = (currentTime - this.lastTime) / 1000;
        }
        this.lastTime = currentTime;
        
        // 限制最大deltaTime，防止卡顿导致的跳跃
        this.deltaTime = Math.min(this.deltaTime, 0.05); // 最大50ms
        
        if (this.gameStarted && this.gameRunning && !this.gamePaused) {
            this.update(this.deltaTime);
        }
        this.render();
        requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(deltaTime) {
        // 更新游戏时间
        if (this.gameStartTime > 0) {
            this.gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        }
        
        // 更新能量爆发状态（基于能量消耗）
        if (this.energyBurstActive) {
            // 每秒消耗25点能量
            const energyConsumption = 25 * deltaTime;
            this.energy = Math.max(0, this.energy - energyConsumption);
            
            // 能量耗尽时自动恢复普通状态
            if (this.energy <= 0) {
                this.energyBurstActive = false;
                this.energyBurstTimer = 0;
            }
        }
        
        // 每秒自动获得2分 - 使用计时器而不是绝对时间戳
        // 确保在游戏运行时始终更新计时器，不受gameTime更新的限制
        this.scoreTimer += deltaTime;
        if (this.scoreTimer >= 1) {
            this.score += 2;
            this.scoreTimer -= 1; // 减去1秒，保留余数
        }
        
        // 更新玩家
        // 创建第一个玩家的键盘状态（仅使用WASD）
        const player1Keys = {};
        player1Keys['w'] = this.keys['w'] || false;
        player1Keys['s'] = this.keys['s'] || false;
        player1Keys['a'] = this.keys['a'] || false;
        player1Keys['d'] = this.keys['d'] || false;
        this.player.update(player1Keys, this.width, this.height, deltaTime, this.energyBurstActive);
        
        // 更新第二个玩家（如果存在）
        if (this.twoPlayerMode && this.player2) {
            // 创建第二个玩家的键盘状态
            const player2Keys = {};
            player2Keys['arrowup'] = this.keys['arrowup'] || false;
            player2Keys['arrowdown'] = this.keys['arrowdown'] || false;
            player2Keys['arrowleft'] = this.keys['arrowleft'] || false;
            player2Keys['arrowright'] = this.keys['arrowright'] || false;
            this.player2.update(player2Keys, this.width, this.height, deltaTime, this.energyBurstActive);
        }
        
        // 自动射击 - 根据武器等级调整射击频率
        this.shootTimer += deltaTime * 60;
        let shootInterval = Math.max(3, Math.floor((25 - this.player.weaponLevel * 2) / 3)); // 射速提升3倍：间隔缩短为1/3
        
        // 能量爆发时提升射击速度
        if (this.energyBurstActive) {
            shootInterval = Math.max(1, Math.floor(shootInterval / 1.5)); // 射击间隔缩短为原来的2/3（射速提升1.5倍）
        }
        
        if (this.shootTimer > shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
        
        // 第二个玩家自动射击（如果存在）
        if (this.twoPlayerMode && this.player2) {
            // 第二个玩家自动射击
            if (!this.player2.shootTimer) this.player2.shootTimer = 0;
            this.player2.shootTimer += deltaTime * 60;
            
            let player2ShootInterval = shootInterval; // 使用相同的射击间隔
            
            if (this.player2.shootTimer > player2ShootInterval) {
                const bullets = this.player2.shoot(this.player2.weaponLevel);
                this.bullets.push(...bullets);
                
                // 添加射击粒子效果
                for (let i = 0; i < 3; i++) {
                    this.particles.push(new Particle(
                        this.player2.x + this.player2.width / 2 + (Math.random() - 0.5) * 20,
                        this.player2.y,
                        (Math.random() - 0.5) * 6, // 速度再提升1.5倍：从4变为6
                        -Math.random() * 9, // 速度再提升1.5倍：从6变为9
                        '#ff0000',
                        20
                    ));
                }
                this.player2.shootTimer = 0;
            }
        }
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y > -20 && bullet.x > -50 && bullet.x < this.width + 50;
        });
        
        // 更新敌机子弹
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update(deltaTime);
            return bullet.y < this.height + 20;
        });
        
        // 更新粒子效果
        this.particles = this.particles.filter(particle => {
            particle.update(deltaTime);
            return particle.life > 0;
        });
        
        // 生成敌机
        // 生成敌机 - 每10秒提升初始出现频率的10%，无时间上限
        this.enemySpawnTimer += deltaTime * 60;
        
        // 计算动态出现间隔：基础间隔200，每10秒减少10%（即频率提升10%）
        const baseInterval = 200;
        const frequencyMultiplier = 1 + Math.floor(this.gameTime / 10) * 0.1; // 每10秒增加10%频率
        const dynamicInterval = baseInterval / frequencyMultiplier;
        
        if (this.enemySpawnTimer > dynamicInterval) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // 生成Boss
        this.bossSpawnTimer += deltaTime * 60;
        if (this.bossSpawnTimer > 1600 && Math.random() < 0.3) { // 约26.7秒后有30%概率生成Boss（频率提升1.5倍）
            this.spawnBoss();
            this.bossSpawnTimer = 0;
        }
        
        // 更新敌机
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(deltaTime);
            
            // Boss射击
            if (enemy.isBoss) {
                if (!enemy.shootTimer) enemy.shootTimer = 0;
                enemy.shootTimer += deltaTime * 60;
                if (enemy.shootTimer > 80) {
                    // Boss射击目标：使用敌机预先确定的目标玩家
                    let targetX = this.player.x;
                    let targetY = this.player.y;
                    if (enemy.targetPlayer) {
                        targetX = enemy.targetPlayer.x;
                        targetY = enemy.targetPlayer.y;
                    }
                    this.enemyBullets.push(...enemy.shoot(targetX, targetY));
                    enemy.shootTimer = 0;
                }
            }
            
            return enemy.y < this.height + 100 && enemy.health > 0;
        });
        
        // 生成能量豆
        this.powerUpSpawnTimer += deltaTime * 60;
        if (this.powerUpSpawnTimer > 1000) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 0;
        }
        
        // 更新能量豆
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update(this.width, this.height, deltaTime);
            return powerUp.active;
        });
        
        // 碰撞检测
        this.checkCollisions();
        
        // 更新UI
        this.updateUI();
    }
    
    shoot() {
        const bullets = this.player.shoot(this.player.weaponLevel);
        this.bullets.push(...bullets);
        
        // 添加射击粒子效果
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
                this.player.y,
                (Math.random() - 0.5) * 6, // 速度再提升1.5倍：从4变为6
                -Math.random() * 9, // 速度再提升1.5倍：从6变为9
                '#ffff00',
                20
            ));
        }
    }
    
    spawnEnemy() {
        const x = Math.random() * (this.width - 50);
        
        // 根据难度计算敌机初始血量
        let baseHealth = 5;
        switch(this.difficulty) {
            case 'easy':
                baseHealth = Math.floor(5 * 0.65);
                break;
            case 'normal':
                baseHealth = 5;
                break;
            case 'hard':
                baseHealth = Math.floor(5 * 1.5); // 困难模式为普通模式的1.5倍
                break;
        }
        
        // 如果是双人模式，增加1.5倍血量
        if (this.twoPlayerMode) {
            baseHealth = Math.floor(baseHealth * 1.5);
        }
        
        // 计算敌机血量增长：每10秒增加初始血量的一半，无时间限制
        const timeBonus = Math.floor(this.gameTime / 10) * (baseHealth / 2);
        const enemyHealth = baseHealth + timeBonus;
        
        // 双人模式下随机选择目标玩家
        let targetPlayer = this.player;
        if (this.twoPlayerMode && this.player2 && Math.random() < 0.5) {
            targetPlayer = this.player2;
        }
        
        const enemy = new Enemy(x, -50, targetPlayer);
        enemy.health = enemyHealth;
        enemy.maxHealth = enemyHealth;
        
        this.enemies.push(enemy);
    }
    
    spawnBoss() {
        const x = this.width / 2 - 40;
        
        // 根据难度计算Boss初始血量
        let baseHealth = 23;
        switch(this.difficulty) {
            case 'easy':
                baseHealth = Math.floor(23 * 0.65);
                break;
            case 'normal':
                baseHealth = 23;
                break;
            case 'hard':
                baseHealth = Math.floor(23 * 1.5); // 困难模式为普通模式的1.5倍
                break;
        }
        
        // 如果是双人模式，增加1.5倍血量
        if (this.twoPlayerMode) {
            baseHealth = Math.floor(baseHealth * 1.5);
        }
        
        // 计算Boss血量增长：每10秒增加初始血量的一半
        const timeBonus = Math.floor(this.gameTime / 10) * (baseHealth / 2);
        const bossHealth = baseHealth + timeBonus;
        
        // 双人模式下随机选择目标玩家
        let targetPlayer = this.player;
        if (this.twoPlayerMode && this.player2 && Math.random() < 0.5) {
            targetPlayer = this.player2;
        }
        
        const boss = new Boss(x, -80, targetPlayer);
        boss.health = bossHealth;
        boss.maxHealth = bossHealth;
        
        this.enemies.push(boss);
    }
    
    spawnPowerUp() {
        const x = Math.random() * (this.width - 30);
        const y = Math.random() * (this.height - 200) + 50;
        this.powerUps.push(new PowerUp(x, y));
    }
    
    checkCollisions() {
         // 子弹击中敌机
         for (let i = this.bullets.length - 1; i >= 0; i--) {
             for (let j = this.enemies.length - 1; j >= 0; j--) {
                 if (this.bullets[i] && this.enemies[j] && 
                     this.checkCollision(this.bullets[i], this.enemies[j])) {
                     
                     // 播放敌机被击中音效
                     this.soundManager.playEnemyHitSound(
                         this.enemies[j].x + this.enemies[j].width / 2,
                         this.enemies[j].y + this.enemies[j].height / 2,
                         this.width
                     );
                     
                     // 添加爆炸粒子效果
                     for (let k = 0; k < 8; k++) {
                             this.particles.push(new Particle(
                                 this.bullets[i].x,
                                 this.bullets[i].y,
                                 (Math.random() - 0.5) * 36, // 速度再提升1.5倍：从24变为36
                                  (Math.random() - 0.5) * 36, // 速度再提升1.5倍：从24变为36
                                 '#ff6600',
                                 30
                             ));
                         }
                     
                     this.bullets.splice(i, 1);
                     this.enemies[j].takeDamage(1);
                     
                     // 击中敌机时增加能量：常规状态0.5点，无双状态0.1点
                     const energyGain = this.energyBurstActive ? 0.1 : 0.5;
                     this.energy = Math.min(this.energy + energyGain, this.maxEnergy);
                     
                     if (this.enemies[j].health <= 0) {
                         // Boss死亡额外奖励和血量上限增加
                         const scoreBonus = this.enemies[j].isBoss ? 100 : 10;
                         this.score += scoreBonus;
                         
                         // 击败Boss增加血量上限
                         if (this.enemies[j].isBoss) {
                             this.maxHealth += 5;
                             this.health = Math.min(this.health + 5, this.maxHealth); // 同时回复5点血量
                         }
                         
                         // Boss死亡爆炸效果
                         for (let k = 0; k < 30; k++) {
                             this.particles.push(new Particle(
                                 this.enemies[j].x + this.enemies[j].width / 2,
                                 this.enemies[j].y + this.enemies[j].height / 2,
                                 (Math.random() - 0.5) * 36, // 速度再提升1.5倍：从24变为36
                                  (Math.random() - 0.5) * 36, // 速度再提升1.5倍：从24变为36
                                 '#ff0000',
                                 80
                             ));
                         }
                         
                         this.enemies.splice(j, 1);
                     }
                     break;
                 }
             }
         }
        
        // 敌机子弹击中玩家
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.enemyBullets[i], this.player)) {
                // 播放玩家被击中音效
                this.soundManager.playPlayerHitSound(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    this.width
                );
                
                this.enemyBullets.splice(i, 1);
                this.health -= 15;
                
                // 受伤粒子效果
                for (let k = 0; k < 5; k++) {
                    this.particles.push(new Particle(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        '#ff0000',
                        25
                    ));
                }
                
                if (this.health <= 0) {
                    this.gameOver();
                }
            }
            
            // 敌机子弹击中第二个玩家
            if (this.twoPlayerMode && this.player2 && this.checkCollision(this.enemyBullets[i], this.player2)) {
                // 播放玩家被击中音效
                this.soundManager.playPlayerHitSound(
                    this.player2.x + this.player2.width / 2,
                    this.player2.y + this.player2.height / 2,
                    this.width
                );
                
                this.enemyBullets.splice(i, 1);
                this.health -= 15;
                
                // 受伤粒子效果
                for (let k = 0; k < 5; k++) {
                    this.particles.push(new Particle(
                        this.player2.x + this.player2.width / 2,
                        this.player2.y + this.player2.height / 2,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        '#ff0000',
                        25
                    ));
                }
                
                if (this.health <= 0) {
                    this.gameOver();
                }
            }
        }
        
        // 玩家碰撞敌机
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.enemies[i])) {
                // 播放玩家被击中音效
                this.soundManager.playPlayerHitSound(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height / 2,
                    this.width
                );
                
                this.enemies.splice(i, 1);
                this.health -= 15;
                
                // 碰撞爆炸效果
                for (let k = 0; k < 10; k++) {
                    this.particles.push(new Particle(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6,
                        '#ff4400',
                        40
                    ));
                }
                
                if (this.health <= 0) {
                    this.gameOver();
                }
            }
            
            // 第二个玩家碰撞敌机
            if (this.twoPlayerMode && this.player2 && this.checkCollision(this.player2, this.enemies[i])) {
                // 播放玩家被击中音效
                this.soundManager.playPlayerHitSound(
                    this.player2.x + this.player2.width / 2,
                    this.player2.y + this.player2.height / 2,
                    this.width
                );
                
                this.enemies.splice(i, 1);
                this.health -= 15;
                
                // 碰撞爆炸效果
                for (let k = 0; k < 10; k++) {
                    this.particles.push(new Particle(
                        this.player2.x + this.player2.width / 2,
                        this.player2.y + this.player2.height / 2,
                        (Math.random() - 0.5) * 6,
                        (Math.random() - 0.5) * 6,
                        '#ff4400',
                        40
                    ));
                }
                
                if (this.health <= 0) {
                    this.gameOver();
                }
            }
        }
        
        // 玩家收集能量豆
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            let collected = false;
            let player = null;
            
            // 第一个玩家收集能量豆
            if (this.checkCollision(this.player, this.powerUps[i])) {
                this.powerUps.splice(i, 1);
                collected = true;
                player = this.player;
            }
            // 第二个玩家收集能量豆
            else if (this.twoPlayerMode && this.player2 && this.checkCollision(this.player2, this.powerUps[i])) {
                this.powerUps.splice(i, 1);
                collected = true;
                player = this.player2;
            }
            
            if (collected && player) {
                // 只有吃到能量豆的玩家升级
                player.weaponLevel = Math.min(player.weaponLevel + 1, 10);
                
                // 回复血量（全局血量）
                this.health = Math.min(this.health + 10, this.maxHealth);
                
                // 升级粒子效果
                for (let k = 0; k < 12; k++) {
                    this.particles.push(new Particle(
                        player.x + player.width / 2,
                        player.y + player.height / 2,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        '#00ffff',
                        35
                    ));
                }
                
                // 回血粒子效果
                for (let k = 0; k < 8; k++) {
                    this.particles.push(new Particle(
                        player.x + player.width / 2,
                        player.y + player.height / 2,
                        (Math.random() - 0.5) * 3,
                        (Math.random() - 0.5) * 3,
                        '#00ff00',
                        30
                    ));
                }
            }
        }
    }
    
    checkCollision(obj1, obj2) {
        return obj1.x < obj2.x + obj2.width &&
               obj1.x + obj1.width > obj2.x &&
               obj1.y < obj2.y + obj2.height &&
               obj1.y + obj1.height > obj2.y;
    }
    
    gameOver() {
        this.gameRunning = false;
        this.bgMusic.pause();
    }
    
    updateUI() {
        document.getElementById('score').textContent = this.score;
        document.getElementById('weaponLevel').textContent = this.weaponLevel;
        
        // 更新游戏时长显示
        const minutes = Math.floor(this.gameTime / 60);
        const seconds = this.gameTime % 60;
        document.getElementById('gameTime').textContent = 
            `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        
        // 更新血量显示（显示当前血量/最大血量）
        document.getElementById('health').textContent = `${Math.max(0, this.health)}/${this.maxHealth}`;
    }
    
    render() {
        // 清空画布
        this.ctx.fillStyle = 'rgba(0, 0, 51, 0.1)';
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // 绘制星空背景
        this.drawStars();
        
        if (!this.gameStarted) {
            // 绘制开始界面
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#00ffff';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('飞机大战', this.width / 2, this.height / 2 - 50);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText('点击屏幕开始游戏', this.width / 2, this.height / 2 + 20);
            return;
        }
        
        // 绘制游戏对象
        this.player.render(this.ctx, this.energyBurstActive);
        
        // 渲染第二个玩家（如果存在）
        if (this.twoPlayerMode && this.player2) {
            this.player2.render(this.ctx, this.energyBurstActive);
        }
        
        // 能量爆发时添加特殊粒子效果
        if (this.energyBurstActive) {
            // 在玩家周围生成能量粒子
            for (let i = 0; i < 5; i++) {
                this.particles.push(new Particle(
                    this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 60,
                    this.player.y + this.player.height / 2 + (Math.random() - 0.5) * 60,
                    (Math.random() - 0.5) * 8,
                    (Math.random() - 0.5) * 8,
                    '#ffff00',
                    30
                ));
            }
            
            // 为第二个玩家也添加粒子效果
            if (this.twoPlayerMode && this.player2) {
                for (let i = 0; i < 5; i++) {
                    this.particles.push(new Particle(
                        this.player2.x + this.player2.width / 2 + (Math.random() - 0.5) * 60,
                        this.player2.y + this.player2.height / 2 + (Math.random() - 0.5) * 60,
                        (Math.random() - 0.5) * 8,
                        (Math.random() - 0.5) * 8,
                        '#ff0000',
                        30
                    ));
                }
            }
        }
        
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
        // 绘制能量条
        this.drawEnergyBar();
        
        // 游戏结束界面
        if (!this.gameRunning && this.gameStarted) {
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
            this.ctx.fillRect(0, 0, this.width, this.height);
            
            this.ctx.fillStyle = '#ff0000';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('游戏结束', this.width / 2, this.height / 2);
            
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`最终得分: ${this.score}`, this.width / 2, this.height / 2 + 60);
        }
    }
    
    drawStars() {
        this.ctx.fillStyle = '#ffffff';
        for (let i = 0; i < 50; i++) {
            const x = (Math.sin(Date.now() * 0.0005 + i) * 100 + this.width / 2 + i * 16) % this.width;
            const y = (Date.now() * 0.05 + i * 50) % this.height;
            this.ctx.fillRect(x, y, 1, 1);
        }
    }
    
    // 绘制能量条
    drawEnergyBar() {
        const barWidth = 200;
        const barHeight = 20;
        const barX = this.width - barWidth - 20;
        const barY = 20;
        
        // 绘制能量条背景
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.ctx.fillRect(barX - 2, barY - 2, barWidth + 4, barHeight + 4);
        
        // 绘制能量条边框
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 2;
        this.ctx.strokeRect(barX, barY, barWidth, barHeight);
        
        // 计算能量百分比
        const energyPercent = this.energy / this.maxEnergy;
        const fillWidth = barWidth * energyPercent;
        
        // 绘制能量条填充
        if (this.energy >= this.maxEnergy) {
            // 能量满时使用闪烁的金色效果
            const time = Date.now() * 0.01;
            const alpha = 0.8 + 0.2 * Math.sin(time);
            this.ctx.fillStyle = `rgba(255, 215, 0, ${alpha})`;
        } else {
            // 根据能量百分比改变颜色：红色->黄色->绿色->青色
            if (energyPercent < 0.25) {
                this.ctx.fillStyle = '#ff0000'; // 红色
            } else if (energyPercent < 0.5) {
                this.ctx.fillStyle = '#ff8000'; // 橙色
            } else if (energyPercent < 0.75) {
                this.ctx.fillStyle = '#ffff00'; // 黄色
            } else {
                this.ctx.fillStyle = '#00ff00'; // 绿色
            }
        }
        
        this.ctx.fillRect(barX, barY, fillWidth, barHeight);
        
        // 绘制能量条文本
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '14px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(`能量: ${Math.floor(this.energy)}/${this.maxEnergy}`, 
                         barX + barWidth / 2, barY + barHeight + 18);
        
        // 如果能量爆发激活，显示剩余能量
        if (this.energyBurstActive) {
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText(`能量爆发: ${Math.ceil(this.energy)}点`, barX + barWidth / 2, barY - 10);
        } else if (this.energy >= this.maxEnergy) {
            // 能量满时显示提示
            this.ctx.fillStyle = '#ffff00';
            this.ctx.font = '16px Arial';
            this.ctx.fillText('按空格键激活能量爆发!', barX + barWidth / 2, barY - 10);
        }
     }
     
     // 激活能量爆发
     activateEnergyBurst() {
         // 检查能量是否充满且当前未激活无双状态
         if (this.energy >= this.maxEnergy && !this.energyBurstActive) {
             this.energyBurstActive = true;
             this.energyBurstTimer = 0;
             // 不再立即清空能量，而是在update中逐渐消耗
             
             // 添加能量爆发特效
             for (let i = 0; i < 20; i++) {
                 this.particles.push(new Particle(
                     this.player.x + this.player.width / 2,
                     this.player.y + this.player.height / 2,
                     (Math.random() - 0.5) * 10,
                     (Math.random() - 0.5) * 10,
                     '#ffff00',
                     60
                 ));
             }
         }
     }
 }

// 粒子效果类
class Particle {
    constructor(x, y, vx, vy, color, life) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.life = life;
        this.maxLife = life;
    }
    
    update(deltaTime) {
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        this.life -= deltaTime * 60; // 基于时间减少生命值
        this.vy += 0.3 * deltaTime * 60; // 重力效果再提升1.5倍：从0.2变为0.3
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(this.x, this.y, 3, 3);
    }
}

// 玩家飞机类
class Player {
    constructor(x, y, isPlayer2 = false) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.speed = 9; // 速度再提升1.5倍：从6变为9
        this.isPlayer2 = isPlayer2; // 标记是否为第二个玩家
        this.weaponLevel = 1; // 独立的武器等级
    }
    
    update(keys, canvasWidth, canvasHeight, deltaTime = 1/60, energyBurstActive = false) {
        // 基于时间的移动速度（像素/秒）
        let moveSpeed = this.speed * deltaTime * 60; // 60fps为基准
        
        // 能量爆发时提升移动速度
        if (energyBurstActive) {
            moveSpeed *= 1.5; // 移动速度提升1.5倍
        }
        
        if (this.isPlayer2) {
            // 第二个玩家使用箭头键
            if (keys['arrowup'] && this.y > 0) this.y -= moveSpeed;
            if (keys['arrowdown'] && this.y < canvasHeight - this.height) this.y += moveSpeed;
            if (keys['arrowleft'] && this.x > 0) this.x -= moveSpeed;
            if (keys['arrowright'] && this.x < canvasWidth - this.width) this.x += moveSpeed;
        } else {
            // 第一个玩家使用WASD
            if (keys['w'] && this.y > 0) this.y -= moveSpeed;
            if (keys['s'] && this.y < canvasHeight - this.height) this.y += moveSpeed;
            if (keys['a'] && this.x > 0) this.x -= moveSpeed;
            if (keys['d'] && this.x < canvasWidth - this.width) this.x += moveSpeed;
        }
    }
    
    shoot(weaponLevel) {
        const bullets = [];
        const centerX = this.x + this.width / 2;
        
        switch (weaponLevel) {
            case 1:
                bullets.push(new Bullet(centerX - 2, this.y, 0, 'normal'));
                break;
            case 2:
                bullets.push(new Bullet(centerX - 15, this.y, 0, 'normal'));
                bullets.push(new Bullet(centerX + 11, this.y, 0, 'normal'));
                break;
            case 3:
                bullets.push(new Bullet(centerX - 2, this.y, 0, 'enhanced'));
                bullets.push(new Bullet(centerX - 20, this.y, 0, 'normal'));
                bullets.push(new Bullet(centerX + 16, this.y, 0, 'normal'));
                break;
            case 4:
                bullets.push(new Bullet(centerX - 15, this.y, 0, 'enhanced'));
                bullets.push(new Bullet(centerX + 11, this.y, 0, 'enhanced'));
                bullets.push(new Bullet(centerX - 25, this.y + 15, 0, 'normal'));
                bullets.push(new Bullet(centerX + 21, this.y + 15, 0, 'normal'));
                break;
            case 5:
                // 扫射模式
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new Bullet(centerX + i * 8, this.y, i * 0.3, 'spread'));
                }
                break;
            case 6:
                // 超级扫射模式
                for (let i = -3; i <= 3; i++) {
                    bullets.push(new Bullet(centerX + i * 6, this.y, i * 0.4, 'spread'));
                }
                bullets.push(new Bullet(centerX - 2, this.y - 10, 0, 'laser'));
                break;
            case 7:
                // 激光炮模式
                for (let i = -2; i <= 2; i++) {
                    bullets.push(new Bullet(centerX + i * 10, this.y, i * 0.2, 'laser'));
                }
                for (let i = -1; i <= 1; i++) {
                    bullets.push(new Bullet(centerX + i * 15, this.y + 10, i * 0.5, 'enhanced'));
                }
                break;
            case 8:
                // 螺旋弹幕
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    bullets.push(new Bullet(centerX, this.y, Math.sin(angle) * 0.8, 'spiral'));
                }
                break;
            case 9:
                // 全方位攻击
                for (let i = -4; i <= 4; i++) {
                    bullets.push(new Bullet(centerX + i * 5, this.y, i * 0.3, 'laser'));
                }
                for (let i = 0; i < 6; i++) {
                    const angle = (i / 6) * Math.PI * 2;
                    bullets.push(new Bullet(centerX, this.y + 5, Math.sin(angle) * 0.6, 'spiral'));
                }
                break;
            case 10:
                // 终极武器
                for (let i = -5; i <= 5; i++) {
                    bullets.push(new Bullet(centerX + i * 4, this.y, i * 0.2, 'ultimate'));
                }
                for (let i = 0; i < 12; i++) {
                    const angle = (i / 12) * Math.PI * 2;
                    bullets.push(new Bullet(centerX, this.y, Math.sin(angle) * 0.8, 'ultimate'));
                }
                break;
        }
        
        return bullets;
    }
    
    render(ctx, energyBurstActive = false) {
        // 能量爆发时的发光效果
        if (energyBurstActive) {
            ctx.save();
            ctx.shadowColor = this.isPlayer2 ? '#ff0000' : '#00ff00';
            ctx.shadowBlur = 20;
            ctx.globalAlpha = 0.8 + Math.sin(Date.now() * 0.01) * 0.2; // 闪烁效果
        }
        
        // 根据是否为第二个玩家选择颜色
        const mainColor = this.isPlayer2 ? '#ff0000' : '#00ff00';
        const wingColor = this.isPlayer2 ? '#cc0000' : '#00cc00';
        const engineColor = this.isPlayer2 ? '#ff9999' : '#ffff00';
        const shieldColor = this.isPlayer2 ? '#ff00ff' : '#00ffff';
        
        // 绘制飞机主体 - 增大尺寸
        ctx.fillStyle = mainColor;
        ctx.fillRect(this.x + 22, this.y + 45, 16, 15);
        
        // 绘制机翼
        ctx.fillStyle = wingColor;
        ctx.fillRect(this.x, this.y + 30, 60, 12);
        
        // 绘制机头
        ctx.fillStyle = mainColor;
        ctx.beginPath();
        ctx.moveTo(this.x + 30, this.y);
        ctx.lineTo(this.x + 15, this.y + 30);
        ctx.lineTo(this.x + 45, this.y + 30);
        ctx.closePath();
        ctx.fill();
        
        // 绘制引擎光效
        ctx.fillStyle = engineColor;
        ctx.fillRect(this.x + 12, this.y + 60, 9, 12);
        ctx.fillRect(this.x + 39, this.y + 60, 9, 12);
        
        // 绘制护盾效果
        ctx.strokeStyle = shieldColor;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
        
        // 恢复上下文状态（如果有能量爆发效果）
        if (energyBurstActive) {
            ctx.restore();
        }
    }
}

// 子弹类
class Bullet {
    constructor(x, y, angle = 0, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = 18; // 速度再提升1.5倍：从12变为18
        this.angle = angle;
        this.type = type;
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -this.speed;
        this.time = 0;
        
        // 根据类型调整属性
        switch (type) {
            case 'enhanced':
                this.width = 6;
                this.height = 16;
                this.speed = 21; // 速度再提升1.5倍：从14变为21
                break;
            case 'laser':
                this.width = 3;
                this.height = 20;
                this.speed = 27; // 速度再提升1.5倍：从18变为27
                break;
            case 'spiral':
                this.width = 5;
                this.height = 8;
                this.speed = 15; // 速度再提升1.5倍：从10变为15
                break;
            case 'ultimate':
                this.width = 8;
                this.height = 24;
                this.speed = 24; // 速度再提升1.5倍：从16变为24
                break;
        }
        
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -this.speed;
    }
    
    update(deltaTime) {
        this.time++;
        
        if (this.type === 'spiral') {
            // 螺旋运动
            this.vx = Math.sin(this.angle + this.time * 0.1) * this.speed * 0.8;
        }
        
        // 基于时间更新位置
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.angle);
        
        // 根据类型绘制不同效果
        switch (this.type) {
            case 'normal':
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-1, -this.height / 2, 2, this.height);
                break;
                
            case 'enhanced':
                ctx.fillStyle = '#ff6600';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#ffff00';
                ctx.fillRect(-2, -this.height / 2, 4, this.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-1, -this.height / 2, 2, this.height);
                break;
                
            case 'spread':
                ctx.fillStyle = '#00ff66';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-1, -this.height / 2, 2, this.height);
                break;
                
            case 'laser':
                ctx.fillStyle = '#ff0066';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#ff66cc';
                ctx.fillRect(-1, -this.height / 2, 2, this.height);
                // 激光光晕
                ctx.strokeStyle = 'rgba(255, 0, 102, 0.5)';
                ctx.lineWidth = 4;
                ctx.strokeRect(-this.width / 2 - 2, -this.height / 2 - 2, this.width + 4, this.height + 4);
                break;
                
            case 'spiral':
                ctx.fillStyle = '#6600ff';
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#cc66ff';
                ctx.fillRect(-2, -this.height / 2, 4, this.height);
                break;
                
            case 'ultimate':
                // 彩虹效果
                const colors = ['#ff0000', '#ff6600', '#ffff00', '#00ff00', '#0066ff', '#6600ff'];
                const colorIndex = Math.floor(this.time / 3) % colors.length;
                ctx.fillStyle = colors[colorIndex];
                ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(-3, -this.height / 2, 6, this.height);
                // 终极光晕
                ctx.strokeStyle = `rgba(255, 255, 255, 0.8)`;
                ctx.lineWidth = 3;
                ctx.strokeRect(-this.width / 2 - 3, -this.height / 2 - 3, this.width + 6, this.height + 6);
                break;
        }
        
        // 尾迹效果
        if (this.type !== 'normal') {
            ctx.fillStyle = 'rgba(255, 255, 0, 0.3)';
            ctx.fillRect(-this.width / 2, this.height / 2, this.width, 8);
        }
        
        ctx.restore();
    }
}

// 敌机子弹类
class EnemyBullet {
    constructor(x, y, vx, vy) {
        this.x = x;
        this.y = y;
        this.width = 6;
        this.height = 10;
        this.vx = vx;
        this.vy = vy;
    }
    
    update(deltaTime) {
        // 基于时间更新位置
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
    }
    
    render(ctx) {
        ctx.fillStyle = '#ff3300';
        ctx.fillRect(this.x, this.y, this.width, this.height);
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x + 1, this.y, this.width - 2, this.height);
    }
}

// 敌机类
class Enemy {
    constructor(x, y, targetPlayer = null) {
        this.x = x;
        this.y = y;
        this.width = 50;  // 从60调整为50
        this.height = 50; // 从60调整为50
        this.speed = 3; // 速度再提升1.5倍：从2变为3
        this.moveSpeed = 1.5; // 速度再提升1.5倍：从1变为1.5
        this.health = 5;  // 3 * 1.5 = 4.5，向上取整为5
        this.maxHealth = 5;
        this.isBoss = false;
        this.targetPlayer = targetPlayer; // 目标玩家对象，在生成时确定
    }
    
    update(deltaTime) {
        // 基于时间更新位置
        this.y += this.speed * deltaTime * 60;
        
        // 如果有目标玩家，向其靠拢（敌机中心点对准玩家中心点）
        if (this.targetPlayer) {
            const targetX = this.targetPlayer.x + this.targetPlayer.width / 2;
            const enemyCenterX = this.x + this.width / 2;
            
            if (enemyCenterX < targetX) {
                this.x += this.moveSpeed * deltaTime * 60;
            } else if (enemyCenterX > targetX) {
                this.x -= this.moveSpeed * deltaTime * 60;
            }
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    render(ctx) {
        // 绘制敌机主体 (调整为50x50尺寸)
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 18.75, this.y + 10, 12.5, 30);
        
        // 绘制机翼 (调整为50x50尺寸)
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x, this.y + 18.75, 50, 10);
        
        // 绘制机头 (调整为50x50尺寸)
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(this.x + 25, this.y + 40);
        ctx.lineTo(this.x + 10, this.y + 10);
        ctx.lineTo(this.x + 40, this.y + 10);
        ctx.closePath();
        ctx.fill();
        
        // 绘制血量条 (调整为50x50尺寸)
        const barWidth = 37.5;
        const barHeight = 5;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 6.25, this.y - 10, barWidth, barHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + 6.25, this.y - 10, barWidth * healthPercent, barHeight);
    }
}

// Boss类
class Boss extends Enemy {
    constructor(x, y, targetPlayer = null) {
        super(x, y, targetPlayer);
        this.width = 100; // 从120调整为100
        this.height = 75; // 从90调整为75
        this.health = 23;  // 15 * 1.5 = 22.5，向上取整为23
        this.maxHealth = 23;
        this.speed = 1.5; // 速度再提升1.5倍：从1变为1.5
        this.moveSpeed = 0.9; // 速度再提升1.5倍：从0.6变为0.9
        this.isBoss = true;
        this.shootTimer = 0;
        this.movePattern = 0;
        this.moveTimer = 0;
    }
    
    update(deltaTime) {
        this.moveTimer += deltaTime * 60; // 基于时间更新计时器
        
        // Boss移动模式
        if (this.moveTimer > 120) {
            this.movePattern = (this.movePattern + 1) % 3;
            this.moveTimer = 0;
        }
        
        switch (this.movePattern) {
            case 0: // 向玩家靠拢
                if (this.targetPlayer) {
                    const targetX = this.targetPlayer.x + this.targetPlayer.width / 2;
                    if (this.x < targetX) {
                        this.x += this.moveSpeed * deltaTime * 60;
                    } else if (this.x > targetX) {
                        this.x -= this.moveSpeed * deltaTime * 60;
                    }
                }
                break;
            case 1: // 左右移动
                this.x += Math.sin(this.moveTimer * 0.1) * 6 * deltaTime * 60; // 速度再提升1.5倍：从4变为6
                break;
            case 2: // 下降
                this.y += this.speed * deltaTime * 60;
                break;
        }
        
        // 保持在屏幕内
        this.x = Math.max(0, Math.min(this.x, 1000 - this.width));
    }
    
    shoot(playerX, playerY) {
        const bullets = [];
        const centerX = this.x + this.width / 2;
        const centerY = this.y + this.height;
        
        // Boss射击模式：向玩家方向射击3发子弹
        for (let i = -1; i <= 1; i++) {
            const targetX = playerX + i * 30;
            const dx = targetX - centerX;
            const dy = playerY - centerY;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const vx = (dx / distance) * 3.6;
            const vy = (dy / distance) * 3.6;
            
            bullets.push(new EnemyBullet(centerX + i * 15, centerY, vx, vy));
        }
        
        return bullets;
    }
    
    render(ctx) {
        // 绘制Boss主体 (调整为100x75尺寸)
        ctx.fillStyle = '#990000';
        ctx.fillRect(this.x + 25, this.y + 18.75, 50, 37.5);
        
        // 绘制Boss机翼 (调整为100x75尺寸)
        ctx.fillStyle = '#660000';
        ctx.fillRect(this.x, this.y + 31.25, 100, 18.75);
        
        // 绘制Boss机头 (调整为100x75尺寸)
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.moveTo(this.x + 50, this.y + 56.25);
        ctx.lineTo(this.x + 18.75, this.y + 18.75);
        ctx.lineTo(this.x + 81.25, this.y + 18.75);
        ctx.closePath();
        ctx.fill();
        
        // Boss装甲 (调整为100x75尺寸)
        ctx.fillStyle = '#444444';
        ctx.fillRect(this.x + 12.5, this.y + 25, 75, 10);
        ctx.fillRect(this.x + 12.5, this.y + 40, 75, 10);
        
        // Boss引擎 (调整为100x75尺寸)
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x + 6.25, this.y + 62.5, 10, 12.5);
        ctx.fillRect(this.x + 83.75, this.y + 62.5, 10, 12.5);
        
        // 绘制Boss血量条（调整为100x75尺寸）
        const barWidth = 75;
        const barHeight = 7.5;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#330000';
        ctx.fillRect(this.x + 12.5, this.y - 15, barWidth, barHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 12.5, this.y - 15, barWidth * healthPercent, barHeight);
        
        // Boss标识 (调整为100x75尺寸)
        ctx.fillStyle = '#ffff00';
        ctx.font = '15px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 22.5);
    }
}

// 能量豆类
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 6; // 速度再提升1.5倍：从4变为6
        this.rotation = 0;
        this.active = true;
        this.vx = (Math.random() - 0.5) * 6; // 速度再提升1.5倍：从4变为6
        this.vy = (Math.random() - 0.5) * 6; // 速度再提升1.5倍：从4变为6
        this.bounceTimer = 0;
    }
    
    update(canvasWidth, canvasHeight, deltaTime) {
        // 随机移动
        this.x += this.vx * deltaTime * 60;
        this.y += this.vy * deltaTime * 60;
        
        // 边界反弹
        if (this.x <= 0 || this.x >= canvasWidth - this.width) {
            this.vx = -this.vx;
        }
        if (this.y <= 0 || this.y >= canvasHeight - this.height) {
            this.vy = -this.vy;
        }
        
        // 随机改变方向
        this.bounceTimer += deltaTime * 60;
        if (this.bounceTimer > 120) {
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
            this.vx = Math.max(-2, Math.min(2, this.vx));
            this.vy = Math.max(-2, Math.min(2, this.vy));
            this.bounceTimer = 0;
        }
        
        this.rotation += 0.05 * deltaTime * 60;
    }
    
    render(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);
        
        // 绘制能量豆
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-12, -12, 24, 24);
        
        // 绘制内部光芒
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(-8, -8, 16, 16);
        
        // 绘制中心
        ctx.fillStyle = '#00ffff';
        ctx.fillRect(-4, -4, 8, 8);
        
        ctx.restore();
        
        // 绘制光环效果
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 18, 0, Math.PI * 2);
        ctx.stroke();
        
        // 绘制外层光环
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.3)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 25, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 重新开始游戏函数 - 重置游戏状态而不刷新页面
function restartGame() {
    const game = window.gameInstance;
    if (!game) return;

    // 停止背景音乐
    game.bgMusic.pause();
    game.bgMusic.currentTime = 0;

    // 重置所有游戏状态
    game.gameStarted = false;
    game.gameRunning = false;
    game.gamePaused = false;
    game.score = 0;
    game.health = 100;
    game.maxHealth = 100;
    game.weaponLevel = 1;
    game.gameStartTime = 0;
    game.gameTime = 0;
    game.scoreTimer = 0;
    game.lastScoreSecond = 0;
    game.pauseStartTime = 0; // 重置暂停开始时间

    // 重置所有计时器
    game.enemySpawnTimer = 0;
    game.powerUpSpawnTimer = 0;
    game.shootTimer = 0;
    game.shootTimer2 = 0;
    game.bossSpawnTimer = 0;

    // 重置能量系统
    game.energy = 0;
    game.energyBurstActive = false;
    game.energyBurstTimer = 0;
    game.energyBurstCooldownTimer = 0;

    // 清空所有游戏对象数组
    game.bullets = [];
    game.enemies = [];
    game.powerUps = [];
    game.enemyBullets = [];
    game.particles = [];

    // 重置玩家
    game.player = new Player(game.width / 2, game.height - 120);
    game.player2 = null;

    // 清空键盘状态
    game.keys = {};
    
    // 重置时间相关变量，确保重新开始后立即正确计分
    game.lastTime = 0;
    game.deltaTime = 0;

    // 立即开始新游戏
    setTimeout(() => {
        game.startGame();
    }, 10); // 短暂延迟确保状态完全重置
}

// 暂停/继续游戏函数
function togglePause() {
    // 获取游戏实例
    const game = window.gameInstance;
    
    if (!game.gameStarted) return; // 如果游戏未开始，则不执行任何操作
    
    game.gamePaused = !game.gamePaused;
    
    // 如果游戏暂停，显示提示信息
    if (game.gamePaused) {
        // 记录暂停时间点
        game.pauseStartTime = Date.now();
        
        // 在画布中央显示"游戏暂停"文本
        game.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        game.ctx.fillRect(0, 0, game.width, game.height);
        
        game.ctx.font = '48px Arial';
        game.ctx.fillStyle = '#00ffff';
        game.ctx.textAlign = 'center';
        game.ctx.textBaseline = 'middle';
        game.ctx.fillText('游戏暂停', game.width / 2, game.height / 2);
        
        // 暂停背景音乐
        game.bgMusic.pause();
    } else {
        // 恢复游戏时，调整gameStartTime以排除暂停期间的时间
        if (game.pauseStartTime) {
            const pauseDuration = Date.now() - game.pauseStartTime;
            game.gameStartTime += pauseDuration;
            game.pauseStartTime = 0;
        }
        
        // 恢复背景音乐
        game.bgMusic.play().catch(e => console.log('音频播放失败:', e));
    }
}

// 设置难度函数
function setDifficulty(difficulty) {
    window.gameInstance.setDifficulty(difficulty);
}

// 全局函数用于切换双人模式
function toggleTwoPlayerMode() {
    if (window.gameInstance) {
        window.gameInstance.toggleTwoPlayerMode();
    }
}

// 启动游戏
window.addEventListener('load', () => {
    window.gameInstance = new Game(); // 将游戏实例存储为全局变量
});

// 规则弹窗功能
// 音效管理系统
class SoundManager {
    constructor() {
        this.audioContext = null;
        this.masterVolume = 0.3; // 主音量
        this.soundEnabled = true;
        
        // 音效播放时间戳记录，用于防止短时间内重复播放
        this.enemyHitTimestamps = new Map();
        this.playerHitTimestamps = new Map();
        this.hitSoundCooldown = 50; // 冷却时间（毫秒）
        
        // 初始化音频上下文
        this.initAudioContext();
    }
    
    initAudioContext() {
        try {
            // 创建音频上下文
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // 创建主音量节点
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.masterVolume;
            this.masterGain.connect(this.audioContext.destination);
        } catch (error) {
            console.warn('音频上下文初始化失败:', error);
            this.soundEnabled = false;
        }
    }
    
    // 播放击中音效
    playHitSound(x = 0, y = 0, canvasWidth = 800) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            // 确保音频上下文已启动
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            // 创建振荡器
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const panNode = this.audioContext.createStereoPanner();
            
            // 设置音效参数
            oscillator.type = 'square';
            oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, this.audioContext.currentTime + 0.1);
            
            // 设置音量包络
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.3, this.audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.15);
            
            // 设置立体声定位（基于x坐标）
            const pan = (x / canvasWidth) * 2 - 1; // 将x坐标转换为-1到1的范围
            panNode.pan.value = Math.max(-1, Math.min(1, pan));
            
            // 连接音频节点
            oscillator.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.masterGain);
            
            // 播放音效
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.15);
            
        } catch (error) {
            console.warn('播放击中音效失败:', error);
        }
    }
    
    // 播放敌机被击中音效
    playEnemyHitSound(x = 0, y = 0, canvasWidth = 800) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            // 检查冷却时间，防止短时间内重复播放
            const now = Date.now();
            const positionKey = `${Math.floor(x / 10)}_${Math.floor(y / 10)}`; // 位置网格化，10像素为一个网格
            
            if (this.enemyHitTimestamps.has(positionKey)) {
                const lastPlayTime = this.enemyHitTimestamps.get(positionKey);
                if (now - lastPlayTime < this.hitSoundCooldown) {
                    return; // 还在冷却时间内，不播放音效
                }
            }
            
            // 记录本次播放时间
            this.enemyHitTimestamps.set(positionKey, now);
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const panNode = this.audioContext.createStereoPanner();
            
            // 敌机击中音效 - 更低沉的声音，音量适中
            oscillator.type = 'sawtooth';
            oscillator.frequency.setValueAtTime(400, this.audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, this.audioContext.currentTime + 0.2);
            
            // 调整音量，最大音量为现在的两倍（0.80），但有冷却时间防止太吵
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.80, this.audioContext.currentTime + 0.02); 
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25);
            
            // 立体声定位 - 增强空间感
            const pan = (x / canvasWidth) * 2 - 1;
            panNode.pan.value = Math.max(-1, Math.min(1, pan * 0.8)); // 稍微减少极端定位
            
            oscillator.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.masterGain);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.25);
            
        } catch (error) {
            console.warn('播放敌机击中音效失败:', error);
        }
    }
    
    // 播放玩家被击中音效
    playPlayerHitSound(x = 0, y = 0, canvasWidth = 800) {
        if (!this.soundEnabled || !this.audioContext) return;
        
        try {
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            const panNode = this.audioContext.createStereoPanner();
            
            // 玩家被击中音效 - 警告音，音量适中
            oscillator.type = 'triangle';
            oscillator.frequency.setValueAtTime(300, this.audioContext.currentTime);
            oscillator.frequency.linearRampToValueAtTime(150, this.audioContext.currentTime + 0.3);
            
            // 调整音量，避免过于刺耳
            gainNode.gain.setValueAtTime(0, this.audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.60, this.audioContext.currentTime + 0.05); 
            gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.35);
            
            // 立体声定位
            const pan = (x / canvasWidth) * 2 - 1;
            panNode.pan.value = Math.max(-1, Math.min(1, pan * 0.8));
            
            oscillator.connect(gainNode);
            gainNode.connect(panNode);
            panNode.connect(this.masterGain);
            
            oscillator.start(this.audioContext.currentTime);
            oscillator.stop(this.audioContext.currentTime + 0.35);
            
        } catch (error) {
            console.warn('播放玩家击中音效失败:', error);
        }
    }
    
    // 设置主音量
    setMasterVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
        if (this.masterGain) {
            this.masterGain.gain.value = this.masterVolume;
        }
    }
    
    // 启用/禁用音效
    toggleSound() {
        this.soundEnabled = !this.soundEnabled;
        return this.soundEnabled;
    }
}

// 规则弹窗功能
function showRules() {
    document.getElementById('rulesModal').style.display = 'block';
}

function closeRules() {
    document.getElementById('rulesModal').style.display = 'none';
}

// 点击模态框外部关闭
window.onclick = function(event) {
    const modal = document.getElementById('rulesModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}