# Fundamental diagram and stability of mixed traffic flow considering platoon size and intensity of connected automated vehicles

```sehll
from Physica A
Zhihong Yao a,b,c, Qiufan Gu a, Yangsheng Jiang a,b,c,∗, Bin Ran d
```

## Abstract

对异质交通流的数学建模，贡献

(1) a greater platoon size leads to the increase of traffic capacity while it is harmful to the maintenance of traffic flow stability;

(2) the platoon size is recommended to be set at 4 to 6 to balance the relationship between traffic capacity and stability; 

(3) a more significant platoon intensity can help improve the traffic capacity and stability; 

(4) the penetration rate of CAVs has a positive effect on the traffic flow stability until it increases to a certain degree.

## Intro

However, CVs strongly depend on a high penetration rate, and AVs cannot predict the driving behavior of multiple vehicles ahead [6,7].

## Mixed traffic flow model

$$
T=\left[\begin{array}{cc}
t_{A A} & t_{A H} \\
t_{H A} & t_{H H}
\end{array}\right]
$$

$$
\begin{aligned}
& t_{A H}\left(P_{A}, P I\right)=\operatorname{Pr}\left(A_{n+1}=\operatorname{HDV} \mid A_{n}=\mathrm{CAV}\right)= \begin{cases}P_{H}(1-P I), & P I \geq 0 \\
P_{H}+P I\left(P_{H}-\min \left\{1, \frac{P_{H}}{P_{A}}\right\}\right), & P I<0,\end{cases} \\
& t_{A A}\left(P_{A}, P I\right)=\operatorname{Pr}\left(A_{n+1}=\mathrm{CAV} \mid A_{n}=\mathrm{CAV}\right)=1-t_{A H}\left(P_{A}, P I\right),
\end{aligned}
$$

$$
\begin{aligned}
t_{H A}\left(P_{A}, P I\right) & =\operatorname{Pr}\left(A_{n+1}=\operatorname{CAV} \mid A_{n}=\mathrm{HDV}\right)= \begin{cases}P_{A}(1-P I), & P I \geq 0 \\
P_{A}+P I\left(P_{A}-\min \left\{1, \frac{P_{A}}{P_{H}}\right\}\right), & P I<0,\end{cases} \\
t_{H H}\left(P_{A}, P I\right) & =\operatorname{Pr}\left(A_{n+1}=\mathrm{HDV} \mid A_{n}=\mathrm{HDV}\right)=1-t_{H A}\left(P_{A}, P I\right) .
\end{aligned}
$$

### Cooperative adaptive cruise control mode

$$
\left\{\begin{array}{l}
v_{n}(t+\Delta t)=v_{n}(t)+k_{p} e_{n}(t+\Delta t)+k_{d} \dot{e}_{n}(t+\Delta t) \\
e_{n}(t+\Delta t)=x_{n-1}(t)-x_{n}(t)-l-S_{0}-T_{A A_{-} \text {intra }} v_{n}(t) .
\end{array}\right.
$$

$$
a_{n}(t)=\frac{k_{p}\left(\Delta x_{n}(t)-l-S_{0}-T_{A A \_ \text {intra }} v_{n}(t)\right)+k_{d} \Delta v_{n}(t)}{\Delta t+k_{d} T_{A A \_i n t r a}}
$$

![Screen Shot 2023-03-06 at 19.28.14](file:///Users/kounarushi/mycode/web-blog/public/.pic/4106D2AF-9729-4B5E-85D4-6FE06A8616FE.jpg)

## Fundamental diagram

In a word, the space headway in the mixed traffic flow steady state depends on the vehicle types.
