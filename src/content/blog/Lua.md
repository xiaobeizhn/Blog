---
title: 'Lua&沐光石之书框架记录'
description: '记录Lua的学习记录，以及2025年沐光石之书框架的学习记录'
pubDate: '2025-08-26'
tags: ['学习日志','Lua']
draft: false
---

# Lua基础知识

## 字符串

**string.find (str, substr, [init, [plain]])**

**string.gsub(mainString,findString,replaceString,num)**


**string.gmatch(str, pattern)**

配合for使用

**string.match(str, pattern, init)**

输出字符串


* %a: 与任何字母配对

* %c: 与任何控制符配对(例如\n)

* %d: 与任何数字配对

* %l: 与任何小写字母配对

* %p: 与任何标点(punctuation)配对

* %s: 与空白字符配对

* %u: 与任何大写字母配对

* %w: 与任何字母/数字配对

* %x: 与任何十六进制数配对

* %z: 与任何代表0的字符配对

## 数组

数组可以以负数为数组索引值

## 函数

### 关于函数传参

* 基本类型（number, string, boolean, nil）：按值传递（函数内修改不影响外部变量）。

* 引用类型（table, function, userdata, thread）：传递的是引用（函数内修改会影响外部对象）。

## 迭代器

C++里是先初始化、判断、执行循环体、迭代

Lua里是先初始化、迭代、判断、执行循环体

## 循环

### 关于ipairs和pairs

### 关于pairs

#### 遍历所有键值对

* 遍历所有键值对（包括数字、字符串、非连续索引等）。

* 不保证顺序：遍历顺序与 table 的内部实现相关（通常无序）。

* 不忽略 `nil`：会跳过 `nil` 值，但能遍历非连续的数字键（如 `t[5]`）。

### 关于ipairs

ipairs是一个专用的遍历函数，主要用于遍历数组，即索引为正整数的表。可以用于遍历表中的所有键值对，其中键仅限于正整数。**ipairs遍历和手动设置序号的先后位置无关，优先从非手动设定位置从左向右开始计算非手动设置的索引，计算非手动设置的索引时会跳过手动设定的索引，计算完非手动设定的索引后，寻找手动设定索引，如果手动设定的序号能连上，则算上手动设置的索引连续打印，直到序号断开。**

根据以上结论尝试推断以下表输出：

```plain
a={[5]="hello",[3]=2,3,4}
for i, v in ipairs(a) do
    print(i, v)
end
```
从非手动设定位置优先开始从左向右计算索引，则为[1]=3,[2]=4,之后寻找手动设定序号，[3]=2。之后继续寻找，只找到5，数字连续性断开，所以只能打印到3的索引。推测结果为[1]=3,[2]=4,[3]=2

和实际结果相符。

#### 例子一

```plain
a={[1]="hello",2,[2]=3,4,5}
for i, v in ipairs(a) do
    print(i, v)
end
```
结果如下。

手动设定的[1]和[2]并没有打印出来，所以猜测lua会忽略手动设定值，从2开始计算索引，2索引为1，4索引为2，5索引为3，

#### 例子二

```plain
a={[1]="hello",[2]=2,[3]=3}
for i, v in ipairs(a) do
    print(i, v)
end
```
例子一中是忽略手动设定的key值，但是例子二中全部手动设定，得到结果却是全部输出。

因此我认为，lua并不会忽略手动设定的整数值索引，猜测如果全部手动设定且为连续正整数则可以识别，如果其中有不是手动设定的则优先非手动设置的开始计算索引

#### 例子三

```plain
a={[1]="hello",[2]=2,3}
for i, v in ipairs(a) do
    print(i, v)
end
```
如图，根据以上推断，优先计算3的索引为1，此时3明明在后面，但结果却是3,2。说明3索引为1，2索引为2，hello的索引断开。这个例子说明序号可以倒序相连。

猜测ipairs是全部元素遍历完后，再寻找连续序号输出，直到序号断开，

#### 例子四

```plain
a={[3]="hello",[2]=2,3}
for i, v in ipairs(a) do
    print(i, v)
end
```
倒序输出了3，2，"Hello"。因此可以推断以上假设为真。

因此得出重要结论：**ipairs遍历和序号先后位置无关，从非手动设定位置优先从左向右开始计算索引，非手动设定位置索引计算换成后，寻找手动设定索引，如果序号能连上，则算上手动设置的索引连续打印，直到序号断开。**

#### 例子五

根据以上推断尝试推断以下表输出：

```plain
a={[5]="hello",[3]=2,3,4}
for i, v in ipairs(a) do
    print(i, v)
end
```
从非手动设定位置优先开始从左向右计算索引，则为[1]=3,[2]=4,之后寻找手动设定序号，[3]=2。之后继续寻找，只找到5，数字连续型断开，所以只能打印到3的索引。推测结果为[1]=3,[2]=4,[3]=2

和实际结果相符。

同时根据此结论可以知道例子一a={[1]="hello",2,[2]=3,4,5}的输出为何忽略了[1]=1和[2]=3，因为4,5分别占用了2,4,5分别占用了1,2,3的索引，接下来要寻找的索引应该是4了，所以忽略掉了[1]和[2]，此时若把[1]="Hello"和[2]=3改为[4]="hello",[5]=3则可以打印出2,4,5,"hello",3。

```plain
a={[4]="hello",2,[5]=3,4,5}
for i, v in ipairs(a) do
    print(i, v)
end
```


#### 例子七

非手动索引时如何计算的？只计算连续的默认索引还是会跨过手动设置的索引？

```plain
a={[2]=0,[4]=0,1,2,3,[5]=6,4,5,6}
for i, v in ipairs(a) do
    print(i, v)
end
```
如果是分块连续索引，则应该是1,2,3后寻找手动索引,得到[4]=0,[5]=6，即1，2，3，0，6
如果是跳过非手动设置索引，则应是,1,2,3,4,5,6

实际结果如下，因此是跳过分手动设置的索引进行计算的。

## Table

引用赋值，智能指针


![图片](/images/lua_b7777ba63c5ee540.png)
![图片](/images/lua_5726e5c999c87014.png)
### rawset函数

`rawset` 是 Lua 中的一个基础函数，它允许你直接设置 table 中的值，绕过所有元表机制。这是 Lua 提供的一个"原始"操作，用于直接访问 table 而不触发任何元方法。

```plain
rawset(table, key, value)
```
* `table`: 要设置值的表

* `key`: 要设置的键

* `value`: 要设置的值


## Metatable

### __index方法

**function**(mytable, key)

*Lua 查找一个表元素时的规则，其实就是如下 3 个步骤:*

* 1.在表中查找，如果找到，返回该元素，找不到则继续

* 2.判断该表是否有元表，如果没有元表，返回 nil，有元表则继续。

* 3.判断元表有没有 __index 方法，如果 __index 方法为 nil，则返回 nil；如果 __index 方法是一个表，则重复 1、2、3；如果 __index 方法是一个函数，则返回该函数的返回值。

### __newindex

**function**(mytable, key, value)

* 1.表中有这个键，修改该元素；否则继续

* 2.若有元表且元表里有__newindex元方法，调用__newindex元方法；否则直接添加该元素

* 3.如果 __newindex 方法是一个表，则重复 1、2、3；如果 __newindex 方法是一个函数，则表的键值为该函数的返回值。

### __add/__sub/__mul/__div......

**function**(mytable, newtable) 

返回生成的表

### __tostring

**function**(mytable)

返回字符串

### __call

**function**(mytable, newtable)

这样调用：mytable(newtable)

## IO

io.open("test.lua","r") io.input(file) io.output(fiile)

![图片](/images/lua_1fe7b3aa64940288.png)
## 垃圾回收

**collectgarbage("setpause", 200)** ： 内存增大 2 倍（200/100）时自动释放一次内存 （200 是默认值）。

**collectgarbage("setstepmul", 200)** ：收集器单步收集的速度相对于内存分配速度的倍率，设置 200 的倍率等于 2 倍

## 协同

coroutine.create(func):coroutine -> coroutine.resume() -> coroutine.yield(return)

在协程里用挂起暂停并返回一个值给main，在main里重启继续跑协程

## 闭包

**闭包（Closure）​** 是一个函数加上它所“捕获”的外部环境（变量），是值类型

Lua中其实没有函数，函数只是不包含外部变量的闭包，因此多次为同一个方法动态生成闭包时，可能会产生多个独立的闭包实例，而这些闭包会重复占用内存。

在闭包创建时，内嵌函数前面的部分（2,3行）将被执行，并保存捕获的变量cnt以及内嵌函数，下次调用（12行）将会直接拿保存的变量cnt=0进行函数操作，并且完成后将会再次保存cnt；

（13行）拿cnt=1和函数进行操作，输出2

```plain
function bibao()
    local cnt = 0
    print("bibao")
    return function()
       cnt = cnt + 1
       return cnt
    end
end
func = bibao()
print("a")
func1 = func
print(func())
print(func1())
-- output:
-- bibao
-- a
-- 1
-- 2
```
# 沐光石之书工程

## UI-Logic-Global

### Global

框架内容 不用管

### PropertyNames

转变量名为字符串 一些属性名

## UI-Logic-Const

### GameConst

![图片](/images/lua_0303b46aa1f97e28.png)
## ![图片](/images/lua_94e156dfdfa9e16e.png)

![图片](/images/lua_69f40ec8e1333a91.png)
## Common-TableUtil

## 1. 基础计数功能

### `table.count(hashtable)`

统计哈希表中的元素数量（键值对数量）

```plain
local t = {a=1, b=2, c=3}
print(table.count(t)) -- 输出: 3
```
### `table.length(array)`

计算数组长度（考虑可能存在的n字段）

```plain
local arr = {1, 2, 3, n=5}
print(table.length(arr)) -- 输出: 5
```
### `table.setlen(array, n)`

设置数组长度标记

```plain
local arr = {1, 2, 3}
table.setlen(arr, 5)
print(table.length(arr)) -- 输出: 5
```
## 2. 表操作功能

### `table.keys(hashtable)`

获取哈希表所有键

```plain
local t = {a=1, b=2}
print(table.concat(table.keys(t), ",")) -- 输出: a,b
```
### `table.values(hashtable)`

获取哈希表所有值

```plain
local t = {a=1, b=2}
print(table.concat(table.values(t), ",")) -- 输出: 1,2
```
### `table.clone(t)`

浅拷贝表

```plain
local t1 = {a=1, b={x=2}}
local t2 = table.clone(t1)
t2.b.x = 3
print(t1.b.x) -- 输出: 3 (浅拷贝)
```
### `table.deepClone(root)`

深拷贝表（支持嵌套表）

```plain
local t1 = {a=1, b={x=2}}
local t2 = table.deepClone(t1)
t2.b.x = 3
print(t1.b.x) -- 输出: 2 (深拷贝)
```
## 3. 表合并与修改

### `table.merge(dest_hashtable, src_hashtable)`

合并两个哈希表

```plain
local t1 = {a=1, b=2}
local t2 = {b=3, c=4}
table.merge(t1, t2)
print(t1.b, t1.c) -- 输出: 3,4
```
### `table.insertto(dest_array, src_array, begin)`

将源数组合并到目标数组

```plain
local t1 = {1, 2}
local t2 = {3, 4}
table.insertto(t1, t2)
print(table.concat(t1, ",")) -- 输出: 1,2,3,4
```
## 4. 查找功能

### `table.indexof(array, value, begin)`

在数组中查找值

```plain
local arr = {"a", "b", "c"}
print(table.indexof(arr, "b")) -- 输出: 2
```
### `table.keyof(hashtable, value)`

在哈希表中查找值对应的键

```plain
local t = {a=1, b=2}
print(table.keyof(t, 2)) -- 输出: b
```
## 5. 高级功能

### `table.map(tb, func)`

用函数修改表中所有元素

```plain
local t = {1, 2, 3}
table.map(t, function(k, v) return v*2 end)
print(table.concat(t, ",")) -- 输出: 2,4,6
```
### `table.filter(tb, func)`

过滤表中元素

```plain
local t = {1, 2, 3, 4}
local filtered = table.filter(t, function(k, v) return v%2==0 end)
print(table.concat(table.values(filtered), ",")) -- 输出: 2,4
```
### `table.dump(tb, dump_metatable, max_level)`

格式化输出表结构

```plain
local t = {a=1, b={c=2}}
print(table.dump(t))
-- 输出格式化后的表结构
```
### `table.save(path, tb)` 和 `table.load(path)`

表的序列化与反序列化

```plain
local t = {a=1, b=2}
table.save("data.txt", t)
local loaded = table.load("data.txt")
print(loaded.a) -- 输出: 1
```
## 6. 特殊功能

### `table.oneByOne(t, callback, finalCallback)`

逐个处理数组元素

```plain
local t = {1, 2, 3}
table.oneByOne(t, 
    function(v, next) 
        print(v) 
        next() 
    end, 
    function() print("Done") end)
```
### `table.findIf(t, callback)`

条件查找

```plain
local t = {1, 2, 3, 4}
local index = table.findIf(t, function(v) return v > 2 end)
print(index) -- 输出: 3
```
## Protocol/tool

ScrollView = UIListView 写一个关联进Prefeb Data

Item = Canvas Group + UI Container 生成一个文件，子物体逻辑都在里面

