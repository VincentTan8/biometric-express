function showSideBar() {
    const sideBar = document.querySelector('.sidebar')
    sideBar.style.display = 'flex'
}

function hideSideBar() {
    const sideBar = document.querySelector('.sidebar')
    sideBar.style.display = 'none'
}


(function ($) {
    "use strict";

    //Prevents default scrolling to top when clicking href="#"
    $('a').click(function(event) {
        event.preventDefault();
    });
    
})(jQuery);