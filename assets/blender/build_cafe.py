"""The big modern café down the road (team's downloaded "Coffee Bar 3D" asset), cut down for the web.

In the story it is where Priya walks after Naren says "illa": the sale he never sees goes to the bigger store.
Run: Blender -b assets/blender/vendor/dl/coffee_lite.blend -P assets/blender/build_cafe.py -- apps/web/public/models [preview.png]
(coffee_lite.blend = the 2.7 GB FBX imported once and saved, with the 5M-polygon trees removed.)
Keeps the building, glazing and the café interior visible through the glass; drops plants, untextured scanned people,
the ground slab and the second building; decimates heavy props; facade turned to face glTF +Z; origin at the
front-centre on the ground. Target: under ~100k triangles (it is a background building).
"""

import math
import re
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

ARGS = sys.argv[sys.argv.index("--") + 1 :]
OUT = Path(ARGS[0])
PREVIEW = ARGS[1] if len(ARGS) > 1 else None
scene = bpy.context.scene

DROP = re.compile(r"Elm|Alder|Tree|Thuja|Ligustrum|Asparagus|Succulent|Potted|Planter|Ficus|Plant|Grass|Everett|Diane|Kavon|Johnny|Jada|Louise|"
                  r"Cheesecake|Muffin|Cake|Banana|Breakfast|Candy|Chocolate|Cup|Tea Cup|Bowls|Vase", re.I)
# building footprint (from inspection): front glass wall at x = -7.89 facing +X, interior to x ~ -22, y in [-5, 5.5]
LO, HI = Vector((-22.2, -5.2, -0.2)), Vector((-7.4, 5.7, 9.6))
FRONT = Vector((-7.89, 0.26, 0.0))

for o in list(scene.objects):
    if o.type in ("CAMERA", "LIGHT", "EMPTY"):
        bpy.data.objects.remove(o)
        continue
    if o.type != "MESH":
        continue
    c = o.matrix_world.translation
    inside = all(LO[i] <= c[i] <= HI[i] for i in range(3))
    if DROP.search(o.name) or not inside or o.name in ("Box097", "Box098"):
        bpy.data.objects.remove(o)

meshes = [o for o in scene.objects if o.type == "MESH"]
for o in meshes:
    n = len(o.data.polygons)
    if n > 600:
        d = o.modifiers.new("dec", "DECIMATE")
        d.ratio = max(0.03, 600 / n)
deps = bpy.context.evaluated_depsgraph_get()
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.convert(target="MESH")  # applies the decimation
bpy.ops.object.select_all(action="SELECT")
# facade (+X) -> Blender -Y (glTF +Z); origin at the front centre on the ground
for o in scene.objects:
    o.matrix_world = Matrix.Rotation(math.radians(-90), 4, "Z") @ Matrix.Translation(-FRONT) @ o.matrix_world
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

for img in bpy.data.images:
    if img.size[0] > 512:
        img.scale(512, max(1, int(512 * img.size[1] / img.size[0])))

tris = sum(len(p.vertices) - 2 for o in scene.objects if o.type == "MESH" for p in o.data.polygons)
OUT.mkdir(parents=True, exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT / "cafe.glb"), export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="JPEG", export_image_quality=80,
                          export_draco_mesh_compression_enable=True, export_draco_mesh_compression_level=7)
print("EXPORTED cafe.glb objects", len(scene.objects), "tris", tris)

if PREVIEW:
    cam = bpy.data.objects.new("C", bpy.data.cameras.new("C"))
    scene.collection.objects.link(cam)
    scene.camera = cam
    cam.location = (7, -14, 3.0)
    cam.rotation_euler = (Vector((0, 4, 3)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = 30
    sun = bpy.data.objects.new("S", bpy.data.lights.new("S", "SUN"))
    sun.rotation_euler = (0.9, 0.2, 0.6)
    sun.data.energy = 3
    scene.collection.objects.link(sun)
    scene.world = bpy.data.worlds.new("W")
    scene.world.color = (0.6, 0.65, 0.75)
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x, scene.render.resolution_y = 960, 600
    scene.render.filepath = PREVIEW
    bpy.ops.render.render(write_still=True)
