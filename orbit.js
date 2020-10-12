const EARTH_DIAMETER = 6378;

// **** Your JavaScript code goes here ****
d3.csv('./UCS-Satellite-Database-4-1-2020.csv').then(function(dataset) {
    const earthCenter = [200, 300];
    var maxApogee = d3.max(dataset, function(d){
        return +d['Apogee (km)'];
    });
    console.log(maxApogee);

    var scale = d3.scaleLinear()
        .domain([0, maxApogee])
        .range([0,500]);

    // plot orbit
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
                    return 'rgba(255, 150, 150, 0)';
                case 'MEO':
                    return 'rgba(150, 255, 150, 0.1)';
                case 'GEO':
                    return 'rgba(150, 150, 255, 0.3)';
                case 'Elliptical':
                    return 'rgba(255, 255, 255, 0.7)';
            }
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
    var orbit = d3.select('svg').selectAll('circle')
        .data(dataset)
        .enter()
        .append('circle')
        .attr('class', 'regular-circle')
        .attr('cx', d => {
            // const angle = +d['Angle'];
            // const centerX = earthCenter[0] + scale((+d['Apogee (km)'] - +d['Perigee (km)']) / 2);
            // const a = ((+d['Apogee (km)'] + EARTH_DIAMETER) + (+d['Perigee (km)'] + EARTH_DIAMETER)) / 2;
            // const b = Math.sqrt((+d['Apogee (km)'] + EARTH_DIAMETER) * (+d['Perigee (km)'] + EARTH_DIAMETER));
            // const xAbs = a * b / Math.sqrt(b * b + Math.pow(a * Math.tan(angle), 2));
            
            // return Math.abs(angle) < Math.PI / 2 ? centerX + scale(xAbs) : centerX - scale(xAbs);
            return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).x;
        })
        .attr('cy', d => {
            return getPointOnEllipse(+d['Apogee (km)'], +d['Perigee (km)'], +d['Angle']).y;
        })
        .attr('r', d => {
            const orbitClass = d['Class of Orbit'];
            switch (orbitClass) {
                case 'LEO':
                    return 0.2;
                case 'MEO':
                    return 0.5;
                case 'GEO':
                    return 0.5;
                case 'Elliptical':
                    return 1;
            }
        })
        .style('fill', d => {
            // const orbitClass = d['Class of Orbit'];
            // switch (orbitClass) {
            //     case 'LEO':
            //         return 'rgba(255, 150, 150, 0.7)';
            //     case 'MEO':
            //         return 'rgba(150, 255, 150, 0.7)';
            //     case 'GEO':
            //         return 'rgba(150, 150, 255, 0.7)';
            //     case 'Elliptical':
            //         return 'rgba(255, 255, 255, 0.7)';
            // }
            const users = d['Users'];
            switch (users) {
                case 'Civil':
                    return 'rgba(255, 150, 30, 0.7)';
                case 'Government':
                    return 'rgba(200, 100, 230, 0.7)';
                case 'Military':
                    return 'rgba(0, 150, 240, 0.7)';
                case 'Commercial':
                    return 'rgba(255, 255, 155, 0.7)';
                default:
                    return 'rgba(255, 255, 255, 0.7)';
            }
        });

    // axes
    // var xAxisBot = d3.axisBottom(xScale);
    // var yAxisLeft = d3.axisLeft(yScale);
    // var xAxisTop = d3.axisTop(xScale);
    // var yAxisRight = d3.axisRight(yScale);

    // Append a new <g> element that we will populate the axis with
    // var svg = d3.select('svg');
	// svg.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', 'translate(0,630)')
    //     .call(xAxisBot);

    // var svg = d3.select('svg');
    // svg.append('g')
    //     .attr('class', 'x axis')
    //     .attr('transform', 'translate(0,40)')
    //     .call(xAxisTop);

    // var svg = d3.select('svg');
    // svg.append('g')
    //     .attr('class', 'y axis')
    //     .attr('transform', 'translate(70,0)')
    //     .call(yAxisLeft);
        
    // var svg = d3.select('svg');
    // svg.append('g')
    //     .attr('class', 'y axis')
    //     .attr('transform', 'translate(530,0)')
    //     .call(yAxisRight);

    // // labels
    // svg.append('text')
    //     .attr('class', 'x label')
    //     .attr('transform', 'translate(300,670)')
    //     .text('Habital Zone Distance');
    // svg.append('text')
    //     .attr('class', 'x label')
    //     .attr('transform', 'translate(300,15)')
    //     .text('Habital Zone Distance');
    // svg.append('text')
    //     .attr('class', 'y label')
    //     .attr('transform', 'translate(25,300)rotate(-90)')
    //     .text('Planet Mass (relative to Earth');
    // svg.append('text')
    //     .attr('class', 'y label')
    //     .attr('transform', 'translate(580,300)rotate(-90)')
    //     .text('Planet Mass (relative to Earth');
});