// ── Main Game Entry ───────────────────────────────────────────────────────────
(function () {
    let renderer, scene, camera, clock;
    let running = false;

    // ── Loading progress animation ────────────────────────────────────────────
    function runLoadingSequence(onDone) {
        const steps = [
            [12,  '지형 생성 중...'],
            [26,  '사막 모래 깔기...'],
            [42,  '알렉산드리아 건설 중...'],
            [58,  '파로스 등대 세우는 중...'],
            [72,  '나일강 채우는 중...'],
            [84,  '야자수 심는 중...'],
            [95,  '캐릭터 초기화 중...'],
            [100, '준비 완료!'],
        ];
        let i = 0;
        (function next() {
            if (i < steps.length) {
                UI.setLoadingProgress(steps[i][0], steps[i][1]);
                i++;
                setTimeout(next, 280 + Math.random() * 160);
            } else {
                setTimeout(() => UI.hideLoading(onDone), 400);
            }
        })();
    }

    // ── Three.js renderer / scene / camera ────────────────────────────────────
    function setupRenderer() {
        const canvas = document.getElementById('gameCanvas');
        renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: true,
            powerPreference: 'high-performance',
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // perf cap
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
        renderer.outputEncoding    = THREE.sRGBEncoding;
        renderer.toneMapping       = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.1;

        scene = new THREE.Scene();
        scene.fog = new THREE.FogExp2(0xc8a45a, 0.0038);

        camera = new THREE.PerspectiveCamera(
            64, window.innerWidth / window.innerHeight, 0.15, 750
        );

        clock = new THREE.Clock();
    }

    // ── Start screen ──────────────────────────────────────────────────────────
    function showStartScreen() {
        const startScreen = document.getElementById('start-screen');
        const startBtn    = document.getElementById('start-btn');

        // Make the start screen visible (it starts hidden while loading)
        startScreen.style.display     = 'flex';
        startScreen.style.opacity     = '0';
        startScreen.style.transition  = 'opacity 0.7s ease';
        // Fade in on next frame
        requestAnimationFrame(() => {
            startScreen.style.opacity = '1';
        });

        // ── Start button click ────────────────────────────────────────────────
        startBtn.addEventListener('click', function onStartClick() {
            startBtn.removeEventListener('click', onStartClick); // fire once

            // Fade out start screen
            startScreen.style.opacity    = '0';
            startScreen.style.transition = 'opacity 0.5s ease';
            setTimeout(() => { startScreen.style.display = 'none'; }, 520);

            // Activate controls (now mouse/keyboard events are consumed by game)
            Controls.enable();

            // Request pointer lock — must be inside a user-gesture handler
            try { document.body.requestPointerLock(); } catch (_) {}

            // Show HUD
            UI.showGame();

            // Start game loop
            running = true;
            clock.start(); // reset clock so first frame dt is ~0
        });
    }

    // ── Game loop ─────────────────────────────────────────────────────────────
    function loop() {
        requestAnimationFrame(loop);

        if (!running) {
            // Keep rendering so the background scene is visible on start screen
            renderer.render(scene, camera);
            return;
        }

        const dt      = Math.min(clock.getDelta(), 0.05);
        const elapsed = clock.getElapsedTime();

        const { dx, dy } = Controls.consumeDelta();

        Player.update(dt);
        GameCamera.update(Player.position, dx, dy);
        World.update(dt, elapsed);

        UI.update(
            Player.hp, Player.maxHp,
            Player.stamina, Player.maxStamina,
            Player.state,
            Player.isAttacking,
            Player.isBlocking
        );

        renderer.render(scene, camera);
    }

    // ── Window resize ─────────────────────────────────────────────────────────
    function onResize() {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    // ── Boot sequence ─────────────────────────────────────────────────────────
    function boot() {
        UI.init();
        setupRenderer();

        // Build the world while the loading screen is shown
        World.init(scene);
        Player.init(scene);
        GameCamera.init(camera);
        Controls.init();     // registers listeners but stays inactive

        // Start a background render tick so the world is live when start screen shows
        loop();

        // Run loading bar animation, then reveal start screen
        runLoadingSequence(() => {
            showStartScreen();
            window.addEventListener('resize', onResize);
        });
    }

    window.addEventListener('load', boot);
})();
