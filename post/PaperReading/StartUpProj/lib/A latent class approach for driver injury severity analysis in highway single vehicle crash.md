# A latent class approach for <u>driver injury severity analysis</u> in <u>highway single vehicle crash</u> considering unobserved heterogeneity and temporal influence

## Overview

* ### Why

  * Temporal variation - (major source) -> [unobserved heterogeneity](# unobserved heterogeneity) (need to be paid attention to)

* ### What

  * develop a [latent class](# latent class model，LCM) mixed **logit model** with **temporal indicators** - ( investigate ) - > **single-vehicle crashes** + effects of **significant contributing factors - (to) -> driver injury severity**

* ### How

  * Crash data: ( 2010 ~ 2016; Washington D.C ; 31,115 single-vehicle crashes )
  * A latent class random-parameter model with temporal indicators was motivated to incorporate the possible temporal variation as well as unobserved heterogeneity. 
    * latent class structure captures the across-class unobserved heterogeneity
    * the incorporated random parameters with heterogeneity relaxed the ability of traditional latent class models in capturing within class unobserved heterogeneity
    * temporal indicators in class probability function demonstrate the temporal variation in the effects of significant factors. The current study adds to the growing studies that contributing to temporal instability.

* ### Achieve

  * model (**two-class**) is able to interpret **within- & across- class unobserved heterogeneity + temporal variation**

* ### Find 

  * two temporal indicators (**male & driver’s age indicators** ) show significant influence on latent class probability functions
  * urban indicator and principle type are found to be random parameters
  * 


* ### backgroud

  * Single-vehicle crashes are more **fatality-concentrated**
  * Characteristically diffrenent from multi-vehicle crash

## Previous Studies review

|             Methods             |                         Applications                         |
| :-----------------------------: | :----------------------------------------------------------: |
|    multinomial logit models     | investigate effects of **significant factors** in single-vehicle crashes |
|       nested logit models       | address (✂️) the **endogenous correlations** among **severity outcomes** |
| ordered logit and probit models | considering the intuitive **ordering** (from 0 to death) of injury outcomes |

#### Problem:  

* temporal instability (params changing over time)
* in **driver injury severity analysis** domain, few efforts->  investigate heterogeneities of various impact factors introduced by temporal variation,
  *  i.e., single-vehicle crash injury severity analysis allowing time-varying interactions among variables

## Data

A total of 31,115 single-vehicle crash records were extracted, involving 131 fatality crashes, 534 serious injury crashes, 2474 evident injury crashes, 3485 possible injury crashes and 24,491 no injury crashes. 


* ### general crash information

  * crash severity in terms of **five accident-severity categories** (i.e., no injury, possible injury, evident injury, serious injury and fatality)
  * collision type
  * temporal information
  * county name
* ### environmental information


  * weather
  * surface condition
  * lighting condition 
  * speed limits
  * roadway characteristics
  * indicators for work zone

* ### vehicle information


  * vehicle type
  * vehicle age
  * airbag condition
  * ejection status

* ### driver and passenger information


  * age
  * gender
  * seat belt usage
  * license status
  * insurance
  * and passengers
  * restrain
  * sobriety conditions


## Methodology



## Results of data analysis





## Terminology

* #### unobserved heterogeneity

  * heterogeneity: variableility, e.g Teams different from others
  * is unobserved when we don't observed its cost
  * Impact: 
    * 

* #### latent class model，LCM

  * 在[统计学中](https://zh.wikipedia.org/wiki/统计学)，**潜在类别模型**（**latent class model，LCM** ），简称**潜类模型**，将一组观察到的（通常是离散的）多变量变量与一组[潜变量联系起来](https://zh.wikipedia.org/wiki/隐变量)（不能观察，只能推测出的变量） 。LCM是一种潜变量模型 。因为潜在变量是离散的，所以它被称为潜类模型。类的特征在于[条件概率](https://zh.wikipedia.org/wiki/条件概率)模式，其指示变量对特定值的可能性。

