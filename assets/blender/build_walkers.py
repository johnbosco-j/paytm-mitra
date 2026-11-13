"""Walking people for the story: the team's Character Creator models with their own skeletons and baked animations.

Run (one character per call):
  Blender -b -P assets/blender/build_walkers.py -- <customer|partner> <out_dir> [filmstrip.png]
  customer <- woman/FBX+File.Fbx   clips: Walk, Idle, Ask (right hand raised as she asks)
  partner  <- man/FBX+FILE.Fbx (blue shirt)   clips: Walk, Idle
Gait: procedural cycle keyed per frame by aiming bones in world space —
  thighs swing ±A, knees bend in the swing phase, feet stay level when planted and toe down in swing,
  arms counter-swing, the hips drop so the planted foot stays on the ground and bob twice per cycle.
Exports a skinned GLB (Draco) with one animation per NLA track; textures ≤ 1024 px JPEG; faces glTF +Z, feet at y = 0.
"""

import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
WHO, OUT = ARGS[0], Path(ARGS[1])
STRIP = ARGS[2] if len(ARGS) > 2 else None
SRC = Path("/Users/ishowbosco/Paytm/new downloaded assets")
FPS, N = 30, 32  # one gait cycle (two steps) = 32 frames ≈ 1.07 s

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
src = SRC / ("woman/FBX+File.Fbx" if WHO == "customer" else "man/FBX+FILE.Fbx")
bpy.ops.import_scene.fbx(filepath=str(src), use_anim=False)
for o in [o for o in scene.objects if o.type == "EMPTY"]:
    bpy.data.objects.remove(o)
arm = next(o for o in scene.objects if o.type == "ARMATURE")
meshes = [o for o in scene.objects if o.type == "MESH"]
bpy.context.view_layer.update()
mw = arm.matrix_world
B = arm.pose.bones

# ---------------------------------------------------------------- skin weights: leaf bones came in as empties
segs = [(b.name, (mw @ b.head_local), (mw @ b.tail_local)) for b in arm.data.bones if b.use_deform]
A0 = np.array([h[:] for _, h, _ in segs])
B0 = np.array([t[:] for _, _, t in segs])
for o in meshes:
    if not any(m.type == "ARMATURE" for m in o.modifiers):
        continue
    idx = {g.index: g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        tot = sum(g.weight for g in v.groups if idx.get(g.group) in arm.data.bones)
        if tot > 0.98:
            continue
        p = np.array((o.matrix_world @ v.co)[:])
        ab = B0 - A0
        t = np.clip(((p - A0) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-9), 0, 1)
        name = segs[int(np.linalg.norm(A0 + ab * t[:, None] - p, axis=1).argmin())][0]
        g = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
        g.add([v.index], 1.0 - tot, "ADD")
    if o.data.shape_keys:  # 69 facial morphs would bloat the GLB; keep the neutral face
        o.shape_key_clear()

# eyes / teeth aren't skinned in the FBX: attach them to the head bone so they follow the rig
for o in meshes:
    if o.parent is None:
        m = o.matrix_world.copy()
        o.parent = arm
        o.parent_type = "BONE"
        o.parent_bone = "CC_Base_Head"
        bpy.context.view_layer.update()
        o.matrix_world = m
bpy.context.view_layer.update()

# ---------------------------------------------------------------- orientation: face Blender -Y (glTF +Z), feet at 0
U = Vector((0, 0, 1))
S = (mw @ B["CC_Base_L_Upperarm"].tail - mw @ B["CC_Base_L_Upperarm"].head).normalized()  # character's left (T-pose)
F = S.cross(U).normalized()
eyes = [o for o in meshes if "eye" in o.name.lower()]
if eyes:
    e = sum((o.matrix_world @ Vector(c) for o in eyes for c in o.bound_box), Vector()) / (8 * len(eyes))
    if (e - mw @ B["CC_Base_Head"].head).dot(F) < 0:
        F = -F
yaw = math.atan2(F.x, -F.y)
dg = bpy.context.evaluated_depsgraph_get()
zs = [(o.matrix_world @ v.co) for o in meshes for v in o.evaluated_get(dg).to_mesh().vertices]
lo = Vector((min(p.x for p in zs), min(p.y for p in zs), min(p.z for p in zs)))
hi = Vector((max(p.x for p in zs), max(p.y for p in zs), max(p.z for p in zs)))
foot = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
arm.matrix_world = Matrix.Rotation(-yaw, 4, "Z") @ Matrix.Translation(-foot) @ arm.matrix_world
bpy.context.view_layer.update()
mw = arm.matrix_world
S, F = Vector((1, 0, 0)), Vector((0, -1, 0))  # after the turn: left = +X? (left x up = forward)
S = (mw @ B["CC_Base_L_Upperarm"].tail - mw @ B["CC_Base_L_Upperarm"].head).normalized()
F = S.cross(U).normalized()


def update():
    bpy.context.view_layer.update()


def reset():
    for pb in B:
        pb.rotation_mode = "QUATERNION"
        pb.rotation_quaternion = (1, 0, 0, 0)
        pb.location = (0, 0, 0)
    update()


def aim(pb, d):
    update()
    w = arm.matrix_world
    head = w @ pb.head
    q = (w @ pb.tail - head).normalized().rotation_difference(Vector(d).normalized())
    pb.matrix = w.inverted() @ (Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ (w @ pb.matrix))
    update()


def roll(pb, deg):
    update()
    w = arm.matrix_world
    head = w @ pb.head
    axis = (w @ pb.tail - head).normalized()
    pb.matrix = w.inverted() @ (Matrix.Translation(head) @ Matrix.Rotation(math.radians(deg), 4, axis) @ Matrix.Translation(-head) @ (w @ pb.matrix))
    update()


def shift_world(pb, v):
    """Translate a bone (and everything under it) by a world-space vector."""
    update()
    w = arm.matrix_world
    pb.matrix = Matrix.Translation(w.inverted().to_3x3() @ v) @ pb.matrix
    update()


reset()
rest_ankle = min((mw @ B["CC_Base_L_Foot"].head).z, (mw @ B["CC_Base_R_Foot"].head).z)
rest_foot_dir = {s: (mw @ B[f"CC_Base_{s}_Foot"].tail - mw @ B[f"CC_Base_{s}_Foot"].head).normalized() for s in "LR"}
side = {"L": S, "R": -S}


def d(s, out, fwd, down):
    return side[s] * out + F * fwd - U * down


def palm_roll(s, want):
    """Search the forearm roll that turns the palm toward `want` (from v2)."""
    fa, hand = B[f"CC_Base_{s}_Forearm"], B[f"CC_Base_{s}_Hand"]
    thumb = B[f"CC_Base_{s}_Thumb1"]
    best, best_d = 0, -9.0
    for deg in range(-180, 180, 15):
        roll(fa, deg)
        w = arm.matrix_world
        along = (w @ hand.tail - w @ hand.head).normalized()
        th = (w @ thumb.head - w @ hand.head).normalized()
        n = along.cross(th) if s == "L" else th.cross(along)
        if n.normalized().dot(want) > best_d:
            best, best_d = deg, n.normalized().dot(want)
        roll(fa, -deg)
    return best


def relaxed_arms(ask=False):
    for s in "LR":
        if ask and s == "R":
            aim(B["CC_Base_R_Upperarm"], d("R", 0.25, 0.3, 1))
            aim(B["CC_Base_R_Forearm"], d("R", 0.1, 0.8, -0.35))
        else:
            aim(B[f"CC_Base_{s}_Upperarm"], d(s, 0.13, 0.04, 1))
            aim(B[f"CC_Base_{s}_Forearm"], d(s, 0.07, 0.2, 1))


ROLL = {}
reset()
relaxed_arms()
for s in "LR":
    ROLL[s] = palm_roll(s, -side[s])  # palms toward the thighs when relaxed
reset()
relaxed_arms(ask=True)
ROLL["R_ask"] = palm_roll("R", F)  # open palm toward the shopkeeper


def key(frame, bones, loc=()):
    for pb in bones:
        pb.keyframe_insert("rotation_quaternion", frame=frame)
    for pb in loc:
        pb.keyframe_insert("location", frame=frame)


ANIM = [B[n] for n in ("CC_Base_Hip", "CC_Base_L_Thigh", "CC_Base_R_Thigh", "CC_Base_L_Calf", "CC_Base_R_Calf", "CC_Base_L_Foot",
                       "CC_Base_R_Foot", "CC_Base_L_Upperarm", "CC_Base_R_Upperarm", "CC_Base_L_Forearm", "CC_Base_R_Forearm",
                       "CC_Base_Spine01", "CC_Base_Head")]
arm.animation_data_create()
clips = []


def new_clip(name):
    act = bpy.data.actions.new(name)
    arm.animation_data.action = act
    clips.append(act)
    return act


def pose_static(name, ask=False):
    new_clip(name)
    for f in (0, 60):
        reset()
        relaxed_arms(ask)
        roll(B["CC_Base_L_Forearm"], ROLL["L"])
        roll(B["CC_Base_R_Forearm"], ROLL["R_ask"] if ask else ROLL["R"])
        if f == 60:  # a slow breath: chest rises a hair
            shift_world(B["CC_Base_Hip"], U * 0.004)
        key(f, ANIM, loc=[B["CC_Base_Hip"]])


AMP = math.radians(22 if WHO == "customer" else 24)
pose_static("Idle")
if WHO == "customer":
    pose_static("Ask", ask=True)

new_clip("Walk")
for f in range(N + 1):
    ph = 2 * math.pi * f / N
    reset()
    for s, off in (("L", 0.0), ("R", math.pi)):
        p = ph + off
        th = AMP * math.sin(p)
        # knee flexion peaks just after the thigh passes vertical on its way forward (early/mid swing), ~45°
        swing = max(0.0, math.cos(p - math.radians(35)))
        bend = math.radians(5) + math.radians(42) * swing ** 2
        aim(B[f"CC_Base_{s}_Thigh"], side[s] * 0.04 - U * math.cos(th) + F * math.sin(th))
        aim(B[f"CC_Base_{s}_Calf"], -U * math.cos(th - bend) + F * math.sin(th - bend))
        toe = math.radians(18) * swing
        aim(B[f"CC_Base_{s}_Foot"], Quaternion(side[s] if s == "L" else -side[s], -toe) @ rest_foot_dir[s])
        # arms swing opposite to the leg on the same side
        a = -0.6 * th
        aim(B[f"CC_Base_{s}_Upperarm"], side[s] * 0.12 - U * math.cos(a) + F * math.sin(a))
        aim(B[f"CC_Base_{s}_Forearm"], side[s] * 0.06 - U * math.cos(a + 0.35) + F * math.sin(a + 0.35))
        roll(B[f"CC_Base_{s}_Forearm"], ROLL[s])
    # keep the planted foot on the ground, then add the double bob of a real gait
    update()
    w = arm.matrix_world
    ankle = min((w @ B["CC_Base_L_Foot"].head).z, (w @ B["CC_Base_R_Foot"].head).z)
    shift_world(B["CC_Base_Hip"], U * (rest_ankle - ankle + 0.012 * math.cos(2 * ph) - 0.012))
    key(f, ANIM, loc=[B["CC_Base_Hip"]])
for act in clips:
    for fc in getattr(act, "fcurves", []):
        for kp in fc.keyframe_points:
            kp.interpolation = "LINEAR" if act.name == "Walk" else "BEZIER"

# one NLA track per clip -> one glTF animation per clip
arm.animation_data.action = None
for act in clips:
    tr = arm.animation_data.nla_tracks.new()
    tr.name = act.name
    tr.strips.new(act.name, 0, act)

# ---------------------------------------------------------------- looks (same as build_people_v2.py)
SKIN = {"customer": (0.70, 0.56, 0.47), "partner": (0.62, 0.50, 0.42)}[WHO]


def tint(img, mul, desat=0.35):
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    g = px[:, :3].mean(1, keepdims=True)
    px[:, :3] = (px[:, :3] * (1 - desat) + g * desat) * np.array(mul, dtype=np.float32)
    img.pixels.foreach_set(px.ravel())
    img.update()


def iris(img):
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = px[:, :3]
    m = ((rgb.max(1) - rgb.min(1)) > 0.08) & (rgb.max(1) < 0.92)
    rgb[m] = rgb[m].mean(1, keepdims=True) * np.array((1.25, 0.8, 0.5), dtype=np.float32) * 0.7
    img.pixels.foreach_set(px.ravel())
    img.update()


done = set()
for o in meshes:
    for sl in o.material_slots:
        m = sl.material
        if not (m and m.node_tree):
            continue
        name = m.name.lower()
        for n in m.node_tree.nodes:
            if n.type != "TEX_IMAGE" or not n.image or n.image.name in done or "diffuse" not in n.image.name.lower():
                continue
            img = n.image
            if ("std_eye" in name or "cornea" in name) and "lash" not in name:
                iris(img)
            elif "skin" in name or "nails" in name:
                tint(img, SKIN)
            elif any(k in name for k in ("hair", "scalp")):
                tint(img, (0.12, 0.1, 0.09), 0)
            elif WHO == "partner" and "shirt" in name:
                tint(img, (0.35, 0.5, 0.8))
            else:
                continue
            done.add(img.name)
for img in bpy.data.images:
    n = img.name.lower()
    cap = 1024 if ("head" in n and "diffuse" in n) else 512 if ("diffuse" in n or "normal" in n) else 256
    if img.size[0] > cap:
        img.scale(cap, max(1, int(cap * img.size[1] / img.size[0])))

# ---------------------------------------------------------------- export
for o in scene.objects:
    o.select_set(o is arm or o in meshes)
bpy.context.view_layer.objects.active = arm
OUT.mkdir(parents=True, exist_ok=True)
name = {"customer": "customer_walk", "partner": "partner_walk"}[WHO]
bpy.ops.export_scene.gltf(filepath=str(OUT / f"{name}.glb"), export_format="GLB", use_selection=True, export_yup=True,
                          export_skins=True, export_animations=True, export_animation_mode="NLA_TRACKS", export_def_bones=True,
                          export_force_sampling=True, export_frame_step=1, export_image_format="JPEG", export_image_quality=82,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print("EXPORTED", name, "clips", [a.name for a in clips])

if STRIP:  # side-view filmstrip of the walk to check the gait
    arm.animation_data.action = bpy.data.actions["Walk"]
    for tr in arm.animation_data.nla_tracks:
        tr.mute = True
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = 2.1
    cam.location = (4, 0, 0.95)
    cam.rotation_euler = (math.radians(90), 0, math.radians(90))
    L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN"))
    L.rotation_euler = (0.8, 0, 1.2)
    L.data.energy = 3
    scene.collection.objects.link(L)
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.55, 0.58, 0.62)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 300, 560
    for i, f in enumerate((0, 4, 8, 12, 16, 20, 24, 28)):
        scene.frame_set(f)
        scene.render.filepath = f"{STRIP}_{i}.png"
        bpy.ops.render.render(write_still=True)
