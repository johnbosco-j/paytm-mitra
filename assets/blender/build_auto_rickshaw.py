"""Build a Chennai auto-rickshaw in Blender (headless) and export GLB for the MITRA story scene.

Run:  /Applications/Blender.app/Contents/MacOS/Blender -b -P assets/blender/build_auto_rickshaw.py -- apps/web/public/models/auto_rickshaw.glb
Everything is modelled from scratch here (no downloaded assets). Units: metres, Z-up (glTF export converts to Y-up).
"""

import math
import sys

import bmesh
import bpy

out = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "auto_rickshaw.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene


def mat(name, color, rough=0.5, metal=0.0, coat=0.0, emit=None, transmission=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*color, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if "Coat Weight" in b.inputs:
        b.inputs["Coat Weight"].default_value = coat
    if transmission and "Transmission Weight" in b.inputs:
        b.inputs["Transmission Weight"].default_value = transmission
    if alpha < 1:
        b.inputs["Alpha"].default_value = alpha
        m.blend_method = "BLEND" if hasattr(m, "blend_method") else None
    if emit:
        b.inputs["Emission Color"].default_value = (*emit, 1)
        b.inputs["Emission Strength"].default_value = 6.0
    return m


YELLOW = mat("Paint_Yellow", (0.93, 0.66, 0.0), rough=0.28, coat=0.8)
BLACK = mat("Canopy_Leather", (0.02, 0.02, 0.02), rough=0.7)
TRIM = mat("Trim_Black", (0.035, 0.035, 0.04), rough=0.45)
CHROME = mat("Chrome", (0.85, 0.86, 0.88), rough=0.15, metal=1.0)
TYRE = mat("Tyre", (0.012, 0.012, 0.012), rough=0.9)
GLASS = mat("Glass", (0.75, 0.86, 0.92), rough=0.03, transmission=0.9, alpha=0.35)
LAMP = mat("Headlamp", (1, 0.97, 0.85), rough=0.1, emit=(1, 0.95, 0.8))
GREEN = mat("Stripe_Green", (0.02, 0.33, 0.16), rough=0.35, coat=0.6)


def cube(name, loc, half, m, bevel=0.0, seg=4, slant=0.0):
    bpy.ops.mesh.primitive_cube_add(location=loc)
    o = bpy.context.object
    o.name = name
    o.scale = half
    bpy.ops.object.transform_apply(scale=True)
    if slant:
        # pull the top-front edge back: a raked nose / windscreen line
        bm = bmesh.new()
        bm.from_mesh(o.data)
        for v in bm.verts:
            if v.co.x > 0 and v.co.z > 0:
                v.co.x -= slant
            if v.co.x > 0:
                v.co.y *= 0.82  # narrower towards the front
        bm.to_mesh(o.data)
        bm.free()
    if bevel:
        b = o.modifiers.new("bevel", "BEVEL")
        b.width = bevel
        b.segments = seg
        b.limit_method = "ANGLE"
        o.modifiers.new("wn", "WEIGHTED_NORMAL")
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


def cyl(name, loc, r, depth, m, rot=(math.pi / 2, 0, 0), verts=32):
    bpy.ops.mesh.primitive_cylinder_add(vertices=verts, radius=r, depth=depth, location=loc, rotation=rot)
    o = bpy.context.object
    o.name = name
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


# --- body: passenger tub, tapered driver nose, floor skirt, green waist stripe
cube("Body_Tub", (-0.25, 0, 0.72), (0.85, 0.66, 0.38), YELLOW, bevel=0.14, seg=6)
cube("Body_Nose", (0.92, 0, 0.98), (0.36, 0.52, 0.34), YELLOW, bevel=0.14, seg=6, slant=0.26)
cube("Skirt", (-0.25, 0, 0.38), (0.85, 0.6, 0.05), TRIM, bevel=0.03)
# front mudguard over the single front wheel
bpy.ops.mesh.primitive_cylinder_add(vertices=32, radius=0.33, depth=0.24, location=(1.12, 0, 0.3), rotation=(math.pi / 2, 0, 0))
mg = bpy.context.object
mg.name = "Mudguard"
bm = bmesh.new()
bm.from_mesh(mg.data)
bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.y < -0.02], context="VERTS")  # keep the upper half (local y = world z)
bm.to_mesh(mg.data)
bm.free()
mg.modifiers.new("solid", "SOLIDIFY").thickness = 0.02
bpy.ops.object.shade_smooth()
mg.data.materials.append(YELLOW)
cube("Stripe_L", (-0.15, 0.665, 0.62), (0.95, 0.012, 0.04), GREEN, bevel=0.01)
cube("Stripe_R", (-0.15, -0.665, 0.62), (0.95, 0.012, 0.04), GREEN, bevel=0.01)
cube("Seat", (-0.55, 0, 0.98), (0.32, 0.6, 0.08), TRIM, bevel=0.05)

# --- canopy: roof, rear panel, side frame tubes
cube("Canopy_Roof", (-0.15, 0, 1.78), (1.05, 0.7, 0.05), BLACK, bevel=0.08, seg=5)
cube("Canopy_Rear", (-1.12, 0, 1.38), (0.05, 0.68, 0.42), BLACK, bevel=0.06)
for y in (0.66, -0.66):
    cyl(f"Frame_{y:+.1f}", (0.62, y, 1.4), 0.022, 0.8, CHROME, rot=(0, 0.25, 0), verts=12)
    cyl(f"FrameRear_{y:+.1f}", (-1.05, y, 1.4), 0.022, 0.8, CHROME, rot=(0, 0, 0), verts=12)

# --- windscreen + headlamp + handlebar + mirrors
bpy.ops.mesh.primitive_plane_add(size=1, location=(0.74, 0, 1.5), rotation=(0, math.radians(78), 0))
w = bpy.context.object
w.name = "Windscreen"
w.scale = (0.42, 0.6, 1)
w.data.materials.append(GLASS)
bpy.ops.mesh.primitive_uv_sphere_add(radius=0.08, location=(1.2, 0, 1.12), segments=24, ring_count=12)
hl = bpy.context.object
hl.name = "Headlamp"
bpy.ops.object.shade_smooth()
hl.data.materials.append(LAMP)
cyl("Handlebar", (0.62, 0, 1.18), 0.018, 0.7, CHROME, rot=(math.pi / 2, 0, 0), verts=12)
for y in (0.38, -0.38):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=0.045, location=(0.72, y, 1.52))
    mr = bpy.context.object
    mr.scale = (0.4, 1, 0.7)
    mr.data.materials.append(CHROME)

# --- three wheels: tyre (torus) + chrome hub
def wheel(name, x, y):
    bpy.ops.mesh.primitive_torus_add(major_radius=0.2, minor_radius=0.085, location=(x, y, 0.27), rotation=(math.pi / 2, 0, 0),
                                     major_segments=40, minor_segments=14)
    t = bpy.context.object
    t.name = name + "_Tyre"
    bpy.ops.object.shade_smooth()
    t.data.materials.append(TYRE)
    cyl(name + "_Hub", (x, y, 0.27), 0.12, 0.1, CHROME, verts=24)


wheel("Wheel_Front", 1.12, 0)
wheel("Wheel_RL", -0.75, 0.6)
wheel("Wheel_RR", -0.75, -0.6)

# group everything under one root so the scene can place it
bpy.ops.object.empty_add(location=(0, 0, 0))
root = bpy.context.object
root.name = "AutoRickshaw"
for o in list(scene.objects):
    if o is not root:
        o.parent = root

bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_apply=True, export_yup=True)
print("exported", out)
