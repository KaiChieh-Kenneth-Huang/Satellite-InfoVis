// Realistic / statistical view switch
$(document).on("change", "[name='mainVisSwitch']", function (){
    if($(this).val() === 'realistic') {
        $('#realistic-main-vis').css('visibility', 'visible');
        $('#statistical-main-vis').css('visibility', 'hidden');
        $('#realistic-main-vis').css('z-index', '-1');
        $('#statistical-main-vis').css('z-index', '-2');

        $('#realistic-main-display').css('display', 'block');
        $('#statistical-main-display').css('display', 'none');
    } else {
        $('#realistic-main-vis').css('visibility', 'hidden');
        $('#statistical-main-vis').css('visibility', 'visible');
        $('#realistic-main-vis').css('z-index', '-2');
        $('#statistical-main-vis').css('z-index', '-1');

        $('#realistic-main-display').css('display', 'none');
        $('#statistical-main-display').css('display', 'block');
    }
});