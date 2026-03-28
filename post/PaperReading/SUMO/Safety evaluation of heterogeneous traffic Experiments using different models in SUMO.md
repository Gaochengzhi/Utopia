## Safety evaluation of heterogeneous traffic Experiments using different models in SUMO

```
Department of Mechanics and Maritime Sciences Division of Vehicle Safety CHALMERS UNIVERSITY OF TECHNOLOGY Göteborg, Sweden 2020
```

## Abstract

不同种车辆混合：

the day when autonomous vehicles share roads with traditional human-operated vehicles seems to be around the corner. This makes the safety evaluation of this so-called heterogeneous traffic particularly important.

标定

the initial car-following model and lane-changing model in SUMO need to be modified and calibrated using real-world data before being implemented in the simulation.

异质性的影响

the types of vehicles involved on driving situation have an impact on drivers’ driving behaviours. The neglect of this impact has led to errors when reproducing the realistic driving behaviour with the existing car- following and lane-changing models

本文的工作：

In this thesis, the models are modified by setting appropriate value for some related parameters to reflect this impact. Then the models are calibrated using the data extracted from highD dataset.

## Introduction

为什么要标定As is known to all, the accuracy of the simulation model largely depends on how close it is to the real situation [13], that is why the default models are normally not directly used. In most cases, the models are optimized and calibrated, to some extent, to make them more consistent with the observed data, so as to obtain more accurate simulation results. As researchers learn more and more about the real traffic situation, the models used for traffic simulation are also continuously changed

