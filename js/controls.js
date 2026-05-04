// ── Input Controller ──────────────────────────────────────────────────────────
const Controls = (() => {
    const keys    = {};
    const pressed = {};
    const mouse   = { dx: 0, dy: 0, left: false, right: false };

    let active  = false;   // false until Controls.enable() is called (game started)
    let locked  = false;   // true when pointer lock is active
    let dragging = false;  // fallback drag-look when no pointer lock
    let lastX = 0, lastY = 0;

    const SENS_LOCK = 0.0025;
    const SENS_DRAG = 0.004;

    const GAME_KEYS = new Set([
        'KeyW','KeyA','KeyS','KeyD',
        'ArrowUp','ArrowDown','ArrowLeft','ArrowRight',
        'KeyC','KeyZ','Space','ShiftLeft','ShiftRight',
    ]);

    function init() {
        // ── Keyboard ──
        document.addEventListener('keydown', e => {
            if (!active) return;
            if (!keys[e.code]) pressed[e.code] = true;
            keys[e.code] = true;
            if (GAME_KEYS.has(e.code)) e.preventDefault();
        });

        document.addEventListener('keyup', e => {
            keys[e.code]    = false;
            pressed[e.code] = false;
        });

        // ── Mouse move ──
        document.addEventListener('mousemove', e => {
            if (!active) return;
            if (locked) {
                // Pointer-lock mode: use movementX/Y
                mouse.dx += e.movementX * SENS_LOCK;
                mouse.dy += e.movementY * SENS_LOCK;
            } else if (dragging) {
                // Drag fallback: right-button or left-button drag
                mouse.dx += (e.clientX - lastX) * SENS_DRAG;
                mouse.dy += (e.clientY - lastY) * SENS_DRAG;
                lastX = e.clientX;
                lastY = e.clientY;
            }
        });

        // ── Mouse buttons ──
        document.addEventListener('mousedown', e => {
            if (!active) return;
            if (e.button === 0) {
                mouse.left = true;
                // Start drag look if pointer not locked
                if (!locked) {
                    dragging = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                    // Try to acquire pointer lock (may fail in some environments)
                    try { document.body.requestPointerLock(); } catch (_) {}
                }
            }
            if (e.button === 2) {
                mouse.right = true;
                // Right-drag for look when no pointer lock
                if (!locked) {
                    dragging = true;
                    lastX = e.clientX;
                    lastY = e.clientY;
                }
            }
        });

        document.addEventListener('mouseup', e => {
            if (e.button === 0) { mouse.left  = false; }
            if (e.button === 2) { mouse.right = false; }
            // Stop drag only when both buttons released
            if (!mouse.left && !mouse.right) dragging = false;
        });

        document.addEventListener('contextmenu', e => {
            if (active) e.preventDefault();
        });

        // ── Pointer lock change ──
        document.addEventListener('pointerlockchange', () => {
            locked   = !!document.pointerLockElement;
            dragging = false;
            const prompt = document.getElementById('lock-prompt');
            if (prompt) prompt.style.display = locked ? 'none' : 'block';
        });

        document.addEventListener('pointerlockerror', () => {
            // Pointer lock failed → drag fallback remains available, no crash
            locked = false;
        });
    }

    // Called once the player clicks "탐험 시작" and the game begins
    function enable() { active = true; }

    function isDown(code)  { return active && !!keys[code]; }

    function justPressed(code) {
        if (!active) return false;
        const v      = !!pressed[code];
        pressed[code] = false;
        return v;
    }

    function consumeDelta() {
        const d = { dx: mouse.dx, dy: mouse.dy };
        mouse.dx = 0;
        mouse.dy = 0;
        return d;
    }

    function isLocked() { return locked; }

    return { init, enable, isDown, justPressed, consumeDelta, isLocked, mouse };
})();
