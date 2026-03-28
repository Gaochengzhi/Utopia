---
title: threadC++
toc: true
date: 2022-06-12 21:19:09
tags:
categories:
---

## Basic Example

```c++
#include <iostream>
#include <thread>
void thread_hello() { std::cout << "Hello" << std::endl; }

int main(int argc, char const* argv[])
{
    std::thread t(thread_hello); // callable object, rather than a function
    // also std::thread my_thread((func()))
    // also std::thread my_thread{func()}
    // also std::thread my_thread([]{
            // do();
    // })
    t.join(); // after which woill not run until t stops
    return 0;
}
```



