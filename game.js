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
        this.score = 0;
        this.health = 100;
        this.maxHealth = 100;
        this.weaponLevel = 1;
        this.gameStartTime = 0;
        this.gameTime = 0;
        
        // 游戏对象数组
        this.bullets = [];
        this.enemies = [];
        this.powerUps = [];
        this.enemyBullets = [];
        this.particles = [];
        
        // 创建玩家飞机
        this.player = new Player(this.width / 2, this.height - 120);
        
        // 键盘输入状态
        this.keys = {};
        
        // 游戏计时器
        this.enemySpawnTimer = 0;
        this.powerUpSpawnTimer = 0;
        this.shootTimer = 0;
        this.bossSpawnTimer = 0;
        
        // 音频
        this.bgMusic = document.getElementById('bgMusic');
        this.bgMusic.volume = 0.3;
        
        this.init();
    }
    
    init() {
        // 绑定键盘事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
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
        this.gameStartTime = Date.now();
        
        this.bgMusic.play().catch(e => console.log('音频播放失败:', e));
    }
    
    gameLoop() {
        if (this.gameRunning) {
            this.update();
        }
        this.render();
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // 更新游戏时间
        if (this.gameStartTime > 0) {
            this.gameTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        }
        
        // 更新玩家
        this.player.update(this.keys, this.width, this.height);
        
        // 自动射击 - 根据武器等级调整射击频率
        this.shootTimer++;
        const shootInterval = Math.max(10, 25 - this.weaponLevel * 2);
        if (this.shootTimer > shootInterval) {
            this.shoot();
            this.shootTimer = 0;
        }
        
        // 更新子弹
        this.bullets = this.bullets.filter(bullet => {
            bullet.update();
            return bullet.y > -20 && bullet.x > -50 && bullet.x < this.width + 50;
        });
        
        // 更新敌机子弹
        this.enemyBullets = this.enemyBullets.filter(bullet => {
            bullet.update();
            return bullet.y < this.height + 20;
        });
        
        // 更新粒子效果
        this.particles = this.particles.filter(particle => {
            particle.update();
            return particle.life > 0;
        });
        
        // 生成敌机
        this.enemySpawnTimer++;
        if (this.enemySpawnTimer > 200) {
            this.spawnEnemy();
            this.enemySpawnTimer = 0;
        }
        
        // 生成Boss
        this.bossSpawnTimer++;
        if (this.bossSpawnTimer > 2400 && Math.random() < 0.3) { // 40秒后有30%概率生成Boss
            this.spawnBoss();
            this.bossSpawnTimer = 0;
        }
        
        // 更新敌机
        this.enemies = this.enemies.filter(enemy => {
            enemy.update(this.player.x, this.player.y);
            
            // Boss射击
            if (enemy.isBoss && enemy.shootTimer++ > 80) {
                this.enemyBullets.push(...enemy.shoot(this.player.x, this.player.y));
                enemy.shootTimer = 0;
            }
            
            return enemy.y < this.height + 100 && enemy.health > 0;
        });
        
        // 生成能量豆
        this.powerUpSpawnTimer++;
        if (this.powerUpSpawnTimer > 1000) {
            this.spawnPowerUp();
            this.powerUpSpawnTimer = 0;
        }
        
        // 更新能量豆
        this.powerUps = this.powerUps.filter(powerUp => {
            powerUp.update(this.width, this.height);
            return powerUp.active;
        });
        
        // 碰撞检测
        this.checkCollisions();
        
        // 更新UI
        this.updateUI();
    }
    
    shoot() {
        const bullets = this.player.shoot(this.weaponLevel);
        this.bullets.push(...bullets);
        
        // 添加射击粒子效果
        for (let i = 0; i < 3; i++) {
            this.particles.push(new Particle(
                this.player.x + this.player.width / 2 + (Math.random() - 0.5) * 20,
                this.player.y,
                (Math.random() - 0.5) * 2,
                -Math.random() * 3,
                '#ffff00',
                20
            ));
        }
    }
    
    spawnEnemy() {
        const x = Math.random() * (this.width - 50);
        
        // 计算敌机血量增长：每10秒增加初始血量的一半
        const timeBonus = Math.floor(this.gameTime / 10) * 2.5; // 初始血量5的一半是2.5
        const enemyHealth = 5 + timeBonus;
        
        const enemy = new Enemy(x, -50);
        enemy.health = enemyHealth;
        enemy.maxHealth = enemyHealth;
        
        this.enemies.push(enemy);
    }
    
    spawnBoss() {
        const x = this.width / 2 - 40;
        
        // 计算Boss血量增长：每10秒增加初始血量的一半
        const timeBonus = Math.floor(this.gameTime / 10) * 11.5; // 初始血量23的一半是11.5
        const bossHealth = 23 + timeBonus;
        
        const boss = new Boss(x, -80);
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
                    
                    // 添加爆炸粒子效果
                    for (let k = 0; k < 8; k++) {
                        this.particles.push(new Particle(
                            this.bullets[i].x,
                            this.bullets[i].y,
                            (Math.random() - 0.5) * 6,
                            (Math.random() - 0.5) * 6,
                            '#ff6600',
                            30
                        ));
                    }
                    
                    this.bullets.splice(i, 1);
                    this.enemies[j].takeDamage(1);
                    if (this.enemies[j].health <= 0) {
                        // Boss死亡额外奖励和血量上限增加
                        const scoreBonus = this.enemies[j].isBoss ? 100 : 10;
                        this.score += scoreBonus;
                        
                        // 击败Boss增加血量上限
                        if (this.enemies[j].isBoss) {
                            this.maxHealth += 5;
                            this.health = Math.min(this.health + 5, this.maxHealth); // 同时回复5点血量
                        }
                        
                        // 死亡爆炸效果
                        for (let k = 0; k < 15; k++) {
                            this.particles.push(new Particle(
                                this.enemies[j].x + this.enemies[j].width / 2,
                                this.enemies[j].y + this.enemies[j].height / 2,
                                (Math.random() - 0.5) * 8,
                                (Math.random() - 0.5) * 8,
                                '#ff0000',
                                50
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
        }
        
        // 玩家碰撞敌机
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.enemies[i])) {
                this.enemies.splice(i, 1);
                this.health -= 25;
                
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
        }
        
        // 玩家收集能量豆
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            if (this.checkCollision(this.player, this.powerUps[i])) {
                this.powerUps.splice(i, 1);
                this.weaponLevel = Math.min(this.weaponLevel + 1, 10);
                
                // 回复血量
                this.health = Math.min(this.health + 10, this.maxHealth);
                
                // 升级粒子效果
                for (let k = 0; k < 12; k++) {
                    this.particles.push(new Particle(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
                        (Math.random() - 0.5) * 4,
                        (Math.random() - 0.5) * 4,
                        '#00ffff',
                        35
                    ));
                }
                
                // 回血粒子效果
                for (let k = 0; k < 8; k++) {
                    this.particles.push(new Particle(
                        this.player.x + this.player.width / 2,
                        this.player.y + this.player.height / 2,
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
        this.player.render(this.ctx);
        
        this.bullets.forEach(bullet => bullet.render(this.ctx));
        this.enemyBullets.forEach(bullet => bullet.render(this.ctx));
        this.enemies.forEach(enemy => enemy.render(this.ctx));
        this.powerUps.forEach(powerUp => powerUp.render(this.ctx));
        this.particles.forEach(particle => particle.render(this.ctx));
        
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
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.life--;
        this.vy += 0.1; // 重力效果
    }
    
    render(ctx) {
        const alpha = this.life / this.maxLife;
        ctx.fillStyle = this.color + Math.floor(alpha * 255).toString(16).padStart(2, '0');
        ctx.fillRect(this.x, this.y, 3, 3);
    }
}

// 玩家飞机类
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 60;
        this.height = 60;
        this.speed = 3;
    }
    
    update(keys, canvasWidth, canvasHeight) {
        // WASD控制
        if (keys['w'] && this.y > 0) this.y -= this.speed;
        if (keys['s'] && this.y < canvasHeight - this.height) this.y += this.speed;
        if (keys['a'] && this.x > 0) this.x -= this.speed;
        if (keys['d'] && this.x < canvasWidth - this.width) this.x += this.speed;
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
    
    render(ctx) {
        // 绘制飞机主体 - 增大尺寸
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + 22, this.y + 45, 16, 15);
        
        // 绘制机翼
        ctx.fillStyle = '#00cc00';
        ctx.fillRect(this.x, this.y + 30, 60, 12);
        
        // 绘制机头
        ctx.fillStyle = '#00ff00';
        ctx.beginPath();
        ctx.moveTo(this.x + 30, this.y);
        ctx.lineTo(this.x + 15, this.y + 30);
        ctx.lineTo(this.x + 45, this.y + 30);
        ctx.closePath();
        ctx.fill();
        
        // 绘制引擎光效
        ctx.fillStyle = '#ffff00';
        ctx.fillRect(this.x + 12, this.y + 60, 9, 12);
        ctx.fillRect(this.x + 39, this.y + 60, 9, 12);
        
        // 绘制护盾效果
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x + this.width / 2, this.y + this.height / 2, 35, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// 子弹类
class Bullet {
    constructor(x, y, angle = 0, type = 'normal') {
        this.x = x;
        this.y = y;
        this.width = 4;
        this.height = 12;
        this.speed = 6;
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
                this.speed = 7;
                break;
            case 'laser':
                this.width = 3;
                this.height = 20;
                this.speed = 9;
                break;
            case 'spiral':
                this.width = 5;
                this.height = 8;
                this.speed = 5;
                break;
            case 'ultimate':
                this.width = 8;
                this.height = 24;
                this.speed = 8;
                break;
        }
        
        this.vx = Math.sin(angle) * this.speed;
        this.vy = -this.speed;
    }
    
    update() {
        this.time++;
        
        if (this.type === 'spiral') {
            // 螺旋运动
            this.vx = Math.sin(this.angle + this.time * 0.1) * this.speed * 0.8;
        }
        
        this.x += this.vx;
        this.y += this.vy;
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
    
    update() {
        this.x += this.vx;
        this.y += this.vy;
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
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 40;
        this.height = 40;
        this.speed = 1;
        this.moveSpeed = 0.5;
        this.health = 5;  // 3 * 1.5 = 4.5，向上取整为5
        this.maxHealth = 5;
        this.isBoss = false;
    }
    
    update(playerX, playerY) {
        this.y += this.speed;
        
        // 向玩家靠拢
        if (this.x < playerX) {
            this.x += this.moveSpeed;
        } else if (this.x > playerX) {
            this.x -= this.moveSpeed;
        }
    }
    
    takeDamage(damage) {
        this.health -= damage;
    }
    
    render(ctx) {
        // 绘制敌机主体
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 15, this.y + 8, 10, 24);
        
        // 绘制机翼
        ctx.fillStyle = '#cc0000';
        ctx.fillRect(this.x, this.y + 15, 40, 8);
        
        // 绘制机头
        ctx.fillStyle = '#ff0000';
        ctx.beginPath();
        ctx.moveTo(this.x + 20, this.y + 32);
        ctx.lineTo(this.x + 8, this.y + 8);
        ctx.lineTo(this.x + 32, this.y + 8);
        ctx.closePath();
        ctx.fill();
        
        // 绘制血量条
        const barWidth = 30;
        const barHeight = 4;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 5, this.y - 8, barWidth, barHeight);
        
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(this.x + 5, this.y - 8, barWidth * healthPercent, barHeight);
    }
}

// Boss类
class Boss extends Enemy {
    constructor(x, y) {
        super(x, y);
        this.width = 80;
        this.height = 60;
        this.health = 23;  // 15 * 1.5 = 22.5，向上取整为23
        this.maxHealth = 23;
        this.speed = 0.5;
        this.moveSpeed = 0.3;
        this.isBoss = true;
        this.shootTimer = 0;
        this.movePattern = 0;
        this.moveTimer = 0;
    }
    
    update(playerX, playerY) {
        this.moveTimer++;
        
        // Boss移动模式
        if (this.moveTimer > 120) {
            this.movePattern = (this.movePattern + 1) % 3;
            this.moveTimer = 0;
        }
        
        switch (this.movePattern) {
            case 0: // 向玩家靠拢
                if (this.x < playerX) {
                    this.x += this.moveSpeed;
                } else if (this.x > playerX) {
                    this.x -= this.moveSpeed;
                }
                break;
            case 1: // 左右移动
                this.x += Math.sin(this.moveTimer * 0.1) * 2;
                break;
            case 2: // 下降
                this.y += this.speed;
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
            const vx = (dx / distance) * 3;
            const vy = (dy / distance) * 3;
            
            bullets.push(new EnemyBullet(centerX + i * 15, centerY, vx, vy));
        }
        
        return bullets;
    }
    
    render(ctx) {
        // 绘制Boss主体
        ctx.fillStyle = '#990000';
        ctx.fillRect(this.x + 20, this.y + 15, 40, 30);
        
        // 绘制Boss机翼
        ctx.fillStyle = '#660000';
        ctx.fillRect(this.x, this.y + 25, 80, 15);
        
        // 绘制Boss机头
        ctx.fillStyle = '#cc0000';
        ctx.beginPath();
        ctx.moveTo(this.x + 40, this.y + 45);
        ctx.lineTo(this.x + 15, this.y + 15);
        ctx.lineTo(this.x + 65, this.y + 15);
        ctx.closePath();
        ctx.fill();
        
        // Boss装甲
        ctx.fillStyle = '#444444';
        ctx.fillRect(this.x + 10, this.y + 20, 60, 8);
        ctx.fillRect(this.x + 10, this.y + 32, 60, 8);
        
        // Boss引擎
        ctx.fillStyle = '#ff6600';
        ctx.fillRect(this.x + 5, this.y + 50, 8, 10);
        ctx.fillRect(this.x + 67, this.y + 50, 8, 10);
        
        // 绘制Boss血量条（更大）
        const barWidth = 60;
        const barHeight = 6;
        const healthPercent = this.health / this.maxHealth;
        
        ctx.fillStyle = '#330000';
        ctx.fillRect(this.x + 10, this.y - 12, barWidth, barHeight);
        
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(this.x + 10, this.y - 12, barWidth * healthPercent, barHeight);
        
        // Boss标识
        ctx.fillStyle = '#ffff00';
        ctx.font = '12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('BOSS', this.x + this.width / 2, this.y - 18);
    }
}

// 能量豆类
class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.width = 25;
        this.height = 25;
        this.speed = 1;
        this.rotation = 0;
        this.active = true;
        this.vx = (Math.random() - 0.5) * 2;
        this.vy = (Math.random() - 0.5) * 2;
        this.bounceTimer = 0;
    }
    
    update(canvasWidth, canvasHeight) {
        // 随机移动
        this.x += this.vx;
        this.y += this.vy;
        
        // 边界反弹
        if (this.x <= 0 || this.x >= canvasWidth - this.width) {
            this.vx = -this.vx;
        }
        if (this.y <= 0 || this.y >= canvasHeight - this.height) {
            this.vy = -this.vy;
        }
        
        // 随机改变方向
        this.bounceTimer++;
        if (this.bounceTimer > 120) {
            this.vx += (Math.random() - 0.5) * 0.5;
            this.vy += (Math.random() - 0.5) * 0.5;
            this.vx = Math.max(-2, Math.min(2, this.vx));
            this.vy = Math.max(-2, Math.min(2, this.vy));
            this.bounceTimer = 0;
        }
        
        this.rotation += 0.05;
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

// 重新开始游戏函数
function restartGame() {
    // 重新加载页面来重启游戏
    location.reload();
}

// 启动游戏
window.addEventListener('load', () => {
    new Game();
});