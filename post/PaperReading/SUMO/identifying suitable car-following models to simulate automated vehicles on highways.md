# identifying suitable car-following models to simulate automated vehicles on highways

```shell
Kim B, Heaslip K P. Identifying suitable car-following models to simulate automated vehicles on highways[J]. International Journal of Transportation Science and Technology, 2023.
```

## Abstract

highD to calibrate MIXIC



## Car-following-Models 

The IDM was developed by Treiber et al., (Treiber et al., 2000). This model is an accident-free and complete model that can respond to all traffic situations. IDM assumes that the acceleration is determined by space gap, actual velocity, and velocity difference. The latest form of IDM is as follows:
$$
\begin{aligned}
& a_{I D M}(s, v, \Delta v)=a\left[1-\left(\frac{v}{v_0}\right)^\delta-\left(\frac{s^*(v, \Delta v)}{s}\right)^2\right] \\
& s^*(v, \Delta v)=s_0+\max \left(0, v T_0+\frac{v \Delta v}{2 \sqrt{a b}}\right)
\end{aligned}
$$
Where:
$a$ Maximum acceleration.
$v$ Current speed
$v_0$ Desired speed.
$\Delta v$ Speed difference between leading and following vehicle.

$s$ Space gap between leading and following vehicle.
$s_0$ Desired standstill distance.
$T_0$ Desired time-gap.
$b$ Leading vehicle's desired deceleration.



The model parameter $\delta$, also called the acceleration exponent, represents the acceleration reduction rate when the vehicle nearly approaches the desired speed. In the original study of Treiber et al., (Treiber et al., 2000), the $\delta$ was 4 and many other studies have used 4 as a default value.

###  Improved IDM and constant-acceleration heuristic ( $\mathrm{CAH})$



Improved IDM (IIDM) and Constant-Acceleration Heuristic (CAH) approaches were developed to overcome the limitation of the IDM model (Treiber and Kesting, 2013). According to the previous studies, IDM shows unrealistic behavior in some cases:

- When the actual speed exceeds the desired speed, the deceleration is unrealistically large, especially when the model parameter $(\delta)$ is large
- When the actual speed is near the desired speed, the desired time gap $(T)$ becomes unrealistically large and loses its meaning
- When the actual space gap is significantly smaller than the desired space gap, the braking reaction is exaggerated
IIDM can treat the first two limitations, while CAH can handle the third limitation. First, to improve the behavior when the current speed is larger than the desired speed, the model restricts the deceleration rate. If there are no interactions with the leading vehicle or obstacles, the vehicle does not need to brake hard. Therefore, the acceleration part of the IDM can be re-written as follows:
$$
a_{\text {free }}(v)= \begin{cases}a\left[1-\left(\frac{v}{v_0}\right)^\delta\right] & \text { if } v \leq v_0 \\ b\left[1-\left(\frac{v_0}{v}\right)^{\frac{d j}{b}}\right] & \text { if } v>v_0\end{cases}
$$
Next, to improve the behavior at, or near, the desired speed, the model strictly set the IDM's desired space gap ( $\left.s_0+v T\right)$. To solve the problem, the model divides into two conditions: the ratio of the actual space gap and the desired space gap ( $z$, see (4)) is less than 1 , and $z$ is greater or equal to 1 .
$$
z=\frac{s^*(v, \Delta v)}{s}
$$
To summarize, the IIDM comprises four regimes by comparing speed - desired speed and space gap - desired space gap. The following equations show the equation of IIDM under different regimes.
$$
\begin{aligned}
\left.\frac{d v}{d t}\right|_{v \leq \nu_0} & = \begin{cases}a\left(1-z^2\right) & z \geq 1 \\
a_{\text {free }}\left(1-z^{(2 a) / a_{\text {frec }}}\right) & \text { otherwise }\end{cases} \\
\left.\frac{d v}{d t}\right|_{v>v_0} & = \begin{cases}a_{\text {free }}+a\left(1-z^2\right) & z \geq 1 \\
a_{\text {free }} & \text { otherwise }\end{cases}
\end{aligned}
$$
Unlike the first and second limitations of IDM, the third limitation is intended to prevent any collisions in the worst case, when the preceding vehicle suddenly breaks to a complete standstill. However, in congested traffic, the desired space gap could be larger than the actual space gap, but the drivers believe that the preceding vehicle will not brake hard. Therefore, the previous research suggested plausible driving behavior, $\mathrm{CAH}$, to overcome the overreacting behavior when the desired space gap is larger than the actual space gap. The $\mathrm{CAH}$ assumes the following conditions:
- The accelerations of the object and the leading vehicle will not change in the near future
- No safety time-headway or safety space-headway is required at this moment
- Drivers or vehicles react without perception-reaction time
$$
\begin{aligned}
& a_{C A H}= \begin{cases}\frac{v^2 \tilde{a}_l}{v^2-2 s a_l} a\left(1-z^2\right) & \text { if } v_l\left(v-v_l\right) \leq-2 s \tilde{a}_l \\
\tilde{a}_l-\frac{(v-v)^2 \Theta(v-v)}{2 s} & \text { otherwise }\end{cases} \\
& \tilde{a}_l=\min \left(v_l, a\right)
\end{aligned}
$$
Where:
$\tilde{a}_{n-1}$ The effective acceleration.

## Modeling method

The whole dataset contains 60 files and each file was collected in approximately 17 minutes of duration. The dataset was collected by drones with 4K cameras (4096  2160 pixels, 25 fps, which corresponds to 0.04 seconds per image)

The dataset contains approximately 110,000 vehicle records from six different German highways. Each segment length is 460 m (1,509 ft), and the position error is less than 10 cm (0.3 ft). Due to its accu- racy and recency, this study uses HighD to investigate traffic flow and calculate AV trajectories. Since the dataset is extensive, the study used random sampling method to reduce the datapoint. A total of 43,503 lead-follow pairs with 9,528,509 data points were used for the analysis.