## EIDM

 SUMO contains many car-following models that replicate automated driving, but cannot realistically imitate human driving behavior. When simulating queued vehicles driving off, existing car-following models are neither able to correctly emulate the acceleration behavior of human drivers nor the resulting vehicle gaps.





The Extended Intelligent Driver Model (EIDM) [1] is based on many known model extensions of the Intelligent Driver Model (IDM) by Treiber and Kesting. Additionally, it includes calculations to **reduce the jerk** in different driving situations (lane changes, accelerating from standstill, etc.). By changing the parameters (mostly to 0), each extension can individually be turned "off". The aim of the model is to correctly replicate submicroscopic acceleration profiles of single vehicles and drivers.

(1) ["Extending the Intelligent Driver Model in SUMO and Verifying the Drive Off Trajectories with Aerial Measurements"](https://sumo.dlr.de/2020/SUMO2020_paper_28.pdf); Dominik Salles, Stefan Kaufmann, Hans-Christian Reuss. SUMO User Conference 2020.









