# C++嵌入式开发学习

> [!abstract] 这份笔记是什么
> 本笔记分为三个递进层次：
> - **第1部分**：C++核心知识总结——类、继承、多态、模板的理论基础
> - **第2部分**：如何将C++应用到STM32开发——工具链、配置、工程实践
> - **第3部分**：RM工程实战分析——从真实项目代码中总结C++在嵌入式中的最佳用法

---

## 目录导览

| 章节 | 主题 | 关键词 |
|------|------|--------|
| [[#1 C++基础：类与对象]] | 面向对象基础 | 封装 / 访问权限 / 构造析构 |
| [[#2 继承与多态]] | OOP三大特性 | 基类 / 虚函数 / 动态多态 |
| [[#3 模板与泛化]] | 编译期多态 | 函数模板 / 类模板 / 模板特化 |
| [[#4 如何在STM32中使用C++]] | 工程实践 | 工具链 / 配置 / 项目结构 |
| [[#5 RM工程实战案例]] | 最佳实践 | 协议模板 / 自注册 / 状态机 |

---

## 1. C++基础：类与对象

### 1.1 类的基本概念

**类是什么**：将数据（成员变量）和操作（成员函数）打包在一起，形成一个整体。

```cpp
class Circle {
private:              // 访问权限：仅内部可见
    double radius;
    
protected:            // 访问权限：内部和派生类可见
    double calculateArea();
    
public:               // 访问权限：外部可见
    Circle(double r) : radius(r) {}        // 构造函数
    ~Circle() { }                          // 析构函数
    double getRadius() const { return radius; }
    void setRadius(double r) { radius = r; }
};
```

**三种访问权限**：
- `private`：私有，仅类内部能访问
- `protected`：保护，类内部和派生类能访问
- `public`：公开，任何代码都能访问

**参考资源**：
- [C++类和对象的总结，拿去做笔记吧 - C语言中文网](https://m.biancheng.net/view/221.html)

### 1.2 构造函数与析构函数

**构造函数**：对象创建时自动调用，用于初始化成员变量

```cpp
class Point {
private:
    double x, y;
public:
    // 默认构造函数
    Point() : x(0), y(0) { }
    
    // 带参数的构造函数
    Point(double x0, double y0) : x(x0), y(y0) { }
    
    // 拷贝构造函数（C++11之前常需显式定义）
    Point(const Point& p) : x(p.x), y(p.y) { }
};
```

**初始化列表**（Member Initializer List）：
- 在冒号后列出所有成员的初始化方式
- 效率比在构造函数体内赋值高（直接初始化vs赋值）
- 对于引用和const成员，初始化列表是**唯一的初始化方式**

```cpp
class Motor {
private:
    PWM& pwm;              // 引用成员，必须在初始化列表中初始化
    const uint16_t id;     // const成员，必须在初始化列表中初始化
public:
    Motor(PWM& p, uint16_t motor_id) : pwm(p), id(motor_id) { }
};
```

**析构函数**：对象销毁时自动调用，用于释放资源

```cpp
class FileHandler {
private:
    FILE* fp;
public:
    FileHandler(const char* filename) {
        fp = fopen(filename, "r");
    }
    ~FileHandler() {              // 析构函数
        if (fp) fclose(fp);       // 释放资源
    }
};
```

> [!tip] 为什么需要析构函数？
> 在嵌入式中，通常不用new/delete，但析构在以下情况很重要：
> - 关闭硬件外设（关闭中断、停止定时器）
> - 释放动态分配的资源
> - 智能指针管理的对象自动清理

---

## 2. 继承与多态

### 2.1 继承：代码复用的机制

```cpp
// 基类：定义共同的接口和数据
class Peripheral {
protected:
    uint32_t baseAddress;
    bool initialized;
public:
    virtual void init() = 0;           // 纯虚函数，必须被派生类实现
    virtual void deinit() { }
    virtual ~Peripheral() { }
};

// 派生类：继承基类，扩展功能
class GPIO : public Peripheral {
private:
    uint16_t pin;
public:
    GPIO(uint32_t addr, uint16_t p) : pin(p) {
        baseAddress = addr;
    }
    void init() override {
        // GPIO初始化代码
    }
    void writePin(bool level);
    bool readPin();
};

class UART : public Peripheral {
private:
    uint32_t baudrate;
public:
    UART(uint32_t addr) { baseAddress = addr; }
    void init() override {
        // UART初始化代码
    }
    void send(const uint8_t* data, uint16_t len);
};
```

**继承的三种方式**：
- `public`：基类的public/protected在派生类中保持
- `protected`：基类的public变成protected
- `private`：基类的public/protected都变成private

### 2.2 虚函数与动态多态

```cpp
// 基类定义虚函数
class Shape {
public:
    virtual void draw() { cout << "Shape\n"; }
    virtual float area() = 0;  // 纯虚函数，没有实现
    virtual ~Shape() { }
};

// 派生类重写虚函数
class Circle : public Shape {
private:
    float radius;
public:
    void draw() override { cout << "Circle\n"; }  // override 显示说明重写
    float area() override { return 3.14f * radius * radius; }
};

// 使用多态
void process(Shape* s) {        // 接收基类指针
    s->draw();                  // 实际调用派生类的版本
    cout << s->area() << endl;
}

Circle c;
process(&c);  // 输出：Circle
```

> [!info] 虚函数的实现原理
> 编译器为每个包含虚函数的类生成一张**虚函数表（vtable）**：
> ```
> class Shape:
>   +0: 虚函数表指针(vptr) → [draw指针, area指针, ...]
>   +8: 数据成员...
> ```
> 调用虚函数时，先通过vptr找到vtable，再通过偏移找到函数地址。这有微小开销（一次指针解引用），但在嵌入式中通常可忽略。

---

## 3. 模板与泛化

### 3.1 函数模板

用一份代码实现多种类型的相同操作（编译期多态）：

```cpp
// 模板函数：交换任意类型的两个值
template<typename T>
void swap(T& a, T& b) {
    T temp = a;
    a = b;
    b = temp;
}

// 编译器根据调用自动生成具体版本
swap(x, y);           // 生成 swap<int>
swap(data1, data2);   // 生成 swap<uint8_t>
```

**模板特化**（Template Specialization）：为某些特定类型提供专用版本

```cpp
// 通用版本
template<typename T>
void print(T value) {
    cout << "Generic: " << value << endl;
}

// 特化版本：针对 const char* 的特化
template<>
void print<const char*>(const char* str) {
    cout << "String: " << str << endl;
}

print(42);        // 调用通用版本
print("Hello");   // 调用特化版本
```

### 3.2 类模板

```cpp
// 通用队列模板
template<typename T, size_t Capacity = 256>
class Queue {
private:
    T buffer[Capacity];
    size_t head = 0, tail = 0, count = 0;
public:
    bool push(const T& value) {
        if (count >= Capacity) return false;
        buffer[tail] = value;
        tail = (tail + 1) % Capacity;
        count++;
        return true;
    }
    
    bool pop(T& value) {
        if (count == 0) return false;
        value = buffer[head];
        head = (head + 1) % Capacity;
        count--;
        return true;
    }
    
    size_t getCount() const { return count; }
};

// 使用：自动推导类型和大小
Queue<uint8_t, 512> rxBuffer;      // UART接收缓冲
Queue<int16_t, 1024> adcBuffer;    // ADC采样缓冲
```

### 3.3 可变模板参数（C++11）

```cpp
// 递归展开：处理任意数量的参数
template<typename T>
void print(T value) {
    cout << value << endl;
}

template<typename T, typename... Args>
void print(T first, Args... rest) {
    cout << first << " ";
    print(rest...);  // 递归调用，rest 逐步减少
}

print(1, 2.5f, "hello", true);
// 输出：1 2.5 hello 1
```

**参考资源**：
- [C++泛型编程：函数模板、类模板与特化实例解析-CSDN博客](https://blog.csdn.net/m0_53421868/article/details/121188326)
- [泛化之美--C++11可变模版参数的妙用 - qicosmos(江南) - 博客园](https://www.cnblogs.com/qicosmos/p/4325949.html)

---

## 4. 如何在STM32中使用C++

### 4.1 开发工具链

| 工具 | 说明 | 建议 |
|------|------|------|
| **IDE** | Keil MDK 或 STM32CubeIDE | CubeIDE 对C++11/14/17支持更好 |
| **编译器** | ARM GNU Toolchain (arm-none-eabi-g++) | 完整支持C++特性 |
| **HAL库** | STM32 HAL或LL库 | 作为C接口的基础 |
| **C++标准** | C++14/17（避免异常和RTTI） | 嵌入式约束条件 |

### 4.2 编译器配置

在 `CMakeLists.txt` 或 `compiler flags` 中：

```cmake
# 禁用异常处理（减少Flash占用）
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-exceptions")

# 禁用RTTI（运行时类型信息，减少RAM占用）
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-rtti")

# 禁用动态静态初始化锁（嵌入式中不需要线程安全）
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -fno-threadsafe-statics")

# 代码优化（体积或速度）
set(CMAKE_CXX_FLAGS "${CMAKE_CXX_FLAGS} -Os")  # -Os 为体积优化，-O2 为速度
```

### 4.3 项目结构

```
stm32_project/
├── Core/
│   ├── Src/main.cpp
│   └── Inc/main.h
├── Drivers/
│   ├── CMSIS/
│   └── STM32_HAL/
├── Hardware/              ← C++封装层
│   ├── gpio.h
│   ├── uart.h
│   └── can.h
├── Application/           ← 业务逻辑
│   └── ...
└── CMakeLists.txt
```

### 4.4 常见坑点

| 坑点 | 原因 | 解决方案 |
|------|------|--------|
| 内存溢出 | C++对象占用栈空间多 | 使用`static`避免栈分配 |
| 编译体积增长 | 模板实例化、虚函数表 | 使用`-Os`优化、精确应用模板 |
| 初始化顺序不确定 | 全局对象初始化顺序 | 避免全局对象依赖，使用延迟初始化 |
| 异常增加体积 | 异常处理表 | 已禁用异常（-fno-exceptions） |

---

## 5. RM工程实战案例

从RM实际工程中提炼出的C++最佳用法（基于 RM_PRIME_f407_Template）。

### 前提：编译选项已划定边界

关键一行代码（`cmake/gcc-arm-none-eabi.cmake:39`）：

```cmake
set(CMAKE_CXX_FLAGS "${CMAKE_C_FLAGS} -fno-rtti -fno-exceptions -fno-threadsafe-statics")
```

这是理解整个工程的钥匙。它砍掉了C++中所有需要运行时支持的部分：
- 没有 `dynamic_cast`/`typeid`（无RTTI）
- 没有异常表（省下几KB flash）
- magic static不加锁（无threadsafe-statics）

**剩下的全是编译期抽象**——模板、constexpr、重载、继承+虚函数。这正是嵌入式C++该用的：**抽象在编译期展开完，运行时和手写C一样**。

配套的是用 `etl` 代替 STL（`etl::queue<uint8_t, 256>`）——固定容量、编译期确定大小、零堆分配。

---

### 案例1：模板把协议ID编码进类型系统

**问题**：收到裁判系统数据包时，需要根据ID反序列化到对应的结构体。C的做法是大switch+全局结构体数组，容易写错或遗漏。

**C++解法**（`RefereeType.h:40`）：

```cpp
template<uint16_t ID>
struct RefereeCMD { 
    static constexpr uint16_t CMD_ID = ID; 
};

struct GameState : RefereeCMD<0x0001> {
    uint8_t game_type;
    uint8_t game_progress;
    // ...
} __attribute__((packed));

struct PowerHeatData : RefereeCMD<0x0202> {
    uint16_t chassis_volt;
    uint16_t chassis_current;
    // ...
} __attribute__((packed));
```

**关键特性**：ID和结构体**绑死在一起，编译期就能检查，不可能配错**。

取数据时的使用（`Referee.h:159`）：

```cpp
auto& hp = referee.getRefereeInfo<RefereeType::GameRobotHP>();
```

返回类型由模板参数决定，`std::enable_if_t<std::is_base_of_v<RefereeCMD<T::CMD_ID>, T>>` **保证你传一个不是裁判协议的类型进去会编译报错**。

**反序列化的实现**（`RefereeType.h:332`）：

```cpp
template <std::size_t I = 0>
void packetWriteTemplate(uint16_t ID, uint8_t* data, uint16_t len, RefereeTupleType& tuple) {
    if constexpr (I < std::tuple_size_v<RefereeTupleType>) {
        using T = std::tuple_element_t<I, RefereeTupleType>;
        if (T::CMD_ID == ID) { 
            std::memcpy(&std::get<I>(tuple), data, ...); 
            return; 
        }
        packetWriteTemplate<I + 1>(ID, data, len, tuple);
    }
}
```

编译后就是一串 `if (id == 0x0001) memcpy(...)`，**和手写switch等价**。但**新增一个裁判系统协议，只需在tuple里加一行**（`RefereeType.h:305`），解析代码一个字不用改。

> [!tip] C vs C++的本质差异
> - **C的做法**：一个大switch，每add一个协议type要在三处改代码（枚举、case、结构体）
> - **C++的做法**：新建一个`struct xxx : RefereeCMD<ID>`，加进tuple，自动生成转发代码

---

### 案例2：抽象基类 + 构造函数自注册

**问题**：硬件中断来了需要分发给对应的驱动。新加一个电机类型时，需要改中断分发代码。

**C++解法**（`InterfaceCAN.cpp:53`）：

```cpp
InterfaceCAN::InterfaceCAN(CAN_HandleTypeDef *hcan, uint32_t RxId, uint32_t TxId)
    : hCAN(hcan), RxStdId(RxId), TxStdId(TxId) {
    registerCANDevice(this);   // 静态对象在main之前就把自己挂进设备表
}
```

新增一个电机只要：

```cpp
class DM4310 : public BSP::InterfaceCAN {
    // ...
};

// 全局对象
DM4310 motor(CAN_PORT, RxID, TxID);  // 构造时自动注册
```

中断分发代码（`InterfaceCAN.cpp:87`）**一行不用改**。

**注意**（`InterfaceCAN.cpp:45`）的关键注释：

> 对于静态类，调用时机位于main函数之前，不要在这里调用HAL库相关函数

这是踩过坑写下来的。构造函数在 `main()` 之前跑，此时时钟和HAL都没初始化。所以设计上把「注册」和「初始化」拆成两步：
- 构造函数只登记
- `CAN_UserInit()` 里统一 `init()`

这个拆分是用**静态构造的正确姿势**。

---

### 案例3：Boost.SML做声明式状态机

用**状态转移表**而不是冗长的switch-case。

**协议解包**（`Referee.h:91`）——逐字节喂进状态机，guard里顺手做CRC校验：

```cpp
"HEADER_CRC8"_s + sml::event<unitData> [CRC8_Pass{}] = "DATA_CRC16"_s,
"HEADER_CRC8"_s + sml::event<unitData>                = "HEAD_SOF"_s,   // CRC失败自动回退
"DATA_CRC16"_s  + sml::event<unitData> [CRC16_Pass{}] = sml::state<PackChecked>
```

传统做法是**几百行的unpack函数 + 手写状态枚举 + 一堆容易漏的回退分支**。这里「CRC8过了往下走，没过回帧头」直接写成两行相邻的规则，**漏不掉**。

**运动模式切换**（`MotionFSM.h:130`）——分工很聪明：

```cpp
state<_> + event<IntoChassisLead> [ InsReadyGuard{} ] / [] {
    CurrentHandler = ChassisLeadLoop;
    InitFlag.ChassisLeadNI = true;
} = state<ChassisLead>,
```

**只负责状态转移**，实际执行谁走的是普通函数指针 `MotionFSM::CurrentHandler`（`MotionFSM.h:53`），在 `MotionControlTask.cpp:41` 直接调用。

也就是说 **500Hz控制循环里根本不经过SML的dispatch**，只有遥控器按键触发切换时才 `process_event`。这样既拿到了转移表的可读性，又**没在热路径上付代价**。

> [!info] 卫语句（Guard）的威力
> `InsReadyGuard{}`——「INS没初始化好不许进任何控制模式」在这里写一次、六条规则共享；
> C里得在**每个case里手写**一遍 `if (ins_ready)`。
> 这就是SML相对switch-case的最大优势：**共享逻辑**。
