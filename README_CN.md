# NMEA Analyzer v2.0

纯前端 GNSS NMEA 数据分析工具，支持多星座、多频点解析与可视化。

## 快速开始

浏览器打开 index.html，拖入 NMEA 文件即可。无需服务器或依赖。

## 功能

### 定位分析
- 按解状态着色的轨迹散点图
- 解状态分布饼图
- GNGST 精度时序图
- 卫星数量时序图

### 卫星分析
- 全星座天空视图
- 按 PRN 聚合的 SNR 柱状图
- SNR 质量分布饼图
- PDOP/HDOP/VDOP 时序图
- 卫星详情表

### 导出
- KML（Google Earth 轨迹，含起终点）
- CSV（GGA/GST/卫星统计，UTF-8）

## 支持的 NMEA 语句

| 语句 | 说明 |
|------|------|
| GNGGA | 定位、解状态、HDOP、高程、差分信息 |
| GNGST | 伪距误差统计 |
| GNGSA | DOP 与活跃卫星（GPS/GLONASS/Galileo/BDS/QZSS） |
| GxGSV | 可见卫星（NMEA V4.1 Signal ID） |
| GNRMC | 最小定位信息 |
| GNVTG | 地面速度 |

## 支持的星座

| 星座 | 前缀 | 频点 |
|------|------|------|
| GPS | GP | L1 C/A, L1 P(Y), L2C, L5 |
| GLONASS | GL | G1, G2 |
| Galileo | GA | E1, E5a, E5b, E6 |
| 北斗 | GB | B1I, B1C, B2a, B2b, B3I |
| QZSS | GQ | L1 C/A, L1C, L2C, L5, L6 |

## 技术栈

- 纯 HTML + CSS + JavaScript，零依赖
- SVG 矢量图表
- FileReader 本地解析，数据不上传

## 许可证

MIT