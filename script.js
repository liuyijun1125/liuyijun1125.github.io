// 生日常量（全局可用）
const BIRTHDAY_MONTH = 10; // 11月 (0-11)
const BIRTHDAY_DAY = 10;   // 11日

// 语言状态（全局）
let currentLang = 'zh';

// 当整个网页加载完毕后运行
window.addEventListener('DOMContentLoaded', () => {
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentDay = today.getDate();

    // 检查是否是生日
    if (currentMonth === BIRTHDAY_MONTH && currentDay === BIRTHDAY_DAY) {
        startBirthdaySequence();
    } else {
        // 为了方便调试，允许通过 URL 参数 force=true 来强制显示生日动画
        const params = new URLSearchParams(window.location.search);
        if (params.get('force') === 'true') {
            startBirthdaySequence();
        } else {
            showCountdownPage();
        }
    }
    // 语言按钮在 body 顶部（全局），尽早绑定事件并应用持久化选择
    setupLanguageToggle();
});

// --- 2. 动画和页面显示 ---

/** * 这是一个辅助函数，用于按顺序显示步骤 
 * (使用 async/await 来避免复杂的 setTimeout 嵌套)
 */
const sleep = (ms) => new Promise(res => setTimeout(res, ms));

/** * 步骤 A: 启动生日过场动画 
 */
async function startBirthdaySequence() {
    const introContainer = document.getElementById('intro-animation');
    const chatStep = document.getElementById('intro-chat');
    const dateStep = document.getElementById('intro-date');
    const popperStep = document.getElementById('intro-popper');
    const fireworksStep = document.getElementById('intro-fireworks');
    const popperButton = document.getElementById('popper-button');

    // 显示 intro 容器
    introContainer.style.display = 'block';
    await sleep(100); // 等待浏览器渲染
    introContainer.style.opacity = 1;

    // 步骤 1: 聊天
    chatStep.style.display = 'flex';
    // 按顺序给每个 .chat-bubble 设置动画延迟，确保新增的行也按顺序出现
    const bubbles = Array.from(chatStep.querySelectorAll('.chat-bubble'));
    const gapMs = 15; // 每条气泡间隔（毫秒），可根据需要调整
    const animDurationMs = 500; // 与 CSS 中 fadeIn 时长一致
    bubbles.forEach((b, i) => {
        // 使用内联样式覆盖 CSS，确保按索引延迟
        b.style.animationDelay = `${i * gapMs}ms`;
        // 重新触发动画（在某些浏览器中需要强制回流）
        b.style.animationName = 'fadeIn';
    });
    // 计算等待总时长：最后一条开始延迟 + 动画时长 + 少量缓冲
    const totalChatTime = (Math.max(0, bubbles.length - 1) * gapMs) + animDurationMs + 300;
    // 在最后一条消息出现后额外等待一个 gapMs（用户要求）再显示按钮
    await sleep(totalChatTime + gapMs);
    // 聊天完成后，显示“继续”按钮，等待用户主动点击再继续到下一步
    const nextContainer = document.getElementById('chat-next-container');
    const nextButton = document.getElementById('chat-next-button');
    if (nextContainer && nextButton) {
        nextContainer.style.display = 'block';
        // 确保浏览器完成布局，然后再添加 .show 以触发平滑过渡
        await new Promise((frameResolve) => requestAnimationFrame(() => frameResolve()));
        // 添加进入动画类（稍微延迟以保证 transition 被正确应用）
        setTimeout(() => {
            nextButton.classList.add('show');
            // 播放一次性的按钮特效（彩带 + 粒子爆炸 + 文字微动画）
            try { playButtonEffects(nextButton); } catch (e) { console.error(e); }
        }, 20);
        // 聚焦按钮，方便键盘操作
        try { nextButton.focus(); } catch (e) {}
        await new Promise((resolve) => {
            const handler = () => {
                nextButton.removeEventListener('click', handler);
                // 隐藏并移除动画类
                nextButton.classList.remove('show');
                nextContainer.style.display = 'none';
                // 隐藏聊天区，进入下一步
                chatStep.style.display = 'none';
                resolve();
            };
            nextButton.addEventListener('click', handler);
        });
    } else {
        // 回退：如果按钮不存在，继续默认行为
        chatStep.style.display = 'none';
    }

    // 步骤 2: 日期
    dateStep.style.display = 'flex';
    // 使用更精确的动画序列：飞入 -> 文本变化 -> 合并 -> 替换
    await animateDateSequence();

    // 在替换完成后，显示三段文字（从屏幕底部缓缓升起等）
    await showMessageSequence();

    // 所有操作完成后再等 5s，然后淡出 intro 并进入主页面
    await sleep(5000);
    introContainer.style.opacity = 0;
    showMainBirthdayPage();
    setTimeout(() => introContainer.remove(), 1000);
}

// 创建一个动态烟花粒子放到 fireworks 容器中
function createDynamicFirework(container) {
    const el = document.createElement('div');
    el.className = 'firework dynamic';
    // 随机位置
    const x = Math.random() * 100; // vw
    const y = 20 + Math.random() * 60; // between 20vh and 80vh
    el.style.left = x + '%';
    el.style.top = y + '%';
    // 随机颜色
    const colors = ['#fff', '#ff0', '#f0f', '#0ff', '#ff7f7f', '#7fff7f'];
    el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    container.appendChild(el);
    // 清理元素
    el.addEventListener('animationend', () => el.remove());
}

/** * 烟花筒按住交互功能
 */
function setupPopperInteraction() {
    const popperButton = document.getElementById('popper-button');
    const fireworksContainer = document.getElementById('intro-fireworks') || document.body; // 使用现有的 fireworks 容器或 body

    if (!popperButton) return;

    let isPressing = false;
    let fireworkInterval;

    // 开始放烟花
    const startFireworks = () => {
        if (isPressing) return;
        isPressing = true;
        // 每 200ms 创建一个烟花粒子
        fireworkInterval = setInterval(() => {
            createDynamicFirework(fireworksContainer);
        }, 200);
    };

    // 停止放烟花
    const stopFireworks = () => {
        if (!isPressing) return;
        isPressing = false;
        clearInterval(fireworkInterval);
        // 可选：淡出现有烟花
        setTimeout(() => {
            const dynamics = fireworksContainer.querySelectorAll('.firework.dynamic');
            dynamics.forEach(el => el.remove());
        }, 1000);
    };

    // 鼠标事件
    popperButton.addEventListener('mousedown', startFireworks);
    document.addEventListener('mouseup', stopFireworks);

    // 触摸事件（兼容移动设备）
    popperButton.addEventListener('touchstart', (e) => {
        e.preventDefault(); // 防止默认行为
        startFireworks();
    });
    document.addEventListener('touchend', stopFireworks);

    // 防止拖拽等干扰
    popperButton.addEventListener('dragstart', (e) => e.preventDefault());
}

/** * 步骤 B: 显示生日快乐主页 
 */
function showMainBirthdayPage() {
    const page = document.getElementById('main-birthday-page');
    page.style.display = 'flex';
    setTimeout(() => page.style.opacity = 1, 100); // 延迟一点以触发过渡

    // 初始化主页的交互
    setupCakeInteraction();
    setupPopperInteraction(); // 添加烟花筒按住交互
}

/** * 步骤 C: 显示倒计时页面
 */
function showCountdownPage() {
    const page = document.getElementById('countdown-page');
    page.style.display = 'flex';
    setTimeout(() => page.style.opacity = 1, 100);

    // 计算目标日期（使用全局 BIRTHDAY_MONTH / BIRTHDAY_DAY）
    const now = new Date();

    // 如果今天就是生日，直接进入生日序列
    if (now.getMonth() === BIRTHDAY_MONTH && now.getDate() === BIRTHDAY_DAY) {
        startBirthdaySequence();
        return;
    }

    let targetYear = now.getFullYear();
    // (注意: 月份是 0-11)
    let targetDate = new Date(targetYear, BIRTHDAY_MONTH, BIRTHDAY_DAY);

    // 如果今年的生日已经过了（且不是今天），目标设为明年
    if (now > targetDate) {
        targetDate.setFullYear(targetYear + 1);
    }

    // 启动倒计时
    const timerInterval = setInterval(() => {
        const diff = targetDate - new Date();
        if (diff <= 0) {
            clearInterval(timerInterval);
            // 倒计时结束，刷新页面（就会显示生日快乐了）
            window.location.reload();
            return;
        }

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        // 更新页面上的数字
        document.getElementById('days').innerText = days;
        document.getElementById('hours').innerText = hours;
        document.getElementById('minutes').innerText = minutes;
        document.getElementById('seconds').innerText = seconds;

    }, 1000);
}


// --- 3. 页面交互逻辑 ---

/** * 语言切换功能 
 */
function setupLanguageToggle() {
    const toggleButton = document.getElementById('lang-toggle');
    if (!toggleButton) return; // 防御性检查

    // 封装：根据语言更新页面上带 data-lang-* 的元素
    const updateTexts = (lang) => {
        document.querySelectorAll('[data-lang-zh]').forEach(el => {
            const text = el.getAttribute(`data-lang-${lang}`);
            if (text != null) el.innerText = text;
        });
    };

    // 从 localStorage 读语言偏好
    try {
        const saved = localStorage.getItem('preferredLang');
        if (saved === 'en' || saved === 'zh') currentLang = saved;
    } catch (e) {
        // ignore storage errors
    }

    // 初始化按钮文本和页面文本
    toggleButton.innerText = (currentLang === 'zh') ? 'English' : '中文';
    updateTexts(currentLang);

    // 切换逻辑
    toggleButton.addEventListener('click', () => {
        currentLang = (currentLang === 'zh') ? 'en' : 'zh';
        toggleButton.innerText = (currentLang === 'zh') ? 'English' : '中文';
        try { localStorage.setItem('preferredLang', currentLang); } catch (e) {}
        updateTexts(currentLang);
    });
}

/** * 蛋糕互动功能 - 新设计
 * 点击蛋糕后：
 * 1. 播放生日歌
 * 2. 显示创意祝福
 */
function setupCakeInteraction() {
    const cakeImg = document.getElementById('cake-img');
    const wishesContainer = document.getElementById('birthday-wishes');
    const song = document.getElementById('birthday-song');
    let cakeClicked = false;

    // 祝福文案库
    const wishes = [
        {
            zh: '祝你新的一岁，万事顺遂！',
            en: 'May all your wishes come true!'
        },
        {
            zh: '愿你的每一天都闪闪发光',
            en: 'May every day of yours shine bright'
        },
        {
            zh: '谢谢你的陪伴和信任',
            en: 'Thank you for your companionship'
        },
        {
            zh: '期待我们的下一个故事 💫',
            en: 'Looking forward to our next story 💫'
        }
    ];

    cakeImg.addEventListener('click', () => {
        if (cakeClicked) return; // 防止重复点击
        cakeClicked = true;

        // 添加点击动画
        cakeImg.style.animation = 'none';
        setTimeout(() => {
            cakeImg.style.animation = 'cakeBounce 0.3s ease';
        }, 10);

        // 播放生日歌
        try {
            song.currentTime = 0;
            song.play().catch(err => console.log('音乐播放失败:', err));
        } catch (e) {
            console.error('播放音乐时出错:', e);
        }

        // 隐藏提示文字
        const hint = document.getElementById('cake-hint');
        if (hint) {
            hint.style.transition = 'opacity 0.5s ease';
            hint.style.opacity = '0';
        }

        // 显示祝福
        setTimeout(() => {
            displayWishes(wishes, wishesContainer);
        }, 300);
    });
}

// 显示祝福文案
function displayWishes(wishes, container) {
    container.innerHTML = ''; // 清空

    wishes.forEach((wish, index) => {
        const line = document.createElement('div');
        line.className = 'wish-line';
        
        // 根据当前语言选择显示文案
        const text = currentLang === 'zh' ? wish.zh : wish.en;
        line.textContent = text;
        
        container.appendChild(line);
    });
}

// 添加点击蛋糕时的弹跳动画
const style = document.createElement('style');
style.textContent = `
    @keyframes cakeBounce {
        0% { transform: scale(1); }
        25% { transform: scale(0.95); }
        50% { transform: scale(1.1); }
        75% { transform: scale(0.97); }
        100% { transform: scale(1); }
    }
`;
document.head.appendChild(style);

// 动画化日期序列：返回 Promise，完成时继续后续步骤
function animateDateSequence() {
    return new Promise((resolve) => {
        const left = document.getElementById('date-left');
        const mid = document.getElementById('date-mid');
    const incoming = document.getElementById('date-in');
        const dateStep = document.getElementById('intro-date');
        const popperStep = document.getElementById('intro-popper');

        // 确保左、中数字可见
        left.style.opacity = 1;
        mid.style.opacity = 1;
        // date-text 可能被移除，需先检测
        const text = document.getElementById('date-text');
        if (text) {
            text.style.opacity = 1;
            text.style.transform = 'translateY(0)';
        }

        // 稍后让 incoming 从视口右侧滑入
        setTimeout(() => {
            // 计算目标（mid 中心）在视口坐标
            const midRect = mid.getBoundingClientRect();
            const targetX = midRect.left + midRect.width / 2;
            const targetY = midRect.top + midRect.height / 2;

            // 把 incoming 放到目标位置的坐标（fixed），并从视口右侧外偏移开始动画
            incoming.style.position = 'fixed';
            incoming.style.top = `${targetY}px`;
            incoming.style.left = `${targetX}px`;
            incoming.style.transform = 'translateX(0) translateY(-50%)';
            incoming.style.opacity = 1;
            incoming.style.zIndex = 900;

            // 计算起始偏移：从视口右侧外开始
            const startOffset = window.innerWidth + 80 - targetX;

            const anim = incoming.animate([
                { transform: `translateX(${startOffset}px) translateY(-50%)` },
                { transform: 'translateX(0) translateY(-50%)' }
            ], { duration: 1200, easing: 'cubic-bezier(.2,.9,.2,1)' });

            anim.onfinish = () => {
                // 在到达 mid 位置时播放粒子爆裂并替换中间数字
                try { playButtonEffects(mid); } catch (e) { console.error(e); }

                // 小弹跳效果并替换文本
                mid.classList.add('collide');
                // 等同替换：先短暂延迟以保证视觉上的“碰撞”感
                setTimeout(() => {
                    mid.textContent = '10';
                    setTimeout(() => mid.classList.remove('collide'), 260);
                }, 80);

                // incoming 渐隐并移除（短淡出）
                incoming.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 320, easing: 'ease' }).onfinish = () => {
                    try { incoming.style.display = 'none'; incoming.remove(); } catch (e) {}
                    // 不在此处切换到 popper，保留 dateStep 可见以便后续文字动画显示
                    // 仅等待一小段时间让用户看清替换和粒子效果，然后 resolve
                    setTimeout(() => {
                        resolve();
                    }, 700);
                };
            };
        }, 700);
    });
}

// 在按钮附近短时播放彩带 + 粒子爆炸效果（使用 Canvas），并给按钮文字播放微动画
function playButtonEffects(button) {
    if (!button) return;
    const container = document.getElementById('intro-animation') || document.body;

    // 创建全覆盖 canvas（定位于容器）
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = 0;
    canvas.style.top = 0;
    // 将 canvas 添加到容器（确保可见）
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    function resize() {
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width;
        canvas.height = rect.height;
        canvas._offsetTop = rect.top + window.scrollY;
        canvas._offsetLeft = rect.left + window.scrollX;
    }
    resize();
    window.addEventListener('resize', resize);

    // 发射器位置：按钮中心相对容器
    const btnRect = button.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();
    const originX = btnRect.left - contRect.left + btnRect.width / 2;
    const originY = btnRect.top - contRect.top + btnRect.height / 2;

    // 生成彩带与粒子
    const pieces = [];
    const colors = ['#ff4d6d', '#ffd166', '#7bd389', '#7dd3ff', '#c089ff', '#fff'];
    // 彩带（矩形片）
    for (let i = 0; i < 36; i++) {
        pieces.push({
            type: 'ribbon',
            x: originX,
            y: originY,
            w: 6 + Math.random() * 10,
            h: 8 + Math.random() * 18,
            vx: (Math.random() - 0.5) * 10,
            vy: -6 - Math.random() * 8,
            rot: Math.random() * Math.PI * 2,
            vr: (Math.random() - 0.5) * 0.3,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1400 + Math.random() * 600,
            age: 0
        });
    }
    // 小颗粒
    for (let i = 0; i < 24; i++) {
        pieces.push({
            type: 'dot',
            x: originX,
            y: originY,
            r: 2 + Math.random() * 3,
            vx: (Math.random() - 0.5) * 12,
            vy: -8 - Math.random() * 10,
            color: colors[Math.floor(Math.random() * colors.length)],
            life: 1000 + Math.random() * 800,
            age: 0
        });
    }

    let last = performance.now();
    function frame(now) {
        const dt = now - last; last = now;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        let alive = false;
        for (let p of pieces) {
            p.age += dt;
            if (p.age >= p.life) continue;
            alive = true;
            // physics
            p.vy += 0.04 * dt * 0.06; // gravity scaled
            p.x += p.vx * (dt / 16);
            p.y += p.vy * (dt / 16);
            if (p.type === 'ribbon') {
                p.rot += p.vr * (dt / 16);
                ctx.save();
                ctx.translate(p.x, p.y);
                ctx.rotate(p.rot);
                ctx.fillStyle = p.color;
                ctx.fillRect(-p.w/2, -p.h/2, p.w, p.h);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.fillStyle = p.color;
                ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
                ctx.fill();
            }
        }
        if (alive) requestAnimationFrame(frame);
        else cleanup();
    }
    requestAnimationFrame(frame);

    // 文字微动画：添加类使文字闪烁/渐变
    button.classList.add('text-anim');
    setTimeout(() => button.classList.remove('text-anim'), 1400);

    function cleanup() {
        window.removeEventListener('resize', resize);
        try { canvas.remove(); } catch (e) {}
    }
}

// 显示逐句上升的消息序列（按用户指定的顺序和强调样式）
async function showMessageSequence() {
    const l1 = document.getElementById('msg-line-1');
    const l2 = document.getElementById('msg-line-2');
    const l3 = document.getElementById('msg-line-3');
    const l4 = document.getElementById('msg-line-4');
    if (!l1 || !l2 || !l3 || !l4) return;

    // helper for inline reveal
    const inlineReveal = (el, delay = 20, duration = 420) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(12px)';
        el.style.transition = `opacity ${duration}ms ease, transform ${duration}ms cubic-bezier(.2,.9,.2,1)`;
        setTimeout(() => {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, delay);
    };

    // 1) 第一行：从屏幕底部缓缓升起
    l1.innerText = '这是一个非常特别的日子！';
    l1.classList.add('rise');
    await sleep(1200);

    // 2) 第二行：出现并移动到上一句下面
    l2.innerText = '今天是你的生日';
    l2.classList.add('rise');
    await sleep(900);

    // 3、4) 第三四行合并到第3行：先显示"而"，然后逐段显示"你，对我来说也是特别的"
    l3.innerHTML = '';
    l3.classList.add('rise');
    
    // 显示"而"
    const erSpan = document.createElement('span');
    erSpan.innerText = '而';
    erSpan.style.opacity = '0';
    l3.appendChild(erSpan);
    inlineReveal(erSpan, 20, 420);
    await sleep(600);

    // 显示"你"（突出）
    const youSpan = document.createElement('span');
    youSpan.className = 'special-you';
    youSpan.innerText = '你';
    youSpan.style.opacity = '0';
    youSpan.style.marginLeft = '8px';
    l3.appendChild(youSpan);
    inlineReveal(youSpan, 20, 520);
    await sleep(600);

    // 显示普通文本"，对我来说也是"
    const normalSpan = document.createElement('span');
    normalSpan.innerText = '，对我来说也是';
    normalSpan.style.opacity = '0';
    normalSpan.style.marginLeft = '4px';
    l3.appendChild(normalSpan);
    inlineReveal(normalSpan, 20, 420);
    await sleep(520);

    // 显示"特别的"（方块背景）
    const boxedSpan = document.createElement('span');
    boxedSpan.className = 'boxed';
    boxedSpan.innerText = '特别的';
    boxedSpan.style.opacity = '0';
    boxedSpan.style.marginLeft = '4px';
    l3.appendChild(boxedSpan);
    inlineReveal(boxedSpan, 20, 520);
    await sleep(900);

    // 隐藏不需要的第4行
    l4.style.display = 'none';

    return;
}