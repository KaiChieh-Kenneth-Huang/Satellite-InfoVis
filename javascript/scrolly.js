const DIMMING_COEFFICIENT_LEO = 0.01;
const DIMMING_COEFFICIENT_MEO = 0.1;
const DIMMING_COEFFICIENT_GEO = 0.05;
const DIMMING_COEFFICIENT_HEO = 0.2;
// instantiate the scrollama
const scroller = scrollama();

// setup the instance, pass callback functions
scroller
  .setup({
    step: ".step",
  })
  .onStepEnter(({ element, index, direction }) => {
    const name = "is-active";
    const arr = element.className.split(" ");
    if (arr.indexOf(name) == -1) {
      element.className += " " + name;
    }

    let visControlParams = {};
    const display1 = document.querySelector('#display-1');
    const display2 = document.querySelector('#display-2');

    // change display
    switch (element.dataset.name) {
      case 'intro':
        display1.style.opacity = 1;
        display2.style.opacity = 0;
        break;
      case 'what-is-satellite':
        display1.style.opacity = 0;
        display2.style.opacity = 1;
        break;
      case 'orbit-intro':
      case 'LEO':
      case 'MEO':
      case 'GEO':
      case 'HEO':
      case 'your-turn':
      default:
        display1.style.opacity = 1;
        display2.style.opacity = 0;
    }

    // update min vis
    switch (element.dataset.name) {
      case 'intro':
        display1.style.opacity = 1;
        break;
      case 'what-is-satellite':
        break;
      case 'orbit-intro':
        visControlParams = {
          shouldAnimate: true,
          hideSatellites: true
        };
        break;
      case 'LEO':
        visControlParams = {
          orbitOpacityCoefficient: {LEO: 1, MEO: DIMMING_COEFFICIENT_MEO, GEO: DIMMING_COEFFICIENT_GEO, Elliptical: DIMMING_COEFFICIENT_HEO},
          shouldAnimate: true,
          zoom: ZOOM_LEO
        };
        break;
      case 'MEO':
        visControlParams = {
          orbitOpacityCoefficient: {LEO: DIMMING_COEFFICIENT_LEO, MEO: 1, GEO: DIMMING_COEFFICIENT_GEO, Elliptical: DIMMING_COEFFICIENT_HEO},
          shouldAnimate: true,
          zoom: ZOOM_GEO
        };
        break;
      case 'GEO':
        visControlParams = {
          orbitOpacityCoefficient: {LEO: DIMMING_COEFFICIENT_LEO, MEO: DIMMING_COEFFICIENT_MEO, GEO: 1, Elliptical: DIMMING_COEFFICIENT_HEO},
          shouldAnimate: true,
          zoom: ZOOM_GEO
        };
        break;
      case 'HEO':
        visControlParams = {
          orbitOpacityCoefficient: {LEO: DIMMING_COEFFICIENT_LEO, MEO: DIMMING_COEFFICIENT_MEO, GEO: DIMMING_COEFFICIENT_GEO, Elliptical: 1},
          shouldAnimate: true,
          animateHEOOribit: true,
          zoom: ZOOM_OVERVIEW
        };
        break;
      case 'your-turn':
        break;
      default:
    }
    updateChart_scrolly(visControlParams);
  })
  .onStepExit(({ element, index, direction }) => {
	  element.className = element.className.replace(/\bis-active\b/g, "");
  });

// setup resize event
window.addEventListener("resize", scroller.resize);