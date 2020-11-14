/***
 * code for realistic mode
***/
const EARTH_RADIUS = 6378;

const magOfOverview = 1.8, magOfGEO = 2.5, magOfLEO = 13;
const ZOOM_OVERVIEW = { mag: magOfOverview, center: false, orbitOpacity: 0.35, satelliteSize: 1.3};
const ZOOM_GEO = { mag: magOfGEO, center: true, orbitOpacity: 0.25, satelliteSize: 2.2};
const ZOOM_LEO = { mag: magOfLEO, center: true, orbitOpacity: 0.12, satelliteSize: 4};
var zoom = ZOOM_GEO;

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
const canvasLeftPadding = 40;
const canvasBottomPadding = 40;
const leftControlsWidth = 200;
const mainVisLeftPadding = 40;
const mainVisRightPadding = 10;
const axisWidth = 0.3 * mainVis.clientWidth;

const graphLeftPadding = canvasLeftPadding + leftControlsWidth + mainVisLeftPadding;

// Refine By dropdowns
const refineByCountry = document.querySelector('#refineByCountry');
const refineByOwner = document.querySelector('#refineByOwner');
const refineByPurpose = document.querySelector('#refineByPurpose');

// field names
const FN_COUNTRY = 'Country of Operator/Owner';
const FN_OWNER = 'Operator/Owner';
const FN_PURPOSE = 'Purpose';

var refineByParams = {};

// svg variables
var satelliteData; // holds the satellite data
var earthCenterX, earthCenter;
var scale;
var kmToWidth;
var maxApogee, maxPerigee, maxLEOApogee, maxMEOApogee, maxGEOApogee;

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

// *** Create a function to update chart ***
function updateChart(refineParam) {

    // Remove the remaining earth PNG, orbit labels, and scale from the last time
    d3.select('.orbitLabels').remove();
    d3.select('.earth').remove();
    d3.selectAll('.x').remove();

    // Update the scale based on Zoom Level
    scale = d3.scaleLinear()
        .domain([0, maxApogee / zoom.mag])
        .range([0,kmToWidth * maxApogee]);

    // Update the earth center on canvas;    
    earthCenterX = zoom.center
        ? (mainVis.clientWidth + graphLeftPadding/5 - mainVisRightPadding) / 2
        : kmToWidth * maxPerigee + graphLeftPadding * 1.4;

    earthCenter = [earthCenterX, mainVis.clientHeight / 2];

    // Update all satellite data based on filter selection    
    var filteredSatellites = satelliteData.filter(function(d){
        let match = true;
        for (let key in refineParam) {
            if (d[key] !== refineParam[key]) {
                match = false;
                break;
            }
        }
        return match;
    });

    // Define the relative position of satellite points
    const getPointOnEllipse = (apogee, perigee, angle) => {
        const centerX = earthCenter[0] + scale((apogee - perigee) / 2);
        const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
        const b = Math.sqrt((apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS));
        const xAbs = a * b / Math.sqrt(b * b + Math.pow(a * Math.tan(angle), 2));

        const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
        const y = angle < 0 ? earthCenter[1] - scale(xAbs * Math.abs(Math.tan(angle))) : earthCenter[1] + scale(xAbs * Math.abs(Math.tan(angle))); // minus because +y direction is actually down on svg

        return {x: x, y: y};
    }

    function getPosX(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
    }

    function getPosY(d) {
        return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
    }

   // Upload the Earth PNG
   var earth = d3.select('#realistic-main-vis').selectAll('.earth')
        .data([0])
        .enter()
        .append('image')
        .attr('class', 'earth')
        .attr('href', '../data/Flat Earth Map.png')
        .attr('width', scale(EARTH_RADIUS)*2).attr('height', scale(EARTH_RADIUS)*2)
        .attr('x', earthCenter[0] - scale(EARTH_RADIUS))
        .attr('y', earthCenter[1] - scale(EARTH_RADIUS))
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('opacity', 0.75)


    // plot orbits
    var orbits = d3.select('#realistic-main-vis').selectAll('ellipse')
        .data(filteredSatellites, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        })

    var orbitsEnter = orbits.enter()
        .append('ellipse')
        .attr('class', 'regular-ellipse')
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
        })
        .style('opacity', 0.7);

        
    // Put all data points into different groups based on purpose
    var civilPurpose = filteredSatellites.filter(function(d){
        return d['new_purpose'] == 'Civil';
    });

    var commercialPurpose = filteredSatellites.filter(function(d){
        return d['new_purpose'] == 'Commercial';
    });

    var governPurpose = filteredSatellites.filter(function(d){
        return d['new_purpose'] == 'Government';
    });

    var militaryPurpose = filteredSatellites.filter(function(d){
        return d['new_purpose'] == 'Military';
    });
    
    var multiPurpose = filteredSatellites.filter(function(d){
        return d['new_purpose'] == 'Multi-purpose';
    });

    // Plot each type of satellites based on their purposes
    // Civil
    var civilSatellites = d3.select('#realistic-main-vis').selectAll('.civil.satellites')
        .data(civilPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var civilSatellitesEnter = civilSatellites.enter()
        .append('rect')
        .attr('class', 'civil satellites')
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
        .style('fill', d => {
            return colorStyle(d)
        })
        .style('opacity', d => {
            return opacityStyle(d)
        });

    // Commercial
    var commercialSatellites = d3.select('#realistic-main-vis').selectAll('.commercial.satellites')
        .data(commercialPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var commercialSatellitesEnter = commercialSatellites.enter()
        .append('circle')
        .attr('class', 'commercial satellites')
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
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
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        })
        .style('fill-opacity', 0);

    // Government
    var governSatellites = d3.select('#realistic-main-vis').selectAll('.govern.satellites')
        .data(governPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var governSatellitesEnter = governSatellites.enter()
        .append('polygon')
        .attr('class', 'govern satellites')
        .attr('points', d => {
            return [[(getPosX(d) - sizeStyle(d)), (getPosY(d) + Math.sqrt(3)/3 * sizeStyle(d))], [(getPosX(d)), (getPosY(d) - Math.sqrt(3)/3*2 * sizeStyle(d))], [(getPosX(d) + sizeStyle(d)), (getPosY(d) + Math.sqrt(3)/3 * sizeStyle(d))]];
        })
        .style('fill', d => {
            return colorStyle(d)
        })
        .style('opacity', d => {
            return opacityStyle(d)
        });

    // Military
    var militarySatellites1 = d3.select('#realistic-main-vis').selectAll('.military1.satellites')
        .data(militaryPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });

    var militarySatellites2 = d3.select('#realistic-main-vis').selectAll('.military2.satellites')
        .data(militaryPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var militarySatellitesEnter1 = militarySatellites1.enter()
        .append('line')
        .attr('class', 'military1 satellites')
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
        .style('stroke', d => {
            return colorStyle(d)
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
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        });

    var militarySatellitesEnter2 = militarySatellites2.enter()
        .append('line')
        .attr('class', 'military2 satellites')
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
        .style('stroke', d => {
            return colorStyle(d)
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
        .style('stroke-opacity', d => {
            return opacityStyle(d)
        })

    // Multi-purpose
    var multiSatellites = d3.select('#realistic-main-vis').selectAll('.multi.satellites')
        .data(multiPurpose, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var multiSatellitesEnter = multiSatellites.enter()
        .append('circle')
        .attr('class', 'multi satellites')
        .attr('cx', d => {
            return getPosX(d);
        })
        .attr('cy', d => {
            return getPosY(d);
        })
        .attr('r', d => {
            return sizeStyle(d)
        })
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
    var axisGroug = svg.append('g')
        .attr('transform', 'translate(' + [canvasLeftPadding, mainVis.clientHeight - canvasBottomPadding] + ')');
    
    axisGroug.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + [0, -10] + ')')
        .call(xAxisBot);

    // Plot scale label
    axisGroug.append('text')
        .attr('class', 'x label')
        .attr('transform', 'translate(' + [canvasLeftPadding + 20, -30] + ')')
        .text('Distance in KM');


    // Plot orbit labels
    var orbitLabels = svg.append('g')
    .attr('class', 'orbitLabels')
    .attr('transform', 'translate(' + [earthCenter[0], earthCenter[1]] + ')')
    
    orbitLabels.append('text')
    .attr('class', 'LEO label')
    .attr('y', function(d) {
        if (zoom.mag == magOfLEO){
           return -scale(maxLEOApogee) - 15;
        } else {
            return -scale(maxLEOApogee) - 6;
        }
    })
    .text('LEO')
    
    orbitLabels.append('text')
    .attr('class', 'MEO label')
    .attr('y', -scale(maxMEOApogee) - 6)
    .text('MEO')

    orbitLabels.append('text')
    .attr('class', 'GEO label')
    .attr('y', -scale(maxGEOApogee) - 12)
    .text('GEO')
    
    orbitLabels.append('text')
    .attr('class', 'HEO label')
    .attr('x', scale(EARTH_RADIUS) * 7.7)
    .text('HEO')

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
}

// **** Load data ****
d3.csv('../data/new_data_with_date.csv').then(function(dataset) {
    satelliteData = dataset;
    
    // acquire options for refine by dropdowns
    let countries = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_COUNTRY;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort();

    let owners = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_OWNER;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort();

    let purposes = Object.keys(satelliteData.reduce((options, d) => {
        const fieldName = FN_PURPOSE;
        if (!options[d[fieldName]]) {
            options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
        }
        return options;
    }, {})).sort();

    // population refine by options
    const populateRefineBy = (selectEle, options) => {
        for (const option of options) {
            selectEle.innerHTML+= `<option value="${option}">${option}</option>`;
        }
    }
    populateRefineBy(refineByCountry, countries);
    populateRefineBy(refineByOwner, owners);
    populateRefineBy(refineByPurpose, purposes);

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

    kmToWidth = (mainVis.clientWidth - graphLeftPadding - mainVisRightPadding) / (maxApogee + maxPerigee);

    updateChart(refineByParams);
    
});


// *** Filter By Listeners ***
// Drop downs
document.querySelector('#refineByCountry').addEventListener('change', (event) => {
    refineByParams[FN_COUNTRY] = event.target.value;
    updateChart(refineByParams);
});

document.querySelector('#refineByOwner').addEventListener('change', (event) => {
    refineByParams[FN_OWNER] = event.target.value;
    updateChart(refineByParams);
});

document.querySelector('#refineByPurpose').addEventListener('change', (event) => {
    refineByParams[FN_PURPOSE] = event.target.value;
    updateChart(refineByParams);
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
    //console.log('I am LEO');
    updateChart();
});

zoomLevel_GEO.addEventListener('change', function(){
    zoom = ZOOM_GEO;
    //console.log('I am GEO');
    updateChart();
});

zoomLevel_OVERVIEW.addEventListener('change', function(){
    zoom = ZOOM_OVERVIEW;
    //console.log('I am Overview');
    updateChart();
});
