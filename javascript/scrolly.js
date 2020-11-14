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
  })
  .onStepExit(({ element, index, direction }) => {
	element.className = element.className.replace(/\bis-active\b/g, "");
  });

// setup resize event
window.addEventListener("resize", scroller.resize);