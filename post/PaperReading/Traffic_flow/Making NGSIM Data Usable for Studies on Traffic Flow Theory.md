# Making NGSIM Data Usable for Studies on Traffic Flow Theory

## Abstract

NGSIM 数据集存在很多错误，需要修正。

这些技术没有适当地处理偏差的原因，并且仅限于消除影响，即数据中的高频率和中频干扰。

these techniques do not treat the cause of the bias appropriately and are limited to smoothing out the effects, which are the high and medium-frequency disturbances in the data

因此，在这项研究中，说明了导致NGSIM数据错误的机制，并展示了可用技术的局限性。然后，提供了需要特殊处理才能修复的极高误差（离群值）的澄清。提出了一个多步过滤过程，旨在(a)通过对车辆轨迹的局部重建消除导致加速度出现非物理值的离群值，以及(b)在仍保留驾驶动态的同时切断信号的残余随机干扰。两个操作都被执行，考虑到轨迹的内部一致性要求。

## Background and Motivation

研究了导致NGSIM数据错误的机制，包括数据重建、技术失败和重建方法的特征。通过数字验证，发现将测量点投影到道路车道对齐是消除空间行驶偏差的基本方法，但是这种方法并没有消除相同程度的噪音。NGSIM数据集中的加速度和减速率**存在不切实际的峰值**和随机扰动，这些错误在流量研究中无法使用，除非采取适当的处理方法。

以数据集中车辆1882的轨迹图 为例，先消除异常值，再平均化结果（低通滤波器，巴特沃斯滤波器）

需要使用多步过滤技术依次执行以下步骤：

- 去除异常值。
- 切断速度曲线中高频和中频响应。
- 去除残余的非物理加速度值并保持一致性要求。

最终切断从第3步产生的高频和中频响应。该程序是绝对通用的，可应用于任何车辆的轨迹。



