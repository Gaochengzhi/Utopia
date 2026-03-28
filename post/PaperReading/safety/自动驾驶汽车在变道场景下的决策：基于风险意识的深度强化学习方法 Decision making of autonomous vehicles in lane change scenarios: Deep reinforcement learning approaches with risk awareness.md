# 自动驾驶汽车在变道场景下的决策：基于风险意识的深度强化学习方法 Decision making of autonomous vehicles in lane change scenarios: Deep reinforcement learning approaches with risk awareness

## Highlights

该文提出一种基于深度强化学习的变道决策框架。

该文提出一种基于概率模型的风险评估方法，用于评估驾驶风险。

为自动驾驶制定了具有最小预期风险的风险感知策略。

所提出的方法在静态和移动场景下都具有优异的变道驾驶性能。

## Introduction

Existing methods for driving decision making

1. **Motion planning based methods：**依赖于图形的生成方式（不违反物理约束），并且没有充分考虑车辆动力学，因此生成的路径可能与动力学不兼容，运动规划中使用的一些运动约束通常是非线性和非凸的，这可能会导致NP-hard。
2. 基于风险评估的方法通常采用以下两个步骤来保证驾驶安全：1）评估当前驾驶状态的风险，2）根据风险评估结果制定顺序行动策略，以保持安全。目前，风险评估通常使用两类方法，包括确定性方法和概率方法。
   1. 确定性方法是一种二元预测方法，它只估计是否会发生潜在的碰撞。传统上，研究人员使用特定的安全指标来评估风险，例如碰撞时间 （TTC）、制动时间 （TTB） 或前进时间 （THW）这些方法几乎无计算负担，可以准确评估单车道场景下纵向行驶中的威胁风险（Kim and Kum，2018）。然而，它们在多车道场景中的表现大多不令人满意，并且没有考虑输入数据的不确定性，这使得推导的策略在实际应用中不实用。
   2. 概率方法通常利用概率描述，通过使用车辆之间的时间和空间关系以及输入数据的不确定性来对风险水平进行建模。
3. Learning based methods
   1. 条件模仿学习方法，以生成驾驶策略作为司机来处理感觉运动协调。对导航命令的持续响应有助于做出决策，以成功避开实验中的障碍物。即使是目前最大的自然驾驶数据集（例如，KITTI，BDD100K）也缺乏碰撞或接近碰撞的样本（Geiger et al.， 2012， Yu et al.， 2018），这使得当前的自动驾驶汽车难以处理这些危险情况
   2. 深度强化学习,许多基于DRL的决策方法没有充分考虑驾驶风险。

#### 3.1. 风险评估

与仅预测二元潜在风险（发生或不发生）的方法不同，我们的风险评估方法将估算不同风险水平下的具体概率。本研究中使用的三个风险级别定义如下：
$$\Omega \equiv \{ \text{危险}, \text{关注}, \text{安全} \} \equiv \{D, A, S\}$$
其中 $\Omega$ 为风险级别的集合。分别给 $\Omega$ 中的 $D$、$A$ 和 $S$ 分配 2、1 和 0 的分数，以描述风险级别。因此，风险等级 $\tau$ 定义为：
$$\tau \in \Omega \equiv \{2, 1, 0\}$$

为了基于非确定性理论对风险进行建模，我们考虑了相对位置 $d$ 和不确定性 $\sigma$，并使用基于安全指标的分布来计算不同风险水平下的条件概率。然后，使用贝叶斯推理来评估每个给定状态的风险水平。

使用相对位置 $d$ 的基于安全指标的分布可以计算如下：
$$
P(d|\tau=D) \equiv 1, \quad \text{若} \, d<d_D; \quad e^{-\frac{\Delta d_D^2}{2\sigma^2}}, \quad \text{否则}
$$

$$
P(d|\tau=A) \equiv e^{-\frac{\Delta d_A^2}{2\sigma^2}}
$$

$$
P(d|\tau=S) \equiv e^{-\frac{\Delta d_S^2}{2\sigma^2}}, \quad \text{若} \, d>d_S; \quad 1, \quad \text{否则}
$$

$$\Delta d_i \equiv d - d_i, \, i \in \Omega$$
其中 $d$ 表示主机车辆 (HV) 与其它车辆 (OV) 之间的相对距离，$d_D$、$d_A$和$d_S$ 是驾驶风险评估的预定义阈值。

使用贝叶斯理论，特定风险水平 $\tau$ 的后验概率可以计算为：
$$
P(\tau|d) = \frac{P(d|\tau) \cdot P(\tau)}{\sum_{\tau \in \Omega} P(\tau) \cdot P(d|\tau)}
$$
其中 $P(\tau|d)$ 表示给定状态 $d$ 下特定风险水平的概率，$P(d|\tau)$ 是从上述等式得到的条件概率，$P(\tau)$ 是每个风险水平的先验概率。在这项研究中，假设不同的风险水平具有相同的先验概率，并具有约束 $\sum_{\tau \in \Omega} P(\tau) = 1$。

#### 3.2. 带最小风险的决策制定

为了找到具有最小风险的安全驾驶策略，应将风险评估结果引入基于DRL的方法中。然而，上述离散的风险评估结果（即 $P(\tau|d)$）不能直接引入DRL方法。为解决这个问题，以风险等级 $\tau$ 为基础定义了一个连续的风险系数 $\epsilon$ 如下：
$$
\epsilon \equiv E_{\tau} = \sum_{\tau \in \{2,1\}} \tau \cdot P(\tau|d)
$$
其中 $\tau$ 是式中描述的离散风险等级，而 $\epsilon$ 代表评估风险的期望值。
通过量化连续值来表示驾驶风险，将使用最小预期风险的策略表示为：
$$
\pi^*_s \equiv \underset{\pi}{\arg\min} E_{\pi} \left[\sum_{i=0}^{\infty} \gamma^i \epsilon_{t+i} | s_t = s \right]
$$
等效转换可以写成如下形式：
$$
\pi^*_s \equiv \underset{\pi}{\arg\max} E_{\pi} \left[\sum_{i=0}^{\infty} \gamma^i(\max \epsilon - \epsilon_{t+i})|s_t = s\right]
$$
其中 $\max \epsilon$ 表示定义的最大风险值。根据式中的定义，我们可以得出 $\max \epsilon = 2$。

与方程 [(2)](#e0010) 相比较，可以发现当 $r_{t+i} = \max \epsilon - \epsilon_{t+i}$ 时，方程 [(16)](#e0080) 有相同的格式，这意味着可以通过使用基于DRL的方法找到预期风险最小的最佳策略。相应的Q值函数定义为：
$$
Q_{\pi}(s,a) = E_{\pi} \left[\sum_{i=0}^{\infty} \gamma^i(\max \epsilon - \epsilon_{t+i})|s_t = s, a_t = a\right]
$$

