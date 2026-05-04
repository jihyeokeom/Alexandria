// ── World: Ancient Alexandria, 30 BC ─────────────────────────────────────────
const World = (() => {
    let scene;
    let waterMesh, beaconLight;

    // Shared height formula (must match player.js groundY)
    function terrainH(x, z) {
        return Math.sin(x * 0.05) * 0.45
             + Math.cos(z * 0.07) * 0.32
             + Math.sin((x + z) * 0.03) * 0.14;
    }

    // ── Materials (reused) ────────────────────────────────────────────────────
    function stdMat(hex, rough, metal) {
        return new THREE.MeshStandardMaterial({ color: hex, roughness: rough, metalness: metal || 0 });
    }

    const M = {
        sand:     () => stdMat(0xd4a860, 0.97),
        stone:    () => stdMat(0xc8a870, 0.92),
        marble:   () => stdMat(0xf5eedf, 0.38, 0.08),
        mudbrick: () => stdMat(0xb8956a, 0.96),
        white:    () => stdMat(0xf4edda, 0.9),
        gold:     () => stdMat(0xffd700, 0.15, 0.88),
        wood:     () => stdMat(0x7a4520, 0.82, 0.05),
        water:    () => new THREE.MeshStandardMaterial({
                            color: 0x1e6a88, roughness: 0.05, metalness: 0.35,
                            transparent: true, opacity: 0.82
                        }),
        palmTrunk:() => stdMat(0x8b6914, 0.9),
        palmLeaf: () => new THREE.MeshStandardMaterial({
                            color: 0x3a7d44, roughness: 0.8, side: THREE.DoubleSide
                        }),
        darkWood: () => stdMat(0x5a3010, 0.85),
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    function box(w, h, d, mat) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function cyl(rt, rb, h, seg, mat) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function place(obj, x, y, z) { obj.position.set(x, y, z); scene.add(obj); return obj; }

    // Custom 4-sided pyramid geometry
    function pyramidGeo(base, height) {
        const h = base / 2;
        const verts = new Float32Array([
            -h,0,-h,  h,0,-h,  h,0, h,  -h,0, h,  0,height,0
        ]);
        const idx = [0,1,2, 0,2,3,  0,1,4, 1,2,4, 2,3,4, 3,0,4];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
        g.setIndex(idx);
        g.computeVertexNormals();
        return g;
    }

    // ── Terrain ───────────────────────────────────────────────────────────────
    function buildTerrain() {
        const SEGS = 120;
        const SIZE = 500;
        const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
        const pos = geo.attributes.position;

        for (let i = 0; i < pos.count; i++) {
            const x = pos.getX(i);
            const y = pos.getY(i);   // local Y = world -Z after rotation
            pos.setZ(i, terrainH(x, -y));
        }
        geo.computeVertexNormals();

        const mat = M.sand();
        const mesh = new THREE.Mesh(geo, mat);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    // ── Sky (large inside-out sphere with vertex colours) ─────────────────────
    function buildSky() {
        const geo = new THREE.SphereGeometry(490, 32, 16);
        geo.scale(-1, 1, -1);
        const posA = geo.attributes.position;
        const cols = new Float32Array(posA.count * 3);
        for (let i = 0; i < posA.count; i++) {
            const ny = (posA.getY(i) + 490) / 980; // 0–1
            // horizon: warm sandy haze → zenith: deep Egyptian blue
            const t = Math.max(0, Math.min(1, ny));
            cols[i*3+0] = 0.85 - t * 0.62;   // R
            cols[i*3+1] = 0.72 - t * 0.28;   // G
            cols[i*3+2] = 0.48 + t * 0.42;   // B
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        scene.add(new THREE.Mesh(geo,
            new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    }

    // ── Lighting ──────────────────────────────────────────────────────────────
    function buildLighting() {
        scene.add(new THREE.AmbientLight(0xffe5b0, 0.55));
        scene.add(new THREE.HemisphereLight(0x87ceeb, 0xd4a055, 0.35));

        const sun = new THREE.DirectionalLight(0xfff8e7, 1.75);
        sun.position.set(120, 220, 80);
        sun.castShadow = true;
        const sc = sun.shadow.camera;
        Object.assign(sc, { near: 1, far: 500, left: -160, right: 160, top: 160, bottom: -160 });
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0004;
        scene.add(sun);

        const fill = new THREE.DirectionalLight(0x4477cc, 0.18);
        fill.position.set(-80, 40, -60);
        scene.add(fill);
    }

    // ── Pyramids (background, south) ─────────────────────────────────────────
    function buildPyramids() {
        const mat = M.stone();
        const defs = [
            { x: -195, z: -255, b: 65, h: 105 },
            { x: -115, z: -265, b: 48, h:  78 },
            { x:  -52, z: -272, b: 32, h:  52 },
        ];
        defs.forEach(d => {
            const geo = pyramidGeo(d.b, d.h);
            const m = new THREE.Mesh(geo, mat);
            m.position.set(d.x, terrainH(d.x, d.z), d.z);
            m.castShadow = true; m.receiveShadow = true;
            scene.add(m);
            // Causeway base
            const base = box(d.b + 4, 1.5, d.b + 4, M.stone());
            base.position.set(d.x, terrainH(d.x, d.z) + 0.75, d.z);
            scene.add(base);
        });
    }

    // ── Temple of Serapis ─────────────────────────────────────────────────────
    function buildTemple(ox, oz) {
        const stone  = M.stone();
        const marble = M.marble();

        // Stepped platform
        const steps = [[26, 1.6, 16], [23, 0.8, 13], [20, 0.6, 11]];
        steps.forEach(([w, h, d], i) => {
            const b = box(w, h, d, stone);
            b.position.set(ox, terrainH(ox, oz) + i * 1.0 + h / 2, oz);
            scene.add(b);
        });
        const baseY = terrainH(ox, oz) + 3.0;

        // Inner cella walls
        const cella = box(18, 5.5, 9, stone);
        cella.position.set(ox, baseY + 2.75, oz);
        scene.add(cella);

        // Columns – front & back rows (7 per row)
        const colX = [-9, -6, -3, 0, 3, 6, 9];
        colX.forEach(cx => {
            [-5.5, 5.5].forEach(cz => {
                const col = cyl(0.38, 0.48, 6.5, 12, marble);
                col.position.set(ox + cx, baseY + 3.25, oz + cz);
                scene.add(col);
                // Capital
                const cap = box(0.9, 0.55, 0.9, marble);
                cap.position.set(ox + cx, baseY + 6.75, oz + cz);
                scene.add(cap);
            });
        });

        // Entablature
        [-5.5, 5.5].forEach(cz => {
            const ent = box(26, 0.9, 0.9, stone);
            ent.position.set(ox, baseY + 7.1, oz + cz);
            scene.add(ent);
        });

        // Roof slab
        const roof = box(25, 0.55, 13, stone);
        roof.position.set(ox, baseY + 7.6, oz);
        scene.add(roof);

        // Pediment (front & back triangles)
        [-5.5, 5.5].forEach(cz => {
            const ped = new THREE.Mesh(pyramidGeo(25, 3.5), stone);
            ped.rotation.y = Math.PI / 2;
            ped.scale.set(0.45, 1, 1);
            ped.position.set(ox, baseY + 7.6, oz + cz);
            scene.add(ped);
        });

        // Altar in front
        const altar = box(4, 1.2, 4, stone);
        altar.position.set(ox, terrainH(ox, oz + 12) + 0.6, oz + 12);
        scene.add(altar);
    }

    // ── Canopic Way colonnade ─────────────────────────────────────────────────
    function buildColonnade(ox, oz, length) {
        const marble = M.marble();
        const roadMat = stdMat(0xdfcc82, 0.9);
        const n = Math.floor(length / 5);
        for (let i = 0; i <= n; i++) {
            const cx = ox - length / 2 + i * 5;
            [-5, 5].forEach(cz => {
                const col = cyl(0.28, 0.36, 5.5, 10, marble);
                col.position.set(cx, terrainH(cx, oz + cz) + 2.75, oz + cz);
                scene.add(col);
            });
        }
        const road = box(length + 2, 0.12, 8, roadMat);
        road.position.set(ox, terrainH(ox, oz) + 0.06, oz);
        road.receiveShadow = true;
        scene.add(road);
    }

    // ── City walls & towers ───────────────────────────────────────────────────
    function buildCityWalls() {
        const stone = M.stone();

        const walls = [
            { x: 0,   z: -82, w: 106, h: 7,  d: 3.5 },
            { x: -53, z: -48, w: 3.5, h: 7,  d: 66  },
            { x:  53, z: -48, w: 3.5, h: 7,  d: 66  },
            { x: 0,   z: -15, w: 106, h: 5,  d: 3.5 },
        ];
        walls.forEach(w => {
            const wall = box(w.w, w.h, w.d, stone);
            wall.position.set(w.x, terrainH(w.x, w.z) + w.h / 2, w.z);
            scene.add(wall);
            // Merlons
            const mCount = Math.floor(Math.max(w.w, w.d) / 3.5);
            for (let i = 0; i < mCount; i++) {
                const merlon = box(1.4, 1.4, Math.min(w.d, 1.4) + 0.2, stone);
                const mPos = (w.w > w.d)
                    ? [w.x - w.w / 2 + i * 3.5 + 1.75, terrainH(w.x, w.z) + w.h + 0.7, w.z]
                    : [w.x, terrainH(w.x, w.z) + w.h + 0.7, w.z - w.d / 2 + i * 3.5 + 1.75];
                merlon.position.set(...mPos);
                scene.add(merlon);
            }
        });

        buildTower(-53, -82, stone);
        buildTower( 53, -82, stone);
        buildTower(-53, -15, stone);
        buildTower( 53, -15, stone);
    }

    function buildTower(x, z, mat) {
        const t = box(9, 14, 9, mat);
        t.position.set(x, terrainH(x, z) + 7, z);
        scene.add(t);
        const cap = box(10.5, 1.2, 10.5, mat);
        cap.position.set(x, terrainH(x, z) + 14.6, z);
        scene.add(cap);
        // Arrow slits (just dark recessed boxes for visual)
        const slit = box(0.3, 1.0, 0.25, stdMat(0x1a1208, 0.9));
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            const s = slit.clone();
            s.position.set(x + Math.cos(a) * 4.55, terrainH(x,z) + 8, z + Math.sin(a) * 4.55);
            s.rotation.y = a;
            scene.add(s);
        }
    }

    // ── Obelisks ──────────────────────────────────────────────────────────────
    function buildObelisks() {
        const stoneMat = M.stone();
        const goldMat  = M.gold();
        const locs = [{ x: 22, z: -38 }, { x: -22, z: -38 }];
        locs.forEach(o => {
            // Base
            const base = box(2.2, 1.8, 2.2, stoneMat);
            base.position.set(o.x, terrainH(o.x, o.z) + 0.9, o.z);
            scene.add(base);
            // Shaft
            const shaft = box(1.1, 16, 1.1, stoneMat);
            shaft.position.set(o.x, terrainH(o.x, o.z) + 1.8 + 8, o.z);
            shaft.castShadow = true;
            scene.add(shaft);
            // Pyramidion (gold tip)
            const cap = new THREE.Mesh(pyramidGeo(1.3, 2.2), goldMat);
            cap.position.set(o.x, terrainH(o.x, o.z) + 17.8, o.z);
            scene.add(cap);
        });
    }

    // ── Pharos Lighthouse ─────────────────────────────────────────────────────
    function buildPharos(ox, oz) {
        const stone  = M.stone();
        const marble = M.marble();
        const gold   = M.gold();
        const base   = terrainH(ox, oz);

        // Level 1 – large square
        const l1 = box(22, 32, 22, stone);
        l1.position.set(ox, base + 16, oz);
        scene.add(l1);

        // Level 1 columns (decorative)
        for (let i = 0; i < 8; i++) {
            const a = i * Math.PI / 4;
            const col = cyl(0.55, 0.65, 9, 10, marble);
            col.position.set(ox + Math.cos(a)*8, base + 4.5, oz + Math.sin(a)*8);
            scene.add(col);
        }

        // Level 2 – octagonal
        const l2 = cyl(9, 9, 22, 8, marble);
        l2.position.set(ox, base + 32 + 11, oz);
        scene.add(l2);

        // Level 3 – cylindrical
        const l3 = cyl(4.5, 5.5, 16, 12, marble);
        l3.position.set(ox, base + 54 + 8, oz);
        scene.add(l3);

        // Beacon dome
        const domeGeo = new THREE.SphereGeometry(4.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, gold);
        dome.position.set(ox, base + 70, oz);
        dome.castShadow = true;
        scene.add(dome);

        // Beacon fire light
        beaconLight = new THREE.PointLight(0xff9933, 3.5, 280);
        beaconLight.position.set(ox, base + 76, oz);
        scene.add(beaconLight);

        // Smaller fill glow
        const glow = new THREE.PointLight(0xff6600, 1.2, 120);
        glow.position.set(ox, base + 72, oz);
        scene.add(glow);
    }

    // ── Nile (river on north edge) ────────────────────────────────────────────
    function buildNile() {
        const waterGeo = new THREE.PlaneGeometry(320, 45, 24, 6);
        waterMesh = new THREE.Mesh(waterGeo, M.water());
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(0, -0.35, 152);
        waterMesh.receiveShadow = true;
        scene.add(waterMesh);

        // Banks
        const bankMat = M.mudbrick();
        const b1 = box(320, 0.5, 6, bankMat);
        b1.position.set(0, -0.1, 130);
        scene.add(b1);
        const b2 = box(320, 0.5, 6, bankMat);
        b2.position.set(0, -0.1, 174);
        scene.add(b2);

        // Papyrus clumps (simple thin cylinders)
        for (let i = 0; i < 30; i++) {
            const px = (Math.random() - 0.5) * 280;
            const pz = 128 + Math.random() * 6;
            for (let j = 0; j < 4; j++) {
                const stem = cyl(0.04, 0.05, 2.5 + Math.random(), 5, stdMat(0x5a8040, 0.9));
                stem.position.set(px + (Math.random() - 0.5) * 0.8, terrainH(px, pz) + 1.25, pz + j * 0.3);
                scene.add(stem);
            }
        }
    }

    // ── Market district ───────────────────────────────────────────────────────
    function buildMarket(ox, oz) {
        const defs = [
            [-14,  -9, 11, 4.5, 9,  M.mudbrick],
            [ -1,  -11, 13, 5.5, 11, M.white],
            [ 15,   -7,  9,   4, 8,  M.mudbrick],
            [-17,   6,  8,   5, 10, M.white],
            [ -4,   9, 11, 6.5, 9,  M.stone],
            [ 12,   7, 10,   4, 8,  M.mudbrick],
        ];
        defs.forEach(([dx, dz, w, h, d, matFn]) => {
            const b = box(w, h, d, matFn());
            b.position.set(ox + dx, terrainH(ox+dx, oz+dz) + h/2, oz + dz);
            scene.add(b);
            // Flat roof rim
            const rim = box(w + 0.4, 0.4, d + 0.4, M.stone());
            rim.position.set(ox+dx, terrainH(ox+dx, oz+dz) + h + 0.2, oz+dz);
            scene.add(rim);
        });
        // Market awnings (coloured flat boxes)
        const awningColors = [0xc0392b, 0x2980b9, 0xe67e22, 0x27ae60];
        for (let i = 0; i < 8; i++) {
            const aMat = new THREE.MeshStandardMaterial({ color: awningColors[i%4], roughness: 0.9 });
            const aw = box(3.5, 0.08, 1.5, aMat);
            aw.position.set(ox - 20 + i * 5, terrainH(ox, oz) + 3, oz - 5);
            scene.add(aw);
        }
    }

    // ── Palm trees ────────────────────────────────────────────────────────────
    function buildPalmTrees() {
        const locs = [];
        // Along the Nile bank
        for (let i = 0; i < 22; i++) {
            locs.push({ x: -130 + i * 12, z: 124 + Math.random() * 6 });
        }
        // Around the city
        for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI * 2;
            const r = 38 + Math.random() * 32;
            locs.push({ x: Math.cos(a) * r, z: Math.sin(a) * r - 22 });
        }
        locs.forEach(l => buildPalmTree(l.x, l.z));
    }

    function buildPalmTree(x, z) {
        const h = 5.5 + Math.random() * 4.5;
        const trunk = cyl(0.1, 0.2, h, 6, M.palmTrunk());
        trunk.position.set(x, terrainH(x, z) + h / 2, z);
        trunk.rotation.z = (Math.random() - 0.5) * 0.18;
        scene.add(trunk);

        const leafMat = M.palmLeaf();
        for (let i = 0; i < 9; i++) {
            const a = (i / 9) * Math.PI * 2;
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 2.6), leafMat);
            leaf.castShadow = true;
            leaf.position.set(x + Math.cos(a) * 0.85, terrainH(x, z) + h + 0.5, z + Math.sin(a) * 0.85);
            leaf.rotation.y = a;
            leaf.rotation.x = 0.45 + Math.random() * 0.25;
            scene.add(leaf);
        }
        // Dates cluster
        const dateMat = stdMat(0xc8650a, 0.8);
        for (let i = 0; i < 3; i++) {
            const cluster = cyl(0.18, 0.18, 0.6, 6, dateMat);
            cluster.position.set(x + (Math.random()-0.5)*0.8, terrainH(x,z)+h-0.3, z+(Math.random()-0.5)*0.8);
            scene.add(cluster);
        }
    }

    // ── Scattered rocks & props ───────────────────────────────────────────────
    function buildScatteredProps() {
        const rockMat = M.stone();
        for (let i = 0; i < 40; i++) {
            const rx = (Math.random() - 0.5) * 420;
            const rz = (Math.random() - 0.5) * 420;
            if (Math.abs(rx) < 25 && Math.abs(rz) < 25) continue;
            const s  = 0.4 + Math.random() * 1.2;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(s, 0),
                rockMat
            );
            rock.scale.set(1, 0.55 + Math.random()*0.4, 1);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.position.set(rx, terrainH(rx, rz) + s * 0.25, rz);
            rock.castShadow = true;
            scene.add(rock);
        }

        // Amphorae near market
        const amphoraMat = stdMat(0xa85428, 0.85);
        for (let i = 0; i < 12; i++) {
            const ax = -28 + i * 5;
            const az = -5 + Math.random() * 4;
            const a = cyl(0.2, 0.12, 0.7, 8, amphoraMat);
            a.position.set(ax, terrainH(ax, az) + 0.35, az);
            scene.add(a);
        }
    }

    // ── Sphinx (simple) ───────────────────────────────────────────────────────
    function buildSphinx(ox, oz) {
        const mat = M.sand();
        // Body
        const body = box(10, 4, 22, mat);
        body.position.set(ox, terrainH(ox, oz) + 2, oz);
        scene.add(body);
        // Head
        const head = box(4.5, 4.5, 4.5, mat);
        head.position.set(ox, terrainH(ox, oz) + 5.5, oz - 9);
        scene.add(head);
        // Nemes
        const nemes = box(5, 3, 5, stdMat(0xd4aa40, 0.6, 0.2));
        nemes.position.set(ox, terrainH(ox, oz) + 7.5, oz - 9);
        scene.add(nemes);
        // Front paws
        const paw = box(3.5, 1.8, 6, mat);
        [-1.7, 1.7].forEach(dx => {
            const p = paw.clone();
            p.position.set(ox + dx, terrainH(ox, oz) + 0.9, oz - 13);
            scene.add(p);
        });
    }

    // ── Sand dune detail patches ───────────────────────────────────────────────
    function buildDuneDetails() {
        const mat = M.sand();
        for (let i = 0; i < 35; i++) {
            const x = (Math.random() - 0.5) * 440;
            const z = (Math.random() - 0.5) * 440;
            if (Math.abs(x) < 35 && Math.abs(z) < 35) continue;
            const geo = new THREE.SphereGeometry(2.5 + Math.random() * 4.5, 7, 4);
            geo.scale(1, 0.22, 1);
            const dune = new THREE.Mesh(geo, mat);
            dune.position.set(x, terrainH(x, z) + 0.15, z);
            dune.receiveShadow = true;
            scene.add(dune);
        }
    }

    // ── init / update ─────────────────────────────────────────────────────────
    function init(s) {
        scene = s;
        buildTerrain();
        buildSky();
        buildLighting();
        buildDuneDetails();
        buildPyramids();
        buildPharos(118, -82);
        buildTemple(32, -44);
        buildColonnade(0, -52, 64);
        buildObelisks();
        buildCityWalls();
        buildMarket(-28, -20);
        buildNile();
        buildPalmTrees();
        buildSphinx(-80, -110);
        buildScatteredProps();
    }

    function update(dt, elapsed) {
        if (waterMesh) {
            const h = 0.54 + Math.sin(elapsed * 0.45) * 0.02;
            waterMesh.material.color.setHSL(h, 0.62, 0.32);
        }
        if (beaconLight) {
            beaconLight.intensity = 3.5 + Math.sin(elapsed * 4.8) * 0.7 + Math.sin(elapsed * 11.3) * 0.25;
        }
    }

    return { init, update };
})();
