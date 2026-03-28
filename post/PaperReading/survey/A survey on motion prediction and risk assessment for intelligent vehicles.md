# A survey on motion prediction and risk assessment for intelligent vehicles

## Abstract

* #### Major challenge:

  * **detect** & **react** dangerous situations

* #### Content:

  * a survey of **methods** for **motion prediction and risk assessment**

* #### Conclusion:

  1. **tradeoff** between **model completeness** & **real-time constraints**
  2. choice of a **risk assessment method**  $\underleftarrow{\ \ \ influences\ \ \ }$   the selected **motion model**

## Intro

This paper surveys **mathematical models** and their relation with **risk assessment**.

### Mathematical models

1. #### Physics-based:

   * simplest, only depends on the laws of physics

2. #### Maneuver-based:

   * consider the **future motion** of a vehicle $\underleftarrow{\ \ depends\ on\ \ }$ the **maneuver** (driver intends to perform)

3. #### Interaction-aware:

   * **inter-dependencies** between vehicles’ maneuvers
   
     

### Classifiction of risk

1. **physical collsions** between entities. 

2. vehicles **behaving differently** from what is **expected** of them given the context (e.g. according to traffic rules).

## **Physics-based** motion models

* Represent vehicles as **dynamic entities** governed by the laws of physics
* Future motion is predicted using **dynamic and kinematic models** linking some parameters
  * control inputs: steering, acceleration...
  * car properties: weight...
  * external conditions: friction coefficient of the road surface

* Limited to **short-term** (< 1s) motion prediction, **unable** to anticipate any change in the motion of the car caused by the **execution of a particular maneuver**

### 2 Evolution models

* **Dynamic models**
  * Based on Lagrange’s equations, condisder different forces that affect the motion of a vehicle
  * Complex, used in control-oriented applications
* **Kinematic models**
  * Based on the parameters of the movement (e.g. position, velocity, acceleration), without considering the forces that affect the motion (e.g. friction force)
  * Simple yet popular, used for trajectory prediction

### Trajectory prediction

Evolution models$\underrightarrow{\quad are\ used\ for\quad}$  trajectory prediction

* *Single trajectory simulation*
  * apply an evolution model to the **current perfect known** state 
  * computational efficiency & for real time application
  * not reliable for long term (>1s ) prediction

* *Gaussian noise simulation*
  * **Uncertainty** of the current state be modeled by a normal distribution ([K.F Kalman Filter](https://zh.m.wikipedia.org/zh/%E5%8D%A1%E5%B0%94%E6%9B%BC%E6%BB%A4%E6%B3%A2)) 
  * Modeling uncertainties using a **unimodal normal distribution** is insufficient to represent the different possible maneuvers (Solution: Switching Kalman Filters, SKF)

* *Monte Carlo simulation*
  * In general case(**unknown analytical expression** for the distribution on the predicted states )
  * Randomly **sample from the input variables** of the evolution model $\underrightarrow{\ to \ }$ generate potential future trajectories

## Maneuver-based motion models

* Maneuver $\approx$ behavior 
* covers approaches based on maneuver intention estimation( more relevant and reliable **in the long term**)

### Prototype trajectories

* the trajectories of vehicles can be **grouped into a finite set of clusters**  $\approx$  a typical motion pattern
* Motion patterns (prototype trajectoriees ) are learned from data during a training phase

### Representation method

* motion patterns **can be identified in advance** -> trajectory in the training dataset is **already assigned to a cluster**
* representing a motion pattern:
  * compute a unique prototype trajectory for each motion pattern
  * have several prototypes for each trajectory class 

### Trajectory prediction

* Define metrics to measure the distance of a partial trajectory to a motion pattern
  * **Gaussian Processes**: the distance is computed as the probability of the partial trajectory
  * **finite set of prototype trajectories**: its similarity with the prototype trajectories: 
    * average Euclidian distance
    * modified Hausdorff
    * the Longest Common Subse- quence (LCS)
* Limitations:
  * strictly deterministic representation of time
  * hard to adaptation to different road layouts (road intersections) 

### Maneuver intention estimation & execution

Focuses on maneuver intention estimation at **road intersections**

* Context and heuristics: discriminative learning algorithms
  * Multi-Layer Perceptrons (MLP) Logistic regression
  * Relevance Vector Machines (RVM)
  * Support Vector Machines (SVM) 
* break down each maneuver into **a chain of consecutive events** and to represent this sequence of events using a **Hidden Markov Model (HMM)**

**Limitations**: the assumption that vehicles move **independently** does not hold.

## Interaction-aware motion models

Represent vehicles as maneuvering entities which **interact** with each other.

### Models based on trajectory prototypes

* **No** intervehicle influences **during the learning phase** (intractable number of motion patterns)
* Consider mutual influences **during the matching phase**

### Models based on Dynamic Bayesian Networks (DBN)

* **Pairwise dependencies** between multiple moving entities $\underrightarrow{\quad\ be\  modeled \ with\quad }$ Coupled HMMs (Hidden Markov model ) or (CHMMs)

  * complexity is not manageable -> simplify the model is to make CHMMs asymmetric by assuming that the surrounding traffic affects the vehicle of interest.

* Limitations: expensive in compution & not compatible with realtime risk assessment

  

## Risk assessment

### Risk based on colliding future trajectories (2)

1. Predict the potential future trajectories for **all the moving entities** in the scene.
2. Detect collisions **between each possible pair of trajectories**, and derive a risk estimate based on the overall chance of collision.

#### *Binary collision prediction*

* the collision risk can be binary (0 or 1)
* solving the **linear differential equations** of the motion model -> **analytical solution** for the state of the vehicles at a specific time

#### *Probabilistic collision prediction*

* compute collision risk in a **probabilistic** manner

#### *Other risk indicators*

* velocity 
* the amount of **overlap** between the shapes representing the vehicles
* he probability of simultaneous occupancy of the conflict area by both vehicles
* Time-To-Collision (TTC) & Time-To-React (TTR):

### Risk based on unexpected behavior

extends the concept of risk beyond collisions, by taking into account the **emotional strain** caused by drivers performing unexpected maneuvers

#### *Detecting unusual events*

* define a set of normal rules
* use real data to learn the typical behavior of road users

#### *Detecting conflicting maneuvers*

* #### estimating the maneuver intentions of the drivers

* **learn models for specific dangerous events** in addition to the models for the nominal behavior( classification problem)
