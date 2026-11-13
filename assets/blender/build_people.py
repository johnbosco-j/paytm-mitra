"""Realistic, dressed, posed people for the MITRA story, built in Blender from Blender Studio's CC0 Human Base Meshes.

Run: Blender -b assets/blender/vendor/hbm/human-base-meshes-bundle-v1.4.1/human_base_meshes_bundle.blend \
       -P assets/blender/build_people.py -- apps/web/public/models
Outputs murugan.glb (shopkeeper: shirt + veshti, hands on the counter), customer.glb (woman: blouse + sari with pallu,
right hand raised as she asks) and passerby.glb. Bodies: CC0 Blender Studio; clothing, rig, poses and materials: ours.
"""

import math
import sys

import bmesh
import bpy
from mathutils import Euler, Matrix, Vector

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "."


def material(name, rgb, rough=0.6, sss=0.0, sheen=0.0, metal=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss and "Subsurface Weight" in b.inputs:
        b.inputs["Subsurface Weight"].default_value = sss
        b.inputs["Subsurface Radius"].default_value = (1.0, 0.35, 0.2)
    if sheen and "Sheen Weight" in b.inputs:
        b.inputs["Sheen Weight"].default_value = sheen
    return m


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i : i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def prepare_body(src_name, new_name, skin_hex):
    """Copy a base body, bake one multires level for facial detail, centre it at the origin."""
    src = bpy.data.objects[src_name]
    ob = src.copy()
    ob.data = src.data.copy()
    ob.name = new_name
    bpy.context.scene.collection.objects.link(ob)
    for o in bpy.context.selected_objects:
        o.select_set(False)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    for m in list(ob.modifiers):
        if m.type == "MULTIRES":
            m.levels = 1
            bpy.ops.object.modifier_apply(modifier=m.name)
    ob.location.x = 0
    bpy.context.view_layer.update()
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)  # matrix_world = identity
    bpy.context.view_layer.update()
    ob.data.materials.clear()
    ob.data.materials.append(material(f"Skin_{new_name}", srgb(skin_hex), rough=0.48, sss=0.12))
    # keep the eyes (children of the source body)
    eyes = []
    for child in [c for c in src.children if c.type == "MESH" and "eye" in c.name.lower()]:
        e = child.copy()
        e.data = child.data.copy()
        bpy.context.scene.collection.objects.link(e)
        e.parent = None
        e.matrix_world = Matrix.Translation(Vector((-src.location.x, 0, 0))) @ child.matrix_world
        e.data.materials.clear()
        e.data.materials.append(material("Eye", srgb("#1b120d"), rough=0.08))
        eyes.append(e)
    return ob, eyes


def joints(ob):
    """Estimate shoulder/elbow/wrist from the A-posed mesh (body faces -Y, Z-up)."""
    vs = [ob.matrix_world @ v.co for v in ob.data.vertices]
    h = max(v.z for v in vs)
    s = h / 1.684  # proportions measured on the male base mesh
    j = {}
    for side, sx in (("L", 1), ("R", -1)):
        j[side] = {
            "shoulder": Vector((sx * 0.17 * s, -0.01, 1.405 * s)),
            "elbow": Vector((sx * 0.305 * s, 0.0, 1.13 * s)),
            "wrist": Vector((sx * 0.405 * s, -0.01, 0.87 * s)),
            "hand": Vector((sx * 0.44 * s, -0.02, 0.76 * s)),
        }
    return j, h



def _smooth(e0, e1, x):
    t = max(0.0, min(1.0, (x - e0) / (e1 - e0)))
    return t * t * (3 - 2 * t)


ARM: dict = {}


def pose_arms(ob, j, h, sides):
    """Bend the A-posed arms directly: sides = {"L"/"R": (down_deg, forward_deg, elbow_deg)}.
    Weights ramp in at the armpit and fade at the shoulder top, so the skin does not tear."""
    s = h / 1.684
    me = ob.data
    ARM[ob.name] = {}
    for v in me.vertices:
        p = ob.matrix_world @ v.co
        side = "L" if p.x > 0 else "R"
        if side not in sides or not (0.66 * s < p.z < 1.47 * s):
            continue
        dx = abs(p.x)
        inner = (0.215 - max(0.0, p.z - 1.28 * s) * 0.25) * s
        w = _smooth(inner, inner + 0.03 * s, dx) * (1 - _smooth(1.36 * s, 1.47 * s, p.z))
        if w <= 0:
            continue
        down, fwd, elbow = sides[side]
        ARM[ob.name][v.index] = (w, (p - j[side]["shoulder"]).dot(j[side]["wrist"] - j[side]["shoulder"]) / (j[side]["wrist"] - j[side]["shoulder"]).length_squared)
        sgn = 1 if side == "L" else -1
        sh, el, wr = j[side]["shoulder"], j[side]["elbow"], j[side]["wrist"]
        # 1) elbow bend (in rest pose), weighted by position along the arm past the elbow
        arm = wr - sh
        t = (p - sh).dot(arm) / arm.length_squared
        we = _smooth(0.45, 0.62, t)
        q = p.copy()
        if elbow and we > 0:
            r = Matrix.Rotation(math.radians(-elbow * we), 4, "X")
            q = el + (r @ (q - el))
        # 2) shoulder: swing down (about Y) then forward (about X)
        r = Matrix.Rotation(math.radians(-fwd * w), 4, "X") @ Matrix.Rotation(math.radians(sgn * down * w), 4, "Y")
        q = sh + (r @ (q - sh))
        v.co = ob.matrix_world.inverted() @ q
    me.update()

def sleeve(body, max_t):
    """keep-filter helper: drop arm vertices beyond `max_t` along the arm (0 shoulder .. 1 wrist); max_t<0 drops the whole arm."""
    arm = ARM.get(body.name, {})
    return lambda idx: not (idx in arm and arm[idx][0] > 0.35 and (max_t < 0 or arm[idx][1] > max_t))


def shell(body, name, keep, push, mat, thick=0.004, smooth=1, sleeve_t=-1.0):
    """Clothing shell: a copy of the posed body limited to `keep(p)` vertices, pushed out along normals."""
    ob = body.copy()
    ob.data = body.data.copy()
    ob.name = name
    bpy.context.scene.collection.objects.link(ob)
    ob.vertex_groups.clear()
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    ok_arm = sleeve(body, sleeve_t)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not (keep(v.co) and ok_arm(v.index))], context="VERTS")
    bm.normal_update()
    for v in bm.verts:
        v.co += v.normal * push
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.materials.clear()
    ob.data.materials.append(mat)
    s = ob.modifiers.new("solid", "SOLIDIFY")
    s.thickness = thick
    if smooth:
        sm = ob.modifiers.new("smooth", "SMOOTH")
        sm.factor, sm.iterations = 0.6, smooth
    return ob


def skirt(name, waist_z, waist_r, hem_r, hem_z, mats, border=0.06, depth_scale=0.72, flare_front=0.0):
    """Lathed wrap skirt (veshti / sari) with a border band as a second material."""
    rings = 18
    seg = 48
    bm = bmesh.new()
    verts = []
    for i in range(rings + 1):
        t = i / rings
        z = waist_z + (hem_z - waist_z) * t
        r = waist_r + (hem_r - waist_r) * (t ** 0.8)
        ring = []
        for k in range(seg):
            a = 2 * math.pi * k / seg
            x, y = math.cos(a) * r, math.sin(a) * r * depth_scale
            # gentle folds
            fold = 1 + 0.025 * math.sin(a * 9) * t
            ring.append(bm.verts.new((x * fold, y * fold - flare_front * t * max(0, -math.sin(a)), z)))
        verts.append(ring)
    for i in range(rings):
        for k in range(seg):
            f = bm.faces.new((verts[i][k], verts[i][(k + 1) % seg], verts[i + 1][(k + 1) % seg], verts[i + 1][k]))
            f.material_index = 1 if (i / rings) > 1 - border * 3 else 0
            f.smooth = True
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    for m in mats:
        me.materials.append(m)
    ob.modifiers.new("solid", "SOLIDIFY").thickness = 0.005
    return ob


def hair(body, name, top_z, back_drop, mat, push=0.02):
    def keep(p):
        if p.z > top_z:
            return True
        return p.z > top_z - back_drop and p.y > 0.0  # back of the head
    return shell(body, name, keep, push, mat, thick=0.012, smooth=3)


def export(objs, path):
    for o in bpy.context.selected_objects:
        o.select_set(False)
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                              export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
    print("exported", path)


# ---------------------------------------------------------------- Murugan (shopkeeper)
m_body, m_eyes = prepare_body("GEO-body_male_realistic", "Murugan", "#7a4a30")
mj, mh = joints(m_body)
# arms down, hands forward resting on the counter
pose_arms(m_body, mj, mh, {"L": (20, 28, 62), "R": (20, 28, 62)})
shirt = shell(m_body, "Murugan_shirt", lambda p: 0.93 < p.z < 1.46, 0.012,
              material("Cotton_cream", srgb("#efe9dc"), rough=0.85, sheen=0.4), sleeve_t=0.42)
veshti = skirt("Murugan_veshti", 0.98, 0.215, 0.25, 0.04, [material("Veshti", srgb("#f6f3ea"), rough=0.9, sheen=0.3),
                                                           material("Veshti_border", srgb("#c8a24a"), rough=0.5, metal=0.4)], border=0.05)
m_hair = hair(m_body, "Murugan_hair", 1.6, 0.06, material("Hair_black", srgb("#14100e"), rough=0.55))
export([m_body, *m_eyes, shirt, veshti, m_hair], f"{OUT}/murugan.glb")

# ---------------------------------------------------------------- Customer (woman in a sari)
c_body, c_eyes = prepare_body("GEO-body_female_realistic", "Customer", "#8a5a3c")
cj, ch = joints(c_body)
# left arm relaxed at her side, right hand raised as she asks
pose_arms(c_body, cj, ch, {"L": (12, 6, 10), "R": (12, 18, 95)})
blouse = shell(c_body, "Customer_blouse", lambda p: 1.12 < p.z < 1.42, 0.006,
               material("Blouse", srgb("#1f6f73"), rough=0.7, sheen=0.5), sleeve_t=0.25)
sari_mats = [material("Sari", srgb("#8e1b3a"), rough=0.6, sheen=0.6), material("Sari_border", srgb("#d4a537"), rough=0.4, metal=0.5)]
sari = skirt("Customer_sari", 1.0, 0.19, 0.27, 0.02, sari_mats, border=0.06, depth_scale=0.82)
# pallu: a diagonal band of the torso from the right hip over the left shoulder
pallu = shell(c_body, "Customer_pallu", lambda p: 0.95 < p.z < 1.45 and abs((p.z - 1.0) - 0.9 * (p.x + 0.12)) < 0.07 and abs(p.x) < 0.22,
              0.014, sari_mats[0], thick=0.004, smooth=2, sleeve_t=-1)
c_hair = hair(c_body, "Customer_hair", 1.52, 0.34, material("Hair_black_f", srgb("#120d0b"), rough=0.5), push=0.014)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.055, location=(0, 0.09, 1.5))
bun = bpy.context.object
bun.name = "Customer_bun"
bun.data.materials.append(bpy.data.materials["Hair_black_f"])
bpy.ops.object.shade_smooth()
# jasmine flowers in the hair
bpy.ops.mesh.primitive_torus_add(major_radius=0.06, minor_radius=0.012, location=(0, 0.1, 1.5), rotation=(math.radians(80), 0, 0))
jasmine = bpy.context.object
jasmine.name = "Customer_jasmine"
jasmine.data.materials.append(material("Jasmine", srgb("#fbfbf2"), rough=0.7))
export([c_body, *c_eyes, blouse, sari, pallu, c_hair, bun, jasmine], f"{OUT}/customer.glb")

# ---------------------------------------------------------------- Passer-by
p_body, p_eyes = prepare_body("GEO-body_male_realistic", "Passerby", "#6e4229")
pj, ph = joints(p_body)
pose_arms(p_body, pj, ph, {"L": (22, 10, 12), "R": (22, -8, 8)})
tshirt = shell(p_body, "Passerby_shirt", lambda p: 0.95 < p.z < 1.46, 0.011,
               material("Shirt_blue", srgb("#2c4a7a"), rough=0.85, sheen=0.3), sleeve_t=0.38)
pants = shell(p_body, "Passerby_pants", lambda p: 0.06 < p.z < 1.0, 0.009, material("Trousers", srgb("#2b2b2e"), rough=0.9))
p_hair = hair(p_body, "Passerby_hair", 1.6, 0.06, bpy.data.materials["Hair_black"])
export([p_body, *p_eyes, tshirt, pants, p_hair], f"{OUT}/passerby.glb")
