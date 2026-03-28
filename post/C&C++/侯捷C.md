---
title: 侯捷C++
toc: true
date: 2020-12-21 11:58:55
tags: 
categories: 
---

## 类构造函数

```c++
class complex
{
private:
    double re, im;
public:
    complex(double r = 0, double i = 0) : re(r), im(i) {}
};
```
## 传递参数

```c++
(double r) //值
(const complex &) //不改变
(ostream& os) // reference
```

## Friend 友元

```c++
private:
		double re, im;
	friend compelx& _doap1(complex&, const )
```

