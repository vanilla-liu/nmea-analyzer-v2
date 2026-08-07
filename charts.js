/**
 * SVG Chart Library for NMEA Analyzer
 * Vector graphics, zoomable, crisp at any scale
 */
class NMEAChart {
  constructor(containerId, options) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;
    this.options = Object.assign({
      padding: {top:40,right:30,bottom:50,left:60},
      bgColor:'#ffffff',gridColor:'#e9ecef',textColor:'#333333'
    }, options || {});
    this.svg = null;
    this._init();
  }
  _init() {
    if (!this.container) return;
    this.container.innerHTML = '';
    var rect = this.container.getBoundingClientRect();
    var w = rect.width || 400, h = rect.height || 350;
    if (w < 10) w = 400;
    if (h < 10) h = 350;
    this.w = w; this.h = h;
    var ns = 'http://www.w3.org/2000/svg';
    this.svg = document.createElementNS(ns, 'svg');
    this.svg.setAttribute('width', '100%');
    this.svg.setAttribute('height', '100%');
    this.svg.setAttribute('viewBox', '0 0 '+w+' '+h);
    this.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
    this.svg.style.display = 'block';
    this.svg.style.background = this.options.bgColor;
    this.container.appendChild(this.svg);
  }
  _el(tag, attrs) {
    var ns = 'http://www.w3.org/2000/svg';
    var el = document.createElementNS(ns, tag);
    if (attrs) Object.keys(attrs).forEach(function(k){el.setAttribute(k, attrs[k]);});
    return el;
  }
  _text(x, y, text, attrs) {
    var el = this._textEl(x, y, text, attrs);
    this.svg.appendChild(el);
    return el;
  }
  _textEl(x, y, text, attrs) {
    var defaults = {x:x, y:y, fill:this.options.textColor, 'font-size':'10px', 'font-family':'sans-serif', 'text-anchor':'middle', 'dominant-baseline':'central'};
    if (attrs) Object.keys(attrs).forEach(function(k){defaults[k]=attrs[k];});
    var el = this._el('text', defaults);
    el.textContent = text;
    return el;
  }
  clear() {
    if (this.svg) this.svg.innerHTML = '';
  }
  resize() {
    if (!this.container) return;
    this._init();
  }
  drawTitle(title) {
    if (!this.svg || !title) return;
    this._text(this.w/2, 18, title, {'font-size':'13px','font-weight':'bold','text-anchor':'middle'});
  }
  _drawGrid(p,w,h,xMin,xMax,yMin,yMax,xLabel,yLabel,yStepSize) {
    var steps = 5;
    if (yStepSize > 0) {
      steps = Math.round((yMax - yMin) / yStepSize);
      if (steps < 1) steps = 1;
      if (steps > 10) steps = 10;
    }
    var yIsInt = yStepSize > 0 && yStepSize === Math.floor(yStepSize);
    for (var i=0;i<=steps;i++) {
      var y = p.top + h - (h*i/steps);
      this.svg.appendChild(this._el('line',{x1:p.left,y1:y,x2:p.left+w,y2:y,stroke:this.options.gridColor,'stroke-width':'0.5'}));
      this._text(p.left-5, y, yIsInt?Math.round(yMin+(yMax-yMin)*i/steps).toString():(yMin+(yMax-yMin)*i/steps).toFixed(4), {'text-anchor':'end','font-size':'10px'});
    }
    for (var j=0;j<=steps;j++) {
      var x = p.left + (w*j/steps);
      this.svg.appendChild(this._el('line',{x1:x,y1:p.top,x2:x,y2:p.top+h,stroke:this.options.gridColor,'stroke-width':'0.5'}));
      var v = xMin+(xMax-xMin)*j/steps;
      this._text(x, p.top+h+15, v.toFixed(4), {'font-size':'10px'});
    }
    if (xLabel) this._text(p.left+w/2, p.top+h+35, xLabel, {'font-size':'11px'});
    if (yLabel) {
      var el = this._textEl(0, 0, yLabel, {'font-size':'11px'});
      el.setAttribute('transform','translate(12,'+(p.top+h/2)+') rotate(-90)');
      this.svg.appendChild(el);
    }
  }
  drawScatter(data, config) {
    if (!this.svg||!data.length) return;
    this.clear(); this.drawTitle(config.title||'');
    var p=this.options.padding, w=this.w-p.left-p.right, h=this.h-p.top-p.bottom;
    var xArr=data.map(function(d){return d.x}), yArr=data.map(function(d){return d.y});
    var xMin=Math.min.apply(null,xArr), xMax=Math.max.apply(null,xArr);
    var yMin=Math.min.apply(null,yArr), yMax=Math.max.apply(null,yArr);
    var xr=(xMax-xMin)||1, yr=(yMax-yMin)||1;
    xMin-=xr*0.05; xMax+=xr*0.05; yMin-=yr*0.05; yMax+=yr*0.05;
    var tx=function(x){return p.left+((x-xMin)/(xMax-xMin))*w;};
    var ty=function(y){return p.top+(1-(y-yMin)/(yMax-yMin))*h;};
    this._drawGrid(p,w,h,xMin,xMax,yMin,yMax,config.xLabel,config.yLabel);
    var self=this;
    data.forEach(function(d){
      var sx=tx(d.x), sy=ty(d.y);
      self.svg.appendChild(self._el('circle',{cx:sx,cy:sy,r:d.size||2,fill:d.color||'#0d6efd',opacity:d.alpha||0.7}));
    });
    if(config.legend) this._drawLegend(config.legend);
  }
  drawLine(datasets, config) {
    if (!this.svg) return;
    this.clear(); this.drawTitle(config.title||'');
    var p=this.options.padding, w=this.w-p.left-p.right, h=this.h-p.top-p.bottom;
    if (!datasets.length||!datasets[0].data.length) return;
    var xMin=Infinity,xMax=-Infinity,yMin=Infinity,yMax=-Infinity;
    datasets.forEach(function(ds){ds.data.forEach(function(pt){
      if(pt.x<xMin)xMin=pt.x; if(pt.x>xMax)xMax=pt.x;
      if(pt.y<yMin)yMin=pt.y; if(pt.y>yMax)yMax=pt.y;
    });});
    if(config.yMin!==undefined)yMin=Math.min(yMin,config.yMin);
    if(config.yMax!==undefined)yMax=Math.max(yMax,config.yMax);
    if(config.yStepSize>0&&yMin>=0)yMin=0;
    var yr=(yMax-yMin)||1; if(!config.yStepSize&&yMin>0)yMin-=yr*0.05; yMax+=yr*0.05;
    var tx=function(x){return p.left+((x-xMin)/((xMax-xMin)||1))*w;};
    var ty=function(y){return p.top+(1-(y-yMin)/(yMax-yMin))*h;};
    this._drawGrid(p,w,h,xMin,xMax,yMin,yMax,config.xLabel,config.yLabel,config.yStepSize);
    var self=this;
    if(config.thresholds){config.thresholds.forEach(function(th){
      var sy=ty(th.value); if(sy>=p.top&&sy<=p.top+h){
        self.svg.appendChild(self._el('line',{x1:p.left,y1:sy,x2:p.left+w,y2:sy,stroke:th.color||'#dc3545','stroke-width':'1','stroke-dasharray':'5,5'}));
        self._text(p.left+w+2,sy,th.label,{'text-anchor':'start','font-size':'10px',fill:th.color||'#dc3545'});
      }
    });}
    datasets.forEach(function(ds){
      if(ds.data.length<2)return;
      var pts=ds.data.map(function(pt,i){return (i===0?'M':'L')+tx(pt.x).toFixed(2)+','+ty(pt.y).toFixed(2);}).join(' ');
      self.svg.appendChild(self._el('path',{d:pts,fill:'none',stroke:ds.color||'#0d6efd','stroke-width':ds.lineWidth||1.5,opacity:ds.alpha||1}));
      if(ds.fill){
        var last=ds.data[ds.data.length-1], first=ds.data[0];
        var fillPts=pts+' L'+tx(last.x).toFixed(2)+','+(p.top+h)+' L'+tx(first.x).toFixed(2)+','+(p.top+h)+' Z';
        self.svg.appendChild(self._el('path',{d:fillPts,fill:ds.color||'#0d6efd',opacity:'0.1',stroke:'none'}));
      }
    });
    if(config.legend) this._drawLegend(config.legend);
  }
  drawBar(data, config) {
    if(!this.svg||!data.length)return;
    this.clear(); this.drawTitle(config.title||'');
    var p=this.options.padding, w=this.w-p.left-p.right, h=this.h-p.top-p.bottom;
    var vals=data.map(function(d){return d.value});
    var yMax=Math.max.apply(null,vals)*1.15; if(yMax===0)yMax=1;
    var barW=Math.min((w/data.length)*0.55, 28);
    var gap=(w-data.length*barW)/(data.length+1);
    if(gap<2)gap=2;
    for(var i=0;i<=5;i++){
      var y=p.top+h-(h*i/5);
      this.svg.appendChild(this._el('line',{x1:p.left,y1:y,x2:p.left+w,y2:y,stroke:this.options.gridColor,'stroke-width':'0.5'}));
      this._text(p.left-5,y,(yMax*i/5).toFixed(config.decimals||1),{'text-anchor':'end','font-size':'10px'});
    }
    var self=this;
    for(var j=0;j<data.length;j++){
      var x=p.left+gap+(barW+gap)*j;
      var barH=(data[j].value/yMax)*h;
      var by=p.top+h-barH;
      self.svg.appendChild(self._el('rect',{x:x,y:by,width:barW,height:barH,fill:data[j].color||'#0d6efd',opacity:'0.85'}));
      var labelEl=self._textEl(0,0,data[j].label,{'font-size':'9px'});
      labelEl.setAttribute('transform','translate('+(x+barW/2)+','+(p.top+h+8)+') rotate(-40)');
      labelEl.style.textAnchor='end';
      self.svg.appendChild(labelEl);
      if(barH>12){
        self._text(x+barW/2,by+barH/2+3,data[j].value.toFixed(config.decimals||0),{'font-size':'9px','font-weight':'bold',fill:'#fff'});
      } else {
        self._text(x+barW/2,by-4,data[j].value.toFixed(config.decimals||0),{'font-size':'9px'});
      }
    }
    if(config.legend) this._drawLegend(config.legend);
  }
  drawGroupedBar(groups, config) {
    if(!this.svg||!groups.length)return;
    this.clear(); this.drawTitle(config.title||'');
    var p=this.options.padding, w=this.w-p.left-p.right, h=this.h-p.top-p.bottom;
    var yMax=0;
    groups.forEach(function(g){g.values.forEach(function(v){if(v.value>yMax)yMax=v.value;});});
    yMax*=1.15; if(yMax===0)yMax=1;
    var gw=w/groups.length, numB=groups[0].values.length, bw=(gw*0.7)/numB, gg=gw*0.15;
    for(var i=0;i<=4;i++){
      var y=p.top+h-(h*i/4);
      this.svg.appendChild(this._el('line',{x1:p.left,y1:y,x2:p.left+w,y2:y,stroke:this.options.gridColor,'stroke-width':'0.5'}));
      this._text(p.left-5,y,(yMax*i/4).toFixed(1),{'text-anchor':'end','font-size':'10px'});
    }
    var self=this;
    for(var gi=0;gi<groups.length;gi++){
      var gx=p.left+gw*gi+gg;
      for(var vi=0;vi<groups[gi].values.length;vi++){
        var v=groups[gi].values[vi];
        var bx=gx+bw*vi;var barH=(v.value/yMax)*h;var by=p.top+h-barH;
        self.svg.appendChild(self._el('rect',{x:bx,y:by,width:bw-1,height:barH,fill:v.color,opacity:'0.85'}));
      }
      self._text(p.left+gw*gi+gw/2,p.top+h+15,groups[gi].label,{'font-size':'10px'});
    }
    if(config.legend) this._drawLegend(config.legend);
  }
  drawPie(data, config) {
    if(!this.svg||!data.length)return;
    this.clear(); this.drawTitle(config.title||'');
    var cx=this.w*0.35, cy=this.h*0.55;
    var radius=Math.min(cx-30,cy-30)*0.8;
    var total=data.reduce(function(s,d){return s+d.value;},0);
    if(total===0)return;
    var startAngle=-Math.PI/2;
    var self=this;
    var onlyOne=data.filter(function(d){return d.value>0;}).length===1;
    data.forEach(function(d){
      if(d.value===0)return;
      var sa=(d.value/total)*Math.PI*2;
      if(onlyOne){
        var path='M'+cx+','+(cy-radius)+' A'+radius+','+radius+' 0 1,1 '+(cx-0.01)+','+(cy-radius)+' Z';
        self.svg.appendChild(self._el('path',{d:path,fill:d.color,opacity:'0.85',stroke:'#fff','stroke-width':'2'}));
      } else {
        var x1=cx+Math.cos(startAngle)*radius, y1=cy+Math.sin(startAngle)*radius;
        var x2=cx+Math.cos(startAngle+sa)*radius, y2=cy+Math.sin(startAngle+sa)*radius;
        var large=sa>Math.PI?1:0;
        var path='M'+cx+','+cy+' L'+x1.toFixed(2)+','+y1.toFixed(2)+' A'+radius+','+radius+' 0 '+large+',1 '+x2.toFixed(2)+','+y2.toFixed(2)+' Z';
        self.svg.appendChild(self._el('path',{d:path,fill:d.color,opacity:'0.85',stroke:'#fff','stroke-width':'2'}));
      }
      if(sa>0.15){var ma=startAngle+sa/2;var lx=cx+Math.cos(ma)*radius*0.65;var ly=cy+Math.sin(ma)*radius*0.65;
        self._text(lx,ly,((d.value/total)*100).toFixed(1)+'%',{'font-size':'11px','font-weight':'bold',fill:'#fff'});}
      startAngle+=sa;
    });
    var ly=30;
    data.forEach(function(d){
      if(d.value===0)return;
      self.svg.appendChild(self._el('rect',{x:cx+radius+30,y:ly,width:14,height:14,fill:d.color,opacity:'0.85'}));
      self._text(cx+radius+50,ly+7,d.label+': '+d.value+' ('+((d.value/total)*100).toFixed(1)+'%)',{'text-anchor':'start','font-size':'11px'});
      ly+=22;
    });
  }
  drawSkyPlot(satellites, config) {
    if(!this.svg)return;
    this.clear(); this.drawTitle(config.title||'Sky Plot');
    var cx=this.w/2, cy=this.h/2+10;
    var radius=Math.min(cx-60,cy-40);
    var constellationColors=config.constellationColors||{GP:'#0d6efd',GL:'#6f42c1',GA:'#28a745',GB:'#dc3545',GQ:'#ffc107'};
    for(var i=0;i<=3;i++){
      var r=radius*(i/3);
      this.svg.appendChild(this._el('circle',{cx:cx,cy:cy,r:r,fill:'none',stroke:'#dee2e6','stroke-width':'1'}));
      this._text(cx+3,cy-r+12,(90-i*30)+'deg',{'font-size':'9px',fill:'#999','text-anchor':'start'});
    }
    var dirs=['N','NE','E','SE','S','SW','W','NW'];
    var self=this;
    dirs.forEach(function(d,idx){
      var angle=idx*Math.PI/4-Math.PI/2;
      self.svg.appendChild(self._el('line',{x1:cx,y1:cy,x2:cx+Math.cos(angle)*radius,y2:cy+Math.sin(angle)*radius,stroke:'#dee2e6','stroke-width':'0.5'}));
      self._text(cx+Math.cos(angle)*(radius+15),cy+Math.sin(angle)*(radius+15)+3,d,{'font-size':'10px',fill:'#666'});
    });
    var prefix={GP:'G',GL:'R',GA:'E',GB:'C',GQ:'Q'};
    satellites.forEach(function(trail){
      var col=constellationColors[trail.talkerId]||'#0d6efd';
      var pts=trail.points;
      if(pts.length>1){
        var pathD=pts.map(function(pt,i){
          var elevRad=(90-pt.elevation)/90*radius;
          var azRad=(pt.azimuth-90)*Math.PI/180;
          var sx=cx+Math.cos(azRad)*elevRad, sy=cy+Math.sin(azRad)*elevRad;
          return (i===0?'M':'L')+sx.toFixed(2)+','+sy.toFixed(2);
        }).join(' ');
        self.svg.appendChild(self._el('path',{d:pathD,fill:'none',stroke:col,'stroke-width':'1',opacity:'0.4'}));
      }
      var last=pts[pts.length-1];
      var elevRad=(90-last.elevation)/90*radius;
      var azRad=(last.azimuth-90)*Math.PI/180;
      var sx=cx+Math.cos(azRad)*elevRad, sy=cy+Math.sin(azRad)*elevRad;
      self.svg.appendChild(self._el('circle',{cx:sx,cy:sy,r:'5',fill:col,opacity:'0.9',stroke:'#fff','stroke-width':'1'}));
      self._text(sx,sy-8,(prefix[trail.talkerId]||'')+trail.prn,{'font-size':'8px'});
    });
    if(config.legend) this._drawLegend(config.legend);
  }
  _drawLegend(items) {
    if(!items||!items.length)return;
    var self=this;
    var lx=this.w-160, ly=30;
    items.forEach(function(item){
      self.svg.appendChild(self._el('rect',{x:lx,y:ly,width:10,height:10,fill:item.color,opacity:'0.85'}));
      self._text(lx+15,ly+5,item.label,{'text-anchor':'start','font-size':'10px'});
      ly+=18;
    });
  }
}
