# Highway traffic data: macroscopic, microscopic and criticality analysis for capturing relevant traffic scenarios and traffic modeling based on the highD data set

## Abstract

对高速公路驾驶行为进行了全面分析。

首先，提供了一些宏观和微观交通统计数据，包括交通流量和交通密度，以及速度、加速度和距离分布。考虑了它们之间的依赖关系，并与相关工作进行了比较。

第二部分调查了关键性度量的分布。分析了时间到碰撞、时间间隔和第三个度量，将两者结合起来。这些度量也与其他指标结合起来。单独讨论了达到临界水平的情况。结果也与相关工作进行了比较。

## Introduction

- **Fundamental diagrams of traffic flow** are used to depict the macroscopic view.
- A normalized **load per lane,** depending on the motorway capacity limits and the flow rates, is provided.
- The **number of lane changes** depending on the flow rate and density is depicted.
- **Velocity distributions, longitudinal and lateral acceleration distributions, and Distance Headway (DHW)** distributions are analyzed in the microscopic analysis.
- The distributions of the Time-To-Collision (TTC) and THW are provided to analyze the criticality of traffic scenarios.

## HData set

The data is checked manually for tracks with TTCmin ≤ 0.8 s and THWmin < 0 s.1 These thresholds were cho- sen because they are very rare when computed properly (TTCmin ≤ 0.8 s) or should not appear at all (THWmin < 0 s).

36 trucks for TTC

64 trucks for THW

……

## Macroscopic anaysis

*A. Velocity distributions*

The two prominent peaks are around v ≈ 90 km/h and v ≈ 120 km/h.

