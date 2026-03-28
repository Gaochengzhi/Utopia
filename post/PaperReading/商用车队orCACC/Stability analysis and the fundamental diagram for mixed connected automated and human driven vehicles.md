# Stability analysis and the fundamental diagram for mixed connected automated and human driven vehicles

```shell
ZhihongYaoa b c e,RongHua b,YiWanga b,YangshengJianga b,BinRanc,YanruChend
selcihev nevird
EI检索 SCI基础版 物理3区 SCI Q2 SCIIF 3.78 SWUFE B
Physica A: Statistical Mechanics and its Applications
```

## Abstract

分别描述了 full velocity difference (FVD) model and cooperative adaptive cruise control (CACC) model 的 **car following driving behavior**, validated by PATH laboratory of University of California, Berkeley.

首先是混合交通流的稳定性研究，变量是CACC 渗透率。

然后是影响因子的基本图分析。

最后用仿真模拟验证模型。

## Intro

current limit: 1. using the same car-following model 2. different model but same fd plot 3. sensitivity analysis only consider few vars

key contribution:

(1) To consider the difference between the driving behavior of HDVs and CAVs, two car-following models (FDV and CACC) are used to describe HDVs and CAVs, respectively.

(2) To analysis the linear stability of the mixed traffic flow and some factors (e.g.,speed, penetration rate, and desired time headway) which affects the stability.

(3) To propose a new analytical fundamental diagram model of the mixed traffic flow and analysis the sensitivity parameters, such as penetration rate, free speed, minimum safe gap distance, and desired time headway.

(4) To design a simulation experiment to verify the validity and rationality of the proposed model. 

## Car following model

### Human-driven vehicles and CAVs

……

## Stability analysis

the control equations of all car-following models can be expressed by the following equation:

$\dot{x}=v$

$\dot{v}=f(v, \Delta v, \Delta x)$
$$
\left\{\begin{array}{l}
f_{v}=\left.\frac{\partial f(v, \Delta v, \Delta x)}{\partial v}\right|_{\left(V\left(\Delta x^{*}\right), 0, \Delta x^{*}\right)} \\
f_{\Delta v}=\left.\frac{\partial f(v, \Delta v, \Delta x)}{\partial \Delta v}\right|_{\left(V\left(\Delta x^{*}\right), 0, \Delta x^{*}\right)} \\
f_{\Delta x}=\left.\frac{\partial f(v, \Delta v, \Delta x)}{\Delta x}\right|_{\left(V\left(\Delta x^{*}\right), 0, \Delta x^{*}\right)}
\end{array}\right.
$$