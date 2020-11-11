/***
 * code for statistical mode
***/

const sta_mainVis = document.getElementById('statistical-main-vis');
const radius_range = 1.8 * Math.PI;

var width = sta_mainVis.clientWidth;
var height = sta_mainVis.clientHeight;

var outerRadius_Mass = 95;
var innerRadius_Mass = 65;

var outerRadius_Dis = 60;
var innerRadius_Dis = 30;

var outerRadius_Period = 130;
var innerRadius_Period = 100;

var outerRadius_Purpose = 150;
var innerRadius_Purpose = 135;

var innerRadius_Country = 155;
var outerRadius_Country = 170;

var padAngle = 0.003;

// Refine By dropdowns
sta_refineByCountry = document.querySelector('#sta_refineByCountry');
sta_refineByPurpose = document.querySelector('#sta_refineByPurpose');
sta_refineByOwner = document.querySelector('#sta_refineByOwner');
sta_refineByAttribute = document.querySelector('#sta_refineByAttribute');
sta_refineByYear = document.querySelector('#sta_refineByYear');

// field names
STA_FN_COUNTRY = 'new_country';
STA_FN_OWNER = 'Operator/Owner';
STA_FN_PURPOSE = 'new_purpose';
STA_FN_YEAR = 'new_year';
//const FN_ATTRIBUTE = 

var refineByParams = {};
var radioValue = 'Country';

// svg variables
var sta_satelliteData; // holds the satellite data
var earthCenter;
var scale;

// TODO: sizing code needs to be inside resize listener

function sta_updateChart(refineParam,radioValue) {
    var sta_filteredSatellites = sta_satelliteData.filter(function(d){
        let match = true;
        for (let key in refineParam) {
            if (refineParam[key] == 'All'){
                continue;
            }
            else if (d[key] !== refineParam[key]) {
                match = false;
                break;
            }
        }
        return match;
    });
    console.log(radioValue);
    sta_dataset = sta_filteredSatellites;
    d3.select('#statistical-main-vis').selectAll('g').remove();
    //Sort
    if (radioValue =='Country'){
        sta_dataset = sta_dataset.sort((a,b)=>d3.descending(a['new_country'],b['new_country']));
    }
    else if(radioValue =='Purpose'){
        sta_dataset = sta_dataset.sort((a,b)=>d3.descending(a['new_purpose'],b['new_purpose']));
    }
    else if(radioValue =='Period'){
        sta_dataset = sta_dataset.sort((a,b)=>d3.descending(parseFloat(a['Period (minutes)']),parseFloat(b['Period (minutes)'])));
    }
    else if(radioValue == 'Mass'){
        sta_dataset = sta_dataset.sort((a,b)=>d3.descending(parseFloat(a['Launch Mass (kg.)']),parseFloat(b['Launch Mass (kg.)'])));
    }
    else if(radioValue == 'Dis'){
        sta_dataset = sta_dataset.sort((a,b)=>d3.descending(parseFloat(a['avgDis']),parseFloat(b['avgDis'])));
    }
    else{
        
    }

    var maxPeriod = d3.max(sta_dataset, function(d){
        return +d['Period (minutes)'];
    });

    var maxMass = d3.max(sta_dataset,function(d){
        return +d['Launch Mass (kg.)'];
    });

    var maxDis = d3.max(sta_dataset,function(d){
        return +d['avgDis'];
    }); 
    
    var x = d3.scaleBand()
        .range([0, radius_range])    // X axis goes from 0 to 2pi = all around the circle. If I stop at 1Pi, it will be around a half circle
        .align(0)                  // This does nothing ?
        .domain( sta_dataset.map(function(d) { return d['Name of Satellite  Alternate Names']; }) ); // The domain of the X axis is the list of states.
    var y_period = d3.scaleRadial()
    .range([outerRadius_Period,innerRadius_Period])
    .domain([0,maxPeriod]);

    var y_dis = d3.scaleRadial()
    .range([outerRadius_Dis,innerRadius_Dis])
    .domain([0,maxDis]);

    var y_mass = d3.scaleRadial()
    .range([outerRadius_Mass,innerRadius_Mass])
    .domain([0,maxMass]);

    var y_purpose = d3.scaleRadial()
    .range([outerRadius_Purpose,innerRadius_Purpose])
    .domain([0,1]);

    var y_country = d3.scaleRadial()
    .range([outerRadius_Country,innerRadius_Country])
    .domain([0,1]);

    var svg = d3.select('#statistical-main-vis')
    .append("g")
    .attr("transform", "translate(" + (width/2+30) + "," + ( height/2 )+ ")"); // Add 100 on Y translation, cause upper bars are longer;


    

    var Civil = 0;
    var Commercial = 0;
    var Military = 0;
    var Governmental = 0;
    var Multi_purpose = 0;
    for (var i = 0; i < sta_dataset.length; i++) {
        if (sta_dataset[i]['new_purpose'] == 'Civil'){
            Civil++;
        }
        else if (sta_dataset[i]['new_purpose'] == 'Commercial'){
            Commercial++;
        }
        else if (sta_dataset[i]['new_purpose'] == 'Military'){
            Military++;
        }
        else if (sta_dataset[i]['new_purpose'] == 'Governmental'){
            Governmental++;
        }
        else if (sta_dataset[i]['new_purpose'] == 'Multi-purpose'){
            Multi_purpose++;
        }
    }
    var all = Civil + Commercial + Military + Governmental + Multi_purpose;
    var Civil_p = Civil / all * radius_range;
    var Commercial_p = Commercial / all * radius_range;
    var Military_p = Military / all * radius_range;
    var Governmental_p = Governmental / all * radius_range;
    var Multi_purpose_p = Multi_purpose / all * radius_range;
    
    var purpose = [
        { purpose: 'Civil', start_angle : 0, angle : Civil_p },
        { purpose: 'Commercial', start_angle : Civil_p, angle : Commercial_p },
        { purpose: 'Military', start_angle : Commercial_p + Civil_p, angle : Military_p },
        { purpose: 'Governmental', start_angle : Commercial_p + Civil_p + Military_p, angle : Governmental_p },
        { purpose: 'Multi_purpose', start_angle : Commercial_p + Civil_p + Military_p + Governmental_p, angle : Multi_purpose_p }
    ]

    var purpose_statistical = [
        { purpose: 'Civil', count : Civil},
        { purpose: 'Commercial', count : Commercial},
        { purpose: 'Military', count : Military },
        { purpose: 'Governmental', count : Governmental},
        { purpose: 'Multi_purpose', count : Multi_purpose }
    ]

    var USA = 0;
    var China = 0;
    var UK = 0;
    var Russia = 0;
    var Others = 0;
    var Multinational = 0;
    for (var i = 0; i < sta_dataset.length; i++) {
        if (sta_dataset[i]['new_country'] == 'USA'){
            USA++;
        }
        else if (sta_dataset[i]['new_country'] == 'UK'){
            UK++;
        }
        else if (sta_dataset[i]['new_country'] == 'China'){
            China++;
        }
        else if (sta_dataset[i]['new_country'] == 'Russia'){
            Russia++;
        }
        else if (sta_dataset[i]['new_country'] == 'Others'){
            Others++;
        }
        else if (sta_dataset[i]['new_country'] == 'Multinational'){
            Multinational++;
        }
    }
    var all = USA + UK + China + Russia + Others + Multinational;
    var USA_p = USA / all * radius_range;
    var China_p = China / all * radius_range;
    var Russia_p = Russia / all * radius_range;
    var UK_p = UK / all * radius_range;
    var Others_p = Others / all * radius_range;
    var Multinational_p = Multinational / all * radius_range;

    var country = [
        { country: 'USA', start_angle : 0, angle : USA_p },
        { country: 'China', start_angle : USA_p, angle : China_p },
        { country: 'UK', start_angle : China_p + USA_p, angle : UK_p },
        { country: 'Russia', start_angle : China_p + USA_p + UK_p, angle : Russia_p },
        { country: 'Others', start_angle : China_p + USA_p + UK_p + Russia_p, angle : Others_p },
        { country: 'Multinational', start_angle : China_p + USA_p + UK_p + Russia_p + Others_p, angle : Multinational_p}
    ]

    var country_statistical = [
        { country: 'USA', count : USA},
        { country: 'China', count : China},
        { country: 'UK', count : UK },
        { country: 'Russia', count : Russia},
        { country: 'Others', count : Others },
        { country: 'Multinational', count : Multinational }
    ]

    if(radioValue == 'Purpose'){
        var purposeBar = svg.append('g')
        .selectAll('path')
        .data(purpose)
        .enter()
        .append('path')
        .attr('fill',function(d){
            if (d['purpose'] == 'Civil'){
                return '#f54f47';
            }
            else if (d['purpose'] == 'Military'){
                return '#edb200';
            }
            else if(d['purpose'] =='Government'){
                return '#f1428a';
            }
            else if(d['purpose'] == 'Multi-purpose'){
                return '#ad73c8';
            }
            else if(d['purpose'] == 'Commercial'){
                return '#f57600';
            }
            else {
                return '#28333c';
            }
        })
        .attr('d',d3.arc()
        .innerRadius( function(d) { return y_purpose(0) })
        .outerRadius(function(d){return y_purpose(1);})
        .startAngle(function(d){return d['start_angle'];})
        .endAngle(function(d){return d['start_angle'] + d['angle'];})
        .padAngle(0)
        .padRadius(outerRadius_Country)
        );
    }
    else{
    var purposeBar = svg.append('g')
    .selectAll('path')
    .data(sta_dataset)
    .enter()
    .append('path')
    .attr('fill',function(d){
        if (d['new_purpose'] == 'Civil'){
            return '#f54f47';
        }
        else if (d['new_purpose'] == 'Military'){
            return '#edb200';
        }
        else if(d['new_purpose'] =='Government'){
            return '#f1428a';
        }
        else if(d['new_purpose'] == 'Multi-purpose'){
            return '#ad73c8';
        }
        else if(d['new_purpose'] == 'Commercial'){
            return '#f57600';
        }
        else {
            return '#28333c';
        }
    })
    .attr("fill-opacity",function(d){
        if (d['new_purpose']==''){
            return 1;
        }
        else{
            return 10;
        }
    })
    .attr('d',d3.arc()
    .innerRadius( function(d) { return y_purpose(0) })
    .outerRadius(function(d){return y_purpose(1);})
    .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
    .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
    .padAngle(padAngle)
    .padRadius(outerRadius_Purpose)
    );
}

if(radioValue == 'Country'){
    var CountryBar = svg.append('g')
    .selectAll('path')
    .data(country)
    .enter()
    .append('path')
    .attr('fill',function(d){
        if (d['country'] == 'USA'){
            return '#919fa8';
        }
        else if (d['country'] == 'Russia'){
            return '#e46c00';
        }
        else if(d['country'] =='China'){
            return '#8939ad';
        }
        else if(d['country'] == 'Others'){
            return '#62a420';
        }
        else if(d['country'] == 'Multinational'){
            return '#00ab9a';
        }
        else {
            return '#28333c';
        }
    })
    .attr('d',d3.arc()
    .innerRadius( function(d) { return y_country(0) })
    .outerRadius(function(d){return y_country(1);})
    // .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
    // .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth()+0.005;})
    .startAngle(function(d){return d['start_angle'];})
    .endAngle(function(d){return d['start_angle'] + d['angle'];})
    .padAngle(0)
    .padRadius(outerRadius_Country)
    );
}
else{
    var CountryBar = svg.append('g')
    .selectAll('path')
    .data(sta_dataset)
    .enter()
    .append('path')
    .attr('fill',function(d){
        if (d['new_country'] == 'USA'){
            return '#919fa8';
        }
        else if (d['new_country'] == 'Russia'){
            return '#e46c00';
        }
        else if(d['new_country'] =='China'){
            return '#8939ad';
        }
        else if(d['new_country'] == 'Others'){
            return '#62a420';
        }
        else if(d['new_country'] == 'Multinational'){
            return '#00ab9a';
        }
        else {
            return '#28333c';
        }
    })
    .attr('d',d3.arc()
    .innerRadius( function(d) { return y_country(0) })
    .outerRadius(function(d){return y_country(1);})
    .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
    .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
    .padAngle(padAngle)
    .padRadius(outerRadius_Country)
    );
    }

    var periodBar_background = svg.append('g')
    .selectAll('path')
    .data(sta_dataset)
    .enter()
    .append('path')
    .attr("fill-opacity","1")
    .attr('fill','#28333c')
    .attr('d',d3.arc()
        .innerRadius( function(d) { return y_period(0) })
        .outerRadius(function(d){return y_period(maxPeriod);})
        .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
        .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
        .padAngle(padAngle)
        .padRadius(outerRadius_Period)
    );

    var periodBar = svg.append('g')
        .selectAll('path')
        .data(sta_dataset)
        .enter()
        .append('path')
        .attr('fill','#e35b4f')
        .attr('d',d3.arc()
            .innerRadius( function(d) { return y_period(0) })
            .outerRadius(function(d){return y_period(d['Period (minutes)']);})
            .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
            .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
            .padAngle(padAngle)
            .padRadius(outerRadius_Period)
        );

    var massBar_background = svg.append('g')
        .selectAll('path')
        .data(sta_dataset)
        .enter()
        .append('path')
        .attr("fill-opacity","1")
        .attr('fill','#28333c')
        .attr('d',d3.arc()
            .innerRadius( function(d) { return y_mass(0) })
            .outerRadius(function(d){return y_mass(maxMass);})
            .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
            .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
            .padAngle(padAngle)
            .padRadius(outerRadius_Mass)
        );

    var massBar = svg.append('g')
        .selectAll('path')
        .data(sta_dataset)
        .enter()
        .append('path')
        .attr('fill','#f08934')
        .attr('d',d3.arc()
            .innerRadius( function(d) { return y_mass(0) })
            .outerRadius(function(d){return y_mass(d['Launch Mass (kg.)']);})
            .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
            .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
            .padAngle(padAngle)
            .padRadius(outerRadius_Mass)
        );


    var disBar_background = svg.append('g')
        .selectAll('path')
        .data(sta_dataset)
        .enter()
        .append('path')
        .attr("fill-opacity","1")
        .attr('fill','#28333c')
        .attr('d',d3.arc()
            .innerRadius( function(d) { return y_dis(0) })
            .outerRadius(function(d){return y_dis(maxDis);})
            .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
            .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
            .padAngle(padAngle)
            .padRadius(outerRadius_Dis)
        );

    var disBar = svg.append('g')
        .selectAll('path')
        .data(sta_dataset)
        .enter()
        .append('path')
        .attr('fill','#ee7137')
        .attr('d',d3.arc()
            .innerRadius( function(d) { return y_dis(0) })
            .outerRadius(function(d){return y_dis(d['Perigee (km)']);})
            .startAngle(function(d){return x(d['Name of Satellite  Alternate Names']);})
            .endAngle(function(d){return x(d['Name of Satellite  Alternate Names']) + x.bandwidth();})
            .padAngle(padAngle)
            .padRadius(outerRadius_Dis)
        );



    // bar charts begin
    var main_svg = d3.select('#statistical-main-vis');
    let barchart_width = 200;
    let barchart_height = 75;
    let disArray = sta_dataset.map(d => parseFloat(d['avgDis']));
    let periodArray = sta_dataset.map(d => parseFloat(d['Period (minutes)']));
    let massArray = sta_dataset.map(d => parseFloat(d['Launch Mass (kg.)']));
    let bin_num = 10;
    let bin_period = 10;
    let bin_mass = 10;

    //disArray
    var dis_barchart = main_svg.append('g')
    .attr('transform', 'translate(625,150)') ;

    min_avgDis = d3.min(disArray);
    max_avgDis = d3.max(disArray);
    var x_dis = d3.scaleLinear()
    .domain([min_avgDis,max_avgDis])
    .range([0,barchart_width]);
    dis_barchart.append('g')
    .attr('class','axis')
    .attr('transform', 'translate(0,' +barchart_height + ')')
    .call(d3.axisBottom(x_dis).ticks(bin_num));

    var dis_histogram = d3.histogram()
    .domain(x_dis.domain())
    .thresholds(x_dis.ticks(bin_num));
    
    var bins = dis_histogram(disArray);

    var y_dis = d3.scaleLinear()
    .range([barchart_height, 0]);

    console.log(bins);

    y_dis.domain([0, d3.max(bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
    
    dis_barchart.append("g")
    .attr('class','axis')
    .call(d3.axisLeft(y_dis));

    dis_barchart.selectAll("rect")
    .data(bins)
    .enter()
    .append("rect")
    .attr("x", 1)
    .attr("transform", function(d) { return "translate("  + x_dis(d.x0) + ","  + y_dis(d.length) + ")"; })
    .attr("width", function(d) { return x_dis(d.x1) - x_dis(d.x0) -1 ; })
    .attr("height", function(d) { return barchart_height - y_dis(d.length); })
    .style("fill", "#69b3a2");

    //period array
    var period_barchart = main_svg.append('g')
    .attr('transform', 'translate(625,' + (150+barchart_height + 25) + ')') ;

    min_period = d3.min(periodArray);
    max_period = d3.max(periodArray);
    var x_period = d3.scaleLinear()
    .domain([min_period,max_period])
    .range([0,barchart_width]);

    period_barchart.append('g')
    .attr('class','axis')
    .attr('transform', 'translate(0,' +barchart_height + ')')
    .call(d3.axisBottom(x_period).ticks(bin_period));

    var period_histogram = d3.histogram()
    .domain(x_period.domain())
    .thresholds(x_period.ticks(bin_period));
    
    var period_bins = period_histogram(disArray);

    var y_period = d3.scaleLinear()
    .range([barchart_height, 0]);

    y_period.domain([0, d3.max(period_bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
    
    period_barchart.append("g")
    .attr('class','axis')
    //.attr('transform', 'translate(625,100)')
    .call(d3.axisLeft(y_period));

    period_barchart.selectAll("rect")
    .data(period_bins)
    .enter()
    .append("rect")
    .attr("x", 1)
    .attr("transform", function(d) { return "translate("  + x_period(d.x0) + ","  + y_period(d.length) + ")"; })
    .attr("width", function(d) { return x_period(d.x1) - x_period(d.x0) -1 ; })
    .attr("height", function(d) { return barchart_height - y_period(d.length); })
    .style("fill", "#69b3a2");

    //mass array
    var mass_barchart = main_svg.append('g')
    .attr('transform', 'translate(625,' + (150+barchart_height*2 + 25*2) + ')') ;

    min_mass = d3.min(massArray);
    max_mass = d3.max(massArray);
    var x_mass = d3.scaleLinear()
    .domain([min_mass,max_mass])
    .range([0,barchart_width]);

    mass_barchart.append('g')
    .attr('class','axis')
    .attr('transform', 'translate(0,' +barchart_height + ')')
    .call(d3.axisBottom(x_mass).ticks(bin_mass));

    var period_histogram = d3.histogram()
    .domain(x_mass.domain())
    .thresholds(x_mass.ticks(bin_mass));
    
    var mass_bins = period_histogram(massArray);

    var y_mass = d3.scaleLinear()
    .range([barchart_height, 0]);

    y_mass.domain([0, d3.max(mass_bins, function(d) { return d.length; })]);   // d3.hist has to be called before the Y axis obviously
    
    mass_barchart.append("g")
    .attr('class','axis')
    //.attr('transform', 'translate(625,100)')
    .call(d3.axisLeft(y_mass));


    mass_barchart.selectAll("rect")
    .data(mass_bins)
    .enter()
    .append("rect")
    .attr("x", 1)
    .attr("transform", function(d) { return "translate("  + x_mass(d.x0) + ","  + y_mass(d.length) + ")"; })
    .attr("width", function(d) { return x_mass(d.x1) - x_mass(d.x0) -1 ; })
    .attr("height", function(d) { return barchart_height - y_mass(d.length); })
    .style("fill", "#69b3a2");


    //purpose barchart
    var purpose_barchart = main_svg.append('g')
    .attr('transform', 'translate(625,' + (150+barchart_height*3 + 25*3) + ')') ;
    
    var x_purpose = d3.scaleBand()
                    .range([0, barchart_width])
                    .padding(0.5);
    var y_purpose = d3.scaleLinear().range([barchart_height, 0]);
    x_purpose.domain(purpose_statistical.map(function(d) { return d['purpose']; }));
    y_purpose.domain([0, d3.max(purpose_statistical, function(d) { return d['count']; })]);
    purpose_barchart.selectAll("rect")
    .data(purpose_statistical)
    .enter().append("rect")
    .attr("x", function(d) { return x_purpose(d['purpose']); })
    .attr("width", x_purpose.bandwidth())
    .attr("y", function(d) { return y_purpose(d['count']); })
    .attr("height", function(d) { return barchart_height - y_purpose(d['count']); })
    .style("fill", "#69b3a2");

    purpose_barchart.append("g")
    .attr("transform", "translate(0," + barchart_height + ")")
    .attr('class','axis')
    .call(d3.axisBottom(x_purpose));
    purpose_barchart.append("g")
    .attr('class','axis')
    .call(d3.axisLeft(y_purpose));


    //country barchart
    var country_barchart = main_svg.append('g')
    .attr('transform', 'translate(625,' + (150+barchart_height*4 + 25*4) + ')') ;
    
    var x_country = d3.scaleBand()
                    .range([0, barchart_width])
                    .padding(0.3);
    var y_country = d3.scaleLinear().range([barchart_height, 0]);

    x_country.domain(country_statistical.map(function(d) { return d['country']; }));
    y_country.domain([0, d3.max(country_statistical, function(d) { return d['count']; })]);

    country_barchart.selectAll("rect")
    .data(country_statistical)
    .enter().append("rect")
    .attr("x", function(d) { return x_country(d['country']); })
    .attr("width", x_country.bandwidth())
    .attr("y", function(d) { return y_country(d['count']); })
    .attr("height", function(d) { return barchart_height - y_country(d['count']); })
    .style("fill", "#69b3a2");

    country_barchart.append("g")
    .attr("transform", "translate(0," + barchart_height + ")")
    .attr('class','axis')
    .call(d3.axisBottom(x_country));
    country_barchart.append("g")
    .attr('class','axis')
    .call(d3.axisLeft(y_country));




}

// load CSV
d3.csv('../data/new_data_with_date.csv').then(function(sta_dataset) {
sta_satelliteData = sta_dataset;
let countries = Object.keys(sta_dataset.reduce((options, d) => {
    const fieldName = STA_FN_COUNTRY;
    if (!options[d[fieldName]]) {
        options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
    }
    return options;
}, {})).sort();
countries.push('All');
countries.sort();

let purposes = Object.keys(sta_dataset.reduce((options, d) => {
    const fieldName = STA_FN_PURPOSE;
    if (!options[d[fieldName]]) {
        options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
    }
    return options;
}, {})).sort();
purposes.push('All');
purposes.sort();

let years = Object.keys(sta_dataset.reduce((options, d) => {
    const fieldName = STA_FN_YEAR;
    if (!options[d[fieldName]]) {
        options[d[fieldName]] = d[fieldName]; // can later make key, value pair different to display different things in dropdown options
    }
    return options;
}, {})).sort((a, b) => b - a);

const sta_populateRefineBy = (selectEle, options) => {
    for (const option of options) {
        selectEle.innerHTML+= `<option value="${option}">${option}</option>`;
    }
}
sta_populateRefineBy(sta_refineByCountry, countries);
sta_populateRefineBy(sta_refineByPurpose, purposes);
sta_populateRefineBy(sta_refineByYear, years);
refineByParams[STA_FN_COUNTRY] = 'All';
refineByParams[STA_FN_YEAR] = '2020';
refineByParams[STA_FN_PURPOSE] = 'All';
sta_updateChart(refineByParams,radioValue);
});

// Filter By Listeners
document.querySelector('#sta_refineByCountry').addEventListener('change', (event) => {
    refineByParams[STA_FN_COUNTRY] = event.target.value;
    sta_updateChart(refineByParams,radioValue);
});

document.querySelector('#sta_refineByPurpose').addEventListener('change', (event) => {
    refineByParams[STA_FN_PURPOSE] = event.target.value;
    sta_updateChart(refineByParams,radioValue);
});

document.querySelector('#sta_refineByYear').addEventListener('change', (event) => {
    refineByParams[STA_FN_YEAR] = event.target.value;
    sta_updateChart(refineByParams,radioValue);
});

document.querySelector('#radioCountry').addEventListener('change', (event) => {
    radioValue = 'Country';
    sta_updateChart(refineByParams,radioValue)
});
document.querySelector('#radioPurpose').addEventListener('change', (event) => {
    radioValue = 'Purpose';
    sta_updateChart(refineByParams,radioValue)
});
document.querySelector('#radioPeriod').addEventListener('change', (event) => {
    radioValue = 'Period';
    sta_updateChart(refineByParams,radioValue)
});
document.querySelector('#radioMass').addEventListener('change', (event) => {
    radioValue = 'Mass';
    sta_updateChart(refineByParams,radioValue)
});
document.querySelector('#radioDis').addEventListener('change', (event) => {
    radioValue = 'Dis';
    sta_updateChart(refineByParams,radioValue)
});