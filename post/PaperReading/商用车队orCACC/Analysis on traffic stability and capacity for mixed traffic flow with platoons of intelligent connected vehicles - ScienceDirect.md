# Analysis on traffic stability and capacity for mixed traffic flow with platoons of intelligent connected vehicles

```shell
Beijing Engineering Research Center of Urban Transport Operation Guarantee, College of Metropolitan Transportation, Beijing
University of Technology, Beijing 100124, PR China
```

## Abstract

普通车辆和智能网联车辆混合行驶

The results of the sensitivity analysis demonstrated that ICVs can improve the stability of the mixed traffic flow under a critical speed.

that the time headway between vehicles in a CACC platoon was 0.6 s, with 1.5 s between HDVs. 

## Stability analysis

$$
\left\{\begin{array}{l}
f_{v}^{I D M i}=-\frac{4 a_{m} v^{3}}{v_{0}^{4}}-\frac{2 a_{m} T_i\left[1-\left(v / v_{0}\right)^{4}\right]}{s_{0}+v T_{i}} \\
f_{\Delta v}^{I D M i}=\sqrt{\frac{a_{m}}{b}} \frac{v\left[1-\left(v / v_{0}\right)^{4}\right]}{s_{0}+v T_{i}} \\
f_{\Delta x}^{I D M i}=2 a_{m} \frac{\left[1-\left(v / v_{0}\right)^{4}\right] \sqrt{1-\left(v / v_{0}\right)^{4}}}{s_{0}+v T_{i}}
\end{array}\right.
$$

$$
F^{I D M i}=\left(\frac{\left(f_{v}^{I D M i}\right)^{2}}{2}-f_{\Delta v}^{I D M i} f_{v}^{I D M i}-f_{\Delta x}^{I D M i}\right) \times\left(f_{\Delta x}^{I D M i}\right)^{2}<0
$$
