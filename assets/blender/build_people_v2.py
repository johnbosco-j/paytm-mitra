"""Story people v2: the team's downloaded Character Creator / MakeHuman models, posed with their own skeletons.

Run (one character per call, so memory stays low):
  Blender -b -P assets/blender/build_people_v2.py -- <character> <out_dir> [preview.png]
  character: murugan | customer | passerby

Sources (local only, never committed: assets/blender/vendor and "new downloaded assets/"):
  murugan  <- man/FBX+FILE.Fbx (CC rig, open-collar shirt + slacks)
  customer <- woman/FBX+File.Fbx (CC rig, top + cargo pants)
  passerby <- man/FBX+FILE.Fbx again, shirt recoloured, walking pose
Steps: import -> pose arms by aiming bones in world space, palms by forearm roll -> bake pose -> warm skin tone ->
textures down to 1024 px JPEG -> Draco GLB, feet at origin, facing +Z (glTF forward).
"""

import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
WHO, OUT = ARGS[0], Path(ARGS[1])
PREVIEW = ARGS[2] if len(ARGS) > 2 else None
SRC = Path("/Users/ishowbosco/Paytm/new downloaded assets")
VENDOR = Path(__file__).parent / "vendor" / "dl"


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def material(name, hexcol, rough=0.7, metal=0.0, sheen=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(hexcol), 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sheen and "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = sheen
    return m


# ----------------------------------------------------------------------------- import
bpy.ops.wm.read_factory_settings(use_empty=True)
if WHO == "murugan":
    bpy.ops.import_scene.fbx(filepath=str(SRC / "man" / "FBX+FILE.Fbx"), use_anim=False)
elif WHO == "customer":
    bpy.ops.import_scene.fbx(filepath=str(SRC / "woman" / "FBX+File.Fbx"), use_anim=False)
else:  # passer-by: the CC man again, different shirt colour, walking pose (the MakeHuman GLB tore at the shoulders when posed)
    bpy.ops.import_scene.fbx(filepath=str(SRC / "man" / "FBX+FILE.Fbx"), use_anim=False)

scene = bpy.context.scene
for o in [o for o in scene.objects if o.type == "EMPTY"]:
    bpy.data.objects.remove(o)
arm = next(o for o in scene.objects if o.type == "ARMATURE")
meshes = [o for o in scene.objects if o.type == "MESH"]
if WHO == "passerby":  # the GLB ships a low-poly proxy body alongside the real one
    for o in [o for o in meshes if "low_poly" in o.name]:
        bpy.data.objects.remove(o)
    meshes = [o for o in scene.objects if o.type == "MESH"]
bpy.context.view_layer.update()


def bone(*cands):
    for c in cands:
        for b in arm.pose.bones:
            if b.name.lower() == c.lower():
                return b
    raise KeyError(cands)


def aim(pb, direction):
    """Rotate a pose bone (in world space, about its head) so it points along `direction`."""
    bpy.context.view_layer.update()
    mw = arm.matrix_world
    head = mw @ pb.head
    cur = (mw @ pb.tail - head).normalized()
    q = cur.rotation_difference(Vector(direction).normalized())
    world = mw @ pb.matrix
    new = Matrix.Translation(head) @ q.to_matrix().to_4x4() @ Matrix.Translation(-head) @ world
    pb.matrix = mw.inverted() @ new
    bpy.context.view_layer.update()


# which way does the character face? eyes are in front of the head centre
bpy.context.view_layer.update()
head_b = bone("CC_Base_Head", "head")
neck_b = bone("CC_Base_NeckTwist01", "neck01", "neck")
lua = bone("CC_Base_L_Upperarm", "upperarm01_L", "upperarm01.L")
lfa = bone("CC_Base_L_Forearm", "lowerarm01_L", "lowerarm01.L")
rua = bone("CC_Base_R_Upperarm", "upperarm01_R", "upperarm01.R")
rfa = bone("CC_Base_R_Forearm", "lowerarm01_R", "lowerarm01.R")
mw = arm.matrix_world
side_l = (mw @ lua.tail - mw @ lua.head).normalized()  # T-pose: left arm points to character's left
up = Vector((0, 0, 1))
fwd = side_l.cross(up).normalized()  # left x up = forward for a right-handed, Z-up world
# sanity: forward should point away from the back of the head; flip if the eyes say otherwise
eyes = [o for o in meshes if "eye" in o.name.lower() and "brow" not in o.name.lower() and "lash" not in o.name.lower()]
if eyes:
    e = sum((o.matrix_world @ Vector(c) for o in eyes for c in o.bound_box), Vector()) / (8 * len(eyes))
    if (e - (mw @ head_b.head)).dot(fwd) < 0:
        fwd = -fwd
side_r = -side_l


def d(side, out, forward, down):
    return side * out + fwd * forward - up * down


POSES = {
    # hands resting forward on the counter
    "murugan": [(lua, d(side_l, 0.22, 0.38, 1)), (lfa, d(side_l, 0.1, 1, 0.1)), (rua, d(side_r, 0.22, 0.38, 1)), (rfa, d(side_r, 0.1, 1, 0.1))],
    # left arm relaxed, right hand raised a little as she asks
    "customer": [(lua, d(side_l, 0.18, 0.05, 1)), (lfa, d(side_l, 0.08, 0.2, 1)), (rua, d(side_r, 0.25, 0.3, 1)), (rfa, d(side_r, 0.1, 0.8, -0.35))],
    # walking past, arms easy
    "passerby": [(lua, d(side_l, 0.12, 0.12, 1)), (lfa, d(side_l, 0.05, 0.35, 1)), (rua, d(side_r, 0.12, -0.1, 1)), (rfa, d(side_r, 0.05, 0.2, 1))],
}
# Leaf bones (fingertips, toes, eyes) come in as empties, so vertices skinned to them would be left behind when a
# hand moves. Give every under-weighted vertex the rest of its weight on the nearest real deform bone.
segs = [(b.name, (mw @ b.head_local), (mw @ b.tail_local)) for b in arm.data.bones if b.use_deform]
A = np.array([h[:] for _, h, _ in segs]); B = np.array([t[:] for _, _, t in segs])
for o in meshes:
    if not any(m.type == "ARMATURE" for m in o.modifiers):
        continue
    idx = {g.index: g.name for g in o.vertex_groups}
    for v in o.data.vertices:
        tot = sum(g.weight for g in v.groups if idx.get(g.group) in arm.data.bones)
        if tot > 0.98:
            continue
        p = np.array((o.matrix_world @ v.co)[:])
        ab = B - A
        t = np.clip(((p - A) * ab).sum(1) / np.maximum((ab * ab).sum(1), 1e-9), 0, 1)
        dist = np.linalg.norm(A + ab * t[:, None] - p, axis=1)
        name = segs[int(dist.argmin())][0]
        g = o.vertex_groups.get(name) or o.vertex_groups.new(name=name)
        g.add([v.index], 1.0 - tot, "ADD")

def roll(pb, degrees):
    """Twist a bone about its own length (e.g. forearm pronation), in world space."""
    bpy.context.view_layer.update()
    mw_ = arm.matrix_world
    head = mw_ @ pb.head
    axis = (mw_ @ pb.tail - head).normalized()
    R = Matrix.Rotation(math.radians(degrees), 4, axis)
    pb.matrix = mw_.inverted() @ (Matrix.Translation(head) @ R @ Matrix.Translation(-head) @ (mw_ @ pb.matrix))
    bpy.context.view_layer.update()


def palm_normal(hand_pb):
    """World-space direction the palm faces, from the hand bone and the thumb side."""
    bpy.context.view_layer.update()
    mw_ = arm.matrix_world
    h = mw_ @ hand_pb.head
    along = (mw_ @ hand_pb.tail - h).normalized()
    thumb = next((b for b in hand_pb.children_recursive if "thumb" in b.name.lower() or b.name.lower().startswith("finger1-1")), None)
    side = ((mw_ @ thumb.head) - h).normalized() if thumb else Vector((0, 0, 1))
    return along, side


for pb, direction in POSES[WHO]:
    aim(pb, direction)

# Palms: turn each forearm until the palm faces the wanted way (down on the counter for Murugan, inward when relaxed).
for side_name, fa in (("L", lfa), ("R", rfa)):
    try:
        hand = bone(f"CC_Base_{side_name}_Hand", f"wrist_{side_name}", f"wrist.{side_name}")
    except KeyError:
        continue
    want = -up if WHO == "murugan" else (-(side_l if side_name == "L" else side_r))
    if WHO == "customer" and side_name == "R":
        want = fwd  # open palm toward the shopkeeper as she asks
    best, best_d = 0, -9.0
    for deg in range(-180, 180, 15):
        roll(fa, deg)
        along, thumb_dir = palm_normal(hand)
        # palm normal = along x thumb (left hand) or thumb x along (right hand)
        n = along.cross(thumb_dir) if side_name == "L" else thumb_dir.cross(along)
        d_ = n.normalized().dot(want)
        if d_ > best_d:
            best, best_d = deg, d_
        roll(fa, -deg)
    roll(fa, best)
    print("PALM", side_name, best, round(best_d, 2))
if WHO == "customer":  # a slight head turn toward the shopkeeper
    head_b.rotation_mode = "XYZ"

# ----------------------------------------------------------------------------- bake pose into the meshes
dg = bpy.context.evaluated_depsgraph_get()
for o in meshes:
    baked = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    mat = o.matrix_world.copy()
    if o.data.shape_keys:
        o.shape_key_clear()
    o.modifiers.clear()
    o.data = baked
    o.parent = None
    o.matrix_world = mat
bpy.data.objects.remove(arm)
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# feet at origin, facing glTF +Z (Blender -Y): rotate so `fwd` -> -Y
yaw = math.atan2(fwd.x, -fwd.y)
lo = Vector((min(v[0] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box]),
             min(v[1] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box]),
             min(v[2] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box])))
hi = Vector((max(v[0] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box]),
             max(v[1] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box]),
             max(v[2] for o in meshes for v in [o.matrix_world @ Vector(c) for c in o.bound_box])))
foot = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
for o in meshes:
    o.matrix_world = Matrix.Rotation(-yaw, 4, "Z") @ Matrix.Translation(-foot) @ o.matrix_world
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
height = hi.z - lo.z
target_h = {"murugan": 1.68, "customer": 1.58, "passerby": 1.72}[WHO]
if abs(height - target_h) > 0.05:
    for o in meshes:
        o.scale = (target_h / height,) * 3
    bpy.ops.object.transform_apply(scale=True)

# ----------------------------------------------------------------------------- look: skin tone, clothes, textures
SKIN = {"murugan": (0.66, 0.53, 0.45), "customer": (0.70, 0.56, 0.47), "passerby": (0.66, 0.53, 0.45)}[WHO]


def tint(img, mul):
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    grey = px[:, :3].mean(1, keepdims=True)
    px[:, :3] = (px[:, :3] * 0.65 + grey * 0.35) * np.array(mul, dtype=np.float32)  # tame the pink base before warming
    img.pixels.foreach_set(px.ravel())
    img.update()


def tint_iris(img):
    """Recolour only the coloured iris pixels to dark brown; keep the white sclera and highlights."""
    px = np.empty(len(img.pixels), dtype=np.float32)
    img.pixels.foreach_get(px)
    px = px.reshape(-1, 4)
    rgb = px[:, :3]
    sat = rgb.max(1) - rgb.min(1)
    mask = (sat > 0.08) & (rgb.max(1) < 0.92)
    lum = rgb[mask].mean(1, keepdims=True)
    rgb[mask] = lum * np.array((1.25, 0.8, 0.5), dtype=np.float32) * 0.7
    img.pixels.foreach_set(px.ravel())
    img.update()


def base_image(m):
    if not (m and m.node_tree):
        return None
    b = m.node_tree.nodes.get("Principled BSDF")
    if not b or not b.inputs["Base Color"].is_linked:
        return None
    n = b.inputs["Base Color"].links[0].from_node
    return n.image if n.type == "TEX_IMAGE" else None


done = set()
for o in meshes:
    for s in o.material_slots:
        m = s.material
        img = base_image(m)
        name = (m.name if m else "").lower()
        if img and img.name not in done and any(k in name for k in ("skin", "base", "body", "middleage", "nails")) and "eye" not in name:
            tint(img, SKIN)
            done.add(img.name)
        if ("std_eye" in name or "cornea" in name or name.startswith("eye")) and "lash" not in name and m and m.node_tree:
            for n in m.node_tree.nodes:
                if n.type == "TEX_IMAGE" and n.image and "diffuse" in n.image.name.lower() and n.image.name not in done:
                    tint_iris(n.image)
                    done.add(n.image.name)
        if img and img.name not in done and any(k in name for k in ("hair", "scalp", "eyebrow", "short04")):
            tint(img, (0.12, 0.1, 0.09))
            done.add(img.name)

if WHO == "passerby":  # same model as Murugan in the far background, so give him a blue checked-shirt tone
    for o in meshes:
        for sl in o.material_slots:
            img = base_image(sl.material)
            if img and img.name not in done and "shirt" in (sl.material.name or "").lower():
                tint(img, (0.35, 0.5, 0.8))
                done.add(img.name)

extra = []  # everyone keeps their own western clothes

# shrink every texture to <= 1024 px so the GLB stays light
for img in bpy.data.images:
    n = img.name.lower()
    cap = 1024 if ("head" in n and "diffuse" in n) else 512 if ("diffuse" in n or "normal" in n) else 256
    if img.size[0] > cap:
        img.scale(cap, max(1, int(cap * img.size[1] / img.size[0])))

# ----------------------------------------------------------------------------- export
objs = meshes + extra
for o in scene.objects:
    o.select_set(o in objs)
bpy.context.view_layer.objects.active = objs[0]
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT / f"{WHO}.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="JPEG", export_image_quality=82,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print("EXPORTED", OUT / f"{WHO}.glb", "tris", sum(len(o.data.polygons) for o in objs))
hand_z = [(o.matrix_world @ v.co).z for o in objs if "body" in o.name.lower() for v in o.data.vertices if abs((o.matrix_world @ v.co).x) > 0.12]
print("HANDS lowest-arm z", round(min(hand_z), 3) if hand_z else None)

if PREVIEW:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = (0.9, -2.6, 1.25)
    cam.rotation_euler = (math.radians(84), 0, math.radians(19))
    cam.data.lens = 45
    for rot, en in (((0.9, 0, 0.5), 3.0), ((1.2, 0, -2.2), 1.2)):
        L = bpy.data.objects.new("L", bpy.data.lights.new("L", "SUN"))
        L.rotation_euler = rot
        L.data.energy = en
        scene.collection.objects.link(L)
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.5, 0.52, 0.56)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 640, 800
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
