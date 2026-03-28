title:  字符串转换整数 (atoi)
toc:  字符串转换整数 (atoi)
date: 2020-12-19 10:08:20
tags: algorithm
---

#  字符串转换整数 (atoi)

## atChar!

Implement atoi which converts a string to an integer.

The function first discards as many whitespace characters as necessary until the first non-whitespace character is found. Then, starting from this character, takes an optional initial plus or minus sign followed by as many numerical digits as possible, and interprets them as a numerical value.

The string can contain additional characters after those that form the integral number, which are ignored and have no effect on the behavior of this function.

If the first sequence of non-whitespace characters in str is not a valid integral number, or if no such sequence exists because either str is empty or it contains only whitespace characters, no conversion is performed.

If no valid conversion could be performed, a zero value is returned.

**Note:**
* Only the space character ' ' is considered as whitespace character.
* Assume we are dealing with an environment which could only store integers within the 32-bit signed integer range: [−231,  231 − 1]. If the numerical value is out of the range of representable values, INT_MAX (231 − 1) or INT_MIN (−231) is returned.


> Example

``` java
Input: "42"
Output: 42
```
```java
Input: "   -42"
Output: -42
Explanation: The first non-whitespace character is '-', which is the minus sign.
             Then take as many numerical digits as possible, which gets 42.            
```

## 俺不会写（2 ms）


```java
class Solution {
    public int myAtoi(String str) {
    str = str.trim();  
    if (str.isEmpty()) return 0;  
  
    // 正负号标记  
    int sign = 1;  
  
    // 转换值  
    int base = 0;  
  
    // 索引位数  
    int i = 0;  
  
  
    // 判断正负号  
    if (str.charAt(i) == '-' || str.charAt(i) == '+')  
        sign = str.charAt(i++) == '-' ? -1 : 1;  
  
    // 索引有效数字字符  
    while (i < str.length() && str.charAt(i) >= '0' && str.charAt(i) <= '9') {   
        // 如果base > MAX_VALUE/10，那么base*10 + new_value > base*10 > MAX_VALUE，这种情况下就会发生溢出。  
        // 若base == INT_MAX/10，而且new_value = str.charAt(i++) - '0'`大于`7`，也会发生溢出。因为MAX_VALUE = 2147483647  
        if (base > Integer.MAX_VALUE / 10 || (base == Integer.MAX_VALUE / 10 && str.charAt(i) - '0' > 7)) {  
            return (sign == 1) ? Integer.MAX_VALUE : Integer.MIN_VALUE;  
        }  
  
        // 计算转换值  
        base = 10 * base + (str.charAt(i++) - '0');  
    }  
  
    // 计算结果值  
    return base * sign;  
    }
}
```
