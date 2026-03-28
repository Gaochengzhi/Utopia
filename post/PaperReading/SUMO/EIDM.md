# Extending the Intelligent Driver Model in SUMO and Verifying the Drive Off Trajectories with Aerial Measurements

```shell
Research Institute of Automotive Engineering and Vehicle Engines Stuttgart (FKFS), Germany
2
IT-Designers GmbH, Esslingen, Germany
3 University of Stuttgart – Institute of Automotive Engineering (IFS), Germany
```

## Abstract

* Need: 

  * Due to implementation issues and missing infrastructure, the impact of connected and automated vehicles on the traffic flow can only be evaluated in accurate simulations. 智能驾驶对交通流的影响难以在现实中实验，只能仿真。

  * Cannot realistically imitate human driving behavior. When simulating queued vehicles driving off, existing car-following models are neither able to correctly emulate the acceleration behavior of human drivers nor the resulting vehicle gaps

    目前sumo 跟车模型有缺陷。

* Contribution

  * we propose a time-discrete 2D Human Driver Model to replicate realistic trajectories. We start off by combining previously published extensions of the Intelligent Driver Model (IDM) to one generalized model. Discontinuities due to introduced reaction times, estimation errors and lane changes are conquered with new approaches and equations
  
    我们对IDM 跟驰模型的改进
  
  * 30 minutes of an aerial measurement 使用了航拍数据来标定参数
  
## Intro

They show that the original IDM is particularly well equipped to replicate automated driving, while the human driving behavior is either simulated using the Two Velocity Difference Model (Derbel et al. 2012) or the Full Velocity Difference Model (Zhou et al. 2016).

Krauss: despite producing unrealistic acceleration and jerk patterns.

## 3 回顾原版IDM 算法和对它的诸多改进

### 3.1 Improved Intelligent Driver Model

注意： leader 才是n 

<img src="file:///Users/kounarushi/mycode/web-blog/public/.pic/6B2A3CCF-CC53-40F9-B32A-2466CDF4BC50.jpg" alt="Screen Shot 2023-02-27 at 17.14.51" style="zoom: 33%;" />  

- the desired time headway $T$,

- the maximum acceleration $a_{\max }$, 

- the desired deceleration $b$, 

- the minimum gap $s_{0}$ and the acceleration exponent $\delta$. 




The desired gap and acc:

$$
s_{n-1}^{*}(t)=s_{0}+\max \left(0, v_{n-1}(t) * T-\frac{v_{n-1}(t) *\left(v_{n}(t)-v_{n-1}(t)\right)}{2 * \sqrt{a_{\max } * b}}\right)
$$



$$
a_{I D M}(t+\Delta t)=a_{\max }\left[1-\left(\frac{v_{n-1}(t)}{v_{0}(t)}\right)^{\delta}-\left(\frac{s_{n-1}^{*}(t)}{s(t)}\right)^{2}\right]
$$
the desired gap $s_{n-1}^{*}(t)$ and the actual gap $s(t)$. 

但是这个公式不允许后面的车辆在相同的交通条件下达到所需的速度，并导致更大的gap。

The Improved Intelligent Driver Model (IIDM)  针对这个问题的改进。

EIDM without using the case distinction of the IIDM, but by linearizing the changes in the desired velocity $v_{0}(t)$ (see Section 3.4). The following equation of the resulting acceleration $a(t+\Delta t)$ further differs from that of the IIDM. Instead of calculating the exponent with $a_{f r e e}(t)$, its absolute value is used. 

The EIDM calculate  $a_{\text {free }}(t)$ by differentiating between two cases: $v_{n-1}(t) \leq v_{0}$ and $v_{n-1}(t)>v_{0}$. 


$$
a_{\text {free }}(t)=a_{\text {max }}\left[1-\left(\frac{v_{n-1}(t)}{v_{0}(t)}\right)^{\delta}\right]
$$

$$
a(t+\Delta t)= \begin{cases}a_{\max }\left[1-\left(\frac{s_{n-1}^{*}(t)}{s(t)}\right)^{2}\right] & s_{n-1}^{*}(t) \geq s(t) \\ a_{\text {free }}(t)\left[1-\left(\frac{s_{n-1}^{*}(t)}{s(t)}\right)^{\frac{2 * a_{\max }}{\left|a_{\text {free }}(t)\right|}}\right] & \text { otherwise }\end{cases}
$$
differentiates between two cases: driving at distances lower than the desired gap and higher than the desired gap.

### 3.2 Human Driver Model

用于模拟人类驾驶员，they introduced：

- reaction time
- imperfect estimation capabilities 
- temporal and spatial anticipation

SUMO 使用离散时间，而IDM 是连续公式，计算所有之前时间的反应点消耗大量内存，而且 be carefully calibrated to stay stable

所以发明了Action Points (APs). Simulating with APs implies that the driver can instantaneously process any information at the action time 𝑡𝐴𝑃. Between two APs, the model uses the variables from the last AP update

estimation errors 使用维纳过程 Wiener process:

step $i$, using the correlation time $\tilde{\tau}$, a randomized number $\eta_{i}$ of variance 1 and the time step $\Delta t$ of SUMO:
$$
w_{i}=e^{-\frac{\Delta t}{\tilde{\tau}}} * w_{i-1}+\sqrt{\frac{2 \Delta t}{\tilde{\tau}}} * \eta_{i}
$$
The variable $w_{i}$ is then used to calculate the estimated distance $s^{e s t}(t)$, the estimated velocity of the leader $v_{n}^{\text {est }}(t)$ and a driving error $\sigma_{a} w_{a}(t)$, which is added to the acceleration term. 

In equations (6), (7) and (8), the variables $w_{s}(t), w_{n}(t), w_{a}(t)$ are the corresponding Wiener processes, represented in (5). The parameters $V_{s}$, $\sigma_{r}$ and $\sigma_{a}$ describe the respective magnitude of the errors.
$$
\begin{aligned}
s^{e s t}(t) & =s(t) * e^{V_{s} w_{s}(t)} \\
v_{n}^{e s t}(t) & =-s(t) \sigma_{r} w_{n}(t)+v_{n}(t) \\
\tilde{a}(t) & =a(t)+\sigma_{a} w_{a}(t)
\end{aligned}
$$
驾驶员预计前车速度：
$$
\begin{aligned}
& v_{n-1}^{\text {pred }}(t)=v_{n-1}^{\text {est }}\left(t-t_{A P}\right)+t_{A P} * a\left(t-t_{A P}\right) \\
& v_{n}^{\text {pred }}(t)=v_{n}^{\text {est }}\left(t-t_{A P}\right) \\
& s^{\text {pred }}(t)=s^{e s t}(t)-t_{A P} * \Delta v_{n-1}^{e s t}\left(t-t_{A P}\right)
\end{aligned}
$$

### 3.3 EIDM

首先是改进了原版IDM 的变道模型，避免了变道时间隙缩小的瞬时减速。

A new equation calculates the Constant Acceleration Heuristic (CAH) $a_{C A H}(t)$ as follows, taking the acceleration $a_{n}(t)$ of the leader into account.
$$
\begin{aligned}
& a_{C A H}(t)=\left\{\begin{array}{lc}
\frac{v_{n-1}^{2} \tilde{a}_{n}}{v_{n}^{2}-2 \mathrm{~s}(\mathrm{t}) \tilde{a}_{n}} & v_{n}\left(v_{n-1}-v_{n}\right) \leq-2 \mathrm{~s}(\mathrm{t}) \tilde{a}_{n} \\
\tilde{a}_{n}-\frac{\left(v_{n-1}-v_{n}\right)^{2} \theta}{2 \mathrm{~s}(\mathrm{t})} & \text { otherwise }
\end{array}\right. \\
& \theta= \begin{cases}0 & v_{n-1}-v_{n}<0 \\
1 & v_{n-1}-v_{n} \geq 0\end{cases} \\
& \tilde{a}_{n}=\min \left(a_{n}(t), a_{\max }\right)
\end{aligned}
$$
$\theta$ is the Heaviside step function. The CAH-model cannot operate as a stand-alone model, it is used as an extension of the IDM. The acceleration $a_{A C C}$ is calculated using the new coolness parameter $c_{A C C}$, with values between 0 and 1. It describes how "cool" a driver reacts when gaps are reduced.
$$
a_{A C C}= \begin{cases}a_{I D M} & a_{I D M} \geq a_{C A H} \\ \left(1-c_{A C C}\right) a_{I D M}+c_{A C C}\left[a_{C A H}+b * \tanh \left(\frac{a_{I D M}-a_{C A H}}{b}\right)\right] & \text { otherwise }\end{cases}
$$

### 3.4 更多EIDM 改进

低速下加速度跳变，驾驶员无法保证smooth 维持min gap 动作：
$$
s_{n-1}^{*}(t)=\left\{\begin{array}{lc}
s(t)+0.05 & s_{n-1}^{*}(t)<s(t)<s_{0}+\gamma \\
s_{n-1}^{*}(t) & \text { otherwise }
\end{array}\right.
$$
速度限制改变后：
$$
v_{0}^{\text {int }}(t)=\left\{\begin{array}{lc}
v_{0}^{\text {int }}-\left(v_{0}^{i}-v_{0}^{i+1}\right) * \Delta t / T_{\text {prev }} & \mathrm{s}^{i}(\mathrm{t})<T_{\text {prev }} * v_{n-1} / 2 \\
v_{0} & \text { otherwise }
\end{array}\right.
$$