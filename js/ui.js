// ── HUD / UI Controller ───────────────────────────────────────────────────────
const UI = (() => {
    let hpFill, stFill, stateLabel, hud, ctrlPanel, blockVig;

    function init() {
        hpFill     = document.getElementById('hp-fill');
        stFill     = document.getElementById('st-fill');
        stateLabel = document.getElementById('state-label');
        hud        = document.getElementById('hud');
        ctrlPanel  = document.getElementById('controls-panel');
        blockVig   = document.getElementById('block-vignette');
    }

    function showGame() {
        hud.style.display      = 'block';
        ctrlPanel.style.display = 'block';
        // Show pointer-lock hint until lock is acquired
        const prompt = document.getElementById('lock-prompt');
        if (prompt) prompt.style.display = 'block';
    }

    function update(hp, maxHp, stamina, maxSt, state, attacking, blocking) {
        hpFill.style.width = Math.max(0, hp / maxHp * 100) + '%';
        stFill.style.width = Math.max(0, stamina / maxSt * 100) + '%';

        // State text
        let txt = '';
        if (blocking)  txt = '방어';
        else if (attacking) txt = '공격';
        else if (state === 'prone')  txt = '엎드리기';
        else if (state === 'crouch') txt = '앉기';
        stateLabel.textContent = txt;

        // Block vignette
        blockVig.style.display = blocking ? 'block' : 'none';
    }

    function triggerAttackFlash() {
        const el = document.createElement('div');
        el.className = 'atk-flash';
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    function triggerDamageFlash() {
        const el = document.createElement('div');
        el.className = 'dmg-flash';
        document.body.appendChild(el);
        el.addEventListener('animationend', () => el.remove());
    }

    function setLoadingProgress(pct, status) {
        const fill = document.getElementById('loading-fill');
        const txt  = document.getElementById('loading-status');
        if (fill) fill.style.width = pct + '%';
        if (txt && status) txt.textContent = status;
    }

    function hideLoading(cb) {
        const scr = document.getElementById('loading-screen');
        if (!scr) return;
        scr.style.opacity = '0';
        setTimeout(() => { scr.style.display = 'none'; if (cb) cb(); }, 950);
    }

    return { init, showGame, update, triggerAttackFlash, triggerDamageFlash, setLoadingProgress, hideLoading };
})();
