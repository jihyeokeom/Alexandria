// ── Player Character ─────────────────────────────────────────────────────────
const Player = (() => {
    // Root group added to scene
    const group = new THREE.Group();
    const pos   = group.position;

    // Sub-meshes
    let body, head, leftArm, rightArm, leftLeg, rightLeg;
    let sword, shield;

    // State machine
    const STATE = { STAND: 'stand', CROUCH: 'crouch', PRONE: 'prone' };
    let state = STATE.STAND;

    let isAttacking  = false;
    let isBlocking   = false;
    let atkTimer     = 0;
    let walkCycle    = 0;
    let facingAngle  = Math.PI; // world rotation y

    // Stats
    let hp       = 100;
    let maxHp    = 100;
    let stamina  = 100;
    let maxSt    = 100;

    // Speed constants
    const SPD_WALK  = 4.5;
    const SPD_RUN   = 9.0;
    const SPD_CROUCH= 2.2;
    const SPD_PRONE = 1.0;

    // ── Build character mesh ──────────────────────────────────────────────────
    function buildMesh() {
        const skin    = mat(0xc8a06b, 0.8, 0);
        const bronze  = mat(0x9b7340, 0.3, 0.6);
        const linen   = mat(0xf4edd4, 0.9, 0);
        const swordM  = mat(0xd0d0d0, 0.15, 0.85);
        const shieldM = mat(0x7a4520, 0.7, 0.2);
        const gold    = mat(0xffd700, 0.2, 0.7);

        // Torso (bronze breastplate)
        body = mesh(new THREE.BoxGeometry(0.52, 0.65, 0.26), bronze);
        body.position.y = 1.22;
        add(body);

        // Kilt (linen)
        const kilt = mesh(new THREE.BoxGeometry(0.54, 0.48, 0.26), linen);
        kilt.position.y = 0.7;
        add(kilt);

        // Head
        head = mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), skin);
        head.position.y = 1.76;
        add(head);

        // Nemes headdress (gold striped cloth)
        const nemes = mesh(new THREE.BoxGeometry(0.46, 0.28, 0.46), gold);
        nemes.position.y = 1.98;
        add(nemes);

        // Arms
        const armGeo = new THREE.CylinderGeometry(0.075, 0.065, 0.52, 7);
        rightArm = mesh(armGeo, skin);
        rightArm.position.set(0.34, 1.18, 0);
        add(rightArm);

        leftArm = mesh(armGeo.clone(), skin);
        leftArm.position.set(-0.34, 1.18, 0);
        add(leftArm);

        // Legs
        const legGeo = new THREE.CylinderGeometry(0.085, 0.075, 0.58, 7);
        rightLeg = mesh(legGeo, skin);
        rightLeg.position.set(0.14, 0.28, 0);
        add(rightLeg);

        leftLeg = mesh(legGeo.clone(), skin);
        leftLeg.position.set(-0.14, 0.28, 0);
        add(leftLeg);

        // Sword (khopesh-like curved blade approximation)
        const bladeGeo = new THREE.BoxGeometry(0.05, 0.72, 0.09);
        sword = mesh(bladeGeo, swordM);
        sword.position.set(0.54, 1.1, 0.06);
        add(sword);

        // Grip
        const gripGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.22, 5);
        const grip = mesh(gripGeo, mat(0x5a3010, 0.8, 0));
        grip.position.set(0.54, 0.72, 0.06);
        add(grip);

        // Shield (oval wooden shield)
        const shieldGeo = new THREE.CylinderGeometry(0.27, 0.27, 0.045, 10);
        shield = mesh(shieldGeo, shieldM);
        shield.rotation.x = Math.PI * 0.5;
        shield.position.set(-0.54, 1.2, 0.12);
        add(shield);

        // Shield boss (bronze centre)
        const bossGeo = new THREE.SphereGeometry(0.07, 6, 5);
        const boss = mesh(bossGeo, bronze);
        boss.position.set(-0.54, 1.2, 0.16);
        add(boss);

        // All cast shadows
        group.traverse(c => {
            if (c.isMesh) { c.castShadow = true; c.receiveShadow = false; }
        });
    }

    function mat(color, roughness, metalness) {
        return new THREE.MeshStandardMaterial({ color, roughness, metalness });
    }
    function mesh(geo, m) { return new THREE.Mesh(geo, m); }
    function add(m) { group.add(m); }

    // ── Ground height (matches terrain formula) ───────────────────────────────
    function groundY(x, z) {
        return Math.sin(x * 0.05) * 0.45
             + Math.cos(z * 0.07) * 0.32
             + Math.sin((x + z) * 0.03) * 0.14;
    }

    // ── Update ────────────────────────────────────────────────────────────────
    function update(dt) {
        handleState(dt);
        handleMovement(dt);
        handleCombat(dt);
        animateBody(dt);
        regenStamina(dt);
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

        let speed = SPD_WALK;
        if (state === STATE.CROUCH) speed = SPD_CROUCH;
        else if (state === STATE.PRONE) speed = SPD_PRONE;
        else if (Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight')) {
            if (stamina > 0) {
                speed = SPD_RUN;
                stamina = Math.max(0, stamina - 22 * dt);
            }
        }

        if (moving) {
            const len = Math.sqrt(mx * mx + mz * mz);
            mx = (mx / len) * speed * dt;
            mz = (mz / len) * speed * dt;
            facingAngle = Math.atan2(mx, mz);
        }

        // Smooth rotation toward facing angle
        let diff = facingAngle - group.rotation.y;
        while (diff >  Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        group.rotation.y += diff * Math.min(1, 14 * dt);

        pos.x += mx;
        pos.z += mz;

        // Clamp to world bounds
        const B = 238;
        pos.x = Math.max(-B, Math.min(B, pos.x));
        pos.z = Math.max(-B, Math.min(B, pos.z));

        // Follow ground
        pos.y = groundY(pos.x, pos.z);

        // Prone tilts the group forward
        if (state === STATE.PRONE) {
            group.rotation.x = 0.72;
        } else {
            group.rotation.x *= 0.85;
        }
    }

    function handleState(dt) {
        if (Controls.justPressed('KeyC')) {
            if (state === STATE.STAND)  state = STATE.CROUCH;
            else if (state === STATE.CROUCH) state = STATE.STAND;
            else if (state === STATE.PRONE)  state = STATE.CROUCH;
        }
        if (Controls.justPressed('KeyZ')) {
            state = (state === STATE.PRONE) ? STATE.STAND : STATE.PRONE;
        }

        // Adjust group vertical scale smoothly for crouch/prone
        let targetScaleY = 1.0;
        if (state === STATE.CROUCH) targetScaleY = 0.68;
        else if (state === STATE.PRONE) targetScaleY = 0.32;
        group.scale.y += (targetScaleY - group.scale.y) * Math.min(1, 10 * dt);
    }

    function handleCombat(dt) {
        // Attack on left click press (edge-triggered)
        if (Controls.mouse.left && !isAttacking && !isBlocking) {
            isAttacking = true;
            atkTimer = 0;
            UI.triggerAttackFlash();
        }

        isBlocking = Controls.mouse.right;

        // Attack animation (0.55s total)
        if (isAttacking) {
            atkTimer += dt;
            const t = atkTimer / 0.55;
            const swing = t < 0.5
                ? -Math.PI * t * 1.8              // swing forward
                : -Math.PI * (1 - t) * 1.8;       // return

            rightArm.rotation.x = swing;
            sword.rotation.x    = swing;

            if (t >= 1) {
                isAttacking = false;
                atkTimer = 0;
                rightArm.rotation.x = 0;
                sword.rotation.x = 0;
            }
        }

        // Block: raise shield
        if (isBlocking) {
            leftArm.rotation.x += (-0.9 - leftArm.rotation.x) * 0.2;
            shield.position.z   += (0.28 - shield.position.z) * 0.2;
        } else {
            leftArm.rotation.x *= 0.8;
            shield.position.z  += (0.12 - shield.position.z) * 0.2;
        }
    }

    function animateBody(dt) {
        const moving = Controls.isDown('KeyW') || Controls.isDown('KeyS') ||
                       Controls.isDown('KeyA') || Controls.isDown('KeyD') ||
                       Controls.isDown('ArrowUp') || Controls.isDown('ArrowDown') ||
                       Controls.isDown('ArrowLeft') || Controls.isDown('ArrowRight');

        const runFactor = (Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight')) ? 1.6 : 1.0;

        if (moving && state !== STATE.PRONE) {
            walkCycle += dt * 5.5 * runFactor;
            const swing = 0.42;
            leftLeg.rotation.x  =  Math.sin(walkCycle) * swing;
            rightLeg.rotation.x = -Math.sin(walkCycle) * swing;
            if (!isBlocking)
                leftArm.rotation.x  = -Math.sin(walkCycle) * 0.3;
            if (!isAttacking)
                rightArm.rotation.x =  Math.sin(walkCycle) * 0.3;
            // Body bob
            body.position.y = 1.22 + Math.abs(Math.sin(walkCycle * 2)) * 0.025;
        } else {
            leftLeg.rotation.x  *= 0.82;
            rightLeg.rotation.x *= 0.82;
            if (!isAttacking) rightArm.rotation.x *= 0.82;
            if (!isBlocking)   leftArm.rotation.x  *= 0.82;
            body.position.y += (1.22 - body.position.y) * 0.12;
        }
    }

    function regenStamina(dt) {
        const sprinting = (Controls.isDown('ShiftLeft') || Controls.isDown('ShiftRight'));
        const moving    = Controls.isDown('KeyW') || Controls.isDown('KeyS') ||
                          Controls.isDown('KeyA') || Controls.isDown('KeyD');
        if (!sprinting || !moving) {
            stamina = Math.min(maxSt, stamina + 18 * dt);
        }
    }

    // ── Public ────────────────────────────────────────────────────────────────
    function init(scene) {
        buildMesh();
        scene.add(group);
        group.position.set(0, 0, 5);
    }

    return {
        init,
        update,
        get group() { return group; },
        get position() { return pos; },
        get hp() { return hp; },
        get maxHp() { return maxHp; },
        get stamina() { return stamina; },
        get maxStamina() { return maxSt; },
        get state() { return state; },
        get isAttacking() { return isAttacking; },
        get isBlocking() { return isBlocking; },
    };
})();
