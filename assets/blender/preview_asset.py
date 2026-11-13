"""Render a quick preview of a 3D asset (blend / glb / fbx / obj) to judge it before use.

Usage: Blender -b [file.blend] --python preview_asset.py -- <out.png> [import_file] [view: front|three_quarter|top]
Prints a JSON summary (objects, triangles, size, materials) to stdout.
"""

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :]
out = argv[0]
src = argv[1] if len(argv) > 1 and argv[1] != "-" else None
view = argv[2] if len(argv) > 2 else "three_quarter"

if src:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    ext = Path(src).suffix.lower()
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=src)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=src)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=src)

scene = bpy.context.scene
meshes = [o for o in scene.objects if o.type == "MESH" and o.visible_get()]
deps = bpy.context.evaluated_depsgraph_get()
tris = 0
lo, hi = Vector((1e9,) * 3), Vector((-1e9,) * 3)
for o in meshes:
    ev = o.evaluated_get(deps)
    me = ev.to_mesh()
    tris += sum(len(p.vertices) - 2 for p in me.polygons)
    for v in me.vertices:
        w = o.matrix_world @ v.co
        lo = Vector(map(min, lo, w))
        hi = Vector(map(max, hi, w))
    ev.to_mesh_clear()
size = hi - lo
center = (lo + hi) / 2
print("SUMMARY", json.dumps({"objects": len(meshes), "tris": tris, "size": [round(x, 2) for x in size],
      "materials": sorted({s.material.name for o in meshes for s in o.material_slots if s.material})[:30],
      "names": [o.name for o in meshes][:40]}))

for o in list(scene.objects):
    if o.type in ("CAMERA", "LIGHT"):
        bpy.data.objects.remove(o)
cam = bpy.data.objects.new("PrevCam", bpy.data.cameras.new("PrevCam"))
scene.collection.objects.link(cam)
scene.camera = cam
r = max(size.x, size.y, size.z) * 1.35
ang = {"front": (0, 0.12), "three_quarter": (math.radians(35), 0.3), "top": (0.3, 1.1)}[view]
cam.location = center + Vector((math.sin(ang[0]) * r, -math.cos(ang[0]) * r, r * ang[1] + size.z * 0.1))
direction = center - cam.location
cam.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()
cam.data.lens = 45
cam.data.clip_end = r * 20
sun = bpy.data.objects.new("Sun", bpy.data.lights.new("Sun", "SUN"))
sun.data.energy = 3
sun.rotation_euler = (math.radians(50), 0, math.radians(30))
scene.collection.objects.link(sun)
if scene.world is None:
    scene.world = bpy.data.worlds.new("W")
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes.get("Background")
if bg:
    bg.inputs[0].default_value = (0.75, 0.78, 0.82, 1)
    bg.inputs[1].default_value = 0.8
scene.render.engine = "BLENDER_EEVEE" if "BLENDER_EEVEE" in [e.identifier for e in bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items] else "BLENDER_EEVEE_NEXT"
scene.render.resolution_x = scene.render.resolution_y = 640
scene.render.filepath = out
bpy.ops.render.render(write_still=True)
