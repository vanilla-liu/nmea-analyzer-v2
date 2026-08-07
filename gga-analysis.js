/**
 * GGA Positioning Accuracy Analysis Module
 * RTKLIB-style color scheme for fix types
 */
class GGAAnalysis {
  constructor() {
    this.data = [];
    this.filteredData = [];
    this.filterQuality = 'all';

    // Fix quality colors
    this.qualityColors = {
      0: '#000000', // Invalid - Black
      1: '#ffff00', // Single - Yellow
      2: '#00ff00', // DGNSS - Green
      4: '#0000ff', // RTK Fixed - Blue
      5: '#ff0000', // RTK Float - Red
      6: '#808080'  // DR - Gray
    };
    this.qualityLabels = {
      0: 'Invalid',
      1: 'Single',
      2: 'DGNSS',
      4: 'RTK Fixed',
      5: 'RTK Float',
      6: 'DR'
    };
  }

  setData(ggaData) {
    this.data = ggaData || [];
    this.applyFilter(this.filterQuality);
  }

  applyFilter(quality) {
    this.filterQuality = quality;
    if (quality === 'all') {
      this.filteredData = this.data.filter(function(d) {
        return d.quality === 0 || d.quality === 1 || d.quality === 2 ||
               d.quality === 4 || d.quality === 5 || d.quality === 6;
      });
    } else {
      var q = parseInt(quality, 10);
      this.filteredData = this.data.filter(function(d) { return d.quality === q; });
    }
  }

  getStatistics() {
    var d = this.filteredData;
    if (!d.length) return null;

    var hdops = d.map(function(g){return g.hdop;}).filter(function(v){return v>0;});
    var alts = d.map(function(g){return g.altitude;});

    var total = this.data.length;
    var valid = this.data.filter(function(g){return g.quality >= 1;}).length;
    var stationIds = {};
    this.data.forEach(function(g){
      if(g.dgpsStationId) stationIds[g.dgpsStationId]=(stationIds[g.dgpsStationId]||0)+1;
    });

    var qualityCounts = {};
    this.data.forEach(function(g){qualityCounts[g.quality]=(qualityCounts[g.quality]||0)+1;});

    return {
      total: total,
      filteredCount: d.length,
      validCount: valid,
      validRate: total>0?(valid/total*100):0,
      hdop: hdops.length?{min:Math.min.apply(null,hdops),max:Math.max.apply(null,hdops),avg:hdops.reduce(function(a,b){return a+b;},0)/hdops.length}:null,
      altitude: alts.length?{min:Math.min.apply(null,alts),max:Math.max.apply(null,alts),range:Math.max.apply(null,alts)-Math.min.apply(null,alts)}:null,
      stationIds: stationIds,
      qualityCounts: qualityCounts
    };
  }

  getTimeRanges() {
    if (!this.filteredData.length) return '';
    var ranges = [];
    var start = this.filteredData[0];
    var prev = start;
    for (var i = 1; i < this.filteredData.length; i++) {
      var cur = this.filteredData[i];
      var prevIdx = this.data.indexOf(prev);
      var curIdx = this.data.indexOf(cur);
      if (curIdx - prevIdx === 1) {
        prev = cur;
      } else {
        var s = start.timestamp ? start.timestamp.toString() : '?';
        var e = prev.timestamp ? prev.timestamp.toString() : '?';
        ranges.push(s === e ? s : s + '-' + e);
        start = cur;
        prev = cur;
      }
    }
    var s = start.timestamp ? start.timestamp.toString() : '?';
    var e = prev.timestamp ? prev.timestamp.toString() : '?';
    ranges.push(s === e ? s : s + '-' + e);
    return ranges.join('; ');
  }

  drawTrajectory(chart) {
    if (!chart || !this.filteredData.length) return;
    var self = this;
    var points = this.filteredData
      .filter(function(g){return g.latitude&&g.longitude;})
      .map(function(g){
        return {
          x: g.longitude.decimalDegrees,
          y: g.latitude.decimalDegrees,
          color: self.qualityColors[g.quality]||'#808080',
          alpha: 0.8,
          size: 2
        };
      });
    chart.drawScatter(points, {
      title: 'Plot',
      xLabel: 'Longitude',
      yLabel: 'Latitude',
      legend: self._getLegendItems()
    });
  }

  drawQualityPie(chart) {
    if (!chart) return;
    var self = this;
    var counts = {};
    this.data.forEach(function(g) {
      var q = g.quality;
      if (self.qualityLabels[q]) counts[q] = (counts[q]||0) + 1;
    });
    var items = Object.keys(counts).map(function(k){
      return {label:self.qualityLabels[k],value:counts[k],color:self.qualityColors[k]};
    }).filter(function(d){return d.value>0;});
    chart.drawPie(items,{title:'Fix Quality Distribution'});
  }

  drawRMSTimeSeries(chart, gstData, ggaData) {
    if (!chart || !gstData || !gstData.length) return;

    var horData = [];
    var verData = [];
    for (var i = 0; i < gstData.length; i++) {
      var g = gstData[i];
      var hor = Math.sqrt((g.latitudeError||0)*(g.latitudeError||0) + (g.longitudeError||0)*(g.longitudeError||0));
      verData.push({x:i, y:g.altitudeError||0});
      horData.push({x:i, y:hor});
    }

    chart.drawLine([
      {data:horData, color:'#0d6efd', fill:true},
      {data:verData, color:'#dc3545', fill:false, lineWidth:1.5}
    ],{
      title:'Realtime RMS (GNGST)',
      xLabel:'Epoch',
      yLabel:'Error (m)',
      yMin:0,
      thresholds:[
        {value:0.02,color:'#28a745',label:'<2cm'},
        {value:0.05,color:'#ffc107',label:'<5cm'},
        {value:0.20,color:'#fd7e14',label:'<20cm'}
      ],
      legend:[
        {label:'Horizontal (Lat+Lon)',color:'#0d6efd'},
        {label:'Vertical (Alt)',color:'#dc3545'}
      ]
    });
  }

  _getLegendItems() {
    var self = this;
    return Object.keys(this.qualityLabels).map(function(k){
      return {label:self.qualityLabels[k],color:self.qualityColors[k]};
    });
  }
}
