# **Continuous improvement of self-driving cars using dynamic confidence-aware reinforcement learning**

```shell
Cao Z, Jiang K, Zhou W, et al. Continuous improvement of self-driving cars using dynamic confidence-aware reinforcement learning[J]. Nature Machine Intelligence, 2023, 5(2): 145-158.
```

## Abstract 

自动驾驶效果出色，但长尾效应不容忽视。

更多的数据不一定会有更好的效果  Training a reinforcement-learning-based self-driving algorithm with more data does not always lead to better performance, which is a safety concern

提出了一种 dynamic confidence-aware reinforcement learning (DCARL) 来逐渐提升效果，更多的训练永远会有更好的效果。

使用在行驶中的数据，不需要漫长的预训练。

## intro 

对未知不确定性的场景，学习的效果有很大的风险。

* a data-driven agent usually requires a very long training time and the performance after training is not guaranteed
* the trained agent may not outperform existing rule-or model-based policies11 for a previously unseen scenario. 

经典RL 框架注重性能提升，但实际情况中更注重安全。

The classical RL framework in the literature also considers safety and aims at performance improvement, but in practice, more training does not always lead to better or safer performance

对于注重安全的RL 框架，经典的做法是解一个有约束马尔科夫决策过程问题。这些方法通常需要每个策略违反约束的概率，但数据不足或模型不准确可能会造成较大的误差，可能导致这些方法失败。

In safe RL research, a widely used idea is to solve the constrained Markov decision process problem to make each updated policy satisfy the given constraints24. These methods usually need each policy’s probability of violating constraints, but insufficient data or inaccurate models may cause large errors, possibly leading to the failures in these methods. 

[DAgger Versus SafeDAgger](https://danieltakeshi.github.io/2020/11/07/safe-dagger/)

相较于 DAgger or SafeDAgger aim to train the policy to approach an expert policy 我们的方案鼓励deviate from the baseline

The worst confidence value (WCV) of a policy is defined：

$\forall s \in \mathcal{S}, \forall \pi \in \boldsymbol{\Pi}, \quad Q_{\pi}^{-}(s, \pi(s), \mathcal{D}) \in Q_{\delta}^{-}(s, \pi(s), \mathcal{D})$,

where $Q_{\delta}^{-}(s, \pi(s), \mathcal{D})=\left\{q \in \mathbf{R} \mid P\left(\tilde{Q}_{\pi}(s, \pi(s)) \geq q \mid \mathcal{D}\right) \geq 1-\delta\right\}$

We further calculate the best confidence value (BCV)  $Q_{\pi_{0}}^{+}\left(s, \pi_{0}(s), \mathcal{D}\right)$ of $\pi_{0}$ as the threshold to activate the trained RL policy
$$
\forall s \in \mathcal{S}, \forall \pi, \forall \mathcal{D}_{k}, P\left(Q_{\pi}^{-}\left(s, \pi(s), \mathcal{D}_{k+1}\right) \geq Q_{\pi}^{-}\left(s, \pi(s), \mathcal{D}_{k}\right)\right) \geq 1-\delta_{k}
$$



When the data are insufficient, the large BCV can avoid the unreasonable activation of the RL agent. Thus, the DCARL can be no worse than the original policy at different training stages, shown as follows:

$$
\begin{aligned}
& \pi_{c i}(s, \mathcal{D}): \arg \max _{\pi \in \Pi}\left(Q_{\pi}^{c}(s, \pi(s), \mathcal{D})\right), \\
& Q_{\pi}^{c}(s, \pi(s), \mathcal{D})=\left\{\begin{array}{l}
Q_{\pi}^{-}(s, \pi(s), \mathcal{D}), \pi \neq \pi_{0} \\
Q_{\pi_{0}}^{+}\left(s, \pi_{0}(s), \mathcal{D}\right), \pi=\pi_{0}
\end{array}\right.
\end{aligned}
$$

## Our approach

The algorithms to achieve the DCARL agent consist of three parts:

1. an existing self-driving algorithm

   as the original policy and the performance baseline It keeps fixed, **but its confidence value may change as training goes on,** using the same dataset with the RL training process

2. the dynamic confidence value updated through new training data 

   The function of this module is to estimate the WCV of the candidate policies and the BCV of the original policy, consisting of two steps. 

   	1. it estimates the maximum likelihood value (MLV) of the collected trajectories using the Monte Carlo principle with importance sampling rates. 
   	1. estimates the maximum possible error between the MLV and the actual value. The error due to insufficient training data can be estimated by the Lindeberg–Lévy theorem and bootstrapping principles. Namely, with more training data, training variance reduces, and there is lower error between the MLV and the actual value. With more training data, the WCV increases monotonical- ly while the BCV of the original policy continuously decreases.

3. the decision-making module

   When encountering a new driving case, the DCARL agent chooses the candi- date driving trajectory that has the maximal confidence value

   At the beginning of training, the original policy is used, as it is initialized with a large confidence value. 

   Then, other policies’ confidence values continue to increase and eventually some of them become higher than the original policy. That moment is called the activation time.

    After that, the agent deviates from the original policy. Achieving the activation level usually re- quires the agent’s repeatedly good performance in a case to avoid mistaken activation due to only a few occasionally good performances.

   

   