/**
 * Satellite Analysis Module
 * GSA + GSV analysis with constellation grouping and signal ID support
 */
class SatelliteAnalysis {
  constructor(parser) {
    this.parser = parser;
    this.gsaData = [];
    this.gsvData = [];
    this.satelliteMap = {}; // key: constellation_PRN_signalId
    this.constellationStats = {};
  }

  setData(gsaData, gsvData) {
    this.gsaData = gsaData || [];
    this.gsvData = gsvData || [];
    this._buildSatelliteMap();
    this._buildConstellationStats();
  }

  _buildSatelliteMap() {
    this.satelliteMap = {};
    var self = this;
    this.gsvData.forEach(function(gsv) {
      gsv.satellites.forEach(function(sat) {
        var key = gsv.talkerId + '_' + sat.prn + '_' + sat.signalId;
        if (!self.satelliteMap[key]) {
          self.satelliteMap[key] = {
            constellation: gsv.constellation,
            talkerId: gsv.talkerId,
            prn: sat.prn,
            signalId: sat.signalId,
            signalName: sat.signalName,
            elevation: sat.elevation,
            azimuth: sat.azimuth,
            snrHistory: []
          };
        }
        self.satelliteMap[key].elevation = sat.elevation;
        self.satelliteMap[key].azimuth = sat.azimuth;
        if (sat.snr > 0) {
          self.satelliteMap[key].snrHistory.push(sat.snr);
        }
      });
    });
  }

  _buildConstellationStats() {
    this.constellationStats = {};
    var self = this;
    var constellationNames = {GP:'GPS',GL:'GLONASS',GA:'Galileo',GB:'BDS',GQ:'QZSS'};
    var constellationColors = {GP:'#0d6efd',GL:'#6f42c1',GA:'#28a745',GB:'#dc3545',GQ:'#ffc107'};

    Object.keys(constellationNames).forEach(function(prefix) {
      self.constellationStats[prefix] = {
        name: constellationNames[prefix],
        prefix: prefix,
        color: constellationColors[prefix],
        satellites: {},
        totalPRNs: 0,
        avgSNR: 0,
        maxSNR: 0,
        minSNR: 999,
        snrSum: 0,
        snrCount: 0
      };
    });

    Object.values(this.satelliteMap).forEach(function(sat) {
      var stats = self.constellationStats[sat.talkerId];
      if (!stats) return;
      var prnKey = sat.prn;
      if (!stats.satellites[prnKey]) {
        stats.satellites[prnKey] = {
          prn: sat.prn,
          signals: {},
          elevation: sat.elevation,
          azimuth: sat.azimuth
        };
      }
      stats.satellites[prnKey].signals[sat.signalId] = {
        signalId: sat.signalId,
        signalName: sat.signalName,
        snrHistory: sat.snrHistory.slice(),
        avgSNR: sat.snrHistory.length ? sat.snrHistory.reduce(function(a,b){return a+b;},0)/sat.snrHistory.length : 0,
        maxSNR: sat.snrHistory.length ? Math.max.apply(null,sat.snrHistory) : 0,
        minSNR: sat.snrHistory.length ? Math.min.apply(null,sat.snrHistory.filter(function(v){return v>0;})) : 0,
        count: sat.snrHistory.length
      };
      if (sat.snrHistory.length) {
        sat.snrHistory.forEach(function(snr) {
          stats.snrSum += snr;
          stats.snrCount++;
          if (snr > stats.maxSNR) stats.maxSNR = snr;
          if (snr > 0 && snr < stats.minSNR) stats.minSNR = snr;
        });
      }
    });

    Object.values(this.constellationStats).forEach(function(stats) {
      stats.totalPRNs = Object.keys(stats.satellites).length;
      stats.avgSNR = stats.snrCount > 0 ? stats.snrSum / stats.snrCount : 0;
      if (stats.minSNR === 999) stats.minSNR = 0;
    });
  }

  getGSAGroups() {
    var groups = {};
    this.gsaData.forEach(function(gsa) {
      var sid = gsa.systemId || 0;
      if (!groups[sid]) {
        groups[sid] = {
          systemId: sid,
          systemName: gsa.systemName,
          systemPrefix: gsa.systemPrefix,
          pdop: [],
          hdop: [],
          vdop: [],
          satelliteCounts: [],
          fixTypes: []
        };
      }
      groups[sid].pdop.push(gsa.pdop);
      groups[sid].hdop.push(gsa.hdop);
      groups[sid].vdop.push(gsa.vdop);
      groups[sid].satelliteCounts.push(gsa.satellites.length);
      groups[sid].fixTypes.push(gsa.fixType);
    });
    var result = [];
    Object.values(groups).forEach(function(g) {
      var avg = function(arr) {
        var valid = arr.filter(function(v){return v>0;});
        return valid.length ? valid.reduce(function(a,b){return a+b;},0)/valid.length : 0;
      };
      result.push({
        systemId: g.systemId,
        systemName: g.systemName,
        systemPrefix: g.systemPrefix,
        avgPdop: avg(g.pdop),
        avgHdop: avg(g.hdop),
        avgVdop: avg(g.vdop),
        avgSatCount: avg(g.satelliteCounts),
        epochCount: g.pdop.length
      });
    });
    return result;
  }

  getLatestSkyPlotData() {
    if (!this.gsvData.length) return [];
    var latest = {};
    var self = this;
    this.gsvData.forEach(function(gsv) {
      gsv.satellites.forEach(function(sat) {
        var key = gsv.talkerId + '_' + sat.prn;
        if (!latest[key] || sat.snr > (latest[key].snr||0)) {
          latest[key] = {
            constellation: gsv.constellation,
            talkerId: gsv.talkerId,
            prn: sat.prn,
            elevation: sat.elevation,
            azimuth: sat.azimuth,
            snr: sat.snr,
            signalId: sat.signalId,
            signalName: sat.signalName
          };
        }
      });
    });
    return Object.values(latest).map(function(s) {
      var prefix = s.talkerId === 'GP' ? 'G' : s.talkerId === 'GL' ? 'R' : s.talkerId === 'GA' ? 'E' : s.talkerId === 'GB' ? 'C' : s.talkerId === 'GQ' ? 'Q' : 'X';
      return {
        constellation: s.constellation,
        label: prefix + s.prn,
        prn: s.prn,
        elevation: s.elevation,
        azimuth: s.azimuth,
        snr: s.snr,
        signalId: s.signalId,
        signalName: s.signalName
      };
    });
  }

  getSNRBarData() {
    var allSats = Object.values(this.satelliteMap);
    var prnMap = {};
    allSats.forEach(function(sat) {
      var key = sat.talkerId + '_' + sat.prn;
      if (!prnMap[key]) {
        var prefix = sat.talkerId === 'GP' ? 'G' : sat.talkerId === 'GL' ? 'R' : sat.talkerId === 'GA' ? 'E' : sat.talkerId === 'GB' ? 'C' : sat.talkerId === 'GQ' ? 'Q' : 'X';
        prnMap[key] = {
          label: prefix + sat.prn,
          constellation: sat.constellation,
          talkerId: sat.talkerId,
          totalSNR: 0,
          totalSamples: 0
        };
      }
      if (sat.snrHistory.length) {
        prnMap[key].totalSNR += sat.snrHistory.reduce(function(a,b){return a+b;},0);
        prnMap[key].totalSamples += sat.snrHistory.length;
      }
    });
    return Object.values(prnMap).filter(function(p){return p.totalSamples>0;});
  }

  getSNRQualityDistribution() {
    var dist = {excellent:0,good:0,fair:0,poor:0};
    Object.values(this.satelliteMap).forEach(function(sat) {
      sat.snrHistory.forEach(function(snr) {
        if (snr >= 40) dist.excellent++;
        else if (snr >= 30) dist.good++;
        else if (snr >= 20) dist.fair++;
        else if (snr > 0) dist.poor++;
      });
    });
    return dist;
  }

  getSkyPlotTrajectories() {
    if (!this.gsvData.length) return [];
    var trails = {};
    var self = this;
    this.gsvData.forEach(function(gsv) {
      gsv.satellites.forEach(function(sat) {
        if (sat.snr <= 0) return;
        var key = gsv.talkerId + '_' + sat.prn;
        if (!trails[key]) {
          trails[key] = {
            constellation: gsv.constellation,
            talkerId: gsv.talkerId,
            prn: sat.prn,
            points: []
          };
        }
        trails[key].points.push({
          elevation: sat.elevation,
          azimuth: sat.azimuth
        });
      });
    });
    return Object.values(trails);
  }

  drawSkyPlot(chart) {
    if (!chart) return;
    var trails = this.getSkyPlotTrajectories();
    var constellationColors = {GP:'#0d6efd',GL:'#6f42c1',GA:'#28a745',GB:'#dc3545',GQ:'#ffc107'};
    var constLabels = {GP:'GPS',GL:'GLONASS',GA:'Galileo',GB:'BDS',GQ:'QZSS'};
    var legendItems = [
      {label:'GPS',color:'#0d6efd'},{label:'BDS',color:'#dc3545'},
      {label:'Galileo',color:'#28a745'},{label:'GLONASS',color:'#6f42c1'},{label:'QZSS',color:'#ffc107'}
    ];
    chart.drawSkyPlot(trails, {title:'Satellite Sky Plot', legend:legendItems, constellationColors:constellationColors});
  }

  drawSNRChart(chart) {
    if (!chart) return;
    var prnData = this.getSNRBarData();
    var constellationColors = {GP:'#0d6efd',GL:'#6f42c1',GA:'#28a745',GB:'#dc3545',GQ:'#ffc107'};
    var prefixOrder = {'G':0,'C':1,'E':2,'R':3,'Q':4};
    var barData = prnData.map(function(prn) {
      var prnNum = parseInt(prn.label.substring(1), 10) || 0;
      var p = prn.label.charAt(0);
      var ordIdx = prefixOrder.hasOwnProperty(p) ? prefixOrder[p] : 99;
      return {
        label: prn.label,
        value: Math.round(prn.totalSNR / prn.totalSamples * 10) / 10,
        color: constellationColors[prn.talkerId] || '#6c757d',
        _order: ordIdx * 10000 + prnNum
      };
    });
    barData.sort(function(a,b){return a._order-b._order;});
    barData.forEach(function(d){delete d._order;});
    chart.drawBar(barData, {title:'Average SNR by Satellite', decimals:1});
  }

  drawDOPTimeSeries(chart) {
    if (!chart || !this.gsaData.length) return;
    var pdopDS=[], hdopDS=[], vdopDS=[];
    this.gsaData.forEach(function(gsa,i) {
      pdopDS.push({x:i,y:gsa.pdop});
      hdopDS.push({x:i,y:gsa.hdop});
      vdopDS.push({x:i,y:gsa.vdop});
    });
    chart.drawLine([
      {data:pdopDS,color:'#6f42c1',label:'PDOP',fill:false},
      {data:hdopDS,color:'#e83e8c',label:'HDOP',fill:false},
      {data:vdopDS,color:'#20c997',label:'VDOP',fill:false}
    ],{title:'DOP',xLabel:'Epoch',yLabel:'DOP',yMin:0,
      legend:[{label:'PDOP',color:'#6f42c1'},{label:'HDOP',color:'#e83e8c'},{label:'VDOP',color:'#20c997'}]
    });
  }

  drawConstellationStats(chart) {
    if (!chart) return;
    var self = this;
    var groups = [];
    Object.values(this.constellationStats).forEach(function(stats) {
      if (stats.totalPRNs > 0) {
        groups.push({
          label: stats.name,
          values: [
            {value: stats.totalPRNs, color: stats.color},
            {value: Math.round(stats.avgSNR), color: stats.color}
          ]
        });
      }
    });
    chart.drawGroupedBar(groups, {
      title:'Constellation Stats (PRNs / Avg SNR)',
      legend:[{label:'# Satellites',color:'#0d6efd'},{label:'Avg SNR',color:'#28a745'}]
    });
  }

  drawSNRQualityPie(chart) {
    if (!chart) return;
    var dist = this.getSNRQualityDistribution();
    chart.drawPie([
      {label:'Excellent(>=40)',value:dist.excellent,color:'#28a745'},
      {label:'Good(30-40)',value:dist.good,color:'#17a2b8'},
      {label:'Fair(20-30)',value:dist.fair,color:'#ffc107'},
      {label:'Poor(<20)',value:dist.poor,color:'#dc3545'}
    ],{title:'SNR Quality Distribution'});
  }
}