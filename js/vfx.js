// ── VFX: Sandstorm + Sunlight Rays ───────────────────────────────────────────
const VFX = (() => {
    let sandGeo, sandParticles;
    let sunRayMeshes = [];
    let dustGeo, dustParticles;

    const SAND_COUNT = 4000;
    const DUST_COUNT = 800;
    const WIND_X = 5.8;   // primary wind direction (positive X)
    const WIND_Z = 0.9;   // slight drift in Z

    // ── Sandstorm particles ───────────────────────────────────────────────────
    function buildSandstorm(scene) {
        const pos    = new Float32Array(SAND_COUNT * 3);
        const colors = new Float32Array(SAND_COUNT * 3);

        for (let i = 0; i < SAND_COUNT; i++) {
            pos[i*3]   = (Math.random() - 0.5) * 280;
            // Denser near ground: square the random to bias toward 0
            pos[i*3+1] = Math.pow(Math.random(), 1.8) * 24;
            pos[i*3+2] = (Math.random() - 0.5) * 280;

            // Sandy yellow-white colour with slight variation
            const br   = 0.78 + Math.random() * 0.22;
            colors[i*3]   = br;
            colors[i*3+1] = br * 0.87;
            colors[i*3+2] = br * 0.52;
        }

        sandGeo = new THREE.BufferGeometry();
        sandGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        sandGeo.setAttribute('color',    new THREE.Float32BufferAttribute(colors, 3));

        sandParticles = new THREE.Points(sandGeo, new THREE.PointsMaterial({
            size:            0.20,
            vertexColors:    true,
            transparent:     true,
            opacity:         0.52,
            sizeAttenuation: true,
            depthWrite:      false,
        }));
        scene.add(sandParticles);
    }

    // ── Slow dust motes near ground ───────────────────────────────────────────
    function buildDust(scene) {
        const pos = new Float32Array(DUST_COUNT * 3);
        for (let i = 0; i < DUST_COUNT; i++) {
            pos[i*3]   = (Math.random() - 0.5) * 80;
            pos[i*3+1] = Math.random() * 3.5;
            pos[i*3+2] = (Math.random() - 0.5) * 80;
        }
        dustGeo = new THREE.BufferGeometry();
        dustGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));

        dustParticles = new THREE.Points(dustGeo, new THREE.PointsMaterial({
            size:            0.09,
            color:           0xffe8b0,
            transparent:     true,
            opacity:         0.35,
            sizeAttenuation: true,
            depthWrite:      false,
        }));
        scene.add(dustParticles);
    }

    // ── Sunlight shafts (additive-blend translucent cones) ────────────────────
    function buildSunRays(scene) {
        // Sun is at roughly (120, 240, 100) in the world
        // Create 4 overlapping shafts of different sizes for layered look
        const shaftDefs = [
            { r: 8,  h: 220, op: 0.042 },
            { r: 14, h: 200, op: 0.028 },
            { r: 22, h: 180, op: 0.018 },
            { r: 38, h: 160, op: 0.010 },
        ];

        shaftDefs.forEach(d => {
            const geo = new THREE.ConeGeometry(d.r, d.h, 8, 1, true);
            const mat = new THREE.MeshBasicMaterial({
                color:      0xfff0a0,
                transparent: true,
                opacity:     d.op,
                side:        THREE.DoubleSide,
                depthWrite:  false,
                blending:    THREE.AdditiveBlending,
            });
            const mesh = new THREE.Mesh(geo, mat);
            // Tilt to match the sun direction (roughly from upper-right)
            mesh.position.set(50, 120, 40);
            mesh.rotation.set(0.22, -0.5, 0.28);
            scene.add(mesh);
            sunRayMeshes.push(mesh);
        });

        // Bright sun disc at source position
        const discGeo = new THREE.PlaneGeometry(45, 45);
        const discMat = new THREE.MeshBasicMaterial({
            color:      0xfff8d0,
            transparent: true,
            opacity:     0.12,
            side:        THREE.DoubleSide,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
        });
        const disc = new THREE.Mesh(discGeo, discMat);
        disc.position.set(120, 230, 100);
        disc.lookAt(0, 0, 0);
        scene.add(disc);
        sunRayMeshes.push(disc);
    }

    // ── Update ────────────────────────────────────────────────────────────────
    function update(dt, elapsed, playerPos) {
        updateSandstorm(dt, elapsed, playerPos);
        updateDust(dt, elapsed, playerPos);
        updateSunRays(elapsed);
    }

    function updateSandstorm(dt, elapsed, playerPos) {
        if (!sandGeo) return;
        const arr  = sandGeo.attributes.position.array;
        const WRAP = 140;
        const px   = playerPos.x, pz = playerPos.z;

        for (let i = 0; i < SAND_COUNT; i++) {
            const idx = i * 3;
            // Wind drift + micro turbulence
            arr[idx]   += WIND_X * dt + Math.sin(elapsed * 2.4 + i * 0.17) * 0.007;
            arr[idx+1] += Math.sin(elapsed * 1.6 + i * 0.63) * 0.003;
            arr[idx+2] += WIND_Z * dt + Math.cos(elapsed * 1.9 + i * 0.48) * 0.005;

            // Wrap relative to player (seamless cloud)
            if (arr[idx]   - px >  WRAP) arr[idx]   -= WRAP * 2;
            if (arr[idx]   - px < -WRAP) arr[idx]   += WRAP * 2;
            if (arr[idx+2] - pz >  WRAP) arr[idx+2] -= WRAP * 2;
            if (arr[idx+2] - pz < -WRAP) arr[idx+2] += WRAP * 2;

            // Keep particles from flying too high
            if (arr[idx+1] > 26) arr[idx+1] = 0.1 + Math.random() * 1.5;
            if (arr[idx+1] < -1) arr[idx+1] = 0.5;
        }
        sandGeo.attributes.position.needsUpdate = true;
    }

    function updateDust(dt, elapsed, playerPos) {
        if (!dustGeo) return;
        const arr = dustGeo.attributes.position.array;
        const px  = playerPos.x, pz = playerPos.z;

        for (let i = 0; i < DUST_COUNT; i++) {
            const idx = i * 3;
            arr[idx]   += (WIND_X * 0.3) * dt + Math.sin(elapsed + i) * 0.006;
            arr[idx+1] += Math.sin(elapsed * 0.8 + i * 0.5) * 0.004;
            arr[idx+2] += (WIND_Z * 0.3) * dt + Math.cos(elapsed * 0.7 + i) * 0.004;

            // Keep near player
            if (arr[idx]   - px >  40) arr[idx]   -= 80;
            if (arr[idx]   - px < -40) arr[idx]   += 80;
            if (arr[idx+2] - pz >  40) arr[idx+2] -= 80;
            if (arr[idx+2] - pz < -40) arr[idx+2] += 80;
            if (arr[idx+1] > 4.5) arr[idx+1] = 0.1 + Math.random() * 0.5;
        }
        dustGeo.attributes.position.needsUpdate = true;
    }

    function updateSunRays(elapsed) {
        sunRayMeshes.forEach((m, i) => {
            if (m.material) {
                const base = m.material.opacity;
                m.material.opacity = base + Math.sin(elapsed * 0.6 + i) * 0.004;
            }
        });
    }

    // ── init ──────────────────────────────────────────────────────────────────
    function init(scene) {
        buildSandstorm(scene);
        buildDust(scene);
        buildSunRays(scene);
    }

    return { init, update };
})();
