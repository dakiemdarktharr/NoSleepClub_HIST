"""Author original monochrome landmark scenes in Blender and export two static GLB LODs.

Run: blender --background --factory-startup --python scripts/build-landmarks.py
No downloaded mesh, photograph, texture, font or add-on is embedded in the assets.
"""
import bpy, json, math, hashlib, struct, sys
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/landmarks'
OUTPUT = ROOT / 'public/models/sites'
PREVIEW = ROOT / '.tmp/landmark-previews'
for folder in [SOURCE, OUTPUT, PREVIEW]: folder.mkdir(parents=True, exist_ok=True)
data = json.loads((SOURCE / 'sites.json').read_text(encoding='utf8'))
bpy.ops.preferences.addon_enable(module='io_scene_gltf2')
material = bpy.data.materials.new('Untextured neutral clay')
material.diffuse_color = (.72, .72, .72, 1)
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Base Color'].default_value = (.72, .72, .72, 1)
bsdf.inputs['Roughness'].default_value = .95
objects = []

def finish(obj, name):
    obj.name = name
    obj.data.materials.clear(); obj.data.materials.append(material)
    objects.append(obj)
    return obj

def box(name, x, y, z, w, d, h, rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=(x, y, z+h/2))
    obj=bpy.context.object; obj.dimensions=(w,d,h); obj.rotation_euler.z=rotation
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    return finish(obj,name)

def cylinder(name,x,y,z,r,h,vertices=12):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=h, location=(x,y,z+h/2))
    return finish(bpy.context.object,name)

def sphere(name,x,y,z,rx,ry,rz):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=6, radius=1, location=(x,y,z))
    obj=bpy.context.object;obj.scale=(rx,ry,rz)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name)

def mesh(name, vertices, faces):
    geo=bpy.data.meshes.new(name);geo.from_pydata(vertices,[],faces);geo.update()
    obj=bpy.data.objects.new(name,geo);bpy.context.collection.objects.link(obj)
    return finish(obj,name)

def gable(name,x,y,z,w,d,rise):
    return mesh(name,[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x,y-d/2,z+rise),(x-w/2,y+d/2,z),(x+w/2,y+d/2,z),(x,y+d/2,z+rise)],[(0,2,1),(3,4,5),(0,3,5,2),(1,2,5,4),(0,1,4,3)])

def hip(name,x,y,z,w,d,rise):
    ridge=max(.15,(w-d*.65)/2)
    return mesh(name,[(x-w/2,y-d/2,z),(x+w/2,y-d/2,z),(x+w/2,y+d/2,z),(x-w/2,y+d/2,z),(x-ridge,y,z+rise),(x+ridge,y,z+rise)],[(0,3,2,1),(0,1,5,4),(1,2,5),(2,3,4,5),(3,0,4)])

def cone(name,x,y,z,w,d,h,vertices=4):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=1,radius2=0,depth=h,location=(x,y,z+h/2),rotation=(0,0,math.pi/4 if vertices==4 else 0))
    obj=bpy.context.object;obj.scale=(w/math.sqrt(2),d/math.sqrt(2),1)
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    return finish(obj,name)

def arch(name,x,y,spring,r,thickness=.25,depth=.25,segments=10):
    verts=[]
    for side in [-1,1]:
        for rad in [r,r+thickness]:
            for i in range(segments+1):
                a=i*math.pi/segments;verts.append((x+rad*math.cos(a),y+side*depth/2,spring+rad*math.sin(a)))
    n=segments+1;faces=[]
    for i in range(segments):
        faces.extend([(i,i+1,n+i+1,n+i),(2*n+i,3*n+i,3*n+i+1,2*n+i+1),(i,2*n+i,2*n+i+1,i+1),(n+i,n+i+1,3*n+i+1,3*n+i)])
    faces.extend([(0,n,3*n,2*n),(n-1,3*n-1,4*n-1,2*n-1)])
    return mesh(name,verts,faces)

def stair(name,x,y,z,w,d,h,count=5):
    for i in range(count):box(name,x,y+i*d/count,z,w,d-i*d/count,h*(i+1)/count)

def window_grid(width,y,z,columns,rows,spacing_z,wide=1.2,tall=2):
    for row in range(rows):
        for i in range(columns):
            x=-width/2+(i+.5)*width/columns
            # Geometric jambs and lintel; no painted glass or texture.
            for side in [-1,1]:box('Window jamb',x+side*wide/2,y,z+row*spacing_z,.18,.35,tall)
            box('Window lintel',x,y,z+tall+row*spacing_z,wide+.18,.35,.18)

def palace(detail):
    box('Front ground slab',0,27,0,86,22,1.2)
    box('Rear spine',0,-11,0,34,54,17.8)
    box('Front hall',0,26,1.2,82,19,16.6)
    for z in [5.6,10.7,17.8]:box('Projecting floor cornice',0,26,z,85,21,.65)
    box('Roof pavilion',0,8,18.4,23,15,6.8)
    box('Pavilion roof',0,8,25.2,25,17,.8)
    for x in [-37,-25,-13,13,25,37]:box('Ground portico column',x,37,0,.9,.9,5.6)
    box('Entrance canopy',0,38,4.7,18,1.5,.5)
    if detail:
        for i in range(34):
            x=-40+i*80/33
            box('Bamboo screen upright',x,36.4,6.4,.42,1.2,10.2)
            box('Bamboo screen joint',x,36.7,10.8,.85,1.4,.7)
        window_grid(77,36.0,7.1,17,2,4.8,2.1,3.5)
        for x in [-10,0,10]:box('Pavilion opening mullion',x,16,19,.4,.5,5.2)
    stair('Entrance steps',0,38.1,0,20,.3,.8,3)

def cu_chi(detail):
    # Ground-relative schematic of a real small hatch, not a scaled-up temple.
    box('Hatch left rim',-.60,0,0,.12,1.8,.18)
    box('Hatch right rim',.60,0,0,.12,1.8,.18)
    box('Hatch rear rim',0,-.84,0,1.1,.12,.18)
    box('Hatch front rim',0,.84,0,1.1,.12,.18)
    lid=box('Raised hatch lid',0,-.8,.12,1.1,1.65,.07)
    # Hinge around back edge; the source photograph shows the camouflaged lid raised.
    lid.rotation_euler.x=math.radians(65);lid.location.y=-.8+math.cos(math.radians(65))*.82;lid.location.z=.18+math.sin(math.radians(65))*.82
    if detail:
        for i in [-.35,0,.35]:box('Lid wooden rib',i,-.45,.8,.035,.6,.04)

def memorial(detail):
    box('Memorial platform',0,0,0,13,9,.35)
    box('Relief wall',0,-3.7,.35,12,.6,3.2)
    cylinder('Lotus pedestal',0,0,.35,1.65,.7,16)
    sphere('Crossed legs',0,.1,1.5,1.65,.9,.55)
    sphere('Seated robe',0,-.1,2.6,1.0,.65,1.45)
    sphere('Head',0,.0,4.2,.52,.48,.65)
    # Stylized flame surround preserves the silhouette without sculptural detail.
    for side in [-1,1]:
        verts=[(side*1.2,-.6,1.2),(side*2.8,-.6,2.2),(side*2.3,-.6,4.7),(side*.35,-.6,6.8),(side*1.5,-.6,4.1),(side*1.0,-.6,2.2)]
        obj=mesh('Flame silhouette',verts,[(0,1,2,3,4,5)])
        solid=obj.modifiers.new('Flame thickness','SOLIDIFY');solid.thickness=.35
    if detail:
        for i in range(11):box('Low relief rhythm',-5+i,-3.3,.65,.45,.18,1.5+(i%3)*.3)
        cylinder('Incense vessel',0,3,.35,.75,.9,12)

def wharf(detail):
    box('Main house',0,0,0,25.5,19,10.4)
    for z in [.25,5.0,10.2]:box('Wraparound veranda slab',0,0,z,34.3,27.5,.4)
    for y in [-12.8,12.8]:
        for i in range(9 if detail else 7):
            x=-15+i*30/(8 if detail else 6)
            box('Arcade pier',x,y,0,.7,.7,10.4)
            if detail and i<8:
                arch('Ground arcade',x+1.875,y,3.1,1.45,.32,.65)
    for x in [-16,16]:
        for y in [-8,-2,4,10]:box('Side veranda pier',x,y,0,.7,.7,10.4)
    hip('Broad tiled roof',0,0,10.7,34.6,27.8,3.4)
    box('Roof ridge',0,0,14.1,18,.4,.3)
    for side in [-1,1]:
        # Two abstract roof dragons; monochrome geometric silhouettes.
        mesh('Roof dragon',[(side*2,0,14.2),(side*4,0,14.5),(side*5,0,15),(side*4.5,0,14.1),(side*2,0,14)],[(0,1,2,3,4)])
    if detail:window_grid(23,9.65,6.2,7,1,4,1.7,2.8)

def war_museum(detail):
    box('Rear gallery block',0,-9,0,57,23,18.2)
    box('Upper projecting gallery',0,8,5.2,58,18,13)
    box('Entrance deep fascia',-6,17.5,11.8,45,.6,6.4)
    for x in [-26,-12,2,16,26]:box('Ground pilotis',x,15,0,1,1,5.5)
    box('East stair tower',23,13,0,11,12,19)
    stair('Entry stairs',0,18,0,32,2.8,1.0,4)
    if detail:
        for i in range(11):box('Gallery roof rhythm',-26+i*5.2,-8,18.2,.45,21,.7)
        # Disc relief stands in for the circular museum emblem, no logo texture.
        emblem=cylinder('Circular facade emblem',13,18,14.5,1.25,.16,16);emblem.rotation_euler.x=math.pi/2
        for i in range(4):box('Recessed stair mullion',20+i*2,19,3,.24,.4,12)

def city_museum(detail):
    box('Main palace',0,-2,0,66,24,13.5)
    for x in [-25,25]:box('Projecting wings',x,2,0,17,29.5,14.5)
    for z in [.3,5.4,12.7,14.4]:box('Continuous cornice',0,1,z,68,30,.4)
    hip('Palace roof',0,-2,14.8,65.5,28,3.3)
    # Central colonnade and triangular classical pediment.
    box('Portico floor',0,14.8,0,31,7,.5)
    for x in [-13,-8,-3,3,8,13]:
        cylinder('Classical column',x,16,.5,.52,12.6,10)
        box('Column capital',x,16,12.6,1.3,1.3,.5)
    gable('Front pediment',0,15.5,14.5,31,4,6.5)
    if detail:
        window_grid(63,13.1,1.2,15,2,6,2,3.5)
        for x in [-30,-20,-10,10,20,30]:sphere('Parapet urn',x,14,15,.35,.35,.7)

def temple(detail):
    box('Courtyard paving',0,0,0,27.4,60.4,.18)
    for x in [-10.4,10.4]:
        box('Side hall',x,0,.18,5.7,58,4.8)
        hip('Side hall roof',x,0,4.9,6.6,59,2.3)
    for y,w,d,h in [(23,27,13,6),(-1,22,12,6.5),(-23,27,13,7.4)]:
        box('Temple hall',0,y,.2,w-2,d-2,h)
        hip('Swept hall roof',0,y,h, w,d,2.4)
        box('Ornamented ridge',0,y,h+2.4,w*.64,.5,.35)
        for side in [-1,1]:
            mesh('Upturned roof end',[(side*w/2,y,h),(side*(w/2-.6),y,h+1.0),(side*(w/2-2),y,h+.4)],[(0,1,2)])
        if detail:
            for i in [-3,-2,-1,0,1,2,3]:cone('Ridge ceramic silhouette',i*w*.085,y,h+2.6,.6,.5,.7,4)
    if detail:
        for x in [-8,-4,4,8]:box('Front stone column',x,29,.2,.55,.55,5.4)
        arch('Central entrance arch',0,29.5,3.3,2.0,.4,.5)

def cathedral(detail):
    box('Nave',0,-1,0,17,77,20)
    gable('Nave pitched roof',0,-1,20,19,78,11)
    for side in [-1,1]:
        box('Side aisle',side*12,0,0,8,73,12.5)
        gable('Aisle roof',side*12,0,12.5,9,74,4.8)
        box('Bell tower',side*11,35.5,0,10,15.5,36.5)
        box('Tower cornice',side*11,35.5,35.8,10.8,16,.8)
        cone('Tall pointed spire',side*11,35.5,36.6,10.2,13.8,22.4)
        box('Spire cross upright',side*11,35.5,59,.2,.2,1.5)
        box('Spire cross bar',side*11,35.5,59.7,.9,.2,.2)
        if detail:
            for y in range(-34,29,9):box('Aisle buttress',side*16.3,y,0,1,1.2,15)
            for z in [13,24,32]:arch('Tower arch trim',side*11,43.4,z,2.1,.32,.25)
    cylinder('Apse',0,-35,0,8,18,12)
    cone('Apse polygon roof',0,-35,18,16,16,9,12)
    gable('Central facade gable',0,38,21,15,3,10)
    if detail:
        arch('Central portal',0,43,4.3,2.4,.45,.5)
        # Rose window is modeled as a ring rather than a colored decal.
        for i in range(12):
            a=i*2*math.pi/12
            box('Rose window spoke',math.cos(a)*2.1,40,17.7+math.sin(a)*2.1,.18,.3,.8, a)

def post_office(detail):
    box('Front main block',0,22,0,69,16,11.3)
    box('Main sorting hall',0,-4,0,43,39,11)
    gable('Main hall barrel approximation',0,-4,11,44,40,5.8)
    for x in [-30,30]:
        box('Rear office wing',x,-2,0,9,54,10)
        hip('Wing tiled roof',x,-2,10,10,55,2)
    box('Central clock pavilion',0,22,0,19,17,17.3)
    box('Front roof cornice',0,30.1,11.3,69.6,.8,.65)
    box('Clock pavilion cornice',0,22,17.3,20,18,.6)
    if detail:
        arch('Large entrance arch',0,30.8,6.4,5,.45,.5)
        for x in [-30,-24,-18,-12,12,18,24,30]:
            arch('Facade arched window',x,30.4,7.2,1.7,.28,.3)
            for side in [-1,1]:box('Window pilaster',x+side*2,30.6,0,.45,.45,10.9)
        for x in [-7,-3.5,0,3.5,7]:box('Upper clock pavilion mullion',x,30.7,12,.3,.3,4.5)
        for x in [-33,-25,-17,17,25,33]:sphere('Roof finial',x,29.7,12.1,.3,.3,.7)
    box('Central clock tablet',0,31,16.8,2.5,.2,2.0)

def market(detail):
    box('Market hall',0,0,0,98,136,5.8)
    # Parallel roof sheds and central raised cross aisle define the aerial silhouette.
    count=9 if detail else 7;span=98/count
    for i in range(count):
        x=-49+(i+.5)*span
        gable('Long shed roof',x,0,5.8,span-.3,136,3.1)
    box('Central clerestory',0,0,8.1,13,132,3.1)
    gable('Central raised roof',0,0,11.2,15,134,3)
    box('South clock tower',0,60,0,13,16,21.3)
    box('Clock tower cornice',0,60,21.3,14,17,.5)
    hip('Clock tower hipped roof',0,60,21.8,16,18,5.2)
    if detail:
        for side in [-1,1]:
            clock=cylinder('Unpainted clock face',0,side*8+60,16.3,2.4,.25,24);clock.rotation_euler.x=math.pi/2
        for i in range(15):arch('Front arcade',-45+i*6,68,3.0,2.4,.25,.3)
        for i in range(12):
            box('Side hall pier',-49,-61+i*11,0,.6,.6,6)
            box('Side hall pier',49,-61+i*11,0,.6,.6,6)
    arch('Main market portal',0,68,3.8,3.1,.5,.4)

builders={'palace':palace,'cu-chi':cu_chi,'memorial':memorial,'wharf':wharf,'war-museum':war_museum,'city-museum':city_museum,'temple':temple,'cathedral':cathedral,'post-office':post_office,'market':market}

def join_geometry(name, dimensions):
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects:obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    for obj in objects:
        bpy.context.view_layer.objects.active=obj
        for modifier in list(obj.modifiers):bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active=objects[0];bpy.ops.object.join()
    obj=bpy.context.object;obj.name=name
    bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
    # Fit authored silhouette to the measured full envelope, never a zoom-dependent exaggeration.
    coords=[v.co.copy()for v in obj.data.vertices]
    low=Vector(tuple(min(c[i]for c in coords)for i in range(3)))
    high=Vector(tuple(max(c[i]for c in coords)for i in range(3)))
    for v in obj.data.vertices:
        for i in range(3):v.co[i]=(v.co[i]-(low[i] if i==2 else (low[i]+high[i])/2))*dimensions[i]/(high[i]-low[i])
    for poly in obj.data.polygons:poly.use_smooth=False
    obj.data.materials.clear();obj.data.materials.append(material)
    for poly in obj.data.polygons:poly.material_index=0
    obj.data.update();return obj

def export_model(obj, slug, lod):
    bpy.ops.object.select_all(action='DESELECT');obj.hide_set(False);obj.select_set(True);bpy.context.view_layer.objects.active=obj
    path=OUTPUT/(slug+'-'+lod+'.glb')
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,use_active_scene=True,export_apply=True,export_yup=True,export_normals=True,export_texcoords=False,export_animations=False,export_cameras=False,export_lights=False)
    raw=path.read_bytes();digest=hashlib.sha256(raw).hexdigest()[:12];hashed=path.with_name(slug+'-'+lod+'-'+digest+'.glb');path.replace(hashed)
    # Export statistics come from the actual glTF accessor, not the editable Blender quad count.
    size=struct.unpack_from('<I',raw,12)[0];gltf=json.loads(raw[20:20+size]);primitive=gltf['meshes'][0]['primitives'][0]
    return {'url':'/models/sites/'+hashed.name,'bytes':len(raw),'triangles':gltf['accessors'][primitive['indices']]['count']//3}

catalog=[]
for site in data['sites']:
    scene=bpy.data.scenes.new(site['slug']);bpy.context.window.scene=scene
    scene.unit_settings.system='METRIC';scene.unit_settings.scale_length=1
    scene['front_axis']='+Y';scene['source_and_placement']='assets/landmarks/sites.json'
    record={k:site[k]for k in ['id','slug','center','frontBearing','dimensionsMeters','minZoom']}
    for lod in ['near','far']:
        objects=[];builders[site['slug']](lod=='near')
        obj=join_geometry(site['slug']+'-'+lod,site['dimensionsMeters'])
        record[lod]=export_model(obj,site['slug'],lod)
        if lod=='far':obj.hide_render=True;obj.hide_set(True)
    catalog.append(record)
    print('HIST_MODEL '+json.dumps(record))

# Remove only stale generated GLBs under the resolved output folder.
assert OUTPUT.resolve().is_relative_to(ROOT.resolve())
keep={Path(row[lod]['url']).name for row in catalog for lod in ['near','far']}
for path in OUTPUT.glob('*.glb'):
    if path.name not in keep:path.unlink()
(ROOT/'src/maps/siteModelCatalog.json').write_text(json.dumps(catalog,indent=2)+'\n',encoding='utf8')

# Save editable scenes with camera/light rigs, then render a small verification view per site.
for scene in list(bpy.data.scenes):
    if scene.name not in builders:
        bpy.data.scenes.remove(scene);continue
    bpy.context.window.scene=scene
    site=next(s for s in data['sites']if s['slug']==scene.name);w,d,h=site['dimensionsMeters']
    scene.render.engine='CYCLES';scene.cycles.samples=24;scene.cycles.use_denoising=True
    scene.render.resolution_x=640;scene.render.resolution_y=480;scene.render.resolution_percentage=100
    scene.render.film_transparent=True
    scene.world=bpy.data.worlds.new(scene.name+' neutral studio');scene.world.use_nodes=True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.8,.8,1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
    camera_data=bpy.data.cameras.new(scene.name+' camera');camera=bpy.data.objects.new('Review camera',camera_data);scene.collection.objects.link(camera)
    distance=max(w,d,h);target=Vector((0,0,h*.35));camera.location=Vector((distance*.9,distance*1.4,distance*.95));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=max(w,d,h)*1.65;scene.camera=camera
    light_data=bpy.data.lights.new('Softbox','AREA');light_data.energy=2000*max(1,distance/15)**2;light_data.shape='DISK';light_data.size=distance*.6
    light=bpy.data.objects.new('Softbox',light_data);scene.collection.objects.link(light);light.location=(-distance,distance,distance*1.6);light.rotation_euler=(-light.location).to_track_quat('-Z','Y').to_euler()
    scene.render.image_settings.file_format='PNG';scene.render.filepath=str(PREVIEW/(scene.name+'.png'))
bpy.context.window.scene=bpy.data.scenes['palace']
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'hist-landmarks.blend'),compress=True)
if '--no-render' not in sys.argv:
    for scene in bpy.data.scenes:
        bpy.context.window.scene=scene;bpy.ops.render.render(write_still=True)
print('HIST_LANDMARK_BUILD_COMPLETE '+str(len(catalog)))
