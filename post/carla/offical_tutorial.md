## basic

### Link to the world model

```python3
import sys
import time
import glob
import os
import random
import numpy as np
import math
from collections import deque
from threading import Thread

try:
	sys.path.append(glob.glob('../../carla/dist/carla-*%d.%d-%s.egg' % (
      sys.version_info.major,
      sys.version_info.minor,
      'win-amd64' if os.name == 'nt' else 'linux-x86_64'))[0])
except IndexError:
  pass
import carla
import cv2
client = carla.Client("localhost",2000)
client.timeout = 2.0
world = client.get_world()
```

### Spawn_point

```python
# Get the blueprint library and the spawn points for the map
bp_lib = world.get_blueprint_library() 
spawn_points = world.get_map().get_spawn_points() # a list
print(spawn_points[1]) 
"""
Transform(Location(x=-67.254570, y=27.963758, z=0.600000), Rotation(pitch=0.000000, yaw=0.159198, roll=0.000000))
"""
```

### Select car

```python
vehicle_bp = bp_lib.find('vehicle.lincoln.mkz_2020') 

# Try spawning the vehicle at a randomly chosen spawn point
vehicle = world.try_spawn_actor(vehicle_bp, random.choice(spawn_points))

"""
# Get all blueprint objects
blueprint_objects = blueprint_library.filter('vehicle') ## sensor, 

# Print the names of all blueprint objects
for blueprint_object in blueprint_objects:
    print(blueprint_object.id)
sensor.other.gnss
sensor.lidar.ray_cast
sensor.camera.semantic_segmentation
sensor.other.radar
sensor.other.lane_invasion
sensor.camera.instance_segmentation
sensor.camera.rgb
sensor.other.rss
sensor.camera.optical_flow
sensor.lidar.ray_cast_semantic
sensor.other.obstacle
sensor.other.imu
sensor.camera.depth
sensor.camera.dvs
sensor.other.collision
"""
```

### change view

```shell
spectator = world.get_spectator() 


transform = carla.Transform(vehicle.get_transform().transform(carla.Location(x=-4,z=2.5)),vehicle.get_transform().rotation) 
spectator.set_transform(transform) 
```

### Add some cars

```python
for i in range(300): 
    vehicle_bp = random.choice(bp_lib.filter('vehicle')) 
    npc = world.try_spawn_actor(vehicle_bp, random.choice(spawn_points)) 
for v in world.get_actors().filter('*vehicle*'): 
    v.set_autopilot(True) 
"""
Actor(id=164, type=vehicle.citroen.c3)
Actor(id=163, type=vehicle.ford.crown)
Actor(id=162, type=vehicle.nissan.micra)
Actor(id=161, type=vehicle.tesla.cybertruck)
Actor(id=160, type=vehicle.mercedes.sprinter)
Actor(id=159, type=vehicle.carlamotors.firetruck)
Actor(id=158, type=vehicle.seat.leon)
Actor(id=157, type=vehicle.kawasaki.ninja)
Actor(id=156, type=vehicle.ford.ambulance)
Actor(id=155, type=vehicle.toyota.prius)
Actor(id=154, type=vehicle.dodge.charger_police_2020)
Actor(id=153, type=vehicle.audi.etron)
Actor(id=152, type=vehicle.toyota.prius)
Actor(id=151, type=vehicle.dodge.charger_2020)
Actor(id=150, type=vehicle.vespa.zx125)
Actor(id=149, type=vehicle.citroen.c3)
Actor(id=148, type=vehicle.lincoln.mkz_2017)
Actor(id=147, type=vehicle.harley-davidson.low_rider)
Actor(id=146, type=vehicle.harley-davidson.low_rider)
Actor(id=145, type=vehicle.carlamotors.carlacola)
Actor(id=144, type=vehicle.carlamotors.firetruck)
"""
```

### Destory all actors in carla

```python
actors = world.get_actors()

# For each actor in the list, call the destroy() method.
for actor in actors:
    actor.destroy()
```



## Scene

### Change town

```shell
python3 config.py --map Town01

py config.py --list
weather presets:

    ClearNight, ClearNoon, ClearSunset, CloudyNight, CloudyNoon,
    CloudySunset, Default, HardRainNight, HardRainNoon,
    HardRainSunset, MidRainSunset, MidRainyNight, MidRainyNoon,
    SoftRainNight, SoftRainNoon, SoftRainSunset, WetCloudyNight,
    WetCloudyNoon, WetCloudySunset, WetNight, WetNoon, WetSunset.
```



## Retrieve simulation data

```python
# carmera
camera.listen(lambda image: image.save_to_disk('out/%06d.png' % image.frame))

# video
import cv2
import numpy as np
# 注意帧速率和aspect ratio 必须和sensor 完全一致
video_writer = cv2.VideoWriter('out/video.avi', cv2.VideoWriter_fourcc(*"MJPG"), 30, (1920, 1080))
def save_image(image):
    # Convert the CARLA image to a numpy array
    transform = carla.Transform(vehicle.get_transform().transform(carla.Location(x=-4,z=2.5)),vehicle.get_transform().rotation) 
    spectator.set_transform(transform) 
    np_image = np.array(image.raw_data)

    # Reshape the array to match the image height, width, and number of channels
    reshaped_image = np_image.reshape((image.height, image.width, 4))
    # Convert RGBA to BGR (OpenCV uses BGR color format)
    bgr_image = reshaped_image[:, :, :3]
    # Write the BGR image to the video file
    video_writer.write(bgr_image)

# Assuming you have a camera sensor object named 'camera'
camera.listen(lambda image: save_image(image))
```







## Traffic manager

use of 同步模式





## Map 



download roadrunner

```shell
wget https://github.com/roadrunner-server/roadrunner/releases/download/v2023.1.3/roadrunner-2023.1.3-linux-amd64.deb
sudo dpkg -i roadrunner-2023.1.3-linux-amd64.deb
```

