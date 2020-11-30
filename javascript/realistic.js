/***
 * code for realistic mode
***/
const EARTH_RADIUS = 6378;

const magOfOverview = 1.8, magOfGEO = 2.5, magOfLEO = 13;
const ZOOM_OVERVIEW = { mag: magOfOverview, center: false, orbitOpacity: 0.25, satelliteSize: 1.3};
const ZOOM_GEO = { mag: magOfGEO, center: true, orbitOpacity: 0.25, satelliteSize: 2.2};
const ZOOM_LEO = { mag: magOfLEO, center: true, orbitOpacity: 0.12, satelliteSize: 4};
const TRANSITION_DURATION = 2000;
var zoom = ZOOM_GEO;
var prevZoom = ZOOM_GEO;

// Visual codings of satellite points 
const colorOfCountry = {
    china: '#E12200',
    russia: '#9B56BB',
    UK: '#0079B8',
    USA: '#62A420',
    others: '#FAC400'
}

var satelliteOpacity = 0.7;
const opacityOfPeriod = {
    '2010-2020': satelliteOpacity,
    '2000-2009': satelliteOpacity * 0.75,
    '1990-1999': satelliteOpacity * 0.5,
    'before 1990': satelliteOpacity * 0.25
}

// Width, padding of canvas
const mainVis = document.getElementById('realistic-main-vis');
const mainVis_scrolly = document.getElementById('scrolly-main-vis');
const canvasLeftPadding = 40;
const canvasBottomPadding = 40;
const leftControlsWidth = 200;
const mainVisLeftPadding = 40;
const mainVisRightPadding = 10;

var real_width = mainVis.clientWidth;
var real_height = mainVis.clientHeight;

const graphLeftPadding = canvasLeftPadding + leftControlsWidth + mainVisLeftPadding;

// Refine By dropdowns
const refineByCountry = document.querySelector('#refineByCountry');
const refineByPurpose = document.querySelector('#refineByPurpose');
const refineByPeriod = document.querySelector('#refineByPeriod');

// field names
const FN_COUNTRY = 'new_country';
const FN_PURPOSE = 'new_purpose';
const FN_PERIOD = 'new_period';
const FN_ORBIT = 'Class of Orbit';
const ORBIT_NAMES = ['LEO', 'MEO', 'GEO', 'Elliptical'];

var refineByParamsRealistic = {};

// svg variables
var satelliteData; // holds the satellite data
var scale;
var kmToWidth;
var kmToWidth_scrolly;
var maxApogee, maxPerigee, maxLEOApogee, maxMEOApogee, maxGEOApogee;

// hover event variables
var earthCenterForHover;

// animation variables
var orbitInterval;
const orbitSpeeds = {LEO: 1.2, MEO: 0.5, GEO: 0.3}

// Functions to style satellite points
function sizeStyle(d) { // Initial Size
    const orbitClass = d['Class of Orbit'];
    const size = ZOOM_GEO.satelliteSize * mainVis.clientWidth / 1425;
    switch (orbitClass) {
        case 'LEO':
            return size;
        case 'MEO':
            return 1.5 * size;
        case 'GEO':
            return 1.5 * size;
        case 'Elliptical':
            return 2 * size;
    }
}

function colorStyle(d) { // Color
    const country = d['Country of Operator/Owner'];
    switch (country) {
        case 'China':
            return colorOfCountry.china;
        case 'Russia':
            return colorOfCountry.russia;
        case 'UK':
            return colorOfCountry.UK;
        case 'USA':
            return colorOfCountry.USA;
        default:
            return colorOfCountry.others;
    }
}

function opacityStyle(d) { //Opacity
    if (+d['new_year'] < 1990) {
        return opacityOfPeriod['before 1990'];
    } else if ((+d['new_year'] >= 1990) && (+d['new_year'] < 2000)) {
        return opacityOfPeriod['1990-1999'];
    } else if ((+d['new_year'] >= 2000) && (+d['new_year'] < 2010)) {
        return opacityOfPeriod['2000-2009'];
    } else {
        return opacityOfPeriod['2010-2020'];
    }
}

function updateOrbitGroupOpacity(orbitClass, opacity) {
    d3.select('#realistic-main-vis').select('g.' + orbitClass)
        .attr('opacity', d => {
            return opacity;
        });
        //.attr('rotation', d => d.rotation);
}

// function for animated transition
function animationSelector(selection, shouldAnimate) {
    return shouldAnimate ? selection.transition().duration(TRANSITION_DURATION) : selection;
}

// handling canvas
var scrollyMainVisContext = mainVis_scrolly.getContext('2d');
var virtualDataContainer = d3.select(document.createElement("custom")); // Create an in memory only element of type 'custom'
const dpi = window.devicePixelRatio;
mainVis_scrolly.setAttribute('height', mainVis_scrolly.clientHeight * dpi);
mainVis_scrolly.setAttribute('width', mainVis_scrolly.clientWidth * dpi);

var earthImg = new Image();
// earthImg.onload = function (){}
earthImg.src = "../data/Flat Earth Map.png";

function drawCanvas(virtualDataContainer, context) {
    // clear canvas
    context.clearRect(0,0,mainVis_scrolly.clientWidth*dpi,mainVis_scrolly.clientHeight*dpi);

    // draw earth //// something is wrong about it...
    const earth = virtualDataContainer.selectAll('.earth');
    context.save();
    context.globalAlpha = earth.style('opacity');
    context.drawImage(
        earthImg,
        earth.attr('x')*dpi,
        earth.attr('y')*dpi,
        earth.attr('width')*dpi,
        earth.attr('height')*dpi
    );
    context.restore();

    const orbitLabels = virtualDataContainer.select('.orbitLabels_scrolly');
    // draw satellites
    for (const orbitClass of ORBIT_NAMES) {
        // handle translation and rotation
        const orbitGroup = virtualDataContainer.select('g.' + orbitClass);
        context.translate(orbitGroup.attr('x')*dpi, orbitGroup.attr('y')*dpi);
        context.rotate(orbitGroup.attr('rotation') / 180 * Math.PI);

        // draw satellites and their orbits in the group
        const satellites = virtualDataContainer.select('g.' + orbitClass).selectAll('.satellites');
        const orbits = virtualDataContainer.select('g.' + orbitClass).selectAll('ellipse');

        orbits.each(function (d) {
            const node = d3.select(this);

            const x = node.attr('cx')*dpi;
            const y = node.attr('cy')*dpi;
            const radiusX = node.attr('rx')*dpi;
            const radiusY = node.attr('ry')*dpi;
            const angle = node.attr('angle');

            context.beginPath();
            context.strokeStyle = node.style("stroke");
            context.ellipse(x, y, radiusX, radiusY, 0, 0, 2 * Math.PI, true);
            context.stroke();
            context.closePath();
        });
    
        satellites.each(function (d) {
            const node = d3.select(this);

            const x = node.attr('cx')*dpi;
            const y = node.attr('cy')*dpi;
            const radius = node.attr('r')*dpi;

            context.save();
            context.globalAlpha = node.style('opacity');
            context.beginPath();
            context.fillStyle = node.style("fill");
            context.arc(x, y, radius, 0, 2 * Math.PI, true);
            context.fill();
            context.closePath();
            context.restore();
        });

        // end rotation
        context.rotate(-orbitGroup.attr('rotation') / 180 * Math.PI);

        // draw labels
        const labelName = orbitClass === 'Elliptical' ? 'HEO' : orbitClass;
        const orbitLabel = orbitLabels.select('.' + labelName);
        orbitLabel.each(function(d) {
            const node = d3.select(this);
            context.save();
            context.globalAlpha = node.style('opacity');
            context.font="26px Metropolis_Medium";
            context.fillStyle = '#FFFFFF';
            context.textAlign = 'center';
            context.fillText(labelName, node.attr('x') * dpi || 0, node.attr('y') * dpi || 0);
            context.restore();
        });
        
        // reset origin
        context.translate(-orbitGroup.attr('x')*dpi, -orbitGroup.attr('y')*dpi);
    }
}

// *** Create a function to update chart in scrollytelling ***
// controlParams are passed from: scrolly.js
// controlParams: {
//   zoom: <obj>,
//   orbitOpacityCoefficient: {
//     LEO: <number>
//     MEO: <number>
//     GEO: <number>
//     Elliptical: <number>
//   },
//   hideSatellites: <bool>,
//   shouldAnimate: <bool>
//   orbitClassToRevolve: <string>
// }
function updateChart_scrolly(controlParams) {
    const scrollyMainVisD3 = d3.select('#scrolly-main-vis');
    // patch controlParams
    controlParams = controlParams || {};
    controlParams.zoom = controlParams.zoom === undefined ? ZOOM_OVERVIEW : controlParams.zoom;
    controlParams.orbitOpacityCoefficient = controlParams.orbitOpacityCoefficient === undefined
      ? {LEO: 1, MEO: 1, GEO: 1, Elliptical: 1} 
      : controlParams.orbitOpacityCoefficient;
    controlParams.hideSatellites = controlParams.hideSatellites === undefined ? false : controlParams.hideSatellites;
    controlParams.shouldAnimate = controlParams.shouldAnimate === undefined ? false : controlParams.shouldAnimate;
  
    // Update the scale based on Zoom Level
    scale_scrolly = d3.scaleLinear()
        .domain([0, maxApogee / controlParams.zoom.mag])
        .range([0,kmToWidth_scrolly * maxApogee]);
  
    // Update the earth center on canvas;    
    const earthCenterX = controlParams.zoom.center
        ? (mainVis_scrolly.clientWidth) / 2
        : kmToWidth_scrolly * maxPerigee + 100;
  
    const earthCenter = [earthCenterX, mainVis_scrolly.clientHeight / 2];
  
    // Define the relative position of satellite points
    const getPointOnEllipse = (apogee, perigee, angle) => {
      const tangent = Math.tan(angle);
      const centerX = scale_scrolly((apogee - perigee) / 2);
      const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
      const bSq = (apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS);
      const xAbs = 1.0 / Math.sqrt(1.0 / (a * a) + Math.pow(tangent, 2) / bSq);
  
      const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale_scrolly(xAbs) : centerX - scale_scrolly(xAbs);
      const y = angle < 0 ? -scale_scrolly(xAbs * Math.abs(tangent)) : scale_scrolly(xAbs * Math.abs(tangent)); // minus because +y direction is actually down on svg
      return {x: x, y: y};
    }
  
    function getPosX(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
    }
  
    function getPosY(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
    }
    // attributes to update
    function updateEarth(earth) {
        const earthDiameter = scale_scrolly(EARTH_RADIUS) * 2;
        earth
        .attr('width', earthDiameter)
        .attr('height', earthDiameter)
        .attr('x', earthCenter[0] - scale_scrolly(EARTH_RADIUS))
        .attr('y', earthCenter[1] - scale_scrolly(EARTH_RADIUS))
    }

    function updateOrbitGroup(orbitClass) {
        animationSelector(virtualDataContainer.select('g.' + orbitClass), controlParams.shouldAnimate)
            // .attr('transform', d => {
            //     return 'translate(' + [earthCenter[0], earthCenter[1]] + ') rotate('+ d.rotation +' 0, 0)';
            // });
            .attr('x', earthCenter[0])
            .attr('y', earthCenter[1])
            // .attr('rotation', d => d.rotation);
    }
    function updateOrbits(orbits) {
        orbits
        .attr('cx', d => {
            return scale_scrolly((+d['Apogee (km)'] - +d['Perigee (km)']) / 2);
        })
        .attr('cy', 0)
        .attr('rx', d => scale_scrolly(((+d['Apogee (km)'] + EARTH_RADIUS) + (+d['Perigee (km)'] + EARTH_RADIUS)) / 2) )
        .attr('ry', d => scale_scrolly(Math.sqrt((+d['Apogee (km)'] + EARTH_RADIUS) * (+d['Perigee (km)'] + EARTH_RADIUS))) )
        .attr('angle', d => d['Angle'])
        .style('stroke', d => {
            const orbitClass = d['Class of Orbit'];
            const orbitOpacity = controlParams.zoom.orbitOpacity * controlParams.orbitOpacityCoefficient[orbitClass];
            switch (orbitClass) {
                case 'LEO': {
                    return 'rgba(68, 68, 68,' + orbitOpacity +')';
                }
                case 'MEO': {
                    return 'rgba(100, 100, 100,' + orbitOpacity +')';
                }
                case 'GEO': {
                    return 'rgba(68, 68, 68,' + orbitOpacity +')';
                }
                case 'Elliptical': {
                    return 'rgba(200, 200, 200,' + orbitOpacity +')';
                }
            }
        });
    }
  
    function updateSatellite(satellites) {
        satellites
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d) * 0.75;
        })
        .style('opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }

    let satByOrbit = {};
    for (const satellite of satelliteData) {
        // Put all data points into different groups based on orbit
        if (satByOrbit[satellite[FN_ORBIT]]) {
            satByOrbit[satellite[FN_ORBIT]].push(satellite);
        } else {
            satByOrbit[satellite[FN_ORBIT]] = [satellite];
        }
    }
  
    // Upload the Earth PNG
    var earth = virtualDataContainer.selectAll('.earth')
        .data([0], function(d) {return 'earth';});
    var earthEnter = earth.enter()
        .append('image')
        .attr('class', 'earth')
        .attr('href', '../data/Flat Earth Map.png')
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('opacity', 0.75);
  
    for (const orbitClass of ORBIT_NAMES) {
        // plot orbits
        let orbit = virtualDataContainer.select('g.' + orbitClass).selectAll('ellipse')
        .data(satByOrbit[orbitClass], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });

        let orbitEnter = orbit.enter()
            .append('ellipse')
            .attr('class', 'regular-ellipse')
            .style('opacity', 0.7);
            
        // orbit.merge(orbitEnter)
        //     .transition();
        orbit.exit().remove();

        updateOrbits(animationSelector(orbit, controlParams.shouldAnimate));

        // Plot satellites
        let satellites = virtualDataContainer.select('g.' + orbitClass).selectAll('.satellites')
        .data(satByOrbit[orbitClass] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });

        let satellitesEnter = satellites.enter()
            .append('circle')
            .attr('class', d => {
                return 'satellites ' + d['Class of Orbit'];
            })
            .style('fill', '#ffffff');
        
        // satellites.merge(satellitesEnter)
        //     .transition();
        satellites.exit().remove();
        updateSatellite(animationSelector(satellites, controlParams.shouldAnimate));

        updateOrbitGroup(orbitClass);
    }

    // Plot orbit labels
    var orbitLabels = virtualDataContainer.select('.orbitLabels_scrolly');
    if (orbitLabels.empty()) {
        virtualDataContainer.append('g').attr('class', 'orbitLabels_scrolly');
        orbitLabels = virtualDataContainer.select('.orbitLabels_scrolly');
  
        orbitLabels.append('text')
        .attr('class', 'LEO label')
        .text('LEO');
        
        orbitLabels.append('text')
        .attr('class', 'MEO label')
        .text('MEO');
    
        orbitLabels.append('text')
        .attr('class', 'GEO label')
        .text('GEO');
        
        orbitLabels.append('text')
        .attr('class', 'HEO label')
        .text('HEO');
    }
    
    // update labels
    animationSelector(orbitLabels, controlParams.shouldAnimate).attr('transform', 'translate(' + [earthCenter[0], earthCenter[1]] + ')');
    animationSelector(orbitLabels.select('.LEO'), controlParams.shouldAnimate)
        .attr('y', function(d) {
            if (controlParams.zoom.mag == magOfLEO){
            return -scale_scrolly(maxLEOApogee) - 15;
            } else {
                return -scale_scrolly(maxLEOApogee) - 3;
            }
        })
        .style('opacity', controlParams.orbitOpacityCoefficient.LEO === 1 ? 1 : 0.2);
    animationSelector(orbitLabels.select('.MEO'), controlParams.shouldAnimate)
        .attr('y', -scale_scrolly(maxMEOApogee) - 6)
        .style('opacity', controlParams.orbitOpacityCoefficient.MEO === 1 ? 1 : 0.2);
    animationSelector(orbitLabels.select('.GEO'), controlParams.shouldAnimate)
        .attr('y', -scale_scrolly(maxGEOApogee) - 12)
        .style('opacity', controlParams.orbitOpacityCoefficient.GEO === 1 ? 1 : 0.2);
    animationSelector(orbitLabels.select('.HEO'), controlParams.shouldAnimate)
        .attr('x', scale_scrolly(EARTH_RADIUS) * 8.5)
        .style('opacity', controlParams.orbitOpacityCoefficient.Elliptical === 1 ? 1 : 0.2);
  
    updateEarth(animationSelector(virtualDataContainer.selectAll('.earth'), controlParams.shouldAnimate));
    
    drawCanvas(virtualDataContainer, scrollyMainVisContext);

    clearInterval(orbitInterval);
    if(controlParams.shouldAnimate) {
        const transitionAnimation = setInterval(()=> {
            drawCanvas(virtualDataContainer, scrollyMainVisContext);
        }, 100);
        setTimeout(() => {
            clearInterval(transitionAnimation);
            animateSatelliteOrbits();
        }, TRANSITION_DURATION);
    } else {
        animateSatelliteOrbits();
    }

    // animate revolving satellites
    function animateSatelliteOrbits() {
        clearInterval(orbitInterval);
        if (controlParams.orbitClassToRevolve) {
            const orbitClass = controlParams.orbitClassToRevolve === 'HEO' ? 'Elliptical' : controlParams.orbitClassToRevolve;
            orbitInterval = setInterval(() => {
                satByOrbit[orbitClass].forEach(function(d) {
                    const p = d['Perigee (km)'];
                    const a = d['Apogee (km)'];
                    const nextAngle = d['Angle'] + 200 / (a + EARTH_RADIUS - (a - p) * (Math.abs(d['Angle'])) / Math.PI);
                    d['Angle'] = nextAngle >= Math.PI ? nextAngle - 2 * Math.PI : nextAngle;
                })
                updateSatellite(virtualDataContainer.selectAll('.satellites.' + orbitClass + ''));
                drawCanvas(virtualDataContainer, scrollyMainVisContext);
            }, 100);
        }
    }
  }


// *** Create a function to update the main chart ***
function updateChart(refineParam) {
    // responsive setup
    kmToWidth = (mainVis.clientWidth - graphLeftPadding - mainVisRightPadding) / (maxApogee + maxPerigee);
    const axisWidth = 0.3 * mainVis.clientWidth;


    const shouldAnimate = prevZoom !== zoom;
    prevZoom = zoom;

    // Update the scale based on Zoom Level
    scale = d3.scaleLinear()
        .domain([0, maxApogee / zoom.mag])
        .range([0,kmToWidth * maxApogee]);

    // Update the earth center on canvas;    
    const earthCenterX = zoom.center
        ? (mainVis.clientWidth + graphLeftPadding/5 - mainVisRightPadding) / 2
        : kmToWidth * maxPerigee + graphLeftPadding * 1.4;

    const earthCenter = [earthCenterX, mainVis.clientHeight / 2];
    earthCenterForHover = earthCenter;

    // Update all satellite data based on filter selection    
    var filteredSatellites = satelliteData.filter(function(d){
        let match = true;
        for (let key in refineParam) {
            if (refineParam[key].substr(0, 3) === 'All') {
                continue;
            }
            if (d[key] !== refineParam[key]) {
                match = false;
                break;
            }
        }
        return match;
    });

    // Define the relative position of satellite points
    const getPointOnEllipse = (apogee, perigee, angle) => {
        const tangent = Math.tan(angle);
        const centerX = earthCenter[0] + scale((apogee - perigee) / 2);
        const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
        const bSq = (apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS);
        const xAbs = 1.0 / Math.sqrt(1.0 / (a * a) + Math.pow(tangent, 2) / bSq);

        const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
        const y = angle < 0 ? earthCenter[1] - scale(xAbs * Math.abs(tangent)) : earthCenter[1] + scale(xAbs * Math.abs(tangent)); // minus because +y direction is actually down on svg
        return {x: x, y: y};
    }

    function getPosX(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
    }

    function getPosY(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
    }

        //for hover
        var real_Tooltip = d3.select("#div_template_real")
        .append("div")
        .attr("class", "tooltip")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background-color", "white")
        .style("color","black")
        .style("border", "solid")
        .style("border-width", "2px")
        .style("border-radius", "5px")
        .style("padding", "5px")
    
        var real_mouseover = function(d) {
            // console.log("Into mouseover");
            real_Tooltip
              .style("opacity", 1)
            d3.select(this)
              .style("stroke", "black")
              .style("opacity", 1)
          }
        var real_mousemove = function(d) {
            // console.log("Into mousemove");
            //console.log("The country is: " + d['new_country']);
            real_Tooltip
              .html("Name: " + d['Name of Satellite  Alternate Names']  + "<br>"
              + "Country: " + d['new_country']  + "<br>" 
              + "Purpose: " + d['new_purpose']  + "<br>"
              + "Peroid: " + d['Period (minutes)']  + "mins"+ "<br>"
              + "Mass: " + d['Launch Mass (kg.)']  + "kg"+ "<br>"
              + "Average Distance to Earth: " + d['avgDis']  + "km"+ "<br>")
              .style("left", (d3.mouse(this)[0]+70 + real_width/2) + "px")
              .style("top", (d3.mouse(this)[1]+70 + real_height/2) + "px")
          }
    
        var real_mouseleave = function(d) {
            // console.log("Into mouseleave");
            real_Tooltip
              .style("opacity", 0)
            d3.select(this)
              .style("stroke", "none")
              .style("opacity", 1)
          }

    // Satellite attributes to update
    function resizeSatellites() { //Resize datamarks
        switch (zoom.mag) {
            case magOfOverview:
                return 'scale(' + ZOOM_OVERVIEW.satelliteSize/ZOOM_GEO.satelliteSize + ')';
            case magOfGEO:
                return 'scale(1)';
            case magOfLEO:
                return 'scale(' + ZOOM_LEO.satelliteSize/ZOOM_GEO.satelliteSize + ')';
        }
    }
    
    function transformDataMark(d) { //Reposition datamarks
        return 'translate(' + [getPosX(d), getPosY(d)] + ') ' + resizeSatellites();
    }

    function updateEarth(earth) {
        earth
        .attr('width', scale(EARTH_RADIUS)*2).attr('height', scale(EARTH_RADIUS)*2)
        .attr('x', earthCenter[0] - scale(EARTH_RADIUS))
        .attr('y', earthCenter[1] - scale(EARTH_RADIUS))
    }

    function updateOrbits(orbits) {
        orbits
        .attr('cx', d => {
            return earthCenter[0] + scale((+d['Apogee (km)'] - +d['Perigee (km)']) / 2);
        })
        .attr('cy', earthCenter[1])
        .attr('rx', d => scale(((+d['Apogee (km)'] + EARTH_RADIUS) + (+d['Perigee (km)'] + EARTH_RADIUS)) / 2) )
        .attr('ry', d => scale(Math.sqrt((+d['Apogee (km)'] + EARTH_RADIUS) * (+d['Perigee (km)'] + EARTH_RADIUS))) )
        .style('stroke', d => {
            const orbitClass = d['Class of Orbit'];
            switch (orbitClass) {
                case 'LEO': {
                    return 'rgba(68, 68, 68,' + zoom.orbitOpacity +')';
                }
                case 'MEO': {
                    return 'rgba(100, 100, 100,' + zoom.orbitOpacity +')';
                }
                case 'GEO': {
                    return 'rgba(68, 68, 68,' + zoom.orbitOpacity +')';
                }
                case 'Elliptical': {
                    return 'rgba(200, 200, 200,' + zoom.orbitOpacity +')';
                }
            }
        });
    }

    function updateSatelliteGroup(satelliteGroup) {
        satelliteGroup //update the group's position and scale
        .attr('transform', function (d){
            return transformDataMark(d);
        })
    }

   // Upload the Earth PNG
   var earth = d3.select('#realistic-main-vis').selectAll('.earth')
        .data([0], function(d) {return 'earth';});
    var earthEnter = earth.enter()
        .append('image')
        .attr('class', 'earth')
        .attr('href', '../data/Flat Earth Map.png')
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('opacity', 0.75);
    
    let satCount = {}; // How to use: element.innerText =  satCount['1990 - 1996'] ? satCount['1990 - 1996'] : 0;
    let satByPurpose = {};
    let satByOrbit = {};
    for (const satellite of filteredSatellites) {
        satCount[satellite[FN_COUNTRY]] = satCount[satellite[FN_COUNTRY]] ? satCount[satellite[FN_COUNTRY]] + 1 : 1;
        satCount[satellite[FN_PURPOSE]] = satCount[satellite[FN_PURPOSE]] ? satCount[satellite[FN_PURPOSE]] + 1 : 1;
        satCount[satellite[FN_PERIOD]] = satCount[satellite[FN_PERIOD]] ? satCount[satellite[FN_PERIOD]] + 1 : 1;

        // Put all data points into different groups based on purpose
        if (satByPurpose[satellite[FN_PURPOSE]]) {
            if (satByPurpose[satellite[FN_PURPOSE]][satellite[FN_ORBIT]]) {
                satByPurpose[satellite[FN_PURPOSE]][satellite[FN_ORBIT]].push(satellite);
            } else {
                satByPurpose[satellite[FN_PURPOSE]][satellite[FN_ORBIT]] = [satellite];
            }
        } else {
            satByPurpose[satellite[FN_PURPOSE]] = {};
            satByPurpose[satellite[FN_PURPOSE]][satellite[FN_ORBIT]] = [satellite];
        }

        // Put all data points into different groups based on orbit
        if (satByOrbit[satellite[FN_ORBIT]]) {
            satByOrbit[satellite[FN_ORBIT]].push(satellite);
        } else {
            satByOrbit[satellite[FN_ORBIT]] = [satellite];
        }
    }

    for (const orbitClass of ORBIT_NAMES) {
        // plot orbits
        let orbits = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('ellipse')
        .data(satByOrbit[orbitClass], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });

        let orbitsEnter = orbits.enter()
            .append('ellipse')
            .attr('class', 'regular-ellipse')
            .style('opacity', 0.7);

        // Plot each type of satellites based on their purposes
        // Civil
        console.log(orbitClass)
        var civilSatellites = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('.civil.dataMark')
            .data(satByPurpose['Civil'][orbitClass] || [], function(d){
                return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
            });

        var civilSatellitesEnter = civilSatellites.enter()
            .append('g')
            .attr('class', d => 'civil dataMark ' + d[FN_ORBIT])
            .style('opacity', d => {
                return opacityStyle(d)
            })
            .append('rect')
            .attr('class', 'civil satellites')
            .style('fill', d => {
                return colorStyle(d)
            })
            .attr('x', d =>{
                return -sizeStyle(d)
            })
            .attr('y', d =>{
                return -sizeStyle(d)
            })
            .attr('width', d => {
                return sizeStyle(d)*2
            })
            .attr('height', d => {
                return sizeStyle(d)*2
            });

        // Commercial
        var commercialSatellites = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('.commercial.dataMark')
            .data(satByPurpose['Commercial'][orbitClass] || [], function(d){
                return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
            });

        var commercialSatellitesEnter = commercialSatellites.enter()
            .append('g')
            .attr('class', d => 'commercial dataMark ' + d[FN_ORBIT])
            .style('stroke-opacity', d => {
                return opacityStyle(d)
            })
            .style('fill-opacity', 0)
            .append('circle')
            .attr('class', 'commercial satellites')
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', d => {
                return sizeStyle(d)
            })
            .style('stroke', d => {
                return colorStyle(d)
            })
            .style('stroke-width', d => {
                if (zoom.mag == magOfLEO){
                    return '2px';
                } else if (zoom.mag == magOfGEO) {
                    return '1.5px';
                } else {
                    return '1px';
                }
            })

        // Government
        var governSatellites = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('.govern.dataMark')
            .data(satByPurpose['Government'][orbitClass] || [], function(d){
                return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
            });

        var governSatellitesEnter = governSatellites.enter()
            .append('g')
            .attr('class', d => 'govern dataMark ' + d[FN_ORBIT])
            .style('opacity', d => {
                return opacityStyle(d)
            })
            .append('polygon')
            .attr('class', 'govern satellites')
            .attr('points', d => {
                return [[-sizeStyle(d), Math.sqrt(3)/3 * sizeStyle(d)], [0, -Math.sqrt(3)/3*2 * sizeStyle(d)], [sizeStyle(d), Math.sqrt(3)/3 * sizeStyle(d)]];
            })
            .style('fill', d => {
                return colorStyle(d)
            })

        // Military
        var militarySatellites = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('.military.dataMark')
            .data(satByPurpose['Military'][orbitClass] || [], function(d){
                return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
            });

        var militarySatellitesEnter = militarySatellites.enter()
            .append('g')
            .attr('class', d => 'military dataMark ' + d[FN_ORBIT]);

        // put two lines in the group to make an x
        militarySatellitesEnter
            .append('line')
            .attr('class', 'military1 satellites')
            .style('stroke-opacity', d => {
                return opacityStyle(d)
            })
            .style('stroke', d => {
                return colorStyle(d)
            })
            .attr('x1', d => {
                return -sizeStyle(d);
            })
            .attr('y1', d => {
                return -sizeStyle(d);
            })
            .attr('x2', d => {
                return sizeStyle(d);
            })
            .attr('y2', d => {
                return sizeStyle(d);
            })
            .style('stroke-width', d => {
                if (zoom.mag == magOfLEO){
                    return '2px';
                } else if (zoom.mag == magOfGEO) {
                    return '1.7px';
                } else {
                    return '1.2px';
                }
            })
            
        militarySatellitesEnter
            .append('line')
            .attr('class', 'military2 satellites')
            .style('stroke-opacity', d => {
                return opacityStyle(d)
            })
            .style('stroke', d => {
                return colorStyle(d)
            })
            .attr('x1', d => {
                return -sizeStyle(d);
            })
            .attr('y1', d => {
                return sizeStyle(d);
            })
            .attr('x2', d => {
                return sizeStyle(d);
            })
            .attr('y2', d => {
                return -sizeStyle(d);
            })
            .style('stroke-width', d => {
                if (zoom.mag == magOfLEO){
                    return '2px';
                } else if (zoom.mag == magOfGEO) {
                    return '1.7px';
                } else {
                    return '1.2px';
                }
            })

        // Multi-purpose
        var multiSatellites = d3.select('#realistic-main-vis').select('g.' + orbitClass).selectAll('.multi.dataMark')
            .data(satByPurpose['Multi-purpose'][orbitClass] || [], function(d){
                return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
            });

        var multiSatellitesEnter = multiSatellites.enter()
            .append('g')
            .attr('class', d => 'multi dataMark ' + d[FN_ORBIT])
            .style('opacity', d => {
                return opacityStyle(d)
            })
            .append('circle')
            .attr('class', 'multi satellites')
            .style('fill', d => {
                return colorStyle(d)
            })
            .attr('cx', 0)
            .attr('cy', 0)
            .attr('r', d => {
                return sizeStyle(d)
            })
        
        // Create an UPDATE + ENTER selection
        // Selects all data-bound elements that are in SVG or just added to SVG
        orbits.merge(orbitsEnter)
        .transition();

        civilSatellites.merge(civilSatellitesEnter)
            .transition();

        commercialSatellites.merge(commercialSatellitesEnter)
            .transition();

        governSatellites.merge(governSatellitesEnter)
            .transition();

        militarySatellites.merge(militarySatellitesEnter)
            .transition();

        multiSatellites.merge(multiSatellitesEnter)
            .transition();

        // Use the EXIT selection to remove all bars that have been filtered out
        // Using a key-function in the data() method is crucial to a proper EXIT
        orbits.exit().remove();

        civilSatellites.exit().remove();
        commercialSatellites.exit().remove();
        governSatellites.exit().remove();
        militarySatellites.exit().remove();
        multiSatellites.exit().remove();
        
        updateOrbits(animationSelector(d3.select('#realistic-main-vis').selectAll('ellipse'), shouldAnimate));
        updateSatelliteGroup(animationSelector(d3.select('#realistic-main-vis').selectAll('.dataMark'), shouldAnimate));

        updateOrbitGroupOpacity(orbitClass, 1);
    }

    document.getElementById('NumOfChina').innerText =  satCount['China'] ? satCount['China'] : 0;
    document.getElementById('NumOfRussia').innerText =  satCount['Russia'] ? satCount['Russia'] : 0;
    document.getElementById('NumOfUSA').innerText =  satCount['USA'] ? satCount['USA'] : 0;
    document.getElementById('NumOfUK').innerText =  satCount['UK'] ? satCount['UK'] : 0;
    document.getElementById('NumOfOthers').innerText =  satCount['Others'] ? satCount['Others'] : 0;

    document.getElementById('NumOfCivil').innerText =  satCount['Civil'] ? satCount['Civil'] : 0;
    document.getElementById('NumOfCommercial').innerText =  satCount['Commercial'] ? satCount['Commercial'] : 0;
    document.getElementById('NumOfGovern').innerText =  satCount['Government'] ? satCount['Government'] : 0;
    document.getElementById('NumOfMilitary').innerText =  satCount['Military'] ? satCount['Military'] : 0;
    document.getElementById('NumOfMulti').innerText =  satCount['Multi-purpose'] ? satCount['Multi-purpose'] : 0;

    document.getElementById('NumOf2010s').innerText =  satCount['2010 - 2020'] ? satCount['2010 - 2020'] : 0;
    document.getElementById('NumOf2000s').innerText =  satCount['2000 - 2009'] ? satCount['2000 - 2009'] : 0;
    document.getElementById('NumOf1990s').innerText =  satCount['1990 - 1999'] ? satCount['1990 - 1999'] : 0;
    document.getElementById('NumOfBefore90').innerText =  satCount['Before 1990'] ? satCount['Before 1990'] : 0;


   // Plot scale axis
    var axisScale = d3.scaleLinear()
        .domain([0, axisWidth / kmToWidth / zoom.mag])
        .range([0, axisWidth]);

    var xAxisBot = d3.axisBottom(axisScale).ticks(5);

    // Append a new <g> element that we will populate the axis with
    var svg = d3.select('#realistic-main-vis');
    var axisGroup = d3.select('.axis-group');
    var xAxis = d3.select('.x.axis');
    if (axisGroup.empty()) {
        axisGroup = svg.append('g')
            .attr('class', 'axis-group');
        // Plot scale label
        axisGroup.append('text')
            .attr('class', 'x label')
            .attr('transform', 'translate(' + [canvasLeftPadding + 20, -30] + ')')
            .text('Distance in KM');

        xAxis = axisGroup.append('g').attr('class', 'x axis');

        xAxis
        .attr('transform', 'translate(' + [0, -10] + ')');
    }
    animationSelector(axisGroup, shouldAnimate).attr('transform', 'translate(' + [canvasLeftPadding, mainVis.clientHeight - canvasBottomPadding] + ')');
    animationSelector(xAxis, shouldAnimate).call(xAxisBot);

    // Plot orbit labels
    var orbitLabels = d3.select('.orbitLabels');
    if (orbitLabels.empty()) {
        svg.append('g').attr('class', 'orbitLabels');
        orbitLabels = d3.select('.orbitLabels');

        orbitLabels.append('text')
        .attr('class', 'LEO label')
        .text('LEO');
        
        orbitLabels.append('text')
        .attr('class', 'MEO label')
        .text('MEO');
    
        orbitLabels.append('text')
        .attr('class', 'GEO label')
        .text('GEO');
        
        orbitLabels.append('text')
        .attr('class', 'HEO label')
        .text('HEO');
    }
    
    animationSelector(orbitLabels, shouldAnimate).attr('transform', 'translate(' + [earthCenter[0], earthCenter[1]] + ')');
    animationSelector(orbitLabels.select('.LEO'), shouldAnimate).attr('y', function(d) {
        if (zoom.mag == magOfLEO){
           return -scale(maxLEOApogee) - 15;
        } else {
            return -scale(maxLEOApogee) - 6;
        }
    });
    animationSelector(orbitLabels.select('.MEO'), shouldAnimate).attr('y', -scale(maxMEOApogee) - 6);
    animationSelector(orbitLabels.select('.GEO'), shouldAnimate).attr('y', -scale(maxGEOApogee) - 12);
    animationSelector(orbitLabels.select('.HEO'), shouldAnimate).attr('x', scale(EARTH_RADIUS) * 7.8);

    updateEarth(animationSelector(d3.select('#realistic-main-vis').selectAll('.earth'), shouldAnimate));
}

var hoveredOrbit;
const hoverEffectTransition = 200;
$('#realistic-main-vis').mousemove(function(event){            
    var relX = event.pageX - $(this).offset().left;
    var relY = event.pageY - $(this).offset().top;

    let orbitLabels = d3.select('.orbitLabels');
    const LEODist = +orbitLabels.select('.LEO').attr('y');
    const MEODist = +orbitLabels.select('.MEO').attr('y');
    const GEODist = +orbitLabels.select('.GEO').attr('y');
    const HEODist = +orbitLabels.select('.HEO').attr('x');
    const cursorDistFromEarthCenterSq = (relX - earthCenterForHover[0]) ** 2 + (relY - earthCenterForHover[1]) ** 2;

    let hoverChanged = false;
    if (cursorDistFromEarthCenterSq < LEODist ** 2) {
        if (hoveredOrbit !== 'LEO'){
            hoveredOrbit = 'LEO';
            hoverChanged = true;
        }
    } else if (zoom.mag == magOfLEO) {
        // do nothing to prevent activation of other orbits when zoomed in to LEO
        hoveredOrbit = null;
        hoverChanged = true;
    } else if (cursorDistFromEarthCenterSq < ((GEODist + MEODist) / 2) ** 2) {
        if (hoveredOrbit !== 'MEO'){
            hoveredOrbit = 'MEO';
            hoverChanged = true;
        }
    } else if (cursorDistFromEarthCenterSq > ((GEODist + MEODist) / 2) ** 2 && cursorDistFromEarthCenterSq < GEODist ** 2) {
        if (hoveredOrbit !== 'GEO'){
            hoveredOrbit = 'GEO';
            hoverChanged = true;
        }
    } else if (
        relX > earthCenterForHover[0]
        && relY > earthCenterForHover[1] + GEODist + LEODist
        && relY < earthCenterForHover[1] - (GEODist + LEODist)
        && cursorDistFromEarthCenterSq > HEODist
    ) {
        if (hoveredOrbit !== 'HEO'){
            hoveredOrbit = 'HEO';
            hoverChanged = true;
        }
    } else {
        if (hoveredOrbit) {
            hoverChanged = true;
        }
        hoveredOrbit = null;
    }

    if (hoverChanged) {
        const hoveredOrbitName = hoveredOrbit === 'HEO' ? 'Elliptical' : hoveredOrbit;
        for (const orbitName of ORBIT_NAMES) {
            const mainVis = d3.select('#realistic-main-vis');
            updateOrbitGroupOpacity(orbitName, hoveredOrbitName === orbitName || !hoveredOrbitName ? 1 : 0.2);
        }
    }
});


// **** Load data ****
d3.csv('../data/new_data_with_date.csv').then(function(dataset) {
    satelliteData = dataset;

    satelliteData.forEach((d) => {
        d['Angle'] = +d['Angle'];
        d['Apogee (km)'] = +d['Apogee (km)'];
        d['Perigee (km)'] = +d['Perigee (km)'];
        d['new_year'] = +d['new_year'];
    });
    
    // acquire options for refine by dropdowns
    let countries = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_COUNTRY;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort();
    countries.push('All (5)');
    countries.sort();
    countries.sort(
        function (a,b){
            if (a =='Others'){
                return 1;
            }
            else if (b == 'Others'){
                return -1
            }
            else{
                return b-a;
            }
        }
    );

    let purposes = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_PURPOSE;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort();
    purposes.push('All (5)');
    purposes.sort();

    let periods = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_PERIOD;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort((a, b) => {
        return parseInt(b.substr(6)) - parseInt(a.substr(6));
    });
    periods.unshift('All (4)');
    //periods.sort();

    // population refine by options
    const populateRefineBy = (selectEle, options) => {
        for (const option of options) {
            selectEle.innerHTML+= `<option value="${option}">${option}</option>`;
        }
    }
    populateRefineBy(refineByCountry, countries);
    populateRefineBy(refineByPurpose, purposes);
    populateRefineBy(refineByPeriod, periods);

    maxApogee = d3.max(dataset, function(d){
        return +d['Apogee (km)'] + EARTH_RADIUS;
    });

    maxPerigee = d3.max(dataset, function(d){
        return +d['Perigee (km)'] + EARTH_RADIUS;
    });

    maxLEOApogee = d3.max(dataset, function(d){
        if (d['Class of Orbit'] == 'LEO') {
            return +d['Apogee (km)'] + EARTH_RADIUS;
        }
    });

    maxMEOApogee = d3.max(dataset, function(d){
        if (d['Class of Orbit'] == 'MEO') {
            return +d['Apogee (km)'] + EARTH_RADIUS;
        }
    });

    maxGEOApogee = d3.min(dataset, function(d){
        if (d['Class of Orbit'] == 'GEO') {
            return +d['Apogee (km)'] + EARTH_RADIUS;
        }
    });

    kmToWidth_scrolly = mainVis_scrolly.clientWidth / (maxApogee + maxPerigee);

    // create groups for holding satellites of different orbits
    for (const mainVis of [d3.select('#realistic-main-vis')]) {
        for (const orbitClass of ORBIT_NAMES) {
            mainVis
                .append('g')
                .data([{rotation: 0}])
                .attr('class', orbitClass);
        }
    }

    for (const orbitClass of ORBIT_NAMES) {
        virtualDataContainer
            .append('g')
            .data([{rotation: 0}])
            .attr('class', orbitClass)
            .attr('rotation', d => d.rotation);
    }

    updateChart(refineByParamsRealistic);
    updateChart_scrolly();
});

// *** Filter By Listeners ***
// Drop downs
document.querySelector('#refineByCountry').addEventListener('change', (event) => {
    refineByParamsRealistic[FN_COUNTRY] = event.target.value;
    updateChart(refineByParamsRealistic);
});

document.querySelector('#refineByPurpose').addEventListener('change', (event) => {
    refineByParamsRealistic[FN_PURPOSE] = event.target.value;
    updateChart(refineByParamsRealistic);
});

document.querySelector('#refineByPeriod').addEventListener('change', (event) => {
    refineByParamsRealistic[FN_PERIOD] = event.target.value;
    updateChart(refineByParamsRealistic);
});

// Toggles for More Options
let orbit_checkBox =  document.getElementById("showOrbits");
orbit_checkBox.addEventListener('change', function() {
    if(this.checked) {
        d3.select('#realistic-main-vis').selectAll('ellipse').transition().duration(500)
            .style("opacity", 0.7);
        d3.select('#realistic-main-vis').selectAll('.orbitLabels').transition().duration(500)
            .style("opacity", 1);
    } else {
        d3.select('#realistic-main-vis').selectAll('ellipse').transition().duration(500)
            .style("opacity", 0);
        d3.select('#realistic-main-vis').selectAll('.orbitLabels').transition().duration(500)
            .style("opacity", 0);
        }
});

let satellite_checkBox =  document.getElementById("showSatellites");
satellite_checkBox.addEventListener('change', function(){
    if(this.checked) {
        d3.select('#realistic-main-vis').selectAll('.satellites').transition().duration(500)
        .style("opacity", 1);
    } else {
        d3.select('#realistic-main-vis').selectAll('.satellites').transition().duration(500)
        .style("opacity", 0);
        }
});

// Radio buttons for Zoom Level
let zoomLevel_LEO = document.getElementById('radioLEO');
let zoomLevel_GEO = document.getElementById('radioGEO');
let zoomLevel_OVERVIEW = document.getElementById('radioOverview');

zoomLevel_LEO.addEventListener('change', function(){
    zoom = ZOOM_LEO;
    updateChart(refineByParamsRealistic);
});

zoomLevel_GEO.addEventListener('change', function(){
    zoom = ZOOM_GEO;
    updateChart(refineByParamsRealistic);
});

zoomLevel_OVERVIEW.addEventListener('change', function(){
    zoom = ZOOM_OVERVIEW;
    updateChart(refineByParamsRealistic);
});

// setup resize event
window.addEventListener("resize", () => {updateChart(refineByParamsRealistic)});