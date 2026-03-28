---
title: chrono
toc: true
date: 2022-02-11 10:35:44
tags:
categories:
---
# Chrono in C++

```c++
std::chrono
 seconds s{3};
 cout << s.count() << "s\n";
```

# <ctime>
```c
#include<time.h>

time_t now = time(NULL);
double diff = difftime(a , now);

char* string_now= ctime(&now);
struct tm *gm_time = gmtime(&now);
```


