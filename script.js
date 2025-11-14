// 生日常量（全局可用）
const BIRTHDAY_MONTH = 10; // 11月 (0-11)
const BIRTHDAY_DAY = 10;   // 11日

// 持久烟花定时器（用于在用户点击蛋糕后持续产生烟花）
let cakeFireworksTimer = null;
// intro 烟花/星光定时器
let introFireworksTimer = null;


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
    // popperStep removed: the popper page was deleted from HTML
    const fireworksStep = document.getElementById('intro-fireworks');
    const popperButton = document.getElementById('popper-button');

    console.log('开始生日序列');
    console.log('introContainer:', introContainer);
    console.log('fireworksStep:', fireworksStep);

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

    // 直接进入烟花动画界面（已移除烟花筒页）
    console.log('跳过烟花筒页，进入烟花动画界面');
    dateStep.style.display = 'none'; // 隐藏日期步骤
    // 初始化并启动 intro 烟花/星光效果
    try { setupIntroFireworks(fireworksStep); } catch (e) { console.error(e); }
    fireworksStep.style.display = 'flex';
    await sleep(3000); // 烟花动画展示 3 秒
    // 停止并清理 intro 特效（进入主页面前）
    try { stopIntroFireworks(); } catch (e) { console.error(e); }

    // 所有操作完成后，淡出 intro 并进入主页面
    console.log('进入主页面');
    await sleep(500);
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

// 初始化 intro 烟花界面的特效（标题、星光与周期性火花）
function setupIntroFireworks(container) {
    try {
        if (!container) return;
        if (container.dataset.introInit) return; // already initialized
        container.dataset.introInit = '1';

        // 标题信息
        const msg = document.createElement('div');
        msg.className = 'intro-message';
        msg.innerHTML = `<h1>生日快乐 🎉</h1><p>愿你被世界温柔以待</p>`;
        container.appendChild(msg);

        // 随机星点
        const starCount = 24;
        for (let i = 0; i < starCount; i++) {
            const s = document.createElement('div');
            s.className = 'star';
            const left = Math.random() * 100;
            const top = Math.random() * 80 + 5;
            s.style.left = left + '%';
            s.style.top = top + '%';
            const dur = 800 + Math.random() * 1200;
            const delay = Math.random() * 1200;
            s.style.animation = `star-twinkle ${dur}ms ease-in-out ${delay}ms infinite`;
            container.appendChild(s);
        }

        // 周期性冒出火花（使用 .spark）
        introFireworksTimer = setInterval(() => {
            try {
                const spark = document.createElement('div');
                spark.className = 'spark';
                const left = 8 + Math.random() * 84; // avoid edges
                const bottom = 10 + Math.random() * 20;
                spark.style.left = left + '%';
                spark.style.top = 70 + Math.random() * 20 + '%';
                // 随机大小与颜色
                const size = 6 + Math.random() * 14;
                spark.style.width = size + 'px'; spark.style.height = size + 'px';
                container.appendChild(spark);

                // 向上并散开
                const tx = (Math.random() - 0.5) * 160;
                const ty = -120 - Math.random() * 120;
                spark.style.transition = 'transform 900ms cubic-bezier(.2,.9,.2,1), opacity 900ms ease';
                requestAnimationFrame(() => {
                    spark.style.transform = `translate(${tx}px, ${ty}px) scale(0.6)`;
                    spark.style.opacity = '0';
                });
                setTimeout(() => { try { spark.remove(); } catch (e) {} }, 1100 + Math.random() * 600);
            } catch (e) { console.error('intro spark error', e); }
        }, 600 + Math.floor(Math.random() * 600));

    } catch (e) { console.error('setupIntroFireworks error', e); }
}

function stopIntroFireworks() {
    try {
        if (introFireworksTimer) { clearInterval(introFireworksTimer); introFireworksTimer = null; }
        const container = document.getElementById('intro-fireworks');
        if (!container) return;
        // 移除我们创建的元素
        container.querySelectorAll('.star, .spark, .intro-message').forEach(n => n.remove());
        delete container.dataset.introInit;
    } catch (e) { console.error('stopIntroFireworks error', e); }
}

/** * 烟花筒按住交互功能
 */
function setupPopperInteraction() {
    const popperButton = document.getElementById('popper-button');
    // For the popper page we intentionally remove the heavy fireworks effects.
    // Keep a minimal press visual feedback only (no particle/svg spawning).
    if (!popperButton) return;

    popperButton.addEventListener('mousedown', () => {
        popperButton.classList.add('pressed');
    });
    document.addEventListener('mouseup', () => {
        popperButton.classList.remove('pressed');
    });

    // Touch support
    popperButton.addEventListener('touchstart', (e) => { e.preventDefault(); popperButton.classList.add('pressed'); });
    document.addEventListener('touchend', () => popperButton.classList.remove('pressed'));

    // Prevent dragging
    popperButton.addEventListener('dragstart', (e) => e.preventDefault());
}

/** * 步骤 B: 显示生日快乐主页 
 */
function showMainBirthdayPage() {
    const page = document.getElementById('main-birthday-page');
    console.log('显示主生日页面', page);
    console.log('background-decoration:', document.getElementById('background-decoration'));
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

    // 添加预览按钮的事件监听器
    const previewBtn = document.getElementById('preview-birthday-btn');
    previewBtn.addEventListener('click', () => {
        // 隐藏倒计时页面
        page.style.display = 'none';
        // 启动生日序列
        startBirthdaySequence();
    });
}


// --- 3. 页面交互逻辑 ---

/** * 蛋糕互动功能 - 新设计
 * 点击蛋糕后：
 * 1. 播放生日歌
 * 2. 显示创意祝福
 */
function setupCakeInteraction() {
    const cakeImg = document.getElementById('cake-img');
    const wishesContainer = document.getElementById('birthday-wishes');
    const song = document.getElementById('birthday-song');
    const giftButton = document.getElementById('gift-button');

    console.log('初始化蛋糕交互');
    console.log('蛋糕图片:', cakeImg);
    console.log('祝福容器:', wishesContainer);
    console.log('背景音乐:', song);
    console.log('礼物按钮:', giftButton);

    // 祝福文案库
    const wishes = [
        '这是我陪你过的第一个生日',
        '祝你新的一岁，万事顺遂！',
        '愿你的每一天都闪闪发光',
        '期待我们的下一个故事 💫',
        '              ——郝怡琛'
    ];

    cakeImg.addEventListener('click', () => {
        console.log('蛋糕被点击了！');

        // 添加点击动画
        console.log('播放蛋糕弹跳动画');
        cakeImg.style.animation = 'none';
        setTimeout(() => {
            cakeImg.style.animation = 'cakeBounce 0.3s ease';
        }, 10);

        // 短时添加发光效果
        try {
            cakeImg.classList.add('cake-glow');
            setTimeout(() => cakeImg.classList.remove('cake-glow'), 1200);
        } catch (e) {}

        // 播放生日歌
        try {
            console.log('尝试播放音乐，当前 song.src:', song.src);
            song.currentTime = 0;
            const playPromise = song.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => console.log('音乐播放成功'))
                    .catch(err => console.log('音乐播放失败:', err));
            }
        } catch (e) {
            console.error('播放音乐时出错:', e);
        }

        // 隐藏提示文字
        const hint = document.getElementById('cake-hint');
        if (hint) {
            console.log('隐藏提示文字');
            hint.style.transition = 'opacity 0.5s ease';
            hint.style.opacity = '0';
        }

        // 显示祝福
        console.log('300ms 后显示祝福');
        setTimeout(() => {
            displayWishes(wishes, wishesContainer);
        }, 300);

        // 显示送礼物按钮
        console.log('2000ms 后显示送礼物按钮');
        setTimeout(() => {
            giftButton.style.display = 'block';
            console.log('送礼物按钮已显示');
        }, 2000);

        // 额外效果：点击蛋糕时触发一些装饰性特效与大量 SVG 烟花
        try {
            const bg = document.getElementById('background-decoration') || document.body;
            // 触发蛋糕周围的彩带/粒子（重用 playButtonEffects）
            try { playButtonEffects(cakeImg); } catch (e) { console.error(e); }
                // 发射大量 SVG 烟花用于庆祝（更多数量、持续时间更长）
                // 使用持久模式：点击后一直显示（直到手动停止或页面卸载）
                startCakeFireworks(bg, 22, 3800, true);
            // 漂浮爱心粒子
            try { spawnFloatingHearts(12, 3600); } catch (e) {}
            // 显示一个大的临时祝福覆盖层（可点击关闭）
            showCakeOverlay(wishes);
        } catch (e) {
            console.error('启动蛋糕烟花或特效时出错:', e);
        }
    });

    // 送礼物按钮事件
    giftButton.addEventListener('click', () => {
        console.log('送礼物按钮被点击');
        showGiftPopup();
    });
}

// 显示礼物弹窗
function showGiftPopup() {
    console.log('打开礼物弹窗');
    const popup = document.createElement('div');
    popup.id = 'gift-popup';
    popup.innerHTML = `
        <h3>🎉 惊喜礼物！</h3>
        <div class="virtual-gift">💖</div>
        <p>抱抱宝宝！🤗愿你永远快乐！🥰</p>
        <div style="display:flex; gap:8px; justify-content:center; margin-top:8px;">
            <button id="surprise-compliment" style="padding:8px 12px; border-radius:8px; border:none; background:linear-gradient(90deg,#ffd166,#ff7f7f); color:#333; cursor:pointer;">随机祝福</button>
            <button id="close-popup" style="padding:8px 12px; border-radius:8px; border:none; background:linear-gradient(90deg,#ff7f50,#ff6b6b); color:white; cursor:pointer;">关闭</button>
        </div>
    `;
    document.body.appendChild(popup);
    popup.style.display = 'block';
    console.log('礼物弹窗已添加到 DOM');

    const closeBtn = document.getElementById('close-popup');
    closeBtn.addEventListener('click', () => {
        console.log('关闭礼物弹窗');
        popup.remove();
    });

    // 惊喜祝福按钮，显示随机一条小弹窗
    const surpriseBtn = document.getElementById('surprise-compliment');
    if (surpriseBtn) {
        surpriseBtn.addEventListener('click', () => {
            try { showComplimentPopup(); } catch (e) { console.error(e); }
        });
    }
}

// 小惊喜短弹窗（随机祝福）
const compliments = [
    '愿你每天都能被小美好包围✨',
    '祝你的笑容永远灿烂！🌞',
    '我的宝宝天天开心天天快乐！💕',
    '每一天都被温柔以待🌸',
    'Hope your day’s filled with joys baby! 🎈',
];

function showComplimentPopup() {
    const text = compliments[Math.floor(Math.random() * compliments.length)];
    const el = document.createElement('div');
    el.id = 'compliment-popup';
    el.textContent = text;
    document.body.appendChild(el);
    // 轻微出现动画
    el.style.opacity = '0';
    el.style.transform = 'translateY(8px)';
    requestAnimationFrame(() => {
        el.style.transition = 'opacity 320ms ease, transform 320ms ease';
        el.style.opacity = '1'; el.style.transform = 'translateY(0)';
    });
    // 自动移除
    setTimeout(() => {
        el.style.opacity = '0'; el.style.transform = 'translateY(8px)';
        setTimeout(() => { try { el.remove(); } catch (e) {} }, 320);
    }, 3200);
}

// 漂浮爱心粒子生成器
function spawnFloatingHearts(count = 8, dur = 3000) {
    try {
        let container = document.querySelector('.heart-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'heart-container';
            // 把容器放到 background-decoration 中以便 z-index 层级合理
            const bg = document.getElementById('background-decoration') || document.body;
            bg.appendChild(container);
        }

        for (let i = 0; i < count; i++) {
            const h = document.createElement('div');
            h.className = 'floating-heart';
            const left = Math.random() * 80 + 10; // 10%..90%
            h.style.left = left + '%';
            const size = 12 + Math.random() * 20;
            h.style.width = size + 'px'; h.style.height = size + 'px';
            const delay = Math.random() * 400;
            const animDur = dur / 1000 + (Math.random() * 0.8 - 0.2);
            h.style.transition = `transform ${animDur}s linear, opacity ${animDur}s linear`;
            container.appendChild(h);

            // 延迟触发动画
            setTimeout(() => {
                h.style.transform = `translateY(-220px) scale(0.9)`;
                h.style.opacity = '0';
            }, 40 + delay);

            // 清理
            setTimeout(() => { try { h.remove(); } catch (e) {} }, dur + 800 + delay);
        }
    } catch (e) { console.error('spawnFloatingHearts error', e); }
}

// 显示祝福文案
function displayWishes(wishes, container) {
    console.log('显示祝福开始，共', wishes.length, '条');
    container.innerHTML = ''; // 清空

    wishes.forEach((wish, index) => {
        const line = document.createElement('div');
        line.className = 'wish-line';
        line.style.cursor = 'pointer'; // 让祝福可点击
        line.addEventListener('click', () => expandWish(line, wish));
        container.appendChild(line);

        // 打字机效果
        typeWriter(line, wish, 0, index * 500); // 每行延迟 500ms
    });
}

// 打字机效果函数 - 改进版本（安全且高效）
function typeWriter(element, text, i, delay) {
    setTimeout(() => {
        if (i < text.length) {
            // 使用 textContent 然后 += 字符，避免 HTML 解析
            if (element.children.length === 0) {
                // 如果没有子元素，直接修改文本
                element.textContent = (element.textContent || '') + text.charAt(i);
            } else {
                // 如果有子元素（如 expanded 详情），添加到最后一个文本节点
                const lastNode = element.lastChild;
                if (lastNode && lastNode.nodeType === Node.TEXT_NODE) {
                    lastNode.textContent += text.charAt(i);
                } else {
                    const textNode = document.createTextNode(text.charAt(i));
                    element.appendChild(textNode);
                }
            }
            typeWriter(element, text, i + 1, 100); // 每个字符延迟 100ms
        } else {
            console.log('祝福显示完成:', text);
        }
    }, delay);
}

// 展开祝福详情
function expandWish(element, wish) {
    console.log('点击祝福:', wish);
    const expanded = element.querySelector('.expanded');
    if (expanded) {
        console.log('收起祝福详情');
        expanded.remove();
    } else {
        console.log('展开祝福详情');
        const detail = document.createElement('div');
        detail.className = 'expanded';
        detail.textContent = `💖 ${wish} - 这是为你特别准备的！`;
        detail.style.marginTop = '8px';
        detail.style.fontSize = '0.9em';
        detail.style.color = '#888';
        detail.style.opacity = '0';
        detail.style.transition = 'opacity 0.5s, color 0.5s';
        element.appendChild(detail);
        setTimeout(() => {
            detail.style.opacity = '1';
            detail.style.color = '#666';
        }, 10);
    }
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
    l1.innerHTML = '这是一个非常<span class="boxed">特别的</span>日子！';
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
    youSpan.style.marginLeft = '4px';
    l3.appendChild(youSpan);
    inlineReveal(youSpan, 20, 520);
    await sleep(600);

    // 显示普通文本"，对我来说也是"
    const normalSpan = document.createElement('span');
    normalSpan.innerText = '，对我来说也是';
    normalSpan.style.opacity = '0';
    normalSpan.style.marginLeft = '2px';
    l3.appendChild(normalSpan);
    inlineReveal(normalSpan, 20, 420);
    await sleep(520);

    // 显示"特别的"（方块背景）
    const boxedSpan = document.createElement('span');
    boxedSpan.className = 'boxed';
    boxedSpan.innerText = '特别的';
    boxedSpan.style.opacity = '0';
    boxedSpan.style.marginLeft = '2px';
    l3.appendChild(boxedSpan);
    inlineReveal(boxedSpan, 20, 520);
    await sleep(900);

    // 隐藏不需要的第4行
    l4.style.display = 'none';

    return;
}

// 在背景容器内发射若干 SVG 烟花
function startCakeFireworks(container, count = 6, spanMs = 1500, persistent = false) {
    if (!container) return;

    // interval 基于 spanMs 与 count 计算（最小 80ms）
    const interval = Math.max(80, Math.floor(spanMs / Math.max(1, Math.max(1, count || 1))));

    // 如果要求持久模式或 count<=0，则持续发射，直到 stopCakeFireworks 被调用
    if (persistent || (count <= 0)) {
        if (cakeFireworksTimer) return; // 已在运行，防止重复创建
        cakeFireworksTimer = setInterval(() => {
            try { spawnSVGFirework(container); } catch (e) { console.error('spawnSVGFirework error', e); }
        }, interval);
        return;
    }

    // 非持久：发射固定数量后停止
    let fired = 0;
    const timer = setInterval(() => {
        spawnSVGFirework(container);
        fired++;
        if (fired >= count) {
            clearInterval(timer);
        }
    }, interval);
}

// 停止持久烟花（如果需要手动停止）
function stopCakeFireworks() {
    try {
        if (cakeFireworksTimer) {
            clearInterval(cakeFireworksTimer);
            cakeFireworksTimer = null;
        }
    } catch (e) { console.error('stopCakeFireworks error', e); }
}

// 创建并播放一枚 SVG 烟花（使用 yanhua1..7.svg）
function spawnSVGFirework(container) {
    // 随机选择一张图片
    const idx = Math.floor(Math.random() * 7) + 1; // 1..7
    const src = `./yanhua${idx}.svg`;

    const img = document.createElement('img');
    img.src = src;
    img.className = 'svg-firework';
    // 使用 fixed 放置在视口坐标系，避免被父容器 z-index/overflow 隐藏
    img.style.position = 'fixed';
    img.style.pointerEvents = 'none';

    // 在容器的随机位置出现（避免覆盖中间重要内容）
    // 在视口范围内随机位置（偏上，让烟花向上飞）
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const x = Math.random() * (vw * 0.7) + vw * 0.15;
    const y = Math.random() * (vh * 0.45) + vh * 0.05;
    img.style.left = x + 'px';
    img.style.top = y + 'px';

    // 初始样式 (小、半透明)
    img.style.transform = 'translate(-50%, -50%) scale(0.6) rotate(0deg)';
    img.style.opacity = '0';

    // 为保证可见性，始终挂到 body（fixed 坐标相对视口）
    document.body.appendChild(img);

    // 强制回流以确保 transition 生效
    // eslint-disable-next-line no-unused-expressions
    img.getBoundingClientRect();

    // 随机动画参数
    const tx = (Math.random() - 0.5) * 120; // x 偏移
    const ty = -80 - Math.random() * 120; // 向上
    const rot = (Math.random() - 0.5) * 360;
    const dur = 900 + Math.random() * 700;

    img.style.transition = `transform ${dur}ms cubic-bezier(.2,.9,.2,1), opacity ${dur}ms ease`;
    // 启动动画（短延迟）
    setTimeout(() => {
        img.style.opacity = '1';
        img.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(${0.9 + Math.random() * 0.6}) rotate(${rot}deg)`;
    }, 20);

    // 在动画中段触发爆炸缩放与淡出
    setTimeout(() => {
        img.style.opacity = '0';
        img.style.transform = `translate(calc(-50% + ${tx * 1.3}px), calc(-50% + ${ty - 60}px)) scale(0.2) rotate(${rot + 90}deg)`;
    }, dur * 0.6 + 60);

    // 清理
    setTimeout(() => {
        try { img.remove(); } catch (e) {}
    }, dur + 200);
}

// 显示蛋糕专属的大的祝福覆盖层（可关闭）
function showCakeOverlay(wishes) {
    try {
        const overlay = document.createElement('div');
        overlay.id = 'cake-overlay';
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.display = 'flex';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.background = 'radial-gradient(circle at 30% 20%, rgba(255,255,255,0.06), rgba(0,0,0,0.6))';
        overlay.style.zIndex = 3000;

        const card = document.createElement('div');
        card.style.background = 'linear-gradient(180deg, rgba(255,255,255,0.98), #fff)';
        card.style.padding = '28px 26px';
        card.style.borderRadius = '14px';
        card.style.boxShadow = '0 20px 60px rgba(0,0,0,0.45)';
        card.style.textAlign = 'center';
        card.style.maxWidth = '760px';
        card.style.width = 'calc(100% - 80px)';

        const title = document.createElement('h2');
        title.innerText = '生日快乐 🎉';
        title.style.margin = '0 0 10px 0';
        title.style.color = '#ff4861';
        title.style.fontSize = '2.2em';
        card.appendChild(title);

        const text = document.createElement('p');
        text.innerText = '咳咳，一些想对你说的生日祝福~：';
        text.style.margin = '0 0 12px 0';
        text.style.color = '#444';
        card.appendChild(text);

        const list = document.createElement('div');
        list.style.display = 'flex';
        list.style.flexDirection = 'column';
        list.style.gap = '10px';

        (wishes || []).forEach((w, i) => {
            const el = document.createElement('div');
            // 去掉前导的分点标记，直接显示祝福文本
            el.innerText = w;
            el.style.fontSize = '1.05em';
            el.style.color = '#333';
            el.style.opacity = '0';
            el.style.transform = 'translateY(8px)';
            el.style.transition = `opacity 420ms ease ${i * 180}ms, transform 420ms ${i * 180}ms`;
            list.appendChild(el);
            // 触发逐个出现
            setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, 20 + i * 180);
        });
        card.appendChild(list);

        const closeBtn = document.createElement('button');
        closeBtn.innerText = '我知道了 ✨';
        closeBtn.style.marginTop = '16px';
        closeBtn.style.padding = '10px 18px';
        closeBtn.style.border = 'none';
        closeBtn.style.borderRadius = '10px';
        closeBtn.style.background = 'linear-gradient(90deg,#ff7f50,#ff6b6b)';
        closeBtn.style.color = 'white';
        closeBtn.style.cursor = 'pointer';
        closeBtn.addEventListener('click', () => { try { overlay.remove(); } catch (e) {} });
        card.appendChild(closeBtn);

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // 自动移除（10秒）以免一直遮挡
        setTimeout(() => {
            try { overlay.remove(); } catch (e) {}
        }, 10000);
    } catch (e) {
        console.error('showCakeOverlay error', e);
    }
}