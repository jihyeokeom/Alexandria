// ── Player Character (Egyptian Warrior) ──────────────────────────────────────
const Player = (() => {
    const group = new THREE.Group();
    const pos   = group.position;

    // Animated sub-groups
    let leftLeg, rightLeg, rightArm, leftArm;
    let sword, shield, body;

    const STATE = { STAND: 'stand', CROUCH: 'crouch', PRONE: 'prone' };
    let state = STATE.STAND;

    let isAttacking  = false;
    let isBlocking   = false;
    let atkTimer     = 0;
    let walkCycle    = 0;
    let facingAngle  = Math.PI;

    // ── Jump physics ──────────────────────────────────────────────────────────
    let velY       = 0;
    let isOnGround = true;
    const GRAVITY    = -24;
    const JUMP_FORCE =  9.5;

    // Stats
    let hp = 100, maxHp = 100;
    let stamina = 100, maxSt = 100;

    const SPD = { WALK: 4.5, RUN: 9.0, CROUCH: 2.2, PRONE: 1.0 };

    // ── Material helpers ─────────────────────────────────────────────────────
    function m(color, rough, metal) {
        return new THREE.MeshStandardMaterial({
            color, roughness: rough, metalness: metal || 0, flatShading: true
        });
    }
    const SKIN    = () => m(0x3d1a08, 0.75);          // very dark Egyptian skin
    const GOLD    = () => m(0xffc830, 0.18, 0.80);    // polished gold
    const KILT    = () => m(0xf5eedc, 0.90);          // white linen
    const BORDER  = () => m(0x15100a, 0.70, 0.10);    // dark kilt trim
    const HAIR    = () => m(0x080604, 0.92);           // black
    const LAPIS   = () => m(0x1a2060, 0.40, 0.10);    // dark blue collar row
    const BLADE   = () => m(0xd0d0d0, 0.12, 0.90);    // silver
    const LEATHER = () => m(0x7a4520, 0.75, 0.15);    // shield leather
    const WOOD    = () => m(0x5a3010, 0.85);           // grip wood

    // ── Build mesh ───────────────────────────────────────────────────────────
    function buildMesh() {
        // Legs
        const legGeo = new THREE.CylinderGeometry(0.10, 0.085, 0.65, 8);
        rightLeg = new THREE.Mesh(legGeo, SKIN());
        rightLeg.position.set(0.16, 0.33, 0);
        group.add(rightLeg);
        leftLeg = new THREE.Mesh(legGeo.clone(), SKIN());
        leftLeg.position.set(-0.16, 0.33, 0);
        group.add(leftLeg);

        // Kilt (white, wide)
        const kilt = new THREE.Mesh(new THREE.BoxGeometry(0.70, 0.65, 0.31), KILT());
        kilt.position.y = 0.76;
        group.add(kilt);

        // Kilt borders
        const bGeo = new THREE.BoxGeometry(0.72, 0.09, 0.33);
        const topBrd = new THREE.Mesh(bGeo, BORDER());
        topBrd.position.y = 1.12;
        group.add(topBrd);
        const botBrd = new THREE.Mesh(bGeo.clone(), GOLD());
        botBrd.position.y = 0.43;
        group.add(botBrd);

        // Gold belt
        const belt = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.13, 0.33), GOLD());
        belt.position.y = 1.14;
        group.add(belt);

        // Torso (bare chest, dark skin)
        body = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.66, 0.29), SKIN());
        body.position.y = 1.45;
        group.add(body);

        // Wesekh collar – 3 concentric flat rings (gold / lapis / gold)
        [[0.40, 0.07, GOLD()], [0.33, 0.06, LAPIS()], [0.26, 0.05, GOLD()]].forEach(([r, h, mat], i) => {
            const c = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.93, h, 16), mat);
            c.position.y = 1.60 + i * 0.065;
            group.add(c);
        });

        // Ankh pendant
        const pend = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.1, 0.02), GOLD());
        pend.position.set(0, 1.70, 0.17);
        group.add(pend);

        // Arms (upper + lower as groups so we can rotate them)
        const uAGeo = new THREE.CylinderGeometry(0.10, 0.09, 0.38, 8);
        const lAGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.32, 8);

        rightArm = new THREE.Group();
        const rUpper = new THREE.Mesh(uAGeo, SKIN());
        rUpper.position.set(0, -0.19, 0);
        rightArm.add(rUpper);
        const rLower = new THREE.Mesh(lAGeo, SKIN());
        rLower.position.set(0, -0.55, 0);
        rightArm.add(rLower);
        rightArm.position.set(0.38, 1.62, 0);
        group.add(rightArm);

        leftArm = new THREE.Group();
        const lUpper = new THREE.Mesh(uAGeo.clone(), SKIN());
        lUpper.position.set(0, -0.19, 0);
        leftArm.add(lUpper);
        const lLower = new THREE.Mesh(lAGeo.clone(), SKIN());
        lLower.position.set(0, -0.55, 0);
        leftArm.add(lLower);
        leftArm.position.set(-0.38, 1.62, 0);
        group.add(leftArm);

        // Gold armbands (upper + wrist, both sides)
        const bndGeo = new THREE.CylinderGeometry(0.115, 0.115, 0.11, 12);
        [[0.38, 1.50], [0.38, 1.22], [-0.38, 1.50], [-0.38, 1.22]].forEach(([x, y]) => {
            const b = new THREE.Mesh(bndGeo.clone(), GOLD());
            b.position.set(x, y, 0);
            group.add(b);
        });

        // Head (slightly elongated box)
        const head = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.40, 0.35), SKIN());
        head.position.y = 1.97;
        group.add(head);

        // Hair top
        const hairTop = new THREE.Mesh(new THREE.BoxGeometry(0.40, 0.22, 0.38), HAIR());
        hairTop.position.y = 2.22;
        group.add(hairTop);
        // Hair sides (dreadlock falls)
        [[-0.22, 1.96], [0.22, 1.96]].forEach(([x, y]) => {
            const dr = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.40, 0.13), HAIR());
            dr.position.set(x, y, -0.1);
            group.add(dr);
        });

        // ── Khopesh sword ──
        sword = new THREE.Group();
        const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.48, 0.11), BLADE());
        blade1.position.y = 0.32;
        const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.36, 0.09), BLADE());
        blade2.position.set(0.14, 0.60, 0);
        blade2.rotation.z = 0.65;
        const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), WOOD());
        grip.position.y = 0;
        sword.add(blade1, blade2, grip);
        sword.position.set(0.50, 1.20, 0.05);
        group.add(sword);

        // ── Oval shield ──
        shield = new THREE.Group();
        const shBody = new THREE.Mesh(
            new THREE.CylinderGeometry(0.30, 0.25, 0.055, 12), LEATHER()
        );
        shBody.rotation.x = Math.PI / 2;
        const shBoss = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), GOLD());
        shBoss.position.z = 0.05;
        shield.add(shBody, shBoss);
        shield.position.set(-0.52, 1.30, 0.10);
        group.add(shield);

        // Cast shadows
        group.traverse(c => { if (c.isMesh) c.castShadow = true; });
    }

    // ── Ground height (matches world.js) ──────────────────────────────────────
    function groundY(x, z) {
        return Math.sin(x * 0.05) * 0.45
             + Math.cos(z * 0.07) * 0.32
             + Math.sin((x + z) * 0.03) * 0.14;
    }

    // ── Main update ───────────────────────────────────────────────────────────
    function update(dt) {
        handleState(dt);
        handleMovement(dt);
        handleJump(dt);
        handleCombat(dt);
        animateBody(dt);
        regenStamina(dt);
    }

    function handleJump(dt) {
        // Trigger jump
        if (Controls.justPressed('Space') && isOnGround && state === STATE.STAND) {
            velY       = JUMP_FORCE;
            isOnGround = false;
        }

        if (!isOnGround) {
            velY  += GRAVITY * dt;
            pos.y += velY * dt;

            const gY = groundY(pos.x, pos.z);
            if (pos.y <= gY) {
                pos.y      = gY;
                velY       = 0;
                isOnGround = true;
            }
        } else {
            pos.y = groundY(pos.x, pos.z);
        }
    }

    function handleMovement(dt) {
        const fwd = GameCamera.forward();
        const rgt = GameCamera.right();

        let mx = 0, mz = 0;
        if (Controls.isDown('KeyW') || Controls.isDown('ArrowUp'))    { mx += fwd.x; mz += fwd.z; }
        if (Controls.isDown('KeyS') || Controls.isDown('ArrowDown'))  { mx -= fwd.x; mz -= fwd.z; }
        if (Controls.isDown('KeyA') || Controls.isDown('ArrowLeft'))  { mx -= rgt.x; mz -= rgt.z; }
        if (Controls.isDown('KeyD') || Controls.isDown('ArrowRight')) { mx += rgt.x; mz += rgt.z; }

        const moving = (mx !== 0 || mz !== 0);

        let speed = SPD.WALK;
        if      (state === STATE.CROUCH) speed = SPD.CROUCH;
        else if (state === STATE.PRONE)  speed = SPD.PRONE;
        else if (Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight')) {
            if (stamina > 0) { speed = SPD.RUN; stamina = Math.max(0, stamina - 22 * dt); }
        }

        if (moving) {
            const len = Math.sqrt(mx * mx + mz * mz);
            mx = (mx / len) * speed * dt;
            mz = (mz / len) * speed * dt;
            facingAngle = Math.atan2(mx, mz);
        }

        // Smooth rotation
        let diff = facingAngle - group.rotation.y;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * Math.min(1, 14 * dt);

        pos.x += mx;
        pos.z += mz;

        const B = 238;
        pos.x = Math.max(-B, Math.min(B, pos.x));
        pos.z = Math.max(-B, Math.min(B, pos.z));

        // Prone body tilt
        if (state === STATE.PRONE) group.rotation.x  = 0.72;
        else                       group.rotation.x *= 0.85;
    }

    function handleState(dt) {
        if (Controls.justPressed('KeyC')) {
            if      (state === STATE.STAND)  state = STATE.CROUCH;
            else if (state === STATE.CROUCH) state = STATE.STAND;
            else if (state === STATE.PRONE)  state = STATE.CROUCH;
        }
        if (Controls.justPressed('KeyZ')) {
            state = (state === STATE.PRONE) ? STATE.STAND : STATE.PRONE;
        }

        let tY = 1.0;
        if (state === STATE.CROUCH) tY = 0.68;
        if (state === STATE.PRONE)  tY = 0.32;
        group.scale.y += (tY - group.scale.y) * Math.min(1, 10 * dt);
    }

    function handleCombat(dt) {
        if (Controls.mouse.left && !isAttacking && !isBlocking) {
            isAttacking = true;
            atkTimer    = 0;
            UI.triggerAttackFlash();
        }

        isBlocking = Controls.mouse.right;

        if (isAttacking) {
            atkTimer += dt;
            const t = atkTimer / 0.55;
            const s = t < 0.5 ? -Math.PI * t * 1.8 : -Math.PI * (1 - t) * 1.8;
            rightArm.rotation.x = s;
            sword.rotation.x    = s;
            if (t >= 1) {
                isAttacking         = false;
                atkTimer            = 0;
                rightArm.rotation.x = 0;
                sword.rotation.x    = 0;
            }
        }

        // Block: raise shield
        if (isBlocking) {
            leftArm.rotation.x += (-0.9 - leftArm.rotation.x) * 0.2;
            shield.position.z  += (0.30 - shield.position.z)  * 0.2;
        } else {
            leftArm.rotation.x *= 0.80;
            shield.position.z  += (0.10 - shield.position.z)  * 0.2;
        }
    }

    function animateBody(dt) {
        const mv = Controls.isDown('KeyW') || Controls.isDown('KeyS') ||
                   Controls.isDown('KeyA') || Controls.isDown('KeyD') ||
                   Controls.isDown('ArrowUp') || Controls.isDown('ArrowDown') ||
                   Controls.isDown('ArrowLeft') || Controls.isDown('ArrowRight');
        const run = Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight');

        if (mv && state !== STATE.PRONE) {
            walkCycle += dt * 5.5 * (run ? 1.7 : 1.0);
            const s = 0.46;
            leftLeg.rotation.x  =  Math.sin(walkCycle) * s;
            rightLeg.rotation.x = -Math.sin(walkCycle) * s;
            if (!isBlocking)  leftArm.rotation.x  = -Math.sin(walkCycle) * 0.30;
            if (!isAttacking) rightArm.rotation.x  =  Math.sin(walkCycle) * 0.30;
            body.position.y = 1.45 + Math.abs(Math.sin(walkCycle * 2)) * 0.025;
        } else {
            leftLeg.rotation.x  *= 0.82;
            rightLeg.rotation.x *= 0.82;
            if (!isAttacking) rightArm.rotation.x *= 0.82;
            if (!isBlocking)  leftArm.rotation.x  *= 0.82;
            body.position.y += (1.45 - body.position.y) * 0.12;
        }
    }

    function regenStamina(dt) {
        const spr = Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight');
        const mv  = Controls.isDown('KeyW') || Controls.isDown('KeyS') ||
                    Controls.isDown('KeyA') || Controls.isDown('KeyD');
        if (!spr || !mv) stamina = Math.min(maxSt, stamina + 18 * dt);
    }

    function init(scene) {
        buildMesh();
        scene.add(group);
        group.position.set(0, 0, 5);
    }

    return {
        init, update,
        get group()      { return group; },
        get position()   { return pos; },
        get hp()         { return hp; },
        get maxHp()      { return maxHp; },
        get stamina()    { return stamina; },
        get maxStamina() { return maxSt; },
        get state()      { return state; },
        get isAttacking(){ return isAttacking; },
        get isBlocking() { return isBlocking; },
        get isOnGround() { return isOnGround; },
    };
})();
