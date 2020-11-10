/***
 * code for realistic mode
***/
const EARTH_RADIUS = 6378;

const ZOOM_OVERVIEW = { mag: 1, center: false, orbitOpacity: 0.35, satelliteSize: 1};
const ZOOM_GEO = { mag: 2.7, center: true, orbitOpacity: 0.25, satelliteSize: 2};
const ZOOM_LEO = { mag: 14, center: true, orbitOpacity: 0.15, satelliteSize: 3};
var zoom = ZOOM_GEO;

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
var earthCenter;
var scale;
var kmToWidth;

// TODO: sizing code needs to be inside resize listener
console.log('client', mainVis.clientWidth + 'x' + mainVis.clientHeight);

// Upload the background PNG
var background = d3.select('svg').selectAll('.background')
    .data([0])
    .enter()
    .append('image')
    .attr('class', '.background')
    .attr('href', '../data/Background.png')
    .attr('width', function(){
        if (mainVis.clientWidth/mainVis.clientHeight >= 5760/3600){
            return mainVis.clientWidth;
        }
    })
    .attr('height', function(){
        if (mainVis.clientWidth/mainVis.clientHeight < 5760/3600){
            return mainVis.clientHeight;
        }
    })
    .style('opacity', 0.65)

// Create a function to update chart
function updateChart(refineParam) {
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

    const getPointOnEllipse = (apogee, perigee, angle) => {
        const centerX = earthCenter[0] + scale((apogee - perigee) / 2);
        const a = ((apogee + EARTH_RADIUS) + (perigee + EARTH_RADIUS)) / 2;
        const b = Math.sqrt((apogee + EARTH_RADIUS) * (perigee + EARTH_RADIUS));
        const xAbs = a * b / Math.sqrt(b * b + Math.pow(a * Math.tan(angle), 2));

        const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
        const y = angle < 0 ? earthCenter[1] - scale(xAbs * Math.abs(Math.tan(angle))) : earthCenter[1] + scale(xAbs * Math.abs(Math.tan(angle))); // minus because +y direction is actually down on svg

        return {x: x, y: y};
    }

   // Upload the earth PNG
   var earth = d3.select('svg').selectAll('.earth')
        .data([0])
        .enter()
        .append('image')
        .attr('class', '.earth')
        .attr('href', '../data/Flat Earth Map.png')
        .attr('width', scale(EARTH_RADIUS)*2).attr('height', scale(EARTH_RADIUS)*2)
        .attr('x', earthCenter[0] - scale(EARTH_RADIUS))
        .attr('y', earthCenter[1] - scale(EARTH_RADIUS))
        .style('stroke', 'white')
        .style('stroke-width', 2)
        .style('opacity', 0.75)


    // plot orbits
    var orbit = d3.select('svg').selectAll('ellipse')
        .data(filteredSatellites, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        })
        .enter()
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


    // plot satellites
    var satellites = d3.select('svg').selectAll('circle')
        .data(filteredSatellites, function(d){
            return d['Name of Satellite, Alternate Names']; // Use a key-function to maintain object constancy
        });
    
    var satellitesEnter = satellites.enter()
        .append('circle')
        .attr('class', 'regular-circle')
        .attr('cx', d => {
            return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
        })
        .attr('cy', d => {
            return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
        })
        .attr('r', d => {
            const orbitClass = d['Class of Orbit'];
            switch (orbitClass) {
                case 'LEO':
                    return zoom.satelliteSize;
                case 'MEO':
                    return zoom.satelliteSize * 1.5;
                case 'GEO':
                    return zoom.satelliteSize * 1.5;
                case 'Elliptical':
                    return zoom.satelliteSize * 2.25;
            }
        })
        .style('fill', d => {
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
        })
        .style('opacity', function (d) {
            if (+d['new_year'] < 1990) {
                return opacityOfPeriod['before 1990'];
            } else if ((+d['new_year'] >= 1990) && (+d['new_year'] < 2000)) {
                return opacityOfPeriod['1990-1999'];
            } else if ((+d['new_year'] >= 2000) && (+d['new_year'] < 2010)) {
                return opacityOfPeriod['2000-2009'];
            } else {
                return opacityOfPeriod['2010-2020'];
            }
        });


   // axes
    var axisScale = d3.scaleLinear()
        .domain([0, axisWidth / kmToWidth / zoom.mag])
        .range([0, axisWidth]);

    var xAxisBot = d3.axisBottom(axisScale).ticks(5);

    // Append a new <g> element that we will populate the axis with
    var svg = d3.select('svg');
    var axisGroug = svg.append('g')
        .attr('transform', 'translate(' + [canvasLeftPadding, mainVis.clientHeight - canvasBottomPadding] + ')');
    
    axisGroug.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + [0, -40] + ')')
        .call(xAxisBot);

    // labels
    axisGroug.append('text')
        .attr('class', 'x label')
        .attr('transform', 'translate(' + [axisWidth / 2, 0] + ')')
        .text('Distance in KM');


    // Create an UPDATE + ENTER selection
    // Selects all data-bound elements that are in SVG or just added to SVG
    satellites.merge(satellitesEnter)
        .transition();

    // Use the EXIT selection to remove all bars that have been filtered out
    // Using a key-function in the data() method is crucial to a proper EXIT
    satellites.exit().remove();
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

    var maxApogee = d3.max(dataset, function(d){
        return +d['Apogee (km)'] + EARTH_RADIUS;
    });

    var maxPerigee = d3.max(dataset, function(d){
        return +d['Perigee (km)'] + EARTH_RADIUS;
    });

    kmToWidth = (mainVis.clientWidth - graphLeftPadding - mainVisRightPadding) / (maxApogee + maxPerigee);

    const earthCenterX = zoom.center
        ? (mainVis.clientWidth + graphLeftPadding/5 - mainVisRightPadding) / 2
        : kmToWidth * maxPerigee + graphLeftPadding;

    earthCenter = [earthCenterX, mainVis.clientHeight / 2];

    scale = d3.scaleLinear()
        .domain([0, maxApogee / zoom.mag])
        .range([0,kmToWidth * maxApogee]);

    updateChart(refineByParams);
    
});

// Filter By Listeners
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