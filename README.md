# NMEA Analyzer v2.0

Pure front-end GNSS NMEA data analysis tool. Multi-constellation, multi-frequency parsing and visualization.

## Quick Start

Open `index.html` in browser, drag NMEA files into the drop zone. No server or dependencies required.

## Features

### Position
- Trajectory scatter plot colored by fix quality
- Fix quality distribution pie chart
- Realtime RMS time series from GNGST
- Satellite count time series

### Satellite
- All-constellation sky plot with trail history
- Per-PRN average SNR bar chart
- SNR quality distribution pie chart
- PDOP/HDOP/VDOP time series
- Satellite PRN detail table

### Export
- KML for Google Earth (with start/end markers)
- CSV (GGA/GST/satellite stats, UTF-8)

## Supported NMEA

| Sentence | Info |
|----------|------|
| GNGGA | Position, fix quality, HDOP, altitude, diff age/station |
| GNGST | Pseudorange error stats |
| GNGSA | DOP, active satellites (GPS/GLONASS/Galileo/BDS/QZSS) |
| GxGSV | Visible satellites (NMEA V4.1 Signal ID) |
| GNRMC | Minimum navigation data |
| GNVTG | Ground speed |

## Constellations

| System | Prefix | Signals |
|--------|--------|---------|
| GPS | GP | L1 C/A, L1 P(Y), L2C, L5 |
| GLONASS | GL | G1, G2 |
| Galileo | GA | E1, E5a, E5b, E6 |
| BDS | GB | B1I, B1C, B2a, B2b, B3I |
| QZSS | GQ | L1 C/A, L1C, L2C, L5, L6 |

## Tech

- HTML + CSS + JavaScript, zero dependencies
- SVG vector charts
- FileReader API, local parsing only

## License

MIT
