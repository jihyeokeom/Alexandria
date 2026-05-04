// ── Third-Person Camera ───────────────────────────────────────────────────────
const GameCamera = (() => {
    let cam = null;
    let yaw   = Math.PI;   // Horizontal angle (behind player by default)
    let pitch = 0.25;      // Vertical angle

    const PITCH_MIN = -0.15;
    const PITCH_MAX =  1.05;
    const DIST      = 5.5;   // Distance behind character
    const HEIGHT_OFF = 1.6;  // Look-at height

    // Smooth follow
    const camPos   = new THREE.Vector3();
    const camTarget = new THREE.Vector3();
    const lookAt   = new THREE.Vector3();

    function init(camera) {
        cam = camera;
    }

    function update(playerPos, dx, dy) {
        yaw   -= dx;
        pitch += dy;
        pitch  = Math.max(PITCH_MIN, Math.min(PITCH_MAX, pitch));

        const sinY = Math.sin(yaw);
        const cosY = Math.cos(yaw);
        const cosP = Math.cos(pitch);
        const sinP = Math.sin(pitch);

        const tx = playerPos.x - sinY * cosP * DIST;
        const ty = playerPos.y + sinP * DIST + HEIGHT_OFF;
        const tz = playerPos.z - cosY * cosP * DIST;

        // Smooth interpolation (lerp requires a THREE.Vector3)
        camTarget.set(tx, ty, tz);
        camPos.lerp(camTarget, 0.18);
        cam.position.set(camPos.x, camPos.y, camPos.z);

        lookAt.set(playerPos.x, playerPos.y + HEIGHT_OFF * 0.6, playerPos.z);
        cam.lookAt(lookAt);
    }

    function getYaw()   { return yaw; }
    function getPitch() { return pitch; }

    // Forward / right vectors in world XZ (for movement)
    function forward() {
        return { x: Math.sin(yaw), z: Math.cos(yaw) };
    }
    function right() {
        return { x: Math.sin(yaw + Math.PI * 0.5), z: Math.cos(yaw + Math.PI * 0.5) };
    }

    return { init, update, getYaw, getPitch, forward, right };
})();
