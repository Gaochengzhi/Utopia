# Fundamental diagram and stability analysis for heterogeneous traffic flow considering human-driven vehicle driver’s acceptance of cooperative adaptive cruise control vehicles

```shell
Beijing Key Laboratory of Traffic Engineering; Faculty of Architecture, Civil and Transportation Engineering; Beijing University of
Technology, Beijing 100124, PR China
```



## Abstract

Topic: the effect of the differences in acceptance of CACC by HV drivers on the heterogeneous traffic flow.

Content: capacity and stability of the heterogeneous traffic flow under different **CACC penetration rates**

## Intro 

However, the relevant report demonstrates until 2045, the penetration rates of CACC on roads could only reach 24.8% [8], 

which shows that the mixed driving of traffic flow of CACC and HV will exist for a more extended period during the popularization of CACC.

Researchers assumed the behavior of HV following CACC is consistent with that of HV homogeneous traffic flow but ignored human factors of HV drivers.

## Questionnair 

……

## Car-following rule and model analysis

![Screen Shot 2023-03-03 at 10.51.30](file:///Users/kounarushi/mycode/web-blog/public/.pic/168C1B21-ECC0-4380-89AD-B084FFCBF6E9.jpg)

### Vehicle composition rule of the heterogeneous traffic flow

Suppose CACC penetration rate is $P_C$ (0,1). Then the probability of HV is $P_H = 1−P_C$ , where the proportions of three types of HV: positive-HV, neutral-HV, and negative-HV, are $P_{pos},\ P_{neu}\ ,\ and\ P_{neg}, $ respectively. 

Considering $P_H = 1 − P_C = P_{pos} + P_{neu} + P_{neg}$ , when the number of vehicles in the lane is N, the expected number of various types of vehicles
$$
\left\{\begin{array}{l}
N_{\mathrm{C}}=N \times P_{\mathrm{C}} \\
N_{\mathrm{H}}=N_{\text {pos }}+N_{\text {neu }}+N_{\text {neg }}=N_{\mathrm{H}}=N \times\left(1-P_{\mathrm{C}}\right) \\
N_{\text {pos }}=N \times P_{\text {pos }} \\
N_{\text {neu }}=N \times P_{\text {neu }} \\
N_{\text {neg }}=N \times P_{\text {neg }}
\end{array}\right.
$$

### Car-following model

IDM:
$$
\left\{\begin{array}{l}
\dot{v}_{n}(t)=a_{m i}\left[1-\left(\frac{v_{n}(t)}{v_{0}}\right)^{\delta}-\left(\frac{s^{*}}{h_{n}(t)-l}\right)^{2}\right] \\
s^{*}=s_{0}+v_{n}(t) T_{i}+v_{n}(t) \Delta v_{n}(t)\left(2 \sqrt{a_{m i} b_{i}}\right)^{-1}
\end{array}\right.
$$
$a_{m i}$ is the maximum acceleration of class $i$ of $\mathrm{HV}, v_{0}$ is the free flow speed,

 $s^{*}$ is the desire safety distance, $s_{0}$ is the **minimum** safety distance at a standstill

 $T_{i}$ is the safe time headway of class $i$ of $\mathrm{HV}, b_{i}$ is the desired deceleration of class $i$ of $\mathrm{HV}, h_{n}(t)$ is the space headway difference between the $n$-1th vehicle and the $n$th vehicle at moment $t$, 

然后使用文献中的数据来校准HV 的参数

determines the value range of parameters in the analysis of the real vehicle driving data in the literature [50],

 the reference of the car-following model parameters of drivers with different personalities calibrated in literature [40,48], fosters the determination of various driver model parameters in this paper in Table 4.

### CACC model

path model
$$
\left\{\begin{array}{l}
v_{n}(t+\Delta t)=v_{n}(t)+k_{p} e_{n}(t)+k_{d} \dot{e}_{n}(t) \\
e_{n}(t)=h_{n}(t)-l-s_{0}-t_{c} v_{n}(t)
\end{array}\right.
$$


<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/3B2E7D06-71F2-485E-8271-08CD88F68859.jpg" alt="Screen Shot 2023-03-03 at 20.23.37" style="zoom:33%;" />

$e_{n}(t)$ is the error between the actual space headway and the desired space headway of the vehicle $n$ at time $t, \dot{e}_{n}(t)$ is the differential of $e_{n}(t), t_{c}$ is the headway that CACC expects to maintain, $k_{p}$ and $k_{d}$ are the control error parameters. The values of the coefficients are determined in the results of the real vehicle calibration in California PATH in Table 5 [18].

## Fundamental diagram

在均衡态，所有车在均衡速度$v_e$ 
$$
\left\{\begin{array}{l}
v=v_{e} \\
\Delta v=0 \mathrm{~m} / \mathrm{s} \\
\dot{v}=0 \mathrm{~m} / \mathrm{s}^{2}
\end{array}\right.
$$

$$
\begin{aligned}
h_{H i} & =\frac{s_{0}+v_{e} T_{i}}{\sqrt{1-\left(v_{e} / v_{0}\right)^{4}}}+l \\
h_{C} & =v_{e} t_{C}+l+s_{0}
\end{aligned}
$$

$$
h_{m}=P_{C} h_{C}+\sum_{i=1}^{3} P_{i} h_{H i}
$$

用概率的表达方式，$h_m$ 是一个平均值
$$
\left\{\begin{array}{l}
k=\frac{1000}{h_{m}}=\frac{1000}{P_{C}\left(t_{c} v_{e}+s_{0}+l\right)+\sum_{i=1}^{3}\left[P_{i} \times\left(\frac{s_{0}+v_{e} T_{i}}{\sqrt{1-\left(v_{e} / v_{0}\right)^{4}}}+l\right)\right]} \\
q=k \times v_{e}
\end{array}\right.
$$
k 是density 

## Stability analysis

随着稳定性的降低，当发生相同程度的交通扰动时，扰动的振幅、传播范围和持续时间均增大，进而导致交通拥堵[54]。本节从跟车模型的总体结构出发，构建了异构交通流稳定性的分析框架。

With the decrease of stability, when the same degree of traffic disturbance occurs, the disturbance amplitude, propagation range, and duration of the disturbance increase, in turn resulting in traffic congestion [54]. Starting from the general structure of the car-following model, this section constructs the analytical framework of the heterogeneous traffic flow stability.



### Traffic flow stability analysis framework

the unstable discriminant condition of the heterogeneous traffic flow：
$$
F F=\sum_{\kappa}^{\alpha}\left[\left(\frac{\left(f_{\kappa}^{v}\right)^{2}}{2}-f_{\kappa}^{\Delta v} \cdot f_{\kappa}^{v}-f_{\kappa}^{h}\right)\left(\prod_{\gamma \neq \kappa} f_{\gamma}^{h}\right)^{2}\right]<0
$$

$$
\left\{\begin{array}{l}
f_{\kappa}^{v}=\left.\frac{\partial f_{\kappa}\left(v_{n}(t), h_{n}(t), \Delta v_{n}(t)\right)}{\partial v_{n}(t)}\right|_{\left(V\left(h^{*}\right), h^{*}, 0\right)} \\
f_{\kappa}^{\Delta v}=\left.\frac{\partial f_{\kappa}\left(v_{n}(t), h_{n}(t), \Delta v_{n}(t)\right)}{\partial \Delta v_{n}(t)}\right|_{\left(V\left(h^{*}\right), h^{*}, 0\right)} \\
f_{\kappa}^{h}=\left.\frac{\partial f_{\kappa}\left(v_{n}(t), h_{n}(t), \Delta v_{n}(t)\right)}{\partial h_{n}(t)}\right|_{\left(V\left(h^{*}\right), h^{*}, 0\right)}
\end{array}\right.
$$

### homogeneous traffic flow

When $\alpha=1$ in Eq. (10), it degenerates to the unstable discriminant condition of the homogeneous traffic flow Eq. (12).
$$
f f_{\kappa}=\left(\frac{\left(f_{\kappa}^{v}\right)^{2}}{2}-f_{\kappa}^{v} \cdot f_{\kappa}^{\Delta v}-f_{\kappa}^{h}\right)<0
$$

$$
\left\{\begin{array}{l}
f_{H i}^{v}=-\frac{4 a_{m i} v^{3}}{v_{0}^{4}}-\frac{2 a_{m i} T_{i}\left[1-\left(v / v_{0}\right)^{4}\right]}{s_{0}+v T_{i}} \\
f_{H i}^{\Delta v}=\sqrt{\frac{a_{m i}}{b_{m i}} \frac{v\left[1-\left(v / v_{0}\right)^{4}\right]}{s_{0}+v T_{i}}} \\
f_{H i}^{h}=2 a_{m i} \frac{\left[1-\left(v / v_{0}\right)^{4}\right]^{\frac{3}{2}}}{s_{0}+v T_{i}}
\end{array}\right.
$$

![Screen Shot 2023-03-04 at 09.36.35](file:///Users/kounarushi/mycode/web-blog/public/.pic/B0017020-117C-470D-83A0-6429AE793967.jpg)

CACC ff value 始终大于0

### Heterogeneous traffic flow stability analysis

$$
\begin{aligned}
& F F=P_{C}\left[\frac{\left(f_{C}^{v}\right)^{2}}{2}-f_{C}^{v} f_{C}^{\Delta v}-f_{C}^{h}\right]\left[\left(f_{C}^{h}\right)^{-1} f_{H 1}^{h} f_{H 2}^{h} f_{H 3}^{h}\right]^{2} \\
& +P_{\text {pos }}\left[\frac{\left(f_{H 1}^{v}\right)^{2}}{2}-f_{H 1}^{v} f_{H 1}^{\Delta v}-f_{H 1}^{h}\right]\left[f_{C}^{h}\left(f_{H 1}^{h}\right)^{-1} f_{H 2}^{h} f_{H 3}^{h}\right]^{2} \\
& +P_{\text {neu }}\left[\frac{\left(f_{H 2}^{v}\right)^{2}}{2}-f_{H 2}^{v} f_{H 2}^{\Delta v}-f_{H 2}^{h}\right]\left[f_{C}^{h} f_{H 1}^{h}\left(f_{H 2}^{h}\right)^{-1} f_{H 3}^{h}\right]^{2} \\
& +P_{\text {neg }}\left[\frac{\left(f_{H 3}^{v}\right)^{2}}{2}-f_{H 3}^{v} f_{H 3}^{\Delta v}-f_{H 3}^{h}\right]\left[f_{C}^{h} f_{H 1}^{h} f_{H 2}^{h}\left(f_{H 3}^{h}\right)^{-1}\right]^{2}<0
\end{aligned}
$$