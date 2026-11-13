"""Naren Stores, built from the team's downloaded "Coffee Bar 3D" café: the back half of the café (counter, coffee
machines, billing PC, back wall with menu boards, ceiling) becomes a clean, open-front Chennai store.

Run: Blender -b assets/blender/vendor/dl/coffee_lite.blend -P assets/blender/build_store.py -- apps/web/public/models [preview.png]
Edits for the story:
  * cut the building just in front of the counter (café x = -18.53), so the counter faces the street like a kirana;
    the open cut is covered in three.js by a plaster facade with the Tamil signboard (components/three/Kirana.tsx)
  * café boards re-skinned as Naren Stores boards (assets/blender/store_boards/make_boards.cjs): price list,
    filter coffee, UPI board, the "COFFEE HOUSE" banner -> "நரேன் ஸ்டோர்ஸ்", the poster -> neighbourhood store
  * drops seating, plants, food props, the coffee machines + PC (they blocked the close-ups) and the untextured
    scanned people
  * frame: café +X (front) -> three.js +Z, café y -> three.js x (counter centred on x = 0), floor at y = 0.16 (footpath
    height), cut plane at z = 0; counter front at z = -0.35, back at z = -1.38, back wall inner face at z = -2.47
"""

import math
import re
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
OUT = Path(ARGS[0])
PREVIEW = ARGS[1] if len(ARGS) > 1 else None
BOARDS = Path(__file__).parent / "store_boards"
CUT_X, CENTRE_Y, FLOOR = -18.53, 0.26, 0.16
scene = bpy.context.scene

DROP = re.compile(r"Elm|Alder|Tree|Thuja|Ligustrum|Asparagus|Succulent|Sansevieria|Potted|Planter|Ficus|Plant|Grass|Everett|Diane|Kavon|"
                  r"Johnny|Jada|Louise|Cheesecake|Muffin|Cake|Banana|Breakfast|Candy|Chocolate|Cup|Tea Cup|Bowls|Vase|Pedestal|Mountain|"
                  r"Coffee Machine|Computer", re.I)  # machines + PC would block the fridge and soundbox close-ups

# 1) re-skin the café boards
for img in list(bpy.data.images):
    name = Path(img.filepath.replace("\\", "/")).name if img.filepath else ""
    if name and (BOARDS / name).exists():
        new = bpy.data.images.load(str(BOARDS / name))
        img.user_remap(new)  # the café images are packed in the .blend, so swap the datablock, not the path
        print("board", name)

# 2) drop what doesn't belong in a kirana, and everything in front of the cut
for o in list(scene.objects):
    if o.type in ("CAMERA", "LIGHT", "EMPTY"):
        bpy.data.objects.remove(o)
        continue
    if o.type != "MESH":
        continue
    lo_x = min((o.matrix_world @ Vector(c)).x for c in o.bound_box)
    hi_x = max((o.matrix_world @ Vector(c)).x for c in o.bound_box)
    lo_z = min((o.matrix_world @ Vector(c)).z for c in o.bound_box)
    if DROP.search(o.name) or o.name in ("Box097", "Box098") or lo_x > CUT_X or hi_x < -23 or lo_z < -0.5:
        bpy.data.objects.remove(o)

meshes = [o for o in scene.objects if o.type == "MESH"]
for o in meshes:
    o.data = o.data.copy()  # instanced meshes: make single-user before editing
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

# 3) slice walls/ceiling/roof that cross the cut plane; keep the inside (x < CUT_X)
for o in meshes:
    xs = [v.co.x for v in o.data.vertices]
    if not xs or max(xs) <= CUT_X:
        continue
    bm = bmesh.new()
    bm.from_mesh(o.data)
    geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
    bmesh.ops.bisect_plane(bm, geom=geom, plane_co=(CUT_X, 0, 0), plane_no=(1, 0, 0), clear_outer=True)
    bm.to_mesh(o.data)
    bm.free()
meshes = [o for o in scene.objects if o.type == "MESH"]
for o in list(meshes):
    if len(o.data.vertices) == 0:
        bpy.data.objects.remove(o)
meshes = [o for o in scene.objects if o.type == "MESH"]

# 4) decimate heavy props (coffee machines, PC) — the walls are already simple
for o in meshes:
    n = len(o.data.polygons)
    if n > 1200:
        d = o.modifiers.new("dec", "DECIMATE")
        d.ratio = max(0.08, 1200 / n)
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.convert(target="MESH")

# 5) into the story frame: café +X -> Blender -Y (three.js +Z); café y -> x; cut at z = 0; floor at 0.16
M = Matrix.Translation((0, 0, FLOOR)) @ Matrix.Rotation(math.radians(-90), 4, "Z") @ Matrix.Translation((-CUT_X, -CENTRE_Y, 0))
for o in meshes:
    o.matrix_world = M @ o.matrix_world
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

for img in bpy.data.images:
    if img.size[0] > 1024:
        img.scale(1024, max(1, int(1024 * img.size[1] / img.size[0])))

tris = sum(len(p.vertices) - 2 for o in meshes for p in o.data.polygons)
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "store.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="JPEG", export_image_quality=85,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
lo = Vector((min(v.co[i] for o in meshes for v in o.data.vertices) for i in range(3)))
hi = Vector((max(v.co[i] for o in meshes for v in o.data.vertices) for i in range(3)))
print("EXPORTED store.glb objects", len(meshes), "tris", tris, "bounds", [round(x, 2) for x in lo], [round(x, 2) for x in hi])

if PREVIEW:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = (1.5, -5.5, 1.9)  # Blender (x, -z_three, y_three)
    cam.rotation_euler = (Vector((0, 1.2, 1.3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 22
    for loc in ((0, 1.5, 3.2), (-2.5, 1.8, 3.0), (2.5, 1.8, 3.0)):
        L = bpy.data.objects.new("L", bpy.data.lights.new("L", "POINT"))
        L.data.energy = 250
        L.location = loc
        scene.collection.objects.link(L)
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.55, 0.58, 0.65)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 1100, 650
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
