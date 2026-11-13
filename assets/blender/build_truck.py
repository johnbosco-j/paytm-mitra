"""Supplier delivery truck for the story: the team's downloaded Hafei mini-truck, rebranded as a (fictional) Chennai
dairy distributor and exported light for the web.

Run: Blender -b assets/blender/vendor/dl/truck/Hafei.blend -P assets/blender/build_truck.py -- apps/web/public/models [preview.png]
Texture: vendor/dl/truck/Hafei_branded.png (Hafei.png + branding panels painted in). Output: truck.glb, wheels on the
ground at y=0, cab facing glTF +Z, length ~4.4 m.
"""

import math
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
OUT = Path(ARGS[0])
PREVIEW = ARGS[1] if len(ARGS) > 1 else None
TEX = Path(__file__).parent / "vendor" / "dl" / "truck" / "Hafei_branded.png"

scene = bpy.context.scene
for o in [o for o in scene.objects if o.type in ("CAMERA", "LIGHT")]:
    bpy.data.objects.remove(o)
body = next(o for o in scene.objects if o.type == "MESH")

# relink the photo texture (the .blend points at a path on the author's machine)
img = bpy.data.images.load(str(TEX), check_existing=True)
for slot in body.material_slots:
    m = slot.material
    m.use_nodes = True
    nt = m.node_tree
    bsdf = nt.nodes.get("Principled BSDF") or nt.nodes.new("ShaderNodeBsdfPrincipled")
    tex = next((n for n in nt.nodes if n.type == "TEX_IMAGE"), None) or nt.nodes.new("ShaderNodeTexImage")
    tex.image = img
    nt.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    bsdf.inputs["Roughness"].default_value = 0.55
    bsdf.inputs["Metallic"].default_value = 0.0

# bake transforms, find which end is the cab (lower roof than the cargo box)
bpy.context.view_layer.objects.active = body
body.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
vs = [v.co for v in body.data.vertices]
lo = Vector((min(v.x for v in vs), min(v.y for v in vs), min(v.z for v in vs)))
hi = Vector((max(v.x for v in vs), max(v.y for v in vs), max(v.z for v in vs)))
long_axis = 1 if (hi.y - lo.y) > (hi.x - lo.x) else 0
span = hi[long_axis] - lo[long_axis]
end_hi = max((v.z for v in vs if v[long_axis] > hi[long_axis] - span * 0.15), default=0)
end_lo = max((v.z for v in vs if v[long_axis] < lo[long_axis] + span * 0.15), default=0)
cab_sign = 1 if end_hi < end_lo else -1  # cab is the lower end
cab_dir = Vector((0, 0, 0))
cab_dir[long_axis] = cab_sign
# rotate so the cab points to Blender -Y (glTF +Z), then stand it on the ground at the origin
yaw = math.atan2(cab_dir.x, -cab_dir.y)
centre = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z))
body.matrix_world = Matrix.Rotation(-yaw, 4, "Z") @ Matrix.Translation(-centre)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))

OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "truck.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="JPEG", export_image_quality=85,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print("EXPORTED truck.glb", "tris", sum(len(p.vertices) - 2 for p in body.data.polygons), "size", [round(x, 2) for x in body.dimensions])

if PREVIEW:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = (float(__import__("os").environ.get("CAMX", "4.6")), -5.2, 2.2)
    cam.rotation_euler = (Vector((0, 0, 1.0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 35
    sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN"))
    sun.rotation_euler = (0.9, 0.2, 0.7)
    sun.data.energy = 3.5
    scene.collection.objects.link(sun)
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.55, 0.6, 0.68)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 800, 520
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
