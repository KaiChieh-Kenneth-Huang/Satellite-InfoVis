const EARTH_DIAMETER = 6378;

const SATELLITE_SIZE = 2;
const ZOOM_OVERVIEW = 1000;

const mainVis = document.getElementById('main-vis');
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

// TODO: sizing code needs to be inside resize listener
console.log('client', mainVis.clientWidth + 'x' + mainVis.clientHeight);

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
        const a = ((apogee + EARTH_DIAMETER) + (perigee + EARTH_DIAMETER)) / 2;
        const b = Math.sqrt((apogee + EARTH_DIAMETER) * (perigee + EARTH_DIAMETER));
        const xAbs = a * b / Math.sqrt(b * b + Math.pow(a * Math.tan(angle), 2));

        const x = Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
        const y = angle < 0 ? earthCenter[1] - scale(xAbs * Math.abs(Math.tan(angle))) : earthCenter[1] + scale(xAbs * Math.abs(Math.tan(angle))); // minus because +y direction is actually down on svg

        return {x: x, y: y};
    }

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
                    return SATELLITE_SIZE;
                case 'MEO':
                    return SATELLITE_SIZE;
                case 'GEO':
                    return SATELLITE_SIZE;
                case 'Elliptical':
                    return SATELLITE_SIZE;
            }
        })
        .style('fill', d => {
            const users = d['Users'];
            switch (users) {
                case 'Civil':
                    return 'rgba(3, 219, 252, 1)';
                case 'Government':
                    return 'rgba(215, 3, 252, 1)';
                case 'Military':
                    return 'rgba(252, 3, 3, 1)';
                case 'Commercial':
                    return 'rgba(36, 252, 3, 1)';
                default:
                    return 'rgba(150, 150, 150, 1)';
            }
        });
    
    // Create an UPDATE + ENTER selection
    // Selects all data-bound elements that are in SVG or just added to SVG
    satellites.merge(satellitesEnter)
        .transition();

    // Use the EXIT selection to remove all bars that have been filtered out
    // Using a key-function in the data() method is crucial to a proper EXIT
    satellites.exit().remove();
}

// **** Your JavaScript code goes here ****
d3.csv('./UCS-Satellite-Database-4-1-2020.csv').then(function(dataset) {
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
        return +d['Apogee (km)'] + EARTH_DIAMETER;
    });

    var maxPerigee = d3.max(dataset, function(d){
        return +d['Perigee (km)'] + EARTH_DIAMETER;
    });

    var kmToWidth = (mainVis.clientWidth - graphLeftPadding - mainVisRightPadding) / (maxApogee + maxPerigee);

    earthCenter = [kmToWidth * maxPerigee + graphLeftPadding, mainVis.clientHeight / 2];

    scale = d3.scaleLinear()
        .domain([0, maxApogee])
        .range([0,kmToWidth * maxApogee]);

    var axisScale = d3.scaleLinear()
        .domain([0, axisWidth / kmToWidth])
        .range([0, axisWidth]);

    // plot orbits
    var orbit = d3.select('svg').selectAll('ellipse')
        .data(dataset)
        .enter()
        .append('ellipse')
        .attr('class', 'regular-ellipse')
        .attr('cx', d => {
            return earthCenter[0] + scale((+d['Apogee (km)'] - +d['Perigee (km)']) / 2);
        })
        .attr('cy', earthCenter[1])
        .attr('rx', d => scale(((+d['Apogee (km)'] + EARTH_DIAMETER) + (+d['Perigee (km)'] + EARTH_DIAMETER)) / 2))
        .attr('ry', d => scale(Math.sqrt((+d['Apogee (km)'] + EARTH_DIAMETER) * (+d['Perigee (km)'] + EARTH_DIAMETER))))
        .style('stroke', d => {
            const orbitClass = d['Class of Orbit'];
            switch (orbitClass) {
                case 'LEO':
                    return 'rgba(205, 150, 150, 0.5)';
                case 'MEO':
                    return 'rgba(50, 155, 50, 0.5)';
                case 'GEO':
                    return 'rgba(50, 50, 255, 0.5)';
                case 'Elliptical':
                    return 'rgba(155, 155, 155, 0.5)';
            }
        });

    updateChart(refineByParams);
    

    // axes
    var xAxisBot = d3.axisBottom(axisScale).ticks(5);

    // Append a new <g> element that we will populate the axis with
    var svg = d3.select('svg');
    var axisGroug = svg.append('g')
        .attr('transform', 'translate(' + [canvasLeftPadding, mainVis.clientHeight - canvasBottomPadding] + ')');
    
    axisGroug.append('g')
        .attr('class', 'x axis')
        .attr('transform', 'translate(' + [0, -40] + ')')
        .call(xAxisBot);

    // // labels
    axisGroug.append('text')
        .attr('class', 'x label')
        .attr('transform', 'translate(' + [axisWidth / 2, 0] + ')')
        .text('Distance in KM');
});

// Filter By Listeners
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