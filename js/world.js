// ── World: Ancient Alexandria 30 BC  (Low-Poly Reference Quality) ─────────────
const World = (() => {
    let scene;
    let waterMesh, beaconLight;

    // Shared height (matches player.js)
    function terrainH(x, z) {
        return Math.sin(x * 0.05) * 0.45
             + Math.cos(z * 0.07) * 0.32
             + Math.sin((x + z) * 0.03) * 0.14;
    }

    // ── Material factory (flat-shading gives low-poly facet look) ─────────────
    function sm(hex, rough, metal) {
        return new THREE.MeshStandardMaterial({
            color: hex, roughness: rough, metalness: metal || 0, flatShading: true
        });
    }
    // Shared palette
    const PAL = {
        sand:      sm(0xd4a860, 0.96),
        sandLight: sm(0xe8c888, 0.94),
        stone:     sm(0xc8a870, 0.88),
        stoneDark: sm(0x9e845c, 0.90),
        marble:    sm(0xf4edd8, 0.35, 0.08),
        mudbrick:  sm(0xb8956a, 0.95),
        mudbrick2: sm(0xc9a478, 0.93),
        white:     sm(0xf2ebd8, 0.90),
        gold:      sm(0xffd060, 0.18, 0.82),
        wood:      sm(0x7a4520, 0.82, 0.06),
        darkWood:  sm(0x4a2810, 0.85),
        linen:     sm(0xf0e8d0, 0.92),
        rust:      sm(0xb04020, 0.85),
        orange:    sm(0xd06020, 0.85),
        slate:     sm(0x888070, 0.80),
        water:     new THREE.MeshStandardMaterial({
                        color: 0x1e6a88, roughness: 0.05, metalness: 0.35,
                        transparent: true, opacity: 0.80, flatShading: true
                    }),
        palmTrunk: sm(0x8b6914, 0.88),
        palmLeaf:  new THREE.MeshStandardMaterial({
                        color: 0x3a7d44, roughness: 0.80, side: THREE.DoubleSide, flatShading: true
                    }),
        tileLight: sm(0xd8cc9e, 0.72),
        tileDark:  sm(0xbfb080, 0.76),
    };

    // ── Geometry helpers ──────────────────────────────────────────────────────
    function box(w, h, d, mat) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function cyl(rt, rb, h, s, mat) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, s), mat);
        m.castShadow = true; m.receiveShadow = true;
        return m;
    }
    function place(obj, x, y, z) { obj.position.set(x, y, z); scene.add(obj); return obj; }

    function pyramidGeo(base, height) {
        const h = base / 2;
        const v = new Float32Array([-h,0,-h, h,0,-h, h,0,h, -h,0,h, 0,height,0]);
        const i = [0,1,2, 0,2,3, 0,1,4, 1,2,4, 2,3,4, 3,0,4];
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
        g.setIndex(i); g.computeVertexNormals();
        return g;
    }

    // ── Paved stone path (InstancedMesh) ──────────────────────────────────────
    function buildPavedPath(ox, oz, length, width) {
        const tW = 1.8, tD = 1.8, gap = 0.12;
        const step = tW + gap;
        const cols = Math.ceil(width / step);
        const rows = Math.ceil(length / step);
        const count = cols * rows;

        const geo  = new THREE.BoxGeometry(tW, 0.18, tD);
        const inst = new THREE.InstancedMesh(geo, PAL.tileLight.clone(), count);
        inst.receiveShadow = true;

        const dummy = new THREE.Object3D();
        let idx = 0;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const tx = ox - (cols * step) / 2 + c * step + tW / 2;
                const tz = oz - (rows * step) / 2 + r * step + tD / 2;
                dummy.position.set(tx, terrainH(tx, tz) + 0.09, tz);
                // Slight rotation per tile for natural look
                dummy.rotation.y = Math.round(Math.sin(r * 7 + c * 13) * 2) * Math.PI / 2 * 0.05;
                dummy.updateMatrix();
                inst.setMatrixAt(idx++, dummy.matrix);
            }
        }
        inst.instanceMatrix.needsUpdate = true;
        scene.add(inst);
    }

    // ── Egyptian statue (simplified standing pharaoh) ─────────────────────────
    function buildStatue(ox, oz, scale) {
        scale = scale || 1;
        const sc = scale;
        const smat = PAL.stoneDark;

        const g = new THREE.Group();
        // Pedestal
        g.add(Object.assign(box(1.2*sc, 0.8*sc, 1.2*sc, smat), { position: { x:0, y:0.4*sc, z:0 } }));
        // Body
        g.add(Object.assign(box(0.7*sc, 1.8*sc, 0.45*sc, smat), { position: { x:0, y:1.7*sc, z:0 } }));
        // Head (tall with Nemes)
        g.add(Object.assign(box(0.5*sc, 0.5*sc, 0.46*sc, smat), { position: { x:0, y:2.85*sc, z:0 } }));
        // Nemes headdress
        g.add(Object.assign(box(0.6*sc, 0.55*sc, 0.58*sc, PAL.stone), { position: { x:0, y:3.15*sc, z:0 } }));
        // Arms at sides
        [-0.42*sc, 0.42*sc].forEach(dx => {
            g.add(Object.assign(box(0.22*sc, 1.6*sc, 0.22*sc, smat), { position: { x:dx, y:1.7*sc, z:0 } }));
        });

        g.position.set(ox, terrainH(ox, oz), oz);
        g.traverse(c => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } });
        scene.add(g);
    }

    // ── Market stall (awning + table + goods) ─────────────────────────────────
    function buildMarketStall(ox, oz, awningColor) {
        awningColor = awningColor || PAL.orange;
        const posts = [[-0.8,-0.8],[0.8,-0.8],[-0.8,0.8],[0.8,0.8]];
        posts.forEach(([dx,dz]) => {
            place(cyl(0.05, 0.05, 2.2, 5, PAL.wood),
                  ox + dx, terrainH(ox+dx, oz+dz) + 1.1, oz + dz);
        });
        // Awning roof
        const awn = box(1.9, 0.1, 2.1, awningColor);
        awn.rotation.x = 0.18;
        place(awn, ox, terrainH(ox, oz) + 2.2, oz);

        // Table
        place(box(1.5, 0.08, 0.9, PAL.wood), ox, terrainH(ox, oz) + 1.0, oz - 0.1);
        place(box(0.06, 0.95, 0.06, PAL.darkWood), ox - 0.65, terrainH(ox, oz) + 0.48, oz - 0.4);
        place(box(0.06, 0.95, 0.06, PAL.darkWood), ox + 0.65, terrainH(ox, oz) + 0.48, oz - 0.4);
        place(box(0.06, 0.95, 0.06, PAL.darkWood), ox - 0.65, terrainH(ox, oz) + 0.48, oz + 0.4);
        place(box(0.06, 0.95, 0.06, PAL.darkWood), ox + 0.65, terrainH(ox, oz) + 0.48, oz + 0.4);

        // Goods on table (jars, cloth)
        place(cyl(0.12, 0.08, 0.35, 8, PAL.rust), ox - 0.4, terrainH(ox, oz) + 1.22, oz - 0.1);
        place(cyl(0.14, 0.09, 0.38, 8, PAL.mudbrick), ox + 0.15, terrainH(ox, oz) + 1.23, oz - 0.1);
        place(box(0.3, 0.1, 0.5, PAL.linen), ox + 0.5, terrainH(ox, oz) + 1.08, oz - 0.05);
    }

    // ── Terrain ───────────────────────────────────────────────────────────────
    function buildTerrain() {
        const SEGS = 140, SIZE = 500;
        const geo  = new THREE.PlaneGeometry(SIZE, SIZE, SEGS, SEGS);
        const posA = geo.attributes.position;
        for (let i = 0; i < posA.count; i++) {
            posA.setZ(i, terrainH(posA.getX(i), -posA.getY(i)));
        }
        geo.computeVertexNormals();
        const mesh = new THREE.Mesh(geo, PAL.sand);
        mesh.rotation.x = -Math.PI / 2;
        mesh.receiveShadow = true;
        scene.add(mesh);
    }

    // ── Sky (inside-out sphere, warm Egyptian palette) ────────────────────────
    function buildSky() {
        const geo = new THREE.SphereGeometry(490, 36, 18);
        geo.scale(-1, 1, -1);
        const posA = geo.attributes.position;
        const cols = new Float32Array(posA.count * 3);
        for (let i = 0; i < posA.count; i++) {
            const t = Math.max(0, Math.min(1, (posA.getY(i) + 490) / 980));
            // horizon: amber haze → zenith: deep cerulean
            cols[i*3+0] = 0.88 - t * 0.65;
            cols[i*3+1] = 0.72 - t * 0.28;
            cols[i*3+2] = 0.46 + t * 0.44;
        }
        geo.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
        scene.add(new THREE.Mesh(geo,
            new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
    }

    // ── Lighting (strong Egyptian sun) ────────────────────────────────────────
    function buildLighting() {
        scene.add(new THREE.AmbientLight(0xffe5a0, 0.55));
        scene.add(new THREE.HemisphereLight(0x87ceeb, 0xd4a055, 0.40));

        const sun = new THREE.DirectionalLight(0xfff8e0, 2.0);
        sun.position.set(120, 240, 100);
        sun.castShadow = true;
        Object.assign(sun.shadow.camera, { near:1, far:500, left:-160, right:160, top:160, bottom:-160 });
        sun.shadow.mapSize.set(2048, 2048);
        sun.shadow.bias = -0.0004;
        scene.add(sun);

        // Warm fill from opposite side (bounced light off sand)
        const fill = new THREE.DirectionalLight(0xffcc80, 0.28);
        fill.position.set(-80, 20, -80);
        scene.add(fill);
    }

    // ── Pyramids ──────────────────────────────────────────────────────────────
    function buildPyramids() {
        const defs = [
            { x:-192, z:-255, b:68, h:108 },
            { x:-114, z:-265, b:50, h:80  },
            { x: -50, z:-272, b:33, h:53  },
        ];
        defs.forEach(d => {
            const geo = pyramidGeo(d.b, d.h);
            const m = new THREE.Mesh(geo, PAL.stone);
            m.position.set(d.x, terrainH(d.x, d.z), d.z);
            m.castShadow = true; m.receiveShadow = true;
            scene.add(m);
            const base = box(d.b + 6, 1.8, d.b + 6, PAL.stoneDark);
            base.position.set(d.x, terrainH(d.x, d.z) + 0.9, d.z);
            scene.add(base);
        });
    }

    // ── Temple of Serapis ─────────────────────────────────────────────────────
    function buildTemple(ox, oz) {
        const base = terrainH(ox, oz);

        // Stepped platform (3 levels)
        [[28,1.8,17],[25,0.9,14],[22,0.6,12]].forEach(([w,h,d], i) => {
            const b = box(w, h, d, PAL.stone);
            b.position.set(ox, base + i * 1.1 + h/2, oz);
            scene.add(b);
        });
        const platY = base + 3.4;

        // Cella walls
        const cella = box(20, 6.0, 9.5, PAL.stone);
        cella.position.set(ox, platY + 3.0, oz);
        scene.add(cella);

        // Window recesses on cella
        [-6,-2,2,6].forEach(dx => {
            const win = box(1.2, 2.0, 0.3, PAL.stoneDark);
            win.position.set(ox + dx, platY + 3.5, oz + 4.85);
            scene.add(win);
            const win2 = win.clone();
            win2.position.z = oz - 4.85;
            scene.add(win2);
        });

        // Columns – front & back (9 per row)
        const colXs = [-10, -7.5, -5, -2.5, 0, 2.5, 5, 7.5, 10];
        colXs.forEach(cx => {
            [-6, 6].forEach(cz => {
                const col = cyl(0.40, 0.50, 7.0, 12, PAL.marble);
                col.position.set(ox + cx, platY + 3.5, oz + cz);
                scene.add(col);
                // Capital
                const cap = box(1.0, 0.55, 1.0, PAL.marble);
                cap.position.set(ox + cx, platY + 7.2, oz + cz);
                scene.add(cap);
            });
        });

        // Entablature
        [-6, 6].forEach(cz => {
            const ent = box(28, 1.0, 1.0, PAL.stone);
            ent.position.set(ox, platY + 7.5, oz + cz);
            scene.add(ent);
        });

        // Roof + pediments
        const roof = box(27, 0.6, 14, PAL.stone);
        roof.position.set(ox, platY + 8.1, oz);
        scene.add(roof);
        [-6, 6].forEach(cz => {
            const ped = new THREE.Mesh(pyramidGeo(27, 3.8), PAL.stone);
            ped.rotation.y = Math.PI / 2; ped.scale.set(0.48, 1, 1);
            ped.position.set(ox, platY + 8.1, oz + cz);
            scene.add(ped);
        });

        // Entrance statues
        buildStatue(ox - 8, oz + 10, 1.1);
        buildStatue(ox + 8, oz + 10, 1.1);

        // Altar
        const altar = box(4.5, 1.4, 4.5, PAL.stoneDark);
        altar.position.set(ox, base + 0.7, oz + 14);
        scene.add(altar);
        // Altar flame (orange sphere)
        const flame = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
            new THREE.MeshStandardMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 1.2, flatShading: true }));
        flame.position.set(ox, base + 1.9, oz + 14);
        scene.add(flame);
        const altarLight = new THREE.PointLight(0xff8833, 1.5, 18);
        altarLight.position.set(ox, base + 2.5, oz + 14);
        scene.add(altarLight);
    }

    // ── Canopic Way (colonnade + paved road) ──────────────────────────────────
    function buildColonnade(ox, oz, length) {
        const n = Math.floor(length / 5.2);
        for (let i = 0; i <= n; i++) {
            const cx = ox - length / 2 + i * 5.2;
            [-5.5, 5.5].forEach(cz => {
                const col = cyl(0.30, 0.40, 5.8, 10, PAL.marble);
                col.position.set(cx, terrainH(cx, oz + cz) + 2.9, oz + cz);
                scene.add(col);
                const cap = box(0.88, 0.5, 0.88, PAL.marble);
                cap.position.set(cx, terrainH(cx, oz + cz) + 5.95, oz + cz);
                scene.add(cap);
            });
            // Entablature beam sections
            if (i < n) {
                [-5.5, 5.5].forEach(cz => {
                    const beam = box(5.2, 0.55, 0.55, PAL.stone);
                    beam.position.set(cx + 2.6, terrainH(cx, oz + cz) + 6.1, oz + cz);
                    scene.add(beam);
                });
            }
        }
        // Paved road
        buildPavedPath(ox, oz, length + 4, 9);
    }

    // ── City walls & towers ───────────────────────────────────────────────────
    function buildCityWalls() {
        const wallDefs = [
            { x:  0, z:-82, w:108, h:7.5, d:3.5 },
            { x:-54, z:-48, w:3.5, h:7.5, d:66  },
            { x: 54, z:-48, w:3.5, h:7.5, d:66  },
            { x:  0, z:-15, w:108, h:5.5, d:3.5 },
        ];
        wallDefs.forEach(w => {
            const wall = box(w.w, w.h, w.d, PAL.stone);
            wall.position.set(w.x, terrainH(w.x, w.z) + w.h / 2, w.z);
            scene.add(wall);
            // Crenellations
            const mCount = Math.floor(Math.max(w.w, w.d) / 3.8);
            for (let i = 0; i < mCount; i++) {
                const mer = box(1.5, 1.6, Math.min(w.d, 1.5) + 0.2, PAL.stoneDark);
                const ix = (w.w > w.d)
                    ? w.x - w.w/2 + i * 3.8 + 1.9
                    : w.x;
                const iz = (w.w > w.d)
                    ? w.z
                    : w.z - w.d/2 + i * 3.8 + 1.9;
                mer.position.set(ix, terrainH(w.x, w.z) + w.h + 0.8, iz);
                scene.add(mer);
            }
        });

        // Gate arch
        buildGateArch(0, -82);
        // Corner towers
        [[-54,-82],[54,-82],[-54,-15],[54,-15]].forEach(([x,z]) => buildTower(x, z));
    }

    function buildTower(x, z) {
        const t = box(10, 15, 10, PAL.stone);
        t.position.set(x, terrainH(x, z) + 7.5, z);
        scene.add(t);
        const cap = box(11.5, 1.4, 11.5, PAL.stoneDark);
        cap.position.set(x, terrainH(x, z) + 15.7, z);
        scene.add(cap);
        // Arrow slits
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2;
            const sl = box(0.3, 1.2, 0.28, sm(0x1a1208, 0.95));
            sl.position.set(x + Math.cos(a) * 5.1, terrainH(x,z) + 8, z + Math.sin(a) * 5.1);
            sl.rotation.y = a;
            scene.add(sl);
        }
    }

    function buildGateArch(ox, oz) {
        // Two tall pilons flanking an entry
        [[-6.5, 0],[6.5, 0]].forEach(([dx]) => {
            const pilon = box(5, 20, 8, PAL.stone);
            pilon.position.set(ox + dx, terrainH(ox, oz) + 10, oz);
            scene.add(pilon);
        });
        // Lintel
        const lintel = box(17, 2.5, 8, PAL.stoneDark);
        lintel.position.set(ox, terrainH(ox, oz) + 20.8, oz);
        scene.add(lintel);
        // Road through gate
        buildPavedPath(ox, oz + 4, 12, 11);
    }

    // ── Obelisks ──────────────────────────────────────────────────────────────
    function buildObelisks() {
        [[22,-38],[-22,-38]].forEach(([ox, oz]) => {
            const base = box(2.5, 2.0, 2.5, PAL.stone);
            base.position.set(ox, terrainH(ox, oz) + 1.0, oz);
            scene.add(base);
            const shaft = box(1.2, 18, 1.2, PAL.stone);
            shaft.position.set(ox, terrainH(ox, oz) + 2.0 + 9, oz);
            shaft.castShadow = true;
            scene.add(shaft);
            const cap = new THREE.Mesh(pyramidGeo(1.4, 2.4), PAL.gold);
            cap.position.set(ox, terrainH(ox, oz) + 20.0, oz);
            scene.add(cap);
        });
    }

    // ── Pharos Lighthouse ─────────────────────────────────────────────────────
    function buildPharos(ox, oz) {
        const base = terrainH(ox, oz);

        // Level 1 – square
        const l1 = box(24, 34, 24, PAL.stone);
        l1.position.set(ox, base + 17, oz);
        scene.add(l1);
        // Level 1 window recesses
        [0, Math.PI/2, Math.PI, Math.PI*1.5].forEach(a => {
            const win = box(3, 4, 0.4, PAL.stoneDark);
            win.position.set(ox + Math.cos(a)*12.1, base + 18, oz + Math.sin(a)*12.1);
            win.rotation.y = a;
            scene.add(win);
        });
        // Decorative columns on level 1
        for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            const col = cyl(0.6, 0.7, 9, 10, PAL.marble);
            col.position.set(ox + Math.cos(a) * 9, base + 4.5, oz + Math.sin(a) * 9);
            scene.add(col);
        }

        // Level 2 – octagonal marble
        const l2 = cyl(10, 10, 24, 8, PAL.marble);
        l2.position.set(ox, base + 34 + 12, oz);
        scene.add(l2);

        // Level 3 – cylindrical
        const l3 = cyl(5, 6, 18, 12, PAL.marble);
        l3.position.set(ox, base + 58 + 9, oz);
        scene.add(l3);

        // Beacon dome
        const domeGeo = new THREE.SphereGeometry(5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const dome = new THREE.Mesh(domeGeo, PAL.gold);
        dome.position.set(ox, base + 75, oz);
        dome.castShadow = true;
        scene.add(dome);

        // Beacon fire
        const fireGeo = new THREE.SphereGeometry(1.8, 8, 6);
        const fireMat = new THREE.MeshStandardMaterial({
            color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 2.0, flatShading: true
        });
        const fire = new THREE.Mesh(fireGeo, fireMat);
        fire.position.set(ox, base + 82, oz);
        scene.add(fire);

        beaconLight = new THREE.PointLight(0xff9933, 4.0, 350);
        beaconLight.position.set(ox, base + 84, oz);
        scene.add(beaconLight);
        const glow = new THREE.PointLight(0xff6600, 1.5, 140);
        glow.position.set(ox, base + 80, oz);
        scene.add(glow);
    }

    // ── Nile ──────────────────────────────────────────────────────────────────
    function buildNile() {
        const geo = new THREE.PlaneGeometry(340, 46, 28, 8);
        waterMesh = new THREE.Mesh(geo, PAL.water);
        waterMesh.rotation.x = -Math.PI / 2;
        waterMesh.position.set(0, -0.35, 152);
        waterMesh.receiveShadow = true;
        scene.add(waterMesh);

        // Banks
        const b1 = box(340, 0.6, 7, PAL.mudbrick);
        b1.position.set(0, -0.1, 130);
        scene.add(b1);
        const b2 = b1.clone();
        b2.position.z = 175;
        scene.add(b2);

        // Papyrus clusters
        for (let i = 0; i < 35; i++) {
            const px = (Math.random() - 0.5) * 300;
            const pz = 128 + Math.random() * 5;
            for (let j = 0; j < 5; j++) {
                const stem = cyl(0.04, 0.05, 2.5 + Math.random() * 0.8, 5, sm(0x4a7835, 0.9));
                stem.position.set(px + (Math.random()-0.5) * 0.8, terrainH(px, pz) + 1.25, pz + j * 0.3);
                scene.add(stem);
                // Papyrus head
                const head = cyl(0.2, 0.05, 0.4, 8, sm(0x6a9840, 0.9));
                head.position.set(px + (Math.random()-0.5)*0.8, terrainH(px,pz)+2.8, pz+j*0.3);
                scene.add(head);
            }
        }
    }

    // ── Market district ───────────────────────────────────────────────────────
    function buildMarket(ox, oz) {
        // Buildings
        const bDefs = [
            [-14, -10, 12, 5.0, 10, PAL.mudbrick],
            [ -1, -12, 14, 6.0, 11, PAL.white],
            [ 15,  -8, 10, 4.5,  9, PAL.mudbrick2],
            [-17,   5,  9, 5.5, 10, PAL.white],
            [ -5,   8, 11, 7.0,  9, PAL.stone],
            [ 11,   6, 10, 4.5,  8, PAL.mudbrick],
        ];
        bDefs.forEach(([dx, dz, w, h, d, mat]) => {
            const bx = ox + dx, bz = oz + dz;
            const b = box(w, h, d, mat);
            b.position.set(bx, terrainH(bx, bz) + h/2, bz);
            scene.add(b);
            // Flat roof lip
            const lip = box(w + 0.4, 0.4, d + 0.4, PAL.stoneDark);
            lip.position.set(bx, terrainH(bx, bz) + h + 0.2, bz);
            scene.add(lip);
            // Door recess
            const door = box(1.2, 2.5, 0.35, PAL.stoneDark);
            door.position.set(bx, terrainH(bx, bz) + 1.25, bz + d/2 + 0.01);
            scene.add(door);
            // Windows
            [-2.5, 2.5].forEach(wdx => {
                const win = box(0.9, 1.1, 0.3, PAL.stoneDark);
                win.position.set(bx + wdx, terrainH(bx, bz) + h * 0.65, bz + d/2 + 0.01);
                scene.add(win);
            });
        });

        // Market stalls along street
        const awnings = [PAL.orange, PAL.rust, PAL.linen, PAL.orange, PAL.rust];
        for (let i = 0; i < 5; i++) {
            buildMarketStall(ox - 22 + i * 8, oz - 3, awnings[i]);
        }

        // Central well
        const wellBase = cyl(1.1, 1.1, 1.0, 10, PAL.stone);
        wellBase.position.set(ox, terrainH(ox, oz) + 0.5, oz + 18);
        scene.add(wellBase);
        const wellRim = cyl(1.15, 1.15, 0.25, 10, PAL.stoneDark);
        wellRim.position.set(ox, terrainH(ox, oz) + 1.13, oz + 18);
        scene.add(wellRim);
        // Well post
        const post = cyl(0.1, 0.1, 2.0, 6, PAL.wood);
        post.position.set(ox, terrainH(ox, oz) + 2.0, oz + 18);
        scene.add(post);
        const crossbeam = box(2.2, 0.15, 0.15, PAL.wood);
        crossbeam.position.set(ox, terrainH(ox, oz) + 3.1, oz + 18);
        scene.add(crossbeam);

        // Crates & amphoras scattered
        for (let i = 0; i < 10; i++) {
            const cx = ox + (Math.random() - 0.5) * 30;
            const cz = oz + (Math.random() - 0.5) * 20;
            if (Math.random() > 0.5) {
                const crate = box(0.7, 0.7, 0.7, PAL.wood);
                crate.position.set(cx, terrainH(cx, cz) + 0.35, cz);
                scene.add(crate);
            } else {
                const amp = cyl(0.18, 0.10, 0.65, 8, PAL.rust);
                amp.position.set(cx, terrainH(cx, cz) + 0.33, cz);
                scene.add(amp);
            }
        }
    }

    // ── Palm trees ────────────────────────────────────────────────────────────
    function buildPalmTrees() {
        const locs = [];
        for (let i = 0; i < 24; i++) {
            locs.push({ x: -135 + i * 11.5 + (Math.random()-0.5)*3, z: 122 + Math.random() * 6 });
        }
        for (let i = 0; i < 20; i++) {
            const a = (i / 20) * Math.PI * 2;
            const r = 40 + Math.random() * 34;
            locs.push({ x: Math.cos(a) * r, z: Math.sin(a) * r - 22 });
        }
        locs.forEach(l => buildPalmTree(l.x, l.z));
    }

    function buildPalmTree(x, z) {
        const h = 5.5 + Math.random() * 5.0;
        const trunk = cyl(0.11, 0.22, h, 7, PAL.palmTrunk);
        trunk.position.set(x, terrainH(x, z) + h/2, z);
        trunk.rotation.z = (Math.random() - 0.5) * 0.2;
        trunk.rotation.x = (Math.random() - 0.5) * 0.08;
        scene.add(trunk);

        // Fronds (more fronds for fuller look)
        for (let i = 0; i < 11; i++) {
            const a = (i / 11) * Math.PI * 2;
            const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 2.8), PAL.palmLeaf);
            leaf.castShadow = true;
            leaf.position.set(x + Math.cos(a)*0.9, terrainH(x,z)+h+0.55, z + Math.sin(a)*0.9);
            leaf.rotation.y = a;
            leaf.rotation.x = 0.45 + Math.random() * 0.28;
            scene.add(leaf);
        }

        // Date clusters
        for (let i = 0; i < 4; i++) {
            const a = Math.random() * Math.PI * 2;
            const dc = cyl(0.16, 0.16, 0.55, 7, sm(0xc8600a, 0.8));
            dc.position.set(x + Math.cos(a)*0.7, terrainH(x,z)+h-0.25, z + Math.sin(a)*0.7);
            scene.add(dc);
        }
    }

    // ── Sphinx ────────────────────────────────────────────────────────────────
    function buildSphinx(ox, oz) {
        // Body
        const body = box(11, 4.5, 24, PAL.sand);
        body.position.set(ox, terrainH(ox, oz) + 2.25, oz);
        scene.add(body);
        // Head
        const head = box(4.8, 5.0, 5.0, PAL.sand);
        head.position.set(ox, terrainH(ox, oz) + 6.25, oz - 9.5);
        scene.add(head);
        // Nemes headdress
        const nemes = box(5.4, 3.5, 5.5, sm(0xd4aa40, 0.55, 0.22));
        nemes.position.set(ox, terrainH(ox, oz) + 8.7, oz - 9.5);
        scene.add(nemes);
        // Paws
        [[3.8,0.8],[-3.8,0.8]].forEach(([dx]) => {
            const paw = box(3.8, 2.0, 7, PAL.sand);
            paw.position.set(ox + dx, terrainH(ox, oz) + 1.0, oz - 14);
            scene.add(paw);
        });
    }

    // ── Sand dune patches ─────────────────────────────────────────────────────
    function buildDuneDetails() {
        for (let i = 0; i < 42; i++) {
            const rx = (Math.random() - 0.5) * 440;
            const rz = (Math.random() - 0.5) * 440;
            if (Math.abs(rx) < 40 && Math.abs(rz) < 40) continue;
            const s = 2.5 + Math.random() * 5;
            const geo = new THREE.SphereGeometry(s, 7, 4);
            geo.scale(1, 0.22, 1);
            const dune = new THREE.Mesh(geo, Math.random() > 0.5 ? PAL.sand : PAL.sandLight);
            dune.position.set(rx, terrainH(rx, rz) + 0.12, rz);
            dune.receiveShadow = true;
            scene.add(dune);
        }
    }

    // ── Scattered rocks & props ───────────────────────────────────────────────
    function buildScatteredProps() {
        for (let i = 0; i < 50; i++) {
            const rx = (Math.random() - 0.5) * 430;
            const rz = (Math.random() - 0.5) * 430;
            if (Math.abs(rx) < 28 && Math.abs(rz) < 28) continue;
            const s = 0.3 + Math.random() * 1.4;
            const rock = new THREE.Mesh(
                new THREE.DodecahedronGeometry(s, 0),
                Math.random() > 0.5 ? PAL.stone : PAL.stoneDark
            );
            rock.scale.set(1, 0.50 + Math.random() * 0.4, 1);
            rock.rotation.set(Math.random(), Math.random(), Math.random());
            rock.position.set(rx, terrainH(rx, rz) + s * 0.22, rz);
            rock.castShadow = true;
            scene.add(rock);
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
        buildPharos(120, -84);
        buildTemple(32, -46);
        buildColonnade(0, -54, 66);
        buildObelisks();
        buildCityWalls();
        buildMarket(-28, -20);
        buildNile();
        buildPalmTrees();
        buildSphinx(-80, -112);
        buildScatteredProps();
    }

    function update(dt, elapsed) {
        if (waterMesh) {
            waterMesh.material.color.setHSL(0.55 + Math.sin(elapsed * 0.42) * 0.018, 0.62, 0.32);
        }
        if (beaconLight) {
            beaconLight.intensity = 4.0 + Math.sin(elapsed * 5.2) * 0.8 + Math.sin(elapsed * 12.7) * 0.3;
        }
    }

    return { init, update };
})();
