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

var refineByParamsRealistic = {};

// svg variables
var satelliteData; // holds the satellite data
var scale;
var kmToWidth;
var kmToWidth_scrolly;
var maxApogee, maxPerigee, maxLEOApogee, maxMEOApogee, maxGEOApogee;

// animation variables
var orbitInterval;

// TODO: sizing code needs to be inside resize listener
console.log('client', mainVis.clientWidth + 'x' + mainVis.clientHeight);

// Functions to style satellite points
function sizeStyle(d) { // Size
    const orbitClass = d['Class of Orbit'];
    switch (orbitClass) {
        case 'LEO':
            return zoom.satelliteSize * mainVis.clientWidth / 1425;
        case 'MEO':
            return zoom.satelliteSize * 1.5 * mainVis.clientWidth / 1425;
        case 'GEO':
            return zoom.satelliteSize * 1.5 * mainVis.clientWidth / 1425;
        case 'Elliptical':
            return zoom.satelliteSize * 2 * mainVis.clientWidth / 1425;
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

// helper functions
function animationSelector(selection, shouldAnimate) {
    return shouldAnimate ? selection.transition().duration(TRANSITION_DURATION) : selection;
}

// main vis setup
// REFER TO REALISTIC.JS FOR CODE REFERENCE

// *** Create a function to update chart ***
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
// }
function updateChart_scrolly(controlParams) {
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
  
    const earthCenter = [earthCenterX, mainVis.clientHeight / 2];
  
    // Define the relative position of satellite points
    const getPointOnEllipse = (apogee, perigee, angle) => {
      const tangent = Math.tan(angle);
      const centerX = earthCenter[0] + scale_scrolly((apogee - perigee) / 2);
      const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
      const bSq = (apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS);
      const xAbs = 1.0 / Math.sqrt(1.0 / (a * a) + Math.pow(tangent, 2) / bSq);
  
      const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale_scrolly(xAbs) : centerX - scale_scrolly(xAbs);
      const y = angle < 0 ? earthCenter[1] - scale_scrolly(xAbs * Math.abs(tangent)) : earthCenter[1] + scale_scrolly(xAbs * Math.abs(tangent)); // minus because +y direction is actually down on svg
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
        earth
        .attr('width', scale_scrolly(EARTH_RADIUS)*2).attr('height', scale_scrolly(EARTH_RADIUS)*2)
        .attr('x', earthCenter[0] - scale_scrolly(EARTH_RADIUS))
        .attr('y', earthCenter[1] - scale_scrolly(EARTH_RADIUS))
    }
    function updateOrbits(orbits) {
        orbits
        .attr('cx', d => {
            return earthCenter[0] + scale_scrolly((+d['Apogee (km)'] - +d['Perigee (km)']) / 2);
        })
        .attr('cy', earthCenter[1])
        .attr('rx', d => scale_scrolly(((+d['Apogee (km)'] + EARTH_RADIUS) + (+d['Perigee (km)'] + EARTH_RADIUS)) / 2) )
        .attr('ry', d => scale_scrolly(Math.sqrt((+d['Apogee (km)'] + EARTH_RADIUS) * (+d['Perigee (km)'] + EARTH_RADIUS))) )
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
  
    function updateCivil(satellites) {
        satellites
        .attr('x', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y', d => {
            return getPosY(d) - sizeStyle(d);
        })
        .attr('width', d => {
            return sizeStyle(d)*2
        })
        .attr('height', d => {
            return sizeStyle(d)*2
        })
        .style('opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
    function updateCommercial(satellites) {
        satellites
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d)
        })
        .style('stroke-width', d => {
            if (controlParams.zoom.mag == magOfLEO){
                return '2px';
             } else if (controlParams.zoom.mag == magOfGEO) {
                 return '1.5px';
             } else {
                 return '1px';
             }
        })
        .style('opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
    function updateGovern(satellites) {
        satellites
        .attr('points', d => {
            const xPos = getPosX(d);
            const yPos = getPosY(d);
            return [[(xPos - sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))], [(xPos), (yPos - Math.sqrt(3)/3*2 * sizeStyle(d))], [(xPos + sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))]];
        })
        .style('opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
    function updateMillitary1(satellites) {
        satellites
        .attr('x1', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y1', d => {
            return getPosY(d) - sizeStyle(d);
        })
        .attr('x2', d => {
            return getPosX(d) + sizeStyle(d);
        })
        .attr('y2', d => {
            return getPosY(d) + sizeStyle(d);
        })
        .style('stroke-width', d => {
            if (controlParams.zoom.mag == magOfLEO){
                return '2px';
             } else if (controlParams.zoom.mag == magOfGEO) {
                 return '1.7px';
             } else {
                 return '1.2px';
             }
        })
        .style('stroke-opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
    function updateMillitary2(satellites) {
        satellites
        .attr('x1', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y1', d => {
            return getPosY(d) + sizeStyle(d);
        })
        .attr('x2', d => {
            return getPosX(d) + sizeStyle(d);
        })
        .attr('y2', d => {
            return getPosY(d) - sizeStyle(d);
        })
        .style('stroke-width', d => {
            if (controlParams.zoom.mag == magOfLEO){
                return '2px';
             } else if (controlParams.zoom.mag == magOfGEO) {
                 return '1.7px';
             } else {
                 return '1.2px';
             }
        })
        .style('stroke-opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
    function updateMulti(satellites) {
        satellites
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d)
        })
        .style('opacity', d => {
            return controlParams.hideSatellites
            ? 0
            : opacityStyle(d) * controlParams.orbitOpacityCoefficient[d['Class of Orbit']];
        });
    }
  
   // Upload the Earth PNG
   var earth = d3.select('#scrolly-main-vis').selectAll('.earth')
        .data([0], function(d) {return 'earth';});
    var earthEnter = earth.enter()
        .append('image')
        .attr('class', 'earth')
        .attr('href', '../data/Flat Earth Map.png')
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('opacity', 0.75);
  
  
    // plot orbits
    var orbits = d3.select('#scrolly-main-vis').selectAll('ellipse')
        .data(satelliteData, function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
  
    var orbitsEnter = orbits.enter()
        .append('ellipse')
        .attr('class', 'regular-ellipse')
        .style('opacity', 0.7);
    
    let satByPurpose = {};
    let satByOrbit = {};
    for (const satellite of satelliteData) {
        // Put all data points into different groups based on purpose
        if (satByPurpose[satellite[FN_PURPOSE]]) {
            satByPurpose[satellite[FN_PURPOSE]].push(satellite);
        } else {
            satByPurpose[satellite[FN_PURPOSE]] = [satellite];
        }
        // Put all data points into different groups based on orbit
        if (satByOrbit[satellite[FN_ORBIT]]) {
            satByOrbit[satellite[FN_ORBIT]].push(satellite);
        } else {
            satByOrbit[satellite[FN_ORBIT]] = [satellite];
        }
    }
  
    // Plot each type of satellites based on their purposes
    // Civil
    var civilSatellites = d3.select('#scrolly-main-vis').selectAll('.civil.satellites')
        .data(satByPurpose['Civil'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var civilSatellitesEnter = civilSatellites.enter()
        .append('rect')
        .attr('class', d => {
            return 'civil satellites ' + d['Class of Orbit'];
        })
        .style('fill', d => {
            return colorStyle(d)
        });
  
    // Commercial
    var commercialSatellites = d3.select('#scrolly-main-vis').selectAll('.commercial.satellites')
        .data(satByPurpose['Commercial'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var commercialSatellitesEnter = commercialSatellites.enter()
        .append('circle')
        .attr('class', d => {
            return 'commercial satellites ' + d['Class of Orbit'];
        })
        .style('stroke', d => {
            return colorStyle(d)
        })
        .style('fill-opacity', 0);
  
    // Government
    var governSatellites = d3.select('#scrolly-main-vis').selectAll('.govern.satellites')
        .data(satByPurpose['Government'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var governSatellitesEnter = governSatellites.enter()
        .append('polygon')
        .attr('class', d => {
            return 'govern satellites ' + d['Class of Orbit'];
        })
        .style('fill', d => {
            return colorStyle(d)
        });
  
    // Military
    var militarySatellites1 = d3.select('#scrolly-main-vis').selectAll('.military1.satellites')
        .data(satByPurpose['Military'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
  
    var militarySatellites2 = d3.select('#scrolly-main-vis').selectAll('.military2.satellites')
        .data(satByPurpose['Military'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var militarySatellitesEnter1 = militarySatellites1.enter()
        .append('line')
        .attr('class', d => {
            return 'military1 satellites ' + d['Class of Orbit'];
        })
        .style('stroke', d => {
            return colorStyle(d)
        });
  
    var militarySatellitesEnter2 = militarySatellites2.enter()
        .append('line')
        .attr('class', d => {
            return 'military2 satellites ' + d['Class of Orbit'];
        })
        .style('stroke', d => {
            return colorStyle(d)
        });
  
    // Multi-purpose
    var multiSatellites = d3.select('#scrolly-main-vis').selectAll('.multi.satellites')
        .data(satByPurpose['Multi-purpose'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var multiSatellitesEnter = multiSatellites.enter()
        .append('circle')
        .attr('class', d => {
            return 'multi satellites ' + d['Class of Orbit'];
        })
        .style('fill', d => {
            return colorStyle(d)
        });
  
    var svg = d3.select('#scrolly-main-vis');
    // Plot orbit labels
    var orbitLabels = d3.select('.orbitLabels_scrolly');
    if (orbitLabels.empty()) {
        svg.append('g').attr('class', 'orbitLabels_scrolly');
        orbitLabels = d3.select('.orbitLabels_scrolly');
  
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
    
    animationSelector(orbitLabels, controlParams.shouldAnimate).attr('transform', 'translate(' + [earthCenter[0], earthCenter[1]] + ')');
    animationSelector(orbitLabels.select('.LEO'), controlParams.shouldAnimate)
        .attr('y', function(d) {
            if (controlParams.zoom.mag == magOfLEO){
            return -scale_scrolly(maxLEOApogee) - 15;
            } else {
                return -scale_scrolly(maxLEOApogee) - 6;
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
        .attr('x', scale_scrolly(EARTH_RADIUS) * 7.7)
        .style('opacity', controlParams.orbitOpacityCoefficient.Elliptical === 1 ? 1 : 0.2);
  
  
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
  
    militarySatellites1.merge(militarySatellitesEnter1)
        .transition();
  
    militarySatellites2.merge(militarySatellitesEnter2)
        .transition();
  
    multiSatellites.merge(multiSatellitesEnter)
        .transition();
    
    // Use the EXIT selection to remove all bars that have been filtered out
    // Using a key-function in the data() method is crucial to a proper EXIT
    orbits.exit().remove();
  
    civilSatellites.exit().remove();
    commercialSatellites.exit().remove();
    governSatellites.exit().remove();
    militarySatellites1.exit().remove();
    militarySatellites2.exit().remove();
    multiSatellites.exit().remove();
  
    updateEarth(animationSelector(d3.select('#scrolly-main-vis').selectAll('.earth'), controlParams.shouldAnimate));
    updateOrbits(animationSelector(d3.select('#scrolly-main-vis').selectAll('ellipse'), controlParams.shouldAnimate));
    updateCivil(animationSelector(d3.select('#scrolly-main-vis').selectAll('.civil.satellites'), controlParams.shouldAnimate));
    updateCommercial(animationSelector(d3.select('#scrolly-main-vis').selectAll('.commercial.satellites'), controlParams.shouldAnimate));
    updateGovern(animationSelector(d3.select('#scrolly-main-vis').selectAll('.govern.satellites'), controlParams.shouldAnimate));
    updateMillitary1(animationSelector(d3.select('#scrolly-main-vis').selectAll('.military1.satellites'), controlParams.shouldAnimate));
    updateMillitary2(animationSelector(d3.select('#scrolly-main-vis').selectAll('.military2.satellites'), controlParams.shouldAnimate));
    updateMulti(animationSelector(d3.select('#scrolly-main-vis').selectAll('.multi.satellites'), controlParams.shouldAnimate));

    // animate HEO
    clearInterval(orbitInterval);
    if (controlParams.animateHEOOribit) {
        orbitInterval = setInterval(() => {
            satByOrbit['Elliptical'].forEach(function(d) {
                const nextAngle = d['Angle'] + 1000 * (Math.abs(d['Angle']) + 1) / (d['Perigee (km)'] + d['Apogee (km)']);
                d['Angle'] = nextAngle >= Math.PI ? nextAngle - 2 * Math.PI : nextAngle;
            })
            // updateCivil(d3.select('#scrolly-main-vis').selectAll('.civil.satellites'));
            //updateCommercial(d3.select('#scrolly-main-vis').selectAll('.commercial.satellites.Elliptical'));
            updateGovern(d3.select('#scrolly-main-vis').selectAll('.govern.satellites.Elliptical'));
            // updateMillitary1(d3.select('#scrolly-main-vis').selectAll('.military1.satellites.Elliptical'));
            // updateMillitary2(d3.select('#scrolly-main-vis').selectAll('.military2.satellites.Elliptical'));
            // updateMulti(d3.select('#scrolly-main-vis').selectAll('.multi.satellites.Elliptical'));
        }, 200);
    }
  }

// *** Create a function to update chart ***
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

    // attributes to update
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

    function updateCivil(satellites) {
        satellites
        .attr('x', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y', d => {
            return getPosY(d) - sizeStyle(d);
        })
        .attr('width', d => {
            return sizeStyle(d)*2
        })
        .attr('height', d => {
            return sizeStyle(d)*2
        })
    }

    function updateCommercial(satellites) {
        satellites
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d)
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
    }

    function updateGovern(satellites) {
        satellites
        .attr('points', d => {
            const xPos = getPosX(d);
            const yPos = getPosY(d);
            return [[(xPos - sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))], [(xPos), (yPos - Math.sqrt(3)/3*2 * sizeStyle(d))], [(xPos + sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))]];
        })
    }

    function updateMillitary1(satellites) {
        satellites
        .attr('x1', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y1', d => {
            return getPosY(d) - sizeStyle(d);
        })
        .attr('x2', d => {
            return getPosX(d) + sizeStyle(d);
        })
        .attr('y2', d => {
            return getPosY(d) + sizeStyle(d);
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
    }

    function updateMillitary2(satellites) {
        satellites
        .attr('x1', d => {
            return getPosX(d) - sizeStyle(d);
        })
        .attr('y1', d => {
            return getPosY(d) + sizeStyle(d);
        })
        .attr('x2', d => {
            return getPosX(d) + sizeStyle(d);
        })
        .attr('y2', d => {
            return getPosY(d) - sizeStyle(d);
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
    }

    function updateMulti(satellites) {
        satellites
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d)
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


    // plot orbits
    var orbits = d3.select('#realistic-main-vis').selectAll('ellipse')
        .data(filteredSatellites, function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });

    var orbitsEnter = orbits.enter()
        .append('ellipse')
        .attr('class', 'regular-ellipse')
        .style('opacity', 0.7);
    
    
    let satCount = {}; // How to use: element.innerText =  satCount['1990 - 1996'] ? satCount['1990 - 1996'] : 0;
    let satByPurpose = {};
    let satByOrbit = {};
    for (const satellite of filteredSatellites) {
        satCount[satellite[FN_COUNTRY]] = satCount[satellite[FN_COUNTRY]] ? satCount[satellite[FN_COUNTRY]] + 1 : 1;
        satCount[satellite[FN_PURPOSE]] = satCount[satellite[FN_PURPOSE]] ? satCount[satellite[FN_PURPOSE]] + 1 : 1;
        satCount[satellite[FN_PERIOD]] = satCount[satellite[FN_PERIOD]] ? satCount[satellite[FN_PERIOD]] + 1 : 1;

        // Put all data points into different groups based on purpose
        if (satByPurpose[satellite[FN_PURPOSE]]) {
            satByPurpose[satellite[FN_PURPOSE]].push(satellite);
        } else {
            satByPurpose[satellite[FN_PURPOSE]] = [satellite];
        }
        // Put all data points into different groups based on orbit
        if (satByOrbit[satellite[FN_ORBIT]]) {
            satByOrbit[satellite[FN_ORBIT]].push(satellite);
        } else {
            satByOrbit[satellite[FN_ORBIT]] = [satellite];
        }
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

    // Plot each type of satellites based on their purposes
    // Civil
    var civilSatellites = d3.select('#realistic-main-vis').selectAll('.civil.satellites')
        .data(satByPurpose['Civil'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var civilSatellitesEnter = civilSatellites.enter()
        .append('rect')
        .attr('class', 'civil satellites')
        .style('fill', d => {
            return colorStyle(d)
        })
        .style('opacity', d => {
            return opacityStyle(d)
        });

    // Commercial
    var commercialSatellites = d3.select('#realistic-main-vis').selectAll('.commercial.satellites')
        .data(satByPurpose['Commercial'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var commercialSatellitesEnter = commercialSatellites.enter()
        .append('circle')
        .attr('class', 'commercial satellites')
        .style('stroke', d => {
            return colorStyle(d)
        })
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        })
        .style('fill-opacity', 0);

    // Government
    var governSatellites = d3.select('#realistic-main-vis').selectAll('.govern.satellites')
        .data(satByPurpose['Government'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var governSatellitesEnter = governSatellites.enter()
        .append('polygon')
        .attr('class', 'govern satellites')
        .style('fill', d => {
            return colorStyle(d)
        })
        .style('opacity', d => {
            return opacityStyle(d)
        });

    // Military
    var militarySatellites1 = d3.select('#realistic-main-vis').selectAll('.military1.satellites')
        .data(satByPurpose['Military'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });

    var militarySatellites2 = d3.select('#realistic-main-vis').selectAll('.military2.satellites')
        .data(satByPurpose['Military'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var militarySatellitesEnter1 = militarySatellites1.enter()
        .append('line')
        .attr('class', 'military1 satellites')
        .style('stroke', d => {
            return colorStyle(d)
        })
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        });

    var militarySatellitesEnter2 = militarySatellites2.enter()
        .append('line')
        .attr('class', 'military2 satellites')
        .style('stroke', d => {
            return colorStyle(d)
        })
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        })

    // Multi-purpose
    var multiSatellites = d3.select('#realistic-main-vis').selectAll('.multi.satellites')
        .data(satByPurpose['Multi-purpose'] || [], function(d){
            return d['Name of Satellite  Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var multiSatellitesEnter = multiSatellites.enter()
        .append('circle')
        .attr('class', 'multi satellites')
        .style('fill', d => {
            return colorStyle(d)
        })
        .style('opacity', d => {
            return opacityStyle(d)
        });
 

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
    animationSelector(orbitLabels.select('.GEO'), shouldAnimate).attr('y', -scale(maxGEOApogee) - 12)
    animationSelector(orbitLabels.select('.HEO'), shouldAnimate).attr('x', scale(EARTH_RADIUS) * 7.7)


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

    militarySatellites1.merge(militarySatellitesEnter1)
        .transition();

    militarySatellites2.merge(militarySatellitesEnter2)
        .transition();

    multiSatellites.merge(multiSatellitesEnter)
        .transition();
    
    // Use the EXIT selection to remove all bars that have been filtered out
    // Using a key-function in the data() method is crucial to a proper EXIT
    orbits.exit().remove();

    civilSatellites.exit().remove();
    commercialSatellites.exit().remove();
    governSatellites.exit().remove();
    militarySatellites1.exit().remove();
    militarySatellites2.exit().remove();
    multiSatellites.exit().remove();

    updateEarth(animationSelector(d3.select('#realistic-main-vis').selectAll('.earth'), shouldAnimate));
    updateOrbits(animationSelector(d3.select('#realistic-main-vis').selectAll('ellipse'), shouldAnimate));
    updateCivil(animationSelector(d3.select('#realistic-main-vis').selectAll('.civil.satellites'), shouldAnimate));
    updateCommercial(animationSelector(d3.select('#realistic-main-vis').selectAll('.commercial.satellites'), shouldAnimate));
    updateGovern(animationSelector(d3.select('#realistic-main-vis').selectAll('.govern.satellites'), shouldAnimate));
    updateMillitary1(animationSelector(d3.select('#realistic-main-vis').selectAll('.military1.satellites'), shouldAnimate));
    updateMillitary2(animationSelector(d3.select('#realistic-main-vis').selectAll('.military2.satellites'), shouldAnimate));
    updateMulti(animationSelector(d3.select('#realistic-main-vis').selectAll('.multi.satellites'), shouldAnimate));
    
    // test orbit animation
    // const satToAnimate = d3.select('#realistic-main-vis').selectAll('.commercial.satellites');
    // setInterval(() => {
        // const getPointOnEllipse = (apogee, perigee, angle) => {
        //     const tangent = Math.tan(angle);
        //     const centerX = earthCenter[0] + scale((apogee - perigee) / 2);
        //     const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
        //     const bSq = (apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS);
        //     const xAbs = 1.0 / Math.sqrt(1.0 / (a * a) + Math.pow(tangent, 2) / bSq);

        //     const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
        //     const y = angle < 0 ? earthCenter[1] - scale(xAbs * Math.abs(tangent)) : earthCenter[1] + scale(xAbs * Math.abs(tangent)); // minus because +y direction is actually down on svg
        //     return {x: x, y: y};
        // }
    //     function getPosX(d) {
    //         return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
    //     }

    //     function getPosY(d) {
    //         return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
    //     }
    //     // function updateCivil(satellites) {
    //     //     satellites
    //     //     .attr('x', d => {
    //     //         return getPosX(d) - sizeStyle(d);
    //     //     })
    //     //     .attr('y', d => {
    //     //         return getPosY(d) - sizeStyle(d);
    //     //     })
    //     // }
    //     // function updateCommercial(satellites) {
    //     //     satellites
    //     //     .attr('cx', d => {
    //     //         return getPosX(d);
    //     //     })
    //     //     .attr('cy', d => {
    //     //         return getPosY(d);
    //     //     })
    //     // }
    //     function updateGovern(satellites) {
    //         satellites
    //         .attr('points', d => {
    //             const xPos = getPosX(d);
    //             const yPos = getPosY(d);
    //             return [[(xPos - sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))], [(xPos), (yPos - Math.sqrt(3)/3*2 * sizeStyle(d))], [(xPos + sizeStyle(d)), (yPos + Math.sqrt(3)/3 * sizeStyle(d))]];
    //         })
    //     }
    //     const shouldAnimate = false;
    //     const satToAnimate = d3.select('#realistic-main-vis').selectAll('.govern.satellites');
    //     satByOrbit['Elliptical'].forEach(function(d) {
    //         const nextAngle = d['Angle'] + 0.01;
    //         d['Angle'] = nextAngle >= Math.PI ? nextAngle - 2 * Math.PI : nextAngle;
    //     })
    //     // updateCommercial(satToAnimate);
    //     // updateCivil(animationSelector(d3.select('#realistic-main-vis').selectAll('.civil.satellites'), shouldAnimate));
    //     // updateCommercial(animationSelector(d3.select('#realistic-main-vis').selectAll('.commercial.satellites'), shouldAnimate));
    //     updateGovern(satToAnimate);
    //     // updateMillitary1(animationSelector(d3.select('#realistic-main-vis').selectAll('.military1.satellites'), shouldAnimate));
    //     // updateMillitary2(animationSelector(d3.select('#realistic-main-vis').selectAll('.military2.satellites'), shouldAnimate));
    //     // updateMulti(animationSelector(d3.select('#realistic-main-vis').selectAll('.multi.satellites'), shouldAnimate));
    // }, 500);
}



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
    countries.push('All (6)');
    countries.sort();

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
        d3.select('#realistic-main-vis').selectAll('ellipse')
            .style("visibility",d => {
                return "visible";
            }
        );
        d3.select('#realistic-main-vis').selectAll('.orbitLabels')
            .style("visibility",d => {
                return "visible";
            }
        )
    } else {
        d3.select('#realistic-main-vis').selectAll('ellipse')
            .style("visibility",d => {
                return "hidden";
            }
        )
        d3.select('#realistic-main-vis').selectAll('.orbitLabels')
            .style("visibility",d => {
                return "hidden";
            }
        )
        }
});

let satellite_checkBox =  document.getElementById("showSatellites");
satellite_checkBox.addEventListener('change', function(){
    if(this.checked) {
        d3.select('#realistic-main-vis').selectAll('.satellites')
        .style("visibility",d => {
            return "visible";
        })
    } else {
        d3.select('#realistic-main-vis').selectAll('.satellites')
            .style("visibility",d => {
                return "hidden";
            })
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